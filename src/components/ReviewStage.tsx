import React, { useState, useRef } from "react";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  FileCheck,
  ArrowLeft,
  ArrowRight,
  History,
  MessageSquare,
  ListTodo,
  FileText,
  CornerDownRight,
  Check,
} from "lucide-react";
import type { ConsolidatedMOM } from "../types";

interface ReviewStageProps {
  mom: ConsolidatedMOM;
  onUpdateMOM: (updated: ConsolidatedMOM) => void;
  onFinalize: () => void;
  onBackToCapture: () => void;
  keywordFinalize: string;
}

export const ReviewStage: React.FC<ReviewStageProps> = ({
  mom,
  onUpdateMOM,
  onFinalize,
  onBackToCapture,
  keywordFinalize,
}) => {
  const [promptText, setPromptText] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState<string[]>(
    mom.revisionNotes ? [mom.revisionNotes] : []
  );
  const [activeTab, setActiveTab] = useState<
    "summary" | "discussions" | "actions" | "full"
  >("full");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleReviseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = promptText.trim();
    if (!text || isRevising) return;

    // Check if user input is the finalize keyword
    if (text.toUpperCase() === keywordFinalize.toUpperCase().trim()) {
      setPromptText("");
      onFinalize();
      return;
    }

    setIsRevising(true);
    setPromptText("");

    try {
      const response = await fetch("/api/mom/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentMOM: mom,
          userPrompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to revise MOM");
      }

      const updated = await response.json();
      onUpdateMOM(updated);
      if (updated.revisionNotes) {
        setRevisionHistory((prev) => [updated.revisionNotes, ...prev]);
      }
    } catch (err: any) {
      console.error("Revision error:", err);
      alert("Failed to revise MOM with AI: " + err.message);
    } finally {
      setIsRevising(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReviseSubmit();
    }
  };

  const samplePrompts = [
    "Change the deadline for task #1 to next Friday",
    "Add a note that Sarah was excused after the budget review",
    "Make the executive summary more concise and punchy",
    "Set priority of all infrastructure tasks to High",
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Banner with Finalize Signal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold uppercase tracking-wider">
                Consolidated MOM Draft
              </span>
              <span className="text-xs text-slate-500">
                Ready for review & refinement
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Review & Refine Minutes of the Meeting
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Review the synthesized draft below. Prompt the AI to make surgical updates, or type{" "}
              <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                {keywordFinalize}
              </span>{" "}
              when satisfied to choose your export format.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={onBackToCapture}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Capture</span>
            </button>
            <button
              type="button"
              onClick={onFinalize}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Finalize MOM ({keywordFinalize})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Refinement Bar */}
      <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-sm p-4 sm:p-5 sticky top-20 z-20">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            Prompt AI to Update / Amend Items
          </label>
          <span className="text-2xs text-slate-500">
            Keyword to finalize:{" "}
            <strong className="font-mono text-indigo-900 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">
              {keywordFinalize}
            </strong>
          </span>
        </div>

        <form onSubmit={handleReviseSubmit} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                rows={3}
                value={promptText}
                disabled={isRevising}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`e.g., 'Change deadline for task 1 to next Friday', 'Reword the budget discussion point', or type '${keywordFinalize}' to finalize...\n(Shift + Enter for new line)`}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:bg-white transition-all placeholder:text-slate-400 font-normal leading-relaxed resize-y min-h-[80px] max-h-48"
              />
            </div>

            <button
              type="submit"
              disabled={!promptText.trim() || isRevising}
              className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0 self-stretch sm:self-auto sm:min-w-[150px]"
            >
              {isRevising ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Apply Update</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Microcopy & keyboard shortcut hints */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            <span>
              💡 Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Enter</kbd> to apply • <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Shift</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Enter</kbd> for new line
            </span>
            {promptText.length > 0 && (
              <button
                type="button"
                onClick={() => setPromptText("")}
                className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                Clear input
              </button>
            )}
          </div>
        </form>

        {/* Quick prompt suggestions - Smaller font and spaced to avoid misclicks */}
        <div className="mt-3 pt-2.5 border-t border-indigo-100/70 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-0.5 select-none">
            Suggestions:
          </span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPromptText(p)}
              className="text-[10px] text-indigo-900 hover:text-indigo-950 bg-indigo-50/70 hover:bg-indigo-100/90 border border-indigo-200/70 hover:border-indigo-300 px-2 py-0.5 rounded transition-colors cursor-pointer text-left truncate max-w-[220px] sm:max-w-xs select-none"
              title={`Click to populate: "${p}"`}
            >
              {p}
            </button>
          ))}
        </div>

        {revisionHistory.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-2xs text-emerald-800 bg-emerald-50/70 p-2 rounded">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Recent AI Revision: </span>
              <span>{revisionHistory[0]}</span>
            </div>
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("full")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "full"
              ? "bg-blue-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Full Consolidated Document
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "summary"
              ? "bg-blue-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Executive Summary & Decisions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("discussions")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "discussions"
              ? "bg-blue-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Discussion Sections ({mom.discussionSections?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("actions")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "actions"
              ? "bg-blue-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Action Items ({mom.actionItems?.length || 0})
        </button>
      </div>

      {/* Document Presentation Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Document Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8">
          <div className="text-2xs uppercase tracking-widest text-blue-300 font-bold mb-1">
            Official Minutes of the Meeting
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {mom.title}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Date & Time</span>
              <span className="font-semibold text-white">
                {mom.date} | {mom.time}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Venue</span>
              <span className="font-semibold text-white">{mom.venue}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Attendees</span>
              <span className="font-semibold text-white">
                {mom.attendees && mom.attendees.length > 0
                  ? `${mom.attendees.length} Present`
                  : "Unspecified"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Document Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                <Check className="w-3.5 h-3.5" /> Consolidated Draft
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Attendees Details Block */}
          {mom.attendees && mom.attendees.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
              <div className="font-bold text-slate-800 uppercase tracking-wider mb-1">
                Attendees Present:
              </div>
              <div className="text-slate-700">{mom.attendees.join(" • ")}</div>
              {mom.absentAttendees && mom.absentAttendees.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-slate-500">
                  <strong className="text-slate-700">Excused / Absent:</strong>{" "}
                  {mom.absentAttendees.join(" • ")}
                </div>
              )}
            </div>
          )}

          {/* Section 1: Executive Summary */}
          {(activeTab === "full" || activeTab === "summary") && (
            <section className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                Executive Summary & Outcomes
              </h3>
              <div className="bg-blue-50/40 border-l-4 border-blue-900 p-4 rounded-r-lg text-sm leading-relaxed text-slate-800">
                {mom.executiveSummary}
              </div>
            </section>
          )}

          {/* Section 2: Key Decisions & Resolutions */}
          {(activeTab === "full" || activeTab === "summary") && (
            <section className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Key Resolutions & Decisions Reached
              </h3>
              <ul className="space-y-2">
                {(mom.keyDecisions || []).map((decision, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-800 bg-white border border-slate-200 p-3 rounded-lg"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{decision}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Section 3: Detailed Discussions */}
          {(activeTab === "full" || activeTab === "discussions") && (
            <section className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                Discussion Points & Synthesized Topics
              </h3>
              <div className="space-y-4">
                {(mom.discussionSections || []).map((sec, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                  >
                    <h4 className="text-sm font-bold text-slate-900 mb-2">
                      3.{idx + 1} {sec.topic}
                    </h4>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 pl-4 list-disc">
                      {sec.details.map((d, di) => (
                        <li key={di}>{d}</li>
                      ))}
                    </ul>

                    {sec.decisions && sec.decisions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200 flex items-start gap-2 text-xs text-blue-900 bg-blue-50/60 p-2 rounded">
                        <CornerDownRight className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Agreed Decision:</span>{" "}
                          {sec.decisions.join("; ")}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Action Items Matrix */}
          {(activeTab === "full" || activeTab === "actions") && (
            <section className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                Consolidated Action Items & Deliverables
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-2xs">
                      <th className="p-3 font-bold w-10">#</th>
                      <th className="p-3 font-bold">Task Deliverable</th>
                      <th className="p-3 font-bold w-40">Owner</th>
                      <th className="p-3 font-bold w-32">Due Date</th>
                      <th className="p-3 font-bold w-24">Priority</th>
                      <th className="p-3 font-bold w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(mom.actionItems || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          {item.task}
                        </td>
                        <td className="p-3 text-slate-800 font-semibold">
                          {item.assignee || "Unassigned"}
                        </td>
                        <td className="p-3 text-slate-600">{item.dueDate}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-bold ${
                              item.priority === "High"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : item.priority === "Low"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {item.priority || "Medium"}
                          </span>
                        </td>
                        <td className="p-3 text-2xs font-medium text-slate-500">
                          {item.status || "Open"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 5: Other Remarks & Next Meeting */}
          {activeTab === "full" && (
            <section className="space-y-4 pt-4 border-t border-slate-200">
              {mom.otherRemarks && mom.otherRemarks.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Other Remarks & Administrative Notes
                  </h4>
                  <ul className="space-y-1 text-xs sm:text-sm text-slate-700 pl-4 list-disc">
                    {mom.otherRemarks.map((r, ri) => (
                      <li key={ri}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-slate-800">Next Scheduled Meeting:</strong>{" "}
                  {mom.nextMeeting?.date
                    ? `${mom.nextMeeting.date} ${mom.nextMeeting.time || ""} (${
                        mom.nextMeeting.venue || "TBD"
                      })`
                    : "To be announced via calendar invitation"}
                </div>
                <span className="text-2xs text-slate-400">
                  Adjourned official record
                </span>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Bottom Finalize Callout */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Satisfied with the Minutes of the Meeting?
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Trigger the final export dialog by entering the keyword{" "}
            <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              {keywordFinalize}
            </span>{" "}
            or clicking the button.
          </p>
        </div>

        <button
          type="button"
          onClick={onFinalize}
          className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Finalize MOM & Choose Output</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
