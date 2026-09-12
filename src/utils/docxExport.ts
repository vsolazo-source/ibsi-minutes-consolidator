import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from "docx";
import type { ConsolidatedMOM } from "../types";

export async function exportMOMToWord(mom: ConsolidatedMOM): Promise<void> {
  const brandPrimary = "1E3A8A"; // Deep Navy
  const brandSecondary = "0284C7"; // Ocean Blue
  const tableHeaderBg = "F1F5F9"; // Light Slate
  const tableBorderColor = "CBD5E1";

  const standardBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
    left: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
    right: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
  };

  const sections: Paragraph[] = [];

  // Title Header
  sections.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: mom.title || "MINUTES OF THE MEETING",
          bold: true,
          size: 36,
          color: brandPrimary,
          font: "Calibri",
        }),
      ],
    })
  );

  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "OFFICIAL CONSOLIDATED RECORD",
          bold: true,
          size: 20,
          color: brandSecondary,
          font: "Calibri",
        }),
      ],
    })
  );

  // Metadata Table
  const metadataRows = [
    [
      "Date & Time",
      `${mom.date || "N/A"} | ${mom.time || "N/A"}`,
      "Venue / Medium",
      mom.venue || "N/A",
    ],
    [
      "Meeting Objective",
      mom.meetingPurpose || "General Agenda & Strategy Alignment",
      "Status",
      "Consolidated & Approved",
    ],
    [
      "Attendees Present",
      mom.attendees && mom.attendees.length > 0
        ? mom.attendees.join("; ")
        : "Unrecorded",
      "Excused / Absent",
      mom.absentAttendees && mom.absentAttendees.length > 0
        ? mom.absentAttendees.join("; ")
        : "None",
    ],
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metadataRows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
              borders: standardBorder,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[0],
                      bold: true,
                      size: 20,
                      color: "334155",
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: standardBorder,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[1],
                      size: 20,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
              borders: standardBorder,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[2],
                      bold: true,
                      size: 20,
                      color: "334155",
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: standardBorder,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[3],
                      size: 20,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
    ),
  });

  // Executive Summary
  const execSummaryHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({
        text: "1. Executive Summary",
        bold: true,
        size: 26,
        color: brandPrimary,
        font: "Calibri",
      }),
    ],
  });

  const execSummaryPara = new Paragraph({
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: mom.executiveSummary || "No summary provided.",
        size: 22,
        font: "Calibri",
      }),
    ],
  });

  // Key Decisions
  const decisionsHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: "2. Key Resolutions & Decisions",
        bold: true,
        size: 26,
        color: brandPrimary,
        font: "Calibri",
      }),
    ],
  });

  const decisionsParas = (
    mom.keyDecisions && mom.keyDecisions.length > 0
      ? mom.keyDecisions
      : ["No major resolutions logged."]
  ).map(
    (dec) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: dec,
            size: 22,
            font: "Calibri",
          }),
        ],
      })
  );

  // Discussion Points
  const discussionHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: "3. Detailed Discussion & Deliberations",
        bold: true,
        size: 26,
        color: brandPrimary,
        font: "Calibri",
      }),
    ],
  });

  const discussionContent: Paragraph[] = [];
  (mom.discussionSections || []).forEach((sec, idx) => {
    discussionContent.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: `3.${idx + 1} ${sec.topic}`,
            bold: true,
            size: 23,
            color: "1E293B",
            font: "Calibri",
          }),
        ],
      })
    );

    (sec.details || []).forEach((det) => {
      discussionContent.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: det,
              size: 21,
              font: "Calibri",
            }),
          ],
        })
      );
    });

    if (sec.decisions && sec.decisions.length > 0) {
      sec.decisions.forEach((d) => {
        discussionContent.push(
          new Paragraph({
            bullet: { level: 1 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Outcome / Agreement: ",
                bold: true,
                color: "0369A1",
                font: "Calibri",
                size: 20,
              }),
              new TextRun({
                text: d,
                font: "Calibri",
                size: 20,
              }),
            ],
          })
        );
      });
    }
  });

  // Action Items
  const actionHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text: "4. Action Items & Deliverables Matrix",
        bold: true,
        size: 26,
        color: brandPrimary,
        font: "Calibri",
      }),
    ],
  });

  const actionTableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
          borders: standardBorder,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "#",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 48, type: WidthType.PERCENTAGE },
          shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
          borders: standardBorder,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Action Item / Task Deliverable",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
          borders: standardBorder,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Owner / Assignee",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
          borders: standardBorder,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Due Date",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: tableHeaderBg, type: ShadingType.CLEAR },
          borders: standardBorder,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Priority",
                  bold: true,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  (mom.actionItems || []).forEach((item, i) => {
    actionTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            borders: standardBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${i + 1}`,
                    size: 20,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: standardBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.task,
                    size: 20,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: standardBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.assignee || "Unassigned",
                    bold: true,
                    size: 20,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            borders: standardBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.dueDate || "TBD",
                    size: 20,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            borders: standardBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.priority || "Medium",
                    color:
                      item.priority === "High"
                        ? "B91C1C"
                        : item.priority === "Low"
                        ? "15803D"
                        : "B45309",
                    size: 20,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  const actionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: actionTableRows,
  });

  // Other Remarks
  const remarksHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text: "5. Other Remarks & Administrative Notes",
        bold: true,
        size: 26,
        color: brandPrimary,
        font: "Calibri",
      }),
    ],
  });

  const remarksParas = (
    mom.otherRemarks && mom.otherRemarks.length > 0
      ? mom.otherRemarks
      : ["No additional remarks recorded."]
  ).map(
    (rem) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: rem,
            size: 21,
            font: "Calibri",
          }),
        ],
      })
  );

  // Sign-off / Next Meeting
  const signoffHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text: "6. Adjournment & Sign-Off",
        bold: true,
        size: 26,
        color: brandPrimary,
        font: "Calibri",
      }),
    ],
  });

  const nextMeetingPara = new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: `Next Scheduled Meeting: ${
          mom.nextMeeting?.date
            ? `${mom.nextMeeting.date} ${mom.nextMeeting.time || ""} (${
                mom.nextMeeting.venue || "TBD"
              })`
            : "To be determined and announced via email calendar invitation."
        }`,
        italics: true,
        size: 21,
        font: "Calibri",
      }),
    ],
  });

  // Document Assembly
  const doc = new Document({
    sections: [
      {
        children: [
          ...sections,
          metaTable,
          execSummaryHeading,
          execSummaryPara,
          decisionsHeading,
          ...decisionsParas,
          discussionHeading,
          ...discussionContent,
          actionHeading,
          actionTable,
          remarksHeading,
          ...remarksParas,
          signoffHeading,
          nextMeetingPara,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanTitle = (mom.title || "Meeting_Minutes")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 30);
  a.href = url;
  a.download = `${cleanTitle}_MOM_${mom.date || "Record"}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
