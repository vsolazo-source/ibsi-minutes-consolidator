import type { ConsolidatedMOM } from "../types";

/**
 * Generates an executive, compact, and concise Email format of the MOM.
 * Designed for fast executive scanning with high signal-to-noise ratio.
 */
export function generateEmailFormat(mom: ConsolidatedMOM): {
  subject: string;
  plainText: string;
  html: string;
} {
  const subject = `[Executive MOM] ${mom.title} - ${mom.date || "Summary"}`;

  const attendeesStr =
    mom.attendees && mom.attendees.length > 0
      ? mom.attendees.join(", ")
      : "Attendees of record";

  const keyDecisionsList = (mom.keyDecisions || []).filter(Boolean);
  const actionItemsList = (mom.actionItems || []).filter(Boolean);
  const discussionList = (mom.discussionSections || []).filter(Boolean);

  // Plain Text Executive Email
  let plainText = `SUBJECT: ${subject}

EXECUTIVE SUMMARY
${mom.executiveSummary}

--------------------------------------------------
MEETING OVERVIEW
--------------------------------------------------
• Meeting: ${mom.title}
• Date & Time: ${mom.date} | ${mom.time}
• Attendees: ${attendeesStr}
${mom.venue ? `• Location: ${mom.venue}\n` : ""}${
    mom.meetingPurpose ? `• Purpose: ${mom.meetingPurpose}\n` : ""
  }
--------------------------------------------------
KEY DECISIONS
--------------------------------------------------
${
  keyDecisionsList.length > 0
    ? keyDecisionsList.map((d, i) => `${i + 1}. ${d}`).join("\n")
    : "• All proposed items discussed per agenda; no binding resolutions."
}

--------------------------------------------------
ACTION ITEMS
--------------------------------------------------
${
  actionItemsList.length > 0
    ? actionItemsList
        .map((item, idx) => {
          const prio = item.priority ? `[${item.priority.toUpperCase()}] ` : "";
          return `${idx + 1}. ${prio}${item.task}\n   → Owner: ${
            item.assignee || "Unassigned"
          } | Due: ${item.dueDate || "TBD"}`;
        })
        .join("\n\n")
    : "• No pending action items."
}

--------------------------------------------------
TOPICAL HIGHLIGHTS & OUTCOMES
--------------------------------------------------
${
  discussionList.length > 0
    ? discussionList
        .map((sec) => {
          const outcome =
            sec.decisions && sec.decisions.length > 0
              ? ` [Outcome: ${sec.decisions.join("; ")}]`
              : "";
          const briefDetail =
            sec.details.length > 0 ? ` - ${sec.details.slice(0, 2).join("; ")}` : "";
          return `• ${sec.topic.toUpperCase()}${outcome}${briefDetail}`;
        })
        .join("\n")
    : "• Standard agenda items reviewed."
}

--------------------------------------------------
NEXT STEPS
--------------------------------------------------
• Next Meeting: ${
    mom.nextMeeting?.date
      ? `${mom.nextMeeting.date} ${mom.nextMeeting.time || ""} (${
          mom.nextMeeting.venue || "TBD"
        })`
      : "To be confirmed via calendar invitation"
  }
• Comprehensive Minutes: Detailed MS Word archive available on request.
`;

  // Rich HTML Executive Email (Optimized for Outlook, Gmail, Apple Mail)
  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
  <!-- Executive Header Banner -->
  <div style="background: #0f172a; color: #ffffff; padding: 18px 24px; border-bottom: 3px solid #2563eb;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">Executive Minutes of Meeting</div>
    <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc; line-height: 1.3;">${mom.title}</h1>
    <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">
      <span>📅 ${mom.date}</span> &nbsp;|&nbsp; <span>⏰ ${mom.time}</span> &nbsp;|&nbsp; <span>📍 ${mom.venue}</span>
    </div>
  </div>

  <div style="padding: 20px 24px;">
    <!-- Compact Meeting Context -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; color: #475569;">
      <div><strong style="color: #1e293b;">Attendees:</strong> ${attendeesStr}</div>
      ${
        mom.meetingPurpose
          ? `<div style="margin-top: 4px;"><strong style="color: #1e293b;">Purpose:</strong> ${mom.meetingPurpose}</div>`
          : ""
      }
    </div>

    <!-- Executive Summary Card -->
    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 18px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.5px; margin-bottom: 4px;">Executive Summary</div>
      <div style="font-size: 13px; color: #1e3a8a; line-height: 1.5;">${mom.executiveSummary}</div>
    </div>

    <!-- Key Decisions -->
    ${
      keyDecisionsList.length > 0
        ? `
    <div style="margin-bottom: 18px;">
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
        🎯 Key Decisions & Outcomes
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #1e293b;">
        ${keyDecisionsList
          .map(
            (d) =>
              `<li style="margin-bottom: 5px;"><strong>${d}</strong></li>`
          )
          .join("")}
      </ul>
    </div>`
        : ""
    }

    <!-- Compact Action Items Table -->
    <div style="margin-bottom: 18px;">
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
        ⚡ Core Action Items
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; color: #475569; font-weight: 600;">
            <th style="padding: 7px 10px; border-bottom: 1px solid #cbd5e1; width: 52%;">Action / Deliverable</th>
            <th style="padding: 7px 10px; border-bottom: 1px solid #cbd5e1; width: 24%;">Owner</th>
            <th style="padding: 7px 10px; border-bottom: 1px solid #cbd5e1; width: 24%;">Due Date</th>
          </tr>
        </thead>
        <tbody>
          ${
            actionItemsList.length > 0
              ? actionItemsList
                  .map((item) => {
                    const isHigh = item.priority === "High";
                    return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 7px 10px; color: #0f172a;">
                ${isHigh ? `<span style="display: inline-block; background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; margin-right: 4px;">HIGH</span>` : ""}
                ${item.task}
              </td>
              <td style="padding: 7px 10px; font-weight: 600; color: #1e293b;">${item.assignee || "Unassigned"}</td>
              <td style="padding: 7px 10px; color: #475569;">${item.dueDate || "TBD"}</td>
            </tr>`;
                  })
                  .join("")
              : `<tr><td colspan="3" style="padding: 8px 10px; color: #64748b;">No open action items.</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <!-- Condensed Discussion Highlights -->
    ${
      discussionList.length > 0
        ? `
    <div style="margin-bottom: 18px;">
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
        📌 Discussion Highlights
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.5;">
        ${discussionList
          .map((sec) => {
            const outcomeText =
              sec.decisions && sec.decisions.length > 0
                ? `<span style="color: #0284c7; font-weight: 600;"> → ${sec.decisions.join("; ")}</span>`
                : "";
            const samplePoint =
              sec.details.length > 0
                ? `<span style="color: #64748b;"> (${sec.details[0]})</span>`
                : "";
            return `<div style="margin-bottom: 5px;">• <strong style="color: #0f172a;">${sec.topic}:</strong>${outcomeText}${samplePoint}</div>`;
          })
          .join("")}
      </div>
    </div>`
        : ""
    }

    <!-- Compact Footer & Next Steps -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; margin-top: 14px; padding: 10px 14px; border-radius: 6px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
      <div><strong>Next Session:</strong> ${
        mom.nextMeeting?.date
          ? `${mom.nextMeeting.date} ${mom.nextMeeting.time || ""} (${
              mom.nextMeeting.venue || "TBD"
            })`
          : "To be scheduled"
      }</div>
      <div style="text-align: right; color: #94a3b8;">Detailed .docx record archived</div>
    </div>
  </div>
</div>
`;

  return { subject, plainText, html };
}

/**
 * Generates an ultra-compact, concise, and executive MS Teams / Google Chat format.
 * Even more streamlined than the Email version: optimized for chat channels,
 * instant mobile scanning, zero fluff, and prominent @mentions.
 */
export function generateChatFormat(mom: ConsolidatedMOM): string {
  const attendeesTags =
    mom.attendees && mom.attendees.length > 0
      ? mom.attendees.map((a) => `@${a.trim().replace(/\s+/g, "_")}`).join(" ")
      : "";

  const keyDecisionsList = (mom.keyDecisions || []).filter(Boolean);
  const actionItemsList = (mom.actionItems || []).filter(Boolean);
  const discussionList = (mom.discussionSections || []).filter(Boolean);

  // Ultra-compact executive digest
  let chat = `⚡ **EXECUTIVE MOM DIGEST: ${mom.title.toUpperCase()}**
📅 ${mom.date} | ⏰ ${mom.time}${mom.venue ? ` | 📍 ${mom.venue}` : ""}
${attendeesTags ? `👥 ${attendeesTags}\n` : ""}
💡 **TL;DR:** ${mom.executiveSummary}
`;

  // Key Decisions - Compact bullet list
  if (keyDecisionsList.length > 0) {
    chat += `
🎯 **KEY DECISIONS:**
${keyDecisionsList.map((d) => `• ✅ **${d}**`).join("\n")}
`;
  }

  // Action Items - Ultra-compact 1-line format per item with mentions
  if (actionItemsList.length > 0) {
    chat += `
⚡ **ACTION ITEMS:**
${actionItemsList
  .map((item) => {
    const prioTag =
      item.priority === "High"
        ? "🔴 [HIGH]"
        : item.priority === "Low"
        ? "🟢 [LOW]"
        : "🟡 [MED]";
    const owner = item.assignee
      ? `@${item.assignee.trim().replace(/\s+/g, "_")}`
      : "_Unassigned_";
    const due = item.dueDate ? ` | 📅 \`${item.dueDate}\`` : "";
    return `• ${prioTag} **${item.task}** → ${owner}${due}`;
  })
  .join("\n")}
`;
  } else {
    chat += `
⚡ **ACTION ITEMS:** None assigned
`;
  }

  // Topical Highlights - 1 crisp line per topic
  if (discussionList.length > 0) {
    chat += `
📌 **HIGHLIGHTS:**
${discussionList
  .map((sec) => {
    const outcome =
      sec.decisions && sec.decisions.length > 0
        ? ` → **${sec.decisions.join("; ")}**`
        : sec.details.length > 0
        ? ` — ${sec.details[0]}`
        : "";
    return `• **${sec.topic}:**${outcome}`;
  })
  .join("\n")}
`;
  }

  // Next Session
  if (mom.nextMeeting?.date) {
    chat += `
🗓️ **NEXT SESSION:** ${mom.nextMeeting.date} ${
      mom.nextMeeting.time || ""
    } (${mom.nextMeeting.venue || "TBD"})
`;
  }

  chat += `_Full detailed record recorded in official MS Word .docx._`;

  return chat;
}

