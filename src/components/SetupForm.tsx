import React, { useState, useRef } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileUp,
  ArrowRight,
  Plus,
  X,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import type { MeetingMetadata } from "../types";

interface SetupFormProps {
  initialData: MeetingMetadata;
  onSubmit: (data: MeetingMetadata) => void;
  keywordFinish: string;
}

export const SetupForm: React.FC<SetupFormProps> = ({
  initialData,
  onSubmit,
  keywordFinish,
}) => {
  const [title, setTitle] = useState(initialData.title || "");
  const [date, setDate] = useState(
    initialData.date || new Date().toISOString().split("T")[0]
  );
  const [time, setTime] = useState(initialData.time || "10:00 AM - 11:30 AM");
  const [venue, setVenue] = useState(
    initialData.venue || "Conference Room 4B & Zoom Link"
  );
  const [attendeeInput, setAttendeeInput] = useState("");
  const [attendees, setAttendees] = useState<string[]>(
    initialData.attendees || []
  );
  const [purpose, setPurpose] = useState(initialData.purpose || "");
  const [uploadedMaterialsText, setUploadedMaterialsText] = useState(
    initialData.uploadedMaterialsText || ""
  );
  const [uploadedMaterialsFilename, setUploadedMaterialsFilename] = useState(
    initialData.uploadedMaterialsFilename || ""
  );
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddAttendee = () => {
    if (!attendeeInput.trim()) return;
    const names = attendeeInput
      .split(/[,;\n]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const updated = Array.from(new Set([...attendees, ...names]));
    setAttendees(updated);
    setAttendeeInput("");
  };

  const handleRemoveAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    setFileError(null);
    setUploadedMaterialsFilename(file.name);

    try {
      // Read text content
      const text = await file.text();
      setUploadedMaterialsText(text.slice(0, 20000));

      // Call parse-document API to extract executive context
      try {
        const response = await fetch("/api/mom/parse-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentText: text.slice(0, 15000),
            filename: file.name,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.summary && !purpose) {
            setPurpose(data.summary);
          }
        }
      } catch (err) {
        console.warn("Background summary fetch skipped", err);
      }
    } catch (err: any) {
      setFileError("Could not read file text directly. You can paste the text below.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleLoadSample = () => {
    setTitle("Q3 Product Roadmap & Infrastructure Budget Review");
    setDate("2026-09-15");
    setTime("09:30 AM - 11:00 AM");
    setVenue("Executive Boardroom & Google Meet");
    setAttendees([
      "Elena Rostova (VP Product)",
      "David Sterling (Head of Eng)",
      "Marcus Vance (Finance Director)",
      "Samantha Reed (Design Lead)",
      "Kevin Park (Staff Architect)",
    ]);
    setPurpose(
      "Align executive leadership on the Q3 product release milestones, resolve the cloud infrastructure budget overrun for migration, and finalize hiring allocations for backend engineers."
    );
    setUploadedMaterialsFilename("Q3_Roadmap_Briefing_Deck.pdf");
    setUploadedMaterialsText(
      "Agenda: 1. Q3 Roadmap Review (Core Platform, Mobile App v2). 2. Cloud Migration Budget Overrun ($45k variance). 3. Security Audit compliance requirements before SOC2 audit in November. 4. Resourcing: 2 Senior Backend engineers needed."
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please provide a meeting title.");
      return;
    }

    onSubmit({
      title: title.trim(),
      date,
      time,
      venue,
      attendees,
      purpose,
      uploadedMaterialsText,
      uploadedMaterialsFilename,
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* Intro */}
        <div className="pb-6 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Meeting Setup & Background
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Provide the meeting coordinates, attendee roster, and reference materials.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Executive Leadership Sync, Q3 Budget Review..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Grid: Date, Time, Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date
                </span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Time
                </span>
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 10:00 AM - 11:30 AM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> Venue / Medium
                </span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Boardroom A / Google Meet"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Attendees (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" /> Attendees (Optional)
                </span>
              </label>
              <span className="text-xs text-slate-400">
                You may leave this blank or input attendees
              </span>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAttendee();
                  }
                }}
                placeholder="Type attendee name (e.g. Sarah Lee, Alex Chen) and press Enter"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={handleAddAttendee}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {attendees.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-full text-xs font-medium shadow-2xs"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(idx)}
                      className="text-slate-400 hover:text-red-600 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* High Level Summary / Purpose */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              High-Level Summary / Purpose of the Meeting
            </label>
            <textarea
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Outline the meeting objective, core problem statement, or anticipated outcomes..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Upload Meeting Materials */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Upload Meeting Materials & Documents (Optional)
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 text-center bg-slate-50/60 hover:bg-blue-50/20 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.pdf,.doc,.docx,.csv,.rtf"
                onChange={handleFileChange}
              />
              <FileUp className="w-8 h-8 text-blue-700 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-800">
                Click or drag & drop meeting slides, agenda, or background docs
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports .txt, .md, .pdf, .docx, .csv (extracted context assists AI synthesis)
              </p>

              {isProcessingFile && (
                <p className="text-xs text-blue-700 font-semibold mt-2 animate-pulse">
                  Analyzing document background with Gemini...
                </p>
              )}

              {uploadedMaterialsFilename && !isProcessingFile && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Attached: {uploadedMaterialsFilename}</span>
                </div>
              )}
            </div>

            {fileError && (
              <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {fileError}
              </p>
            )}
          </div>

          {/* Workflow Keyword Note */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">Next Step: Real-Time Capture & Intelligent Analysis</p>
              <p className="text-blue-800/90 mt-0.5">
                In the next stage, input key points one-by-one. The AI will classify each as a discussion point, action item, or remark, and expand on it. When ready to consolidate, simply enter the keyword <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300 text-blue-950">{keywordFinish}</span> or click the consolidate action.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span>Proceed to Meeting Capture</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
