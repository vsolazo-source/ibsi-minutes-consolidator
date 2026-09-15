import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import {
  localHeuristicAnalyzeItem,
  buildLocalConsolidatedMOM,
  localReviseMOM,
} from "../src/utils/localSynthesis";

dotenv.config();

export const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Initialize AI client with safety check
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Cooldown map to avoid querying models under temporary high demand
const modelCooldownMap = new Map<string, number>();

function getHealthyCandidateModels(): string[] {
  const now = Date.now();
  const allModels = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview",
  ];

  return allModels.sort((a, b) => {
    const aCooldown = modelCooldownMap.get(a) || 0;
    const bCooldown = modelCooldownMap.get(b) || 0;
    const aInCooldown = now < aCooldown ? 1 : 0;
    const bInCooldown = now < bCooldown ? 1 : 0;
    return aInCooldown - bInCooldown;
  });
}

// Resilient AI generation with candidate model fallback and dynamic health routing
async function generateWithFallbackAndRetry(options: {
  prompt: string;
  responseSchema?: any;
}): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY is not configured in environment variables. Please set GEMINI_API_KEY in your Vercel Project Settings > Environment Variables."
    );
  }

  const candidateModels = getHealthyCandidateModels();
  let lastError: any = null;

  for (const model of candidateModels) {
    const isUnderCooldown = (modelCooldownMap.get(model) || 0) > Date.now();
    if (isUnderCooldown) {
      continue;
    }

    try {
      const config: any = {};
      if (options.responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = options.responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: options.prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      if (response.text && response.text.trim()) {
        return response.text.trim();
      }
    } catch (err: any) {
      lastError = err;
      const errMessage = String(err?.message || err);

      const isHighDemand =
        errMessage.includes("503") ||
        errMessage.includes("UNAVAILABLE") ||
        errMessage.includes("high demand") ||
        errMessage.includes("429") ||
        errMessage.includes("RESOURCE_EXHAUSTED");

      if (isHighDemand) {
        modelCooldownMap.set(model, Date.now() + 3 * 60 * 1000);
        console.log(`[AI Routing] Failover from ${model} to next candidate model.`);
      }
    }
  }

  throw lastError || new Error("All candidate models currently in cooldown or unavailable");
}

function localParseDocument(text: string, filename: string) {
  const cleaned = text.replace(/\r\n/g, "\n").slice(0, 5000);
  const paragraphs = cleaned
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const preview = paragraphs.slice(0, 3).join(" ");
  return {
    summary: `Background document context from "${filename || "Uploaded File"}": ${preview.slice(0, 350)}... Included key discussion topics and preliminary agenda targets.`,
  };
}

// Router to handle both `/api/...` and `...`
const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Endpoint: Analyze a single live item input
router.post("/mom/analyze-item", async (req, res) => {
  const { rawText, metadata, existingItems } = req.body;

  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return res.status(400).json({ error: "rawText is required" });
  }

  try {
    const prompt = `You are an expert executive meeting secretary analyzing real-time meeting notes.
Analyze this single raw input entered during a meeting:
Raw Input: "${rawText}"

Meeting Metadata:
- Title: ${metadata?.title || "Untitled Meeting"}
- Purpose: ${metadata?.purpose || "Not specified"}
- Attendees: ${(metadata?.attendees || []).join(", ") || "Unspecified"}

Existing Captured Items in this meeting:
${
  (existingItems || []).length === 0
    ? "No items captured yet."
    : (existingItems || [])
        .map(
          (item: any) =>
            `[ID: ${item.id}] Type: ${item.type} | Title: "${item.title}" | Expounded: "${item.expoundedText}"`
        )
        .join("\n")
}

Your tasks:
1. Classify the input into one of these 4 types:
   - 'discussion': Key topic discussed, debate, finding, or key point.
   - 'action_item': Concrete task with an assignee, action verb, or deadline.
   - 'remark': Other note, announcement, administrative detail, side remark, or schedule note.
   - 'related': The note directly expounds, clarifies, or connects to one of the existing items listed above.
2. If type is 'related' or relates heavily to an existing item, set 'relatedToItemId' to the exact ID of that existing item, and describe 'relatedReason'.
3. Expound the raw input into a clear, professional, executive-ready sentence/paragraph ('expoundedText'). Keep all factual details, names, metrics, and dates intact.
4. Provide a crisp 3 to 7-word 'title'.
5. If it's an action item, extract or suggest:
   - 'suggestedOwner': Person or team responsible (or "Unassigned" if unknown).
   - 'suggestedDeadline': Target date or timeframe (e.g. "Next Friday", "2026-09-19", "EOD Tomorrow", or "TBD").
   - 'priority': 'High', 'Medium', or 'Low'.
6. Provide 1 to 3 concise relevant 'tags' (e.g. ["Budget", "Q3", "Client"]).

Return strictly a JSON object.`;

    const rawResponseText = await generateWithFallbackAndRetry({
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: "Must be 'discussion', 'action_item', 'remark', or 'related'",
          },
          title: {
            type: Type.STRING,
            description: "Concise title for the item",
          },
          expoundedText: {
            type: Type.STRING,
            description: "Professionally expounded explanation of the point",
          },
          relatedToItemId: {
            type: Type.STRING,
            description: "ID of existing related item if applicable, or empty string",
          },
          relatedReason: {
            type: Type.STRING,
            description: "Explanation of how it connects to the related item",
          },
          suggestedOwner: {
            type: Type.STRING,
            description: "Extracted or inferred owner/assignee for action item",
          },
          suggestedDeadline: {
            type: Type.STRING,
            description: "Extracted or inferred deadline",
          },
          priority: {
            type: Type.STRING,
            description: "'High', 'Medium', or 'Low'",
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["type", "title", "expoundedText"],
      },
    });

    const parsed = JSON.parse(rawResponseText || "{}");
    let finalType = parsed.type?.toLowerCase();
    if (!["discussion", "action_item", "remark", "related"].includes(finalType)) {
      finalType = "discussion";
    }

    return res.json({
      type: finalType,
      title: parsed.title || "Meeting Note",
      expoundedText: parsed.expoundedText || rawText,
      relatedToItemId: parsed.relatedToItemId || null,
      relatedReason: parsed.relatedReason || null,
      suggestedOwner: parsed.suggestedOwner || null,
      suggestedDeadline: parsed.suggestedDeadline || null,
      priority: parsed.priority || "Medium",
      tags: parsed.tags || [],
    });
  } catch (error: any) {
    console.log("[MOM Server] Note analysis handled via intelligent local heuristic engine. Reason:", error?.message || error);
    const fallbackItem = localHeuristicAnalyzeItem(rawText, metadata, existingItems);
    return res.json(fallbackItem);
  }
});

// Endpoint: Consolidate all meeting items into structured MOM
router.post("/mom/consolidate", async (req, res) => {
  const { metadata, items } = req.body;

  try {
    const prompt = `You are a chief corporate secretary creating official, consolidated Minutes of the Meeting (MOM).
Here is the meeting information:
- Title: ${metadata?.title || "Meeting Minutes"}
- Date: ${metadata?.date || "Not specified"}
- Time: ${metadata?.time || "Not specified"}
- Venue: ${metadata?.venue || "Not specified"}
- Attendees: ${(metadata?.attendees || []).join(", ") || "None specified"}
- Purpose / High-Level Agenda: ${metadata?.purpose || "General discussion"}
- Uploaded Materials Summary / Context: ${metadata?.uploadedMaterialsText || "None provided"}

All Raw Captured & Classified Notes during the meeting (${(items || []).length} items):
${JSON.stringify(items, null, 2)}

Your instructions:
1. Synthesize all points into a rigorous, complete, professional MOM.
2. Group discussion points and related points logically into distinct topical discussion sections. For each topic:
   - Provide a clear 'topic' title.
   - List comprehensive 'details' (bullet points of what was explored and argued).
   - List explicit 'decisions' reached on that topic.
   - List any 'relatedNotes' or supplementary considerations.
3. Consolidate ALL action items into a clean, actionable matrix:
   - 'task': specific, action-oriented deliverable description.
   - 'assignee': responsible person/role.
   - 'dueDate': clear date or milestone.
   - 'priority': 'High', 'Medium', or 'Low'.
   - 'status': e.g. "Open" or "Pending".
4. Formulate an 'executiveSummary' capturing the core achievements, outcomes, and business impact of the session.
5. Capture any miscellaneous 'otherRemarks' (e.g. logistical notices, commendations, parking lot topics).
6. Capture 'nextMeeting' if mentioned anywhere in notes or remarks.

Return the response strictly matching the requested JSON schema.`;

    const rawResponseText = await generateWithFallbackAndRetry({
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
          venue: { type: Type.STRING },
          attendees: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          absentAttendees: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          executiveSummary: { type: Type.STRING },
          meetingPurpose: { type: Type.STRING },
          keyDecisions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          discussionSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                details: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                decisions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                relatedNotes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["topic", "details"],
            },
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                task: { type: Type.STRING },
                assignee: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                priority: { type: Type.STRING },
                status: { type: Type.STRING },
              },
              required: ["task", "assignee", "dueDate"],
            },
          },
          otherRemarks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          nextMeeting: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              venue: { type: Type.STRING },
              agenda: { type: Type.STRING },
            },
          },
        },
        required: [
          "title",
          "executiveSummary",
          "discussionSections",
          "actionItems",
        ],
      },
    });

    const parsed = JSON.parse(rawResponseText || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.log("[MOM Server] Consolidation synthesized via structured local consolidation engine. Reason:", error?.message || error);
    const fallbackMOM = buildLocalConsolidatedMOM(metadata, items || []);
    return res.json(fallbackMOM);
  }
});

// Endpoint: Iterative review and revision of the consolidated MOM
router.post("/mom/revise", async (req, res) => {
  const { currentMOM, userPrompt } = req.body;

  if (!userPrompt || typeof userPrompt !== "string" || !userPrompt.trim()) {
    return res.status(400).json({ error: "userPrompt is required" });
  }

  try {
    const prompt = `You are an expert executive secretary refining official Minutes of the Meeting (MOM).
The user reviewed the current MOM draft and wants to make the following update/revision:
"${userPrompt}"

Current MOM Draft:
${JSON.stringify(currentMOM, null, 2)}

Instructions:
1. Apply the user's requested modifications accurately.
2. If they ask to adjust assignees, due dates, change wording of discussion points, add new notes, clarify attendees, or rephrase the summary, update those exact sections cleanly.
3. Keep all other verified information intact.
4. Include a brief 'revisionNotes' string describing what changed (e.g. "Updated task #2 assignee to John and adjusted the Q3 budget discussion.").

Return strictly the updated JSON matching the schema.`;

    const rawResponseText = await generateWithFallbackAndRetry({
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
          venue: { type: Type.STRING },
          attendees: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          absentAttendees: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          executiveSummary: { type: Type.STRING },
          meetingPurpose: { type: Type.STRING },
          keyDecisions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          discussionSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                details: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                decisions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                relatedNotes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["topic", "details"],
            },
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                task: { type: Type.STRING },
                assignee: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                priority: { type: Type.STRING },
                status: { type: Type.STRING },
              },
              required: ["task", "assignee", "dueDate"],
            },
          },
          otherRemarks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          nextMeeting: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              venue: { type: Type.STRING },
              agenda: { type: Type.STRING },
            },
          },
          revisionNotes: { type: Type.STRING },
        },
        required: [
          "title",
          "executiveSummary",
          "discussionSections",
          "actionItems",
        ],
      },
    });

    const parsed = JSON.parse(rawResponseText || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.log("[MOM Server] Revision applied via local revision engine. Reason:", error?.message || error);
    const revisedMOM = localReviseMOM(currentMOM, userPrompt);
    return res.json(revisedMOM);
  }
});

// Endpoint: Parse background document materials
router.post("/mom/parse-document", async (req, res) => {
  const { documentText, filename } = req.body;
  if (!documentText) {
    return res.status(400).json({ error: "documentText is required" });
  }

  try {
    const prompt = `You are an executive assistant preparing for a meeting.
Summarize the key objectives, agenda topics, and relevant background from this uploaded meeting material (${filename || "Meeting Document"}):
"""
${documentText.slice(0, 15000)}
"""

Provide a concise 3 to 5 sentence summary and bulleted key agenda topics to serve as background context for the Minutes of the Meeting.`;

    const responseText = await generateWithFallbackAndRetry({
      prompt,
    });

    return res.json({
      summary: responseText || "Processed document materials.",
    });
  } catch (error: any) {
    console.log("[MOM Server] Document parsed via local extractor engine. Reason:", error?.message || error);
    const fallback = localParseDocument(documentText, filename || "Document");
    return res.json(fallback);
  }
});

// Mount the router on both `/api` and `/` so all deployment environments work seamlessly
app.use("/api", router);
app.use("/", router);

// Resilient global error handler to prevent unhandled 500 crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[MOM Server Error Handler]:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(200).json({
    type: "remark",
    title: "Meeting Note",
    expoundedText: req.body?.rawText || "Meeting note recorded.",
    relatedToItemId: null,
    relatedReason: null,
    suggestedOwner: null,
    suggestedDeadline: null,
    priority: "Medium",
    tags: ["Meeting Item"],
    fallback: true,
  });
});

export default app;
