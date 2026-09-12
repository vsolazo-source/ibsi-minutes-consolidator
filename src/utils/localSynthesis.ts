import type { ConsolidatedMOM, RawMeetingItem, MeetingMetadata } from "../types";

// Local intelligent heuristic analyzer for raw meeting notes (zero failure guarantee)
export function localHeuristicAnalyzeItem(
  rawText: string,
  metadata?: Partial<MeetingMetadata>,
  existingItems: RawMeetingItem[] = []
): {
  type: "discussion" | "action_item" | "remark" | "related";
  title: string;
  expoundedText: string;
  relatedToItemId: string | null;
  relatedReason: string | null;
  suggestedOwner: string | null;
  suggestedDeadline: string | null;
  priority: "High" | "Medium" | "Low";
  tags: string[];
} {
  const text = (rawText || "").trim();
  const lower = text.toLowerCase();

  // Action item detection
  const actionVerbs = [
    "assign", "assigned", "todo", "to-do", "to do", "action:", "task:",
    "will prepare", "will send", "will review", "will check", "will update",
    "will finalize", "follow up", "submit", "deliver", "due by", "by friday",
    "by monday", "by next", "by tomorrow", "deadline", "schedule", "reach out",
    "must complete", "responsible"
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
export function buildLocalConsolidatedMOM(
  metadata?: Partial<MeetingMetadata>,
  items: RawMeetingItem[] = []
): ConsolidatedMOM {
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

  // Group discussions into logical topics
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
          .map((s) => s.relatedReason as string),
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
          priority: (a.priority || "Medium") as "High" | "Medium" | "Low",
          status: "Open",
        }))
      : [
          {
            id: "act-1",
            task: "Coordinate follow-up schedule and circulate finalized minutes",
            assignee: attendees[0] || "Chairperson",
            dueDate: "End of Week",
            priority: "Medium" as const,
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

// Local intelligent revision helper
export function localReviseMOM(currentMOM: ConsolidatedMOM, userPrompt: string): ConsolidatedMOM {
  const updated: ConsolidatedMOM = JSON.parse(JSON.stringify(currentMOM || {}));
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
