import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { SetupForm } from "./components/SetupForm";
import { LiveCapture } from "./components/LiveCapture";
import { ReviewStage } from "./components/ReviewStage";
import { ExportStage } from "./components/ExportStage";
import { RotateCcw, AlertTriangle, X } from "lucide-react";
import type {
  MeetingMetadata,
  RawMeetingItem,
  ConsolidatedMOM,
  MeetingStage,
} from "./types";

const STORAGE_KEY_METADATA = "mom_analyzer_metadata";
const STORAGE_KEY_ITEMS = "mom_analyzer_items";
const STORAGE_KEY_MOM = "mom_analyzer_consolidated";
const STORAGE_KEY_STAGE = "mom_analyzer_stage";

export default function App() {
  const keywordFinish = "FINISH";
  const keywordFinalize = "FINALIZE";

  // State initialization with localStorage fallback
  const [stage, setStage] = useState<MeetingStage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STAGE);
    return (saved as MeetingStage) || "setup";
  });

  const [metadata, setMetadata] = useState<MeetingMetadata>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_METADATA);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "10:00 AM - 11:30 AM",
      venue: "Conference Room 4B & Zoom Link",
      attendees: [],
      purpose: "",
    };
  });

  const [items, setItems] = useState<RawMeetingItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [consolidatedMOM, setConsolidatedMOM] = useState<ConsolidatedMOM | null>(
    () => {
      const saved = localStorage.getItem(STORAGE_KEY_MOM);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
      return null;
    }
  );

  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STAGE, stage);
  }, [stage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(metadata));
  }, [metadata]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (consolidatedMOM) {
      localStorage.setItem(STORAGE_KEY_MOM, JSON.stringify(consolidatedMOM));
    }
  }, [consolidatedMOM]);

  // Handle escape key to close reset modal
  useEffect(() => {
    if (!showResetConfirmModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowResetConfirmModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResetConfirmModal]);

  const handleSetupSubmit = (data: MeetingMetadata) => {
    setMetadata(data);
    setStage("capturing");
  };

  const handleAddItem = (item: RawMeetingItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleUpdateItem = (id: string, updated: Partial<RawMeetingItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updated } : it))
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleConsolidate = async () => {
    if (items.length === 0) {
      alert("Please capture at least one meeting item before consolidating.");
      return;
    }

    setIsConsolidating(true);
    try {
      const response = await fetch("/api/mom/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata,
          items,
        }),
      });

      if (!response.ok) {
        throw new Error("Server failed to consolidate minutes");
      }

      const momData: ConsolidatedMOM = await response.json();
      setConsolidatedMOM(momData);
      setStage("review");
    } catch (err: any) {
      console.error("Consolidation error:", err);
      alert("Failed to consolidate minutes with AI: " + err.message);
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleFinalize = () => {
    setStage("finalized");
  };

  const handleResetMeeting = () => {
    // Open in-app confirmation modal
    setShowResetConfirmModal(true);
  };

  const confirmResetMeeting = () => {
    localStorage.removeItem(STORAGE_KEY_METADATA);
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_MOM);
    localStorage.removeItem(STORAGE_KEY_STAGE);
    setMetadata({
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "10:00 AM - 11:30 AM",
      venue: "Conference Room 4B & Zoom Link",
      attendees: [],
      purpose: "",
    });
    setItems([]);
    setConsolidatedMOM(null);
    setStage("setup");
    setShowResetConfirmModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      <Header
        currentStage={stage}
        onReset={handleResetMeeting}
        keywordFinish={keywordFinish}
        keywordFinalize={keywordFinalize}
      />

      <main className="flex-1 pb-16">
        {stage === "setup" && (
          <SetupForm
            initialData={metadata}
            onSubmit={handleSetupSubmit}
            keywordFinish={keywordFinish}
          />
        )}

        {stage === "capturing" && (
          <LiveCapture
            metadata={metadata}
            items={items}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onConsolidate={handleConsolidate}
            isConsolidating={isConsolidating}
            keywordFinish={keywordFinish}
          />
        )}

        {stage === "review" && consolidatedMOM && (
          <ReviewStage
            mom={consolidatedMOM}
            onUpdateMOM={setConsolidatedMOM}
            onFinalize={handleFinalize}
            onBackToCapture={() => setStage("capturing")}
            keywordFinalize={keywordFinalize}
          />
        )}

        {stage === "finalized" && consolidatedMOM && (
          <ExportStage
            mom={consolidatedMOM}
            onBackToReview={() => setStage("review")}
            onResetMeeting={handleResetMeeting}
          />
        )}
      </main>

      {/* In-App Confirmation Modal for Starting a New Meeting */}
      {showResetConfirmModal && (
        <div
          id="modal-reset-meeting-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowResetConfirmModal(false)}
        >
          <div
            id="modal-reset-meeting-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="reset-modal-title"
                  className="text-base font-bold text-slate-900 leading-tight"
                >
                  Start a New Meeting?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Starting a new session will clear your current notes, live capture items, and generated MOM draft. Please ensure you have copied or downloaded any required records before proceeding.
                </p>
                {metadata.title && (
                  <div className="mt-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 truncate">
                    <span className="font-semibold text-slate-500">Current Session: </span>
                    <span className="font-medium text-slate-900">{metadata.title}</span>
                  </div>
                )}
              </div>
              <button
                id="btn-close-reset-modal"
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-reset"
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-reset"
                type="button"
                onClick={confirmResetMeeting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yes, Start New Meeting</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
