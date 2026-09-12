import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Mail,
  MessageSquare,
  FileText,
  ExternalLink,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Share2,
} from "lucide-react";
import type { ConsolidatedMOM, OutputTypeSelection } from "../types";
import { exportMOMToWord } from "../utils/docxExport";
import { generateEmailFormat, generateChatFormat } from "../utils/formatters";

interface ExportStageProps {
  mom: ConsolidatedMOM;
  onBackToReview: () => void;
  onResetMeeting: () => void;
}

export const ExportStage: React.FC<ExportStageProps> = ({
  mom,
  onBackToReview,
  onResetMeeting,
}) => {
  const [selectedOutputs, setSelectedOutputs] = useState<OutputTypeSelection>({
    wordDoc: true,
    email: true,
    chat: true,
  });

  const [activeTab, setActiveTab] = useState<"word" | "email" | "chat">("word");
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedEmailText, setCopiedEmailText] = useState(false);
  const [copiedEmailHtml, setCopiedEmailHtml] = useState(false);
  const [copiedChat, setCopiedChat] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);

  const emailData = generateEmailFormat(mom);
  const chatData = generateChatFormat(mom);

  const handleToggleOutput = (key: keyof OutputTypeSelection) => {
    setSelectedOutputs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDownloadWord = async () => {
    setIsDownloadingWord(true);
    try {
      await exportMOMToWord(mom);
    } catch (err) {
      console.error("Failed to export Word doc:", err);
      alert("Failed to export Word document: " + String(err));
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  const copyHtmlToClipboard = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([emailData.html], { type: "text/html" });
        const blobText = new Blob([emailData.plainText], { type: "text/plain" });
        const item = new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        });
        await navigator.clipboard.write([item]);
        setCopiedEmailHtml(true);
        setTimeout(() => setCopiedEmailHtml(false), 2500);
      } else {
        copyToClipboard(emailData.plainText, setCopiedEmailText);
      }
    } catch (err) {
      console.error("Rich HTML copy fallback:", err);
      copyToClipboard(emailData.plainText, setCopiedEmailText);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Check className="w-3 h-3 text-emerald-600" />
              Finalized MOM Ready
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Select Output Format of the MOM
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Choose which format(s) of the Minutes of the Meeting you need for distribution.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onBackToReview}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Review</span>
            </button>
            <button
              id="btn-export-new-meeting"
              type="button"
              onClick={onResetMeeting}
              className="px-3 py-2 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Meeting</span>
            </button>
          </div>
        </div>

        {/* Output Checkboxes Selection Card */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-3">
            Output Types (Check all that apply):
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Checkbox 1: MS Word */}
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedOutputs.wordDoc
                  ? "border-blue-900 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedOutputs.wordDoc}
                onChange={() => handleToggleOutput("wordDoc")}
                className="mt-1 w-4 h-4 rounded text-blue-900 focus:ring-blue-800 border-slate-300"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                  <FileText className="w-4 h-4 text-blue-700" />
                  Detailed MS Word (.docx)
                </div>
                <p className="text-2xs text-slate-500 mt-1">
                  Comprehensive official record with full discussion logs, tables, letterhead, and sign-offs.
                </p>
              </div>
            </label>

            {/* Checkbox 2: Email */}
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedOutputs.email
                  ? "border-blue-900 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedOutputs.email}
                onChange={() => handleToggleOutput("email")}
                className="mt-1 w-4 h-4 rounded text-blue-900 focus:ring-blue-800 border-slate-300"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  Executive Email (Concise)
                </div>
                <p className="text-2xs text-slate-500 mt-1">
                  Compact & executive for inboxes: crisp summary, key decisions, deliverables table, and highlights.
                </p>
              </div>
            </label>

            {/* Checkbox 3: MS Teams / Google Chat */}
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedOutputs.chat
                  ? "border-blue-900 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedOutputs.chat}
                onChange={() => handleToggleOutput("chat")}
                className="mt-1 w-4 h-4 rounded text-blue-900 focus:ring-blue-800 border-slate-300"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                  <MessageSquare className="w-4 h-4 text-indigo-700" />
                  Teams / Chat (Ultra-Compact)
                </div>
                <p className="text-2xs text-slate-500 mt-1">
                  Fast executive digest with TL;DR, @mentions, and one-line actions for quick reading.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Output Views Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {selectedOutputs.wordDoc && (
          <button
            type="button"
            onClick={() => setActiveTab("word")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "word"
                ? "bg-blue-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Detailed MS Word</span>
          </button>
        )}

        {selectedOutputs.email && (
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "email"
                ? "bg-blue-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Executive Email (Concise)</span>
          </button>
        )}

        {selectedOutputs.chat && (
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "chat"
                ? "bg-blue-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Teams / Chat (Ultra-Compact)</span>
          </button>
        )}
      </div>

      {/* View 1: MS Word Export */}
      {activeTab === "word" && selectedOutputs.wordDoc && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-800" />
                Microsoft Word (.docx) Format
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates a clean, editable .docx file fully compatible with Word, Google Docs, and LibreOffice.
              </p>
            </div>

            <button
              type="button"
              disabled={isDownloadingWord}
              onClick={handleDownloadWord}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              {isDownloadingWord ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Word Doc...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download .docx File</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 text-xs text-slate-700 space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-2xs">
              Document Specifications Included:
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Formal Corporate Meeting Header & Status</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Metadata Matrix (Time, Date, Venue, Purpose)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Executive Summary & Key Decisions List</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Detailed Topical Discussion Breakdown</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Action Items Table (Task, Owner, Due Date, Priority)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Administrative Remarks & Next Session Schedule</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* View 2: Email Version */}
      {activeTab === "email" && selectedOutputs.email && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-700" />
                Executive Email (Concise & Compact)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Executive-level summary: key decisions, structured action items table, and topical outcomes for leadership inboxes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyHtmlToClipboard}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEmailHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Rich Email!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Rich HTML (Outlook/Gmail)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(emailData.plainText, setCopiedEmailText)
                }
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEmailText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Plain Text!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Plain Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Subject Line Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="truncate mr-2">
              <span className="font-bold text-slate-500 mr-2">SUBJECT:</span>
              <span className="font-medium text-slate-900">
                {emailData.subject}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(emailData.subject, setCopiedSubject)}
              className="text-xs text-blue-800 hover:text-blue-900 font-semibold shrink-0 cursor-pointer"
            >
              {copiedSubject ? "Copied!" : "Copy Subject"}
            </button>
          </div>

          {/* Rendered Email Preview */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: emailData.html }} />
          </div>
        </div>
      )}

      {/* View 3: MS Teams / Google Chat */}
      {activeTab === "chat" && selectedOutputs.chat && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-700" />
                MS Teams & Google Chat (Ultra-Compact Digest)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ultra-condensed snapshot with TL;DR, @mentions, bulleted decisions, and one-line action items for instant chat skimming.
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(chatData, setCopiedChat)}
              className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              {copiedChat ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Chat Format!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy for Teams / Google Chat</span>
                </>
              )}
            </button>
          </div>

          {/* Chat Preview */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-xs leading-relaxed max-h-[480px] overflow-y-auto whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
            {chatData}
          </div>
        </div>
      )}
    </div>
  );
};
