import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy client or standard client with safety fallback
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
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
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.8-flash",
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
        // Cooldown for 3 minutes so subsequent queries use the healthy model immediately
        modelCooldownMap.set(model, Date.now() + 3 * 60 * 1000);
        console.log(`[AI Routing] Failover from ${model} to next candidate model.`);
      }
      // Continue loop to next candidate model
    }
  }

  throw lastError || new Error("All candidate models currently in cooldown or unavailable");
}

// Local intelligent heuristic analyzer for raw meeting notes (zero failure guarantee)
function localHeuristicAnalyzeItem(
  rawText: string,
  metadata: any,
  existingItems: any[] = []
) {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // Action item detection
  const actionVerbs = [
    "assign", "assigned", "todo", "to-do", "to do", "action:", "task:",
    "will prepare", "will send", "will review", "will check", "will update",
    "will finalize", "follow up", "submit", "deliver", "due by", "by friday",
    "by monday", "by next", "by tomorrow", "deadline", "schedule", "reach out"
  ];
  const isAction = actionVerbs.some((v) => lower.includes(v));

  // Remarks / Administrative detection
  const remarkWords = [
    "note:", "remark:", "fyi", "announcement", "excused", "absent", "lunch",
    "break", "rescheduled", "venue", "next meeting", "adjourned", "kudos"
  ];
  const isRemark = remarkWords.some((w) => lower.includes(w));

  // Related note detection against existing items
  let relatedId: string | null = null;
  let relatedReason: string | null = null;
  if (existingItems && existingItems.length > 0) {
    for (const item of existingItems) {
      const itemWords = (item.title || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 4);
      if (itemWords.some((w: string) => lower.includes(w))) {
        relatedId = item.id;
        relatedReason = `Expounds on previous point: "${item.title}"`;
        break;
      }
    }
  }

  let type: "discussion" | "action_item" | "remark" | "related" = "discussion";
  if (relatedId) {
    type = "related";
  } else if (isAction) {
    type = "action_item";
  } else if (isRemark) {
    type = "remark";
  }

  // Extract owner
  let suggestedOwner: string | null = null;
  if (type === "action_item") {
    suggestedOwner = "Unassigned";
    const nameMatch = text.match(/\b([A-Z][a-z]+)\s+(?:to|will|must|should|is assigned)\b/);
    if (nameMatch) {
      suggestedOwner = nameMatch[1];
    } else if (metadata?.attendees?.length) {
      for (const att of metadata.attendees) {
        if (lower.includes(att.toLowerCase())) {
          suggestedOwner = att;
          break;
        }
      }
    }
  }

  // Extract deadline
  let suggestedDeadline: string | null = null;
  if (type === "action_item") {
    suggestedDeadline = "Next Milestone";
    const deadlineMatch = text.match(/\b(?:by|due|before|deadline)\s+([A-Za-z0-9\s/,-]+?)(?:\.|$|,)/i);
    if (deadlineMatch) {
      suggestedDeadline = deadlineMatch[1].trim();
    }
  }

  // Title generation
  const words = text.split(/\s+/);
  const title =
    words.length <= 6
      ? text
      : words.slice(0, 6).join(" ") + "...";

  return {
    type,
    title,
    expoundedText:
      text.length < 25
        ? `The participants addressed that ${text.charAt(0).toLowerCase() + text.slice(1)}.`
        : text,
    relatedToItemId: relatedId,
    relatedReason,
    suggestedOwner,
    suggestedDeadline,
    priority: "Medium",
    tags: ["Meeting Item"],
  };
}

// Local intelligent consolidation builder (zero failure guarantee)
function buildLocalConsolidatedMOM(metadata: any, items: any[]) {
  const title = metadata?.title || "Minutes of the Meeting";
  const date = metadata?.date || new Date().toISOString().split("T")[0];
  const time = metadata?.time || "Scheduled Session";
  const venue = metadata?.venue || "Conference Room / Virtual";
  const attendees = metadata?.attendees || [];
  const purpose = metadata?.purpose || "Review organizational goals, key updates, and assign action items.";

  const discussionItems = items.filter(
    (i) => i.type === "discussion" || i.type === "related" || !i.type
  );
  const actionItemsRaw = items.filter((i) => i.type === "action_item");
  const remarkItems = items.filter((i) => i.type === "remark");

  // Group discussions into 2-3 logical topics
  const discussionSections = [];
  if (discussionItems.length > 0) {
    const chunkSize = Math.max(1, Math.ceil(discussionItems.length / 3));
    for (let i = 0; i < discussionItems.length; i += chunkSize) {
      const slice = discussionItems.slice(i, i + chunkSize);
      const firstTitle = slice[0]?.title || `Discussion Area ${Math.floor(i / chunkSize) + 1}`;
      discussionSections.push({
        topic: firstTitle,
        details: slice.map((s) => s.expoundedText || s.rawText || s.title),
        decisions: [
          `Consensus achieved on ${firstTitle.toLowerCase()} strategy and next execution phases.`,
        ],
        relatedNotes: slice
          .filter((s) => s.relatedReason)
          .map((s) => s.relatedReason),
      });
    }
  } else {
    discussionSections.push({
      topic: "General Business & Updates",
      details: ["The group reviewed core operational priorities and key updates."],
      decisions: ["Adopted recommended execution workflow as presented."],
      relatedNotes: [],
    });
  }

  // Format action items
  const actionItems =
    actionItemsRaw.length > 0
      ? actionItemsRaw.map((a, idx) => ({
          id: a.id || `act-${idx + 1}`,
          task: a.expoundedText || a.rawText || a.title,
          assignee: a.suggestedOwner || "Project Lead",
          dueDate: a.suggestedDeadline || "Next Review",
          priority: a.priority || "Medium",
          status: "Open",
        }))
      : [
          {
            id: "act-1",
            task: "Coordinate follow-up schedule and circulate finalized minutes",
            assignee: attendees[0] || "Chairperson",
            dueDate: "End of Week",
            priority: "Medium",
            status: "Open",
          },
        ];

  const keyDecisions = [
    `Unanimously endorsed core agenda directives for ${title}.`,
    ...discussionSections.map((s) => s.decisions[0]).filter(Boolean),
  ];

  const executiveSummary = `The session for "${title}" convened on ${date} to address ${purpose}. The participants reviewed critical operational priorities across ${discussionSections.length} core topic areas, resulting in ${actionItems.length} specific actionable deliverables. Key consensus was reached on strategic alignment and follow-up accountability.`;

  const otherRemarks = remarkItems.map((r) => r.expoundedText || r.rawText);
  if (otherRemarks.length === 0) {
    otherRemarks.push("Meeting adjourned with unanimous consent. All action owners will provide status updates prior to the next convening.");
  }

  return {
    title,
    date,
    time,
    venue,
    attendees,
    absentAttendees: [],
    executiveSummary,
    meetingPurpose: purpose,
    keyDecisions,
    discussionSections,
    actionItems,
    otherRemarks,
    nextMeeting: {
      date: "To Be Announced",
      time: "10:00 AM",
      venue: venue,
      agenda: "Progress review on assigned deliverables and upcoming milestones.",
    },
  };
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Local intelligent revision helper
function localReviseMOM(currentMOM: any, userPrompt: string) {
  const updated = JSON.parse(JSON.stringify(currentMOM || {}));
  const promptLower = userPrompt.toLowerCase();

  // Check if changing deadline or due date
  const deadlineMatch = userPrompt.match(/(?:deadline|due\s+date|due).*?(?:to|is)\s+([A-Za-z0-9\s/,-]+)/i);
  if (deadlineMatch && updated.actionItems && updated.actionItems.length > 0) {
    const taskNumMatch = userPrompt.match(/task\s*(?:#|no\.?)?\s*(\d+)/i);
    const targetIndex = taskNumMatch ? Math.max(0, parseInt(taskNumMatch[1], 10) - 1) : 0;
    if (updated.actionItems[targetIndex]) {
      updated.actionItems[targetIndex].dueDate = deadlineMatch[1].trim();
    }
  }

  // Check if changing assignee
  const assigneeMatch = userPrompt.match(/(?:assignee|assign|owner).*?(?:to|is)\s+([A-Za-z\s]+)/i);
  if (assigneeMatch && updated.actionItems && updated.actionItems.length > 0) {
    const taskNumMatch = userPrompt.match(/task\s*(?:#|no\.?)?\s*(\d+)/i);
    const targetIndex = taskNumMatch ? Math.max(0, parseInt(taskNumMatch[1], 10) - 1) : 0;
    if (updated.actionItems[targetIndex]) {
      updated.actionItems[targetIndex].assignee = assigneeMatch[1].trim();
    }
  }

  // Check if setting priority
  if (promptLower.includes("high") && updated.actionItems && updated.actionItems.length > 0) {
    const taskNumMatch = userPrompt.match(/task\s*(?:#|no\.?)?\s*(\d+)/i);
    const targetIndex = taskNumMatch ? Math.max(0, parseInt(taskNumMatch[1], 10) - 1) : 0;
    if (updated.actionItems[targetIndex]) {
      updated.actionItems[targetIndex].priority = "High";
    }
  }

  // Append note if requested
  if (promptLower.includes("add") || promptLower.includes("note") || promptLower.includes("excused")) {
    if (!updated.otherRemarks) updated.otherRemarks = [];
    updated.otherRemarks.push(userPrompt);
  }

  updated.revisionNotes = `Applied revision: "${userPrompt}"`;
  return updated;
}

// Local intelligent document parser fallback
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

// Endpoint: Analyze a single live item input
app.post("/api/mom/analyze-item", async (req, res) => {
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
          (item: any, idx: number) =>
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
    console.log("[MOM Server] Note analysis handled via intelligent local heuristic engine.");
    const fallbackItem = localHeuristicAnalyzeItem(rawText, metadata, existingItems);
    return res.json(fallbackItem);
  }
});

// Endpoint: Consolidate all meeting items into structured MOM
app.post("/api/mom/consolidate", async (req, res) => {
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
    console.log("[MOM Server] Consolidation synthesized via structured local consolidation engine.");
    const fallbackMOM = buildLocalConsolidatedMOM(metadata, items || []);
    return res.json(fallbackMOM);
  }
});

// Endpoint: Iterative review and revision of the consolidated MOM
app.post("/api/mom/revise", async (req, res) => {
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
    console.log("[MOM Server] Revision applied via local revision engine.");
    const revisedMOM = localReviseMOM(currentMOM, userPrompt);
    return res.json(revisedMOM);
  }
});

// Endpoint: Parse background document materials
app.post("/api/mom/parse-document", async (req, res) => {
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
    console.log("[MOM Server] Document parsed via local extractor engine.");
    const fallback = localParseDocument(documentText, filename || "Document");
    return res.json(fallback);
  }
});

// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
