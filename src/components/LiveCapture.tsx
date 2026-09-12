import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Tag,
  Link as LinkIcon,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  Info,
  Mic,
  MicOff,
  CornerDownRight,
  ArrowRight,
  Layers,
} from "lucide-react";
import type {
  MeetingMetadata,
  RawMeetingItem,
  ItemType,
} from "../types";

interface LiveCaptureProps {
  metadata: MeetingMetadata;
  items: RawMeetingItem[];
  onAddItem: (item: RawMeetingItem) => void;
  onUpdateItem: (id: string, updated: Partial<RawMeetingItem>) => void;
  onDeleteItem: (id: string) => void;
  onConsolidate: () => void;
  isConsolidating: boolean;
  keywordFinish: string;
}

export const LiveCapture: React.FC<LiveCaptureProps> = ({
  metadata,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onConsolidate,
  isConsolidating,
  keywordFinish,
}) => {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExpoundedText, setEditExpoundedText] = useState("");
  const [showMetadataDetails, setShowMetadataDetails] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition error", err);
      }
    }
  };

  const handleProcessInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isAnalyzing || isConsolidating) return;

    // Check if the user entered the finish keyword
    if (text.toUpperCase() === keywordFinish.toUpperCase().trim()) {
      setInputText("");
      onConsolidate();
      return;
    }

    setIsAnalyzing(true);
    setInputText("");

    try {
      const response = await fetch("/api/mom/analyze-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: text,
          metadata,
          existingItems: items,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze input note");
      }

      const analyzed = await response.json();

      const newItem: RawMeetingItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        rawText: text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: analyzed.type,
        title: analyzed.title || "Meeting Item",
        expoundedText: analyzed.expoundedText || text,
        relatedToItemId: analyzed.relatedToItemId || null,
        relatedReason: analyzed.relatedReason || null,
        suggestedOwner: analyzed.suggestedOwner || null,
        suggestedDeadline: analyzed.suggestedDeadline || null,
        priority: analyzed.priority || "Medium",
        tags: analyzed.tags || [],
      };

      onAddItem(newItem);
    } catch (err: any) {
      console.error("Error analyzing note:", err);
      // Fallback manual item
      const fallbackItem: RawMeetingItem = {
        id: `item-${Date.now()}`,
        rawText: text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "discussion",
        title: "Meeting Note",
        expoundedText: text,
      };
      onAddItem(fallbackItem);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleProcessInput();
    }
  };

  const handleStartEdit = (item: RawMeetingItem) => {
    setEditingId(item.id);
    setEditExpoundedText(item.expoundedText);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateItem(id, { expoundedText: editExpoundedText });
    setEditingId(null);
  };

  const quickExamples = [
    "Agreed to approve $45k budget for cloud infrastructure",
    "Marcus will finalize the security vendor contract by Friday",
    "Samantha highlighted mobile latency under 50ms (relates to performance)",
    "Next sprint demo is set for Oct 12 at 10 AM",
  ];

  const getTypeBadge = (type: ItemType) => {
    switch (type) {
      case "discussion":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <MessageSquare className="w-3 h-3" /> Discussion Point
          </span>
        );
      case "action_item":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sparkles className="w-3 h-3" /> Action Item
          </span>
        );
      case "related":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <LinkIcon className="w-3 h-3" /> Related Discussion
          </span>
        );
      case "remark":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3 h-3" /> Other Remark
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Meeting Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {metadata.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {metadata.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {metadata.time}
              </span>
              <span>📍 {metadata.venue}</span>
              {metadata.attendees && metadata.attendees.length > 0 && (
                <span>👥 {metadata.attendees.length} Attendees</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMetadataDetails(!showMetadataDetails)}
            className="text-xs text-blue-800 font-medium hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            {showMetadataDetails ? "Hide Details" : "View Context & Agenda"}
            {showMetadataDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showMetadataDetails && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700 space-y-2 bg-slate-50 p-3 rounded-lg">
            {metadata.purpose && (
              <div>
                <strong className="text-slate-900">Purpose / Objective:</strong>{" "}
                {metadata.purpose}
              </div>
            )}
            {metadata.attendees && metadata.attendees.length > 0 && (
              <div>
                <strong className="text-slate-900">Attendees:</strong>{" "}
                {metadata.attendees.join(", ")}
              </div>
            )}
            {metadata.uploadedMaterialsFilename && (
              <div>
                <strong className="text-slate-900">Attached Material:</strong>{" "}
                {metadata.uploadedMaterialsFilename}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Input Component */}
      <div className="bg-white rounded-xl border-2 border-blue-900/20 shadow-md p-4 sm:p-6 sticky top-20 z-20">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            Live Meeting Note Ingestion
          </label>
          <div className="text-xs text-slate-500">
            Consolidation Keyword:{" "}
            <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
              {keywordFinish}
            </span>
          </div>
        </div>

        <form onSubmit={handleProcessInput} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                rows={3}
                value={inputText}
                disabled={isAnalyzing || isConsolidating}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Enter discussion point, action item with owner and deadline, key decision, or type '${keywordFinish}' to consolidate...\n(Shift + Enter for new line)`}
                className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all placeholder:text-slate-400 font-normal leading-relaxed resize-y min-h-[82px] max-h-48"
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`absolute right-2.5 top-2.5 p-1.5 rounded-full transition-colors ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                  }`}
                  title={isListening ? "Stop listening" : "Dictate with voice"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isAnalyzing || isConsolidating}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0 self-stretch sm:self-auto sm:min-w-[150px]"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze & Add</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Microcopy & keyboard shortcut hints */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            <span>
              💡 Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Enter</kbd> to add • <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Shift</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Enter</kbd> for new line
            </span>
            {inputText.length > 0 && (
              <button
                type="button"
                onClick={() => setInputText("")}
                className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                Clear input
              </button>
            )}
          </div>
        </form>

        {/* Quick Example Pills - Smaller font and spaced to avoid misclicks */}
        <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-0.5 select-none">
            Quick test inputs:
          </span>
          {quickExamples.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputText(ex)}
              className="text-[10px] text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 hover:border-slate-300 px-2 py-0.5 rounded transition-colors cursor-pointer text-left truncate max-w-[220px] sm:max-w-xs select-none"
              title={`Click to populate: "${ex}"`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Captured Notes Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Captured & Classified Notes ({items.length})
            </h3>
          </div>
          {items.length > 0 && (
            <span className="text-xs text-slate-500">
              AI automatically synthesized and indexed each point
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              No meeting points captured yet.
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Start by typing remarks, debate items, or action deliverables above.
              The AI will parse, categorize, and expand each statement in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const isEditing = editingId === item.id;
              const relatedParent = item.relatedToItemId
                ? items.find((p) => p.id === item.relatedToItemId)
                : null;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-4 relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{index + 1}
                      </span>
                      {getTypeBadge(item.type)}
                      <span className="text-sm font-bold text-slate-900">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-2xs text-slate-400 font-mono">
                        {item.timestamp}
                      </span>
                      <select
                        value={item.type}
                        onChange={(e) =>
                          onUpdateItem(item.id, {
                            type: e.target.value as ItemType,
                          })
                        }
                        className="text-2xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
                      >
                        <option value="discussion">Discussion</option>
                        <option value="action_item">Action Item</option>
                        <option value="remark">Other Remark</option>
                        <option value="related">Related</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="text-slate-400 hover:text-blue-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit expounded text"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expounded Content */}
                  <div className="text-sm text-slate-800 mb-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={editExpoundedText}
                          onChange={(e) => setEditExpoundedText(e.target.value)}
                          className="w-full p-2 text-sm border border-blue-500 rounded-lg focus:outline-none bg-blue-50/20"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-2.5 py-1 text-xs text-white bg-blue-900 rounded font-medium"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="leading-relaxed">{item.expoundedText}</p>
                    )}
                  </div>

                  {/* Raw note footnote */}
                  <div className="text-2xs text-slate-400 italic mb-2">
                    Input: &ldquo;{item.rawText}&rdquo;
                  </div>

                  {/* Context chips: Related parent or Action details */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {item.relatedToItemId && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded text-2xs font-medium">
                        <CornerDownRight className="w-3 h-3 text-purple-600" />
                        <span>
                          Relates to:{" "}
                          <strong>
                            {relatedParent ? relatedParent.title : item.relatedToItemId}
                          </strong>
                          {item.relatedReason ? ` (${item.relatedReason})` : ""}
                        </span>
                      </div>
                    )}

                    {item.type === "action_item" && (
                      <>
                        {item.suggestedOwner && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-2xs font-semibold">
                            <User className="w-3 h-3 text-amber-600" />
                            Owner: {item.suggestedOwner}
                          </span>
                        )}
                        {item.suggestedDeadline && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-2xs">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Due: {item.suggestedDeadline}
                          </span>
                        )}
                        {item.priority && (
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-bold ${
                              item.priority === "High"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : item.priority === "Low"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            Priority: {item.priority}
                          </span>
                        )}
                      </>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {item.tags.map((tg, ti) => (
                          <span
                            key={ti}
                            className="text-2xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                          >
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consolidation Action Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-white/20 text-white rounded text-xs font-mono font-bold tracking-wider uppercase">
              Signal Keyword: {keywordFinish}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold mt-1 text-white">
            Ready to consolidate Minutes of the Meeting?
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
            Type <span className="font-mono font-bold bg-white/10 px-1 py-0.5 rounded">{keywordFinish}</span> in the note bar above or click the button to synthesize all items.
          </p>
        </div>

        <button
          type="button"
          disabled={items.length === 0 || isConsolidating}
          onClick={onConsolidate}
          className="px-6 py-3 bg-white hover:bg-blue-50 text-blue-950 text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isConsolidating ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-950 border-t-transparent rounded-full animate-spin" />
              <span>Consolidating MOM with Gemini...</span>
            </>
          ) : (
            <>
              <span>Consolidate Minutes ({keywordFinish})</span>
              <ArrowRight className="w-4 h-4 text-blue-950" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
