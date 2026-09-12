import React from "react";
import {
  FileText,
  CheckCircle2,
  Edit3,
  Download,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { MeetingStage } from "../types";

interface HeaderProps {
  currentStage: MeetingStage;
  onReset: () => void;
  keywordFinish: string;
  keywordFinalize: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentStage,
  onReset,
}) => {
  const steps: { stage: MeetingStage; stepNumber: number; label: string; icon: React.ReactNode }[] = [
    {
      stage: "setup",
      stepNumber: 1,
      label: "Setup & Context",
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      stage: "capturing",
      stepNumber: 2,
      label: "Capture & Analyze",
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      stage: "review",
      stepNumber: 3,
      label: "AI Review & Refine",
      icon: <Edit3 className="w-3.5 h-3.5" />,
    },
    {
      stage: "finalized",
      stepNumber: 4,
      label: "Output & Export",
      icon: <Download className="w-3.5 h-3.5" />,
    },
  ];

  const stageOrder: MeetingStage[] = ["setup", "capturing", "review", "finalized"];
  const currentStepIndex = stageOrder.indexOf(currentStage);
  const currentStepInfo = steps[currentStepIndex] || steps[0];

  const getStepStatus = (stepStage: MeetingStage) => {
    const stepIndex = stageOrder.indexOf(stepStage);
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "active";
    return "upcoming";
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center text-white shadow-xs border border-blue-900/30">
              <FileText className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Minutes of the Meeting
                </h1>
                <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-semibold uppercase tracking-wider">
                  MOM AI
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Real-time Note Ingestion • Autonomous Classification • Executive Synthesis
              </p>
            </div>
          </div>

          {/* Desktop Full Stepper */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Meeting Stages">
            {steps.map((step, idx) => {
              const status = getStepStatus(step.stage);
              return (
                <div key={step.stage} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none ${
                      status === "active"
                        ? "bg-blue-900 text-white shadow-xs"
                        : status === "completed"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "text-slate-400 bg-slate-100/80 border border-transparent"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        status === "active"
                          ? "bg-white/20 text-white"
                          : status === "completed"
                          ? "bg-emerald-200/60 text-emerald-800"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        step.stepNumber
                      )}
                    </span>
                    <span>{step.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-5 h-0.5 mx-1 transition-colors ${
                        idx < currentStepIndex ? "bg-emerald-400" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Tablet & Mobile Progress Badge */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-right">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  Step {currentStepInfo.stepNumber} of 4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[120px] sm:max-w-none">
                {currentStepInfo.label}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {currentStage !== "setup" && (
              <button
                id="btn-header-new-meeting"
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer hover:text-slate-900 active:scale-97"
                title="Start a new meeting session"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold">New Meeting</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile/Tablet Segmented Progress Line */}
        <div className="lg:hidden pb-2 grid grid-cols-4 gap-1.5">
          {steps.map((step, idx) => (
            <div
              key={step.stage}
              className={`h-1 rounded-full transition-all ${
                idx < currentStepIndex
                  ? "bg-emerald-500"
                  : idx === currentStepIndex
                  ? "bg-blue-900"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
    </header>
  );
};
