import { Play, Video, VideoOff, Mic, PenLine, Sparkles, ShieldCheck } from "lucide-react";
import { VscOpenPreview } from "react-icons/vsc";
import HealthStatusBar from "../HealthStatusBar";
import ProximityStatusIndicator from "./ProximityStatusIndicator";

export default function EditorNav({
  onRunClick,
  onPreviewClick,
  isHtmlFile,
  flowStatus,
  healthData,
  projectName,
  isDemoMode,
  onToggleDemo,
  showVideoPanel,
  onToggleVideoPanel,
  onInterviewClick,
  showWhiteboard,
  onWhiteboardClick,
}) {
  return (
    <header className="editor-nav-shell select-none z-50 relative">
      <div className="editor-nav-brand">
        <div className="editor-nav-logo">
          <Sparkles size={16} />
          SynCodex
        </div>
        <div className="editor-nav-project">
          <span className="editor-nav-project-label">Workspace</span>
          <span className="editor-nav-project-name">{projectName || "Untitled Project"}</span>
        </div>
      </div>

      <div className="editor-nav-center">
        {isHtmlFile ? (
          <button
            className="editor-nav-primary-button editor-nav-secondary-button"
            onClick={onPreviewClick}
            title="View Preview"
            aria-label="View Preview"
            type="button"
          >
            <VscOpenPreview size={16} />
            Preview
          </button>
        ) : (
          <button
            className="editor-nav-primary-button"
            onClick={onRunClick}
            title="Run Code"
            aria-label="Run Code"
            type="button"
          >
            <Play fill="currentColor" size={13} className="text-indigo-400 mt-[1px]" />
            RUN
          </button>
        )}
      </div>

      <div className="editor-nav-actions">
        <ProximityStatusIndicator />
        {flowStatus && <div className="editor-nav-status">{flowStatus}</div>}
        {onWhiteboardClick && (
          <button
            id="whiteboard-toggle-btn"
            onClick={onWhiteboardClick}
            title="Toggle Collaborative Whiteboard"
            type="button"
            className={`editor-nav-chip ${
              showWhiteboard
                ? "is-active"
                : ""
            }`}
          >
            <PenLine size={14} />
            Whiteboard
          </button>
        )}
        {onInterviewClick && (
          <button
            onClick={onInterviewClick}
            title="Start Interview Recording"
            type="button"
            className="editor-nav-chip editor-nav-chip-success"
          >
            <Mic size={14} />
            Interview
          </button>
        )}
        {onToggleVideoPanel && (
          <button
            onClick={onToggleVideoPanel}
            title={showVideoPanel ? "Hide video panel" : "Show video panel"}
            type="button"
            className={`editor-nav-chip ${
              showVideoPanel
                ? "is-active"
                : ""
            }`}
          >
            {showVideoPanel ? <Video size={14} /> : <VideoOff size={14} />}
            {showVideoPanel ? "Hide Call" : "Show Call"}
          </button>
        )}
        {onToggleDemo && (
          <button
            onClick={onToggleDemo}
            title={isDemoMode ? "Switch to 20-minute mode" : "Switch to 2-second demo"}
            type="button"
            className={`editor-nav-chip ${isDemoMode ? "is-active" : ""}`}
          >
            {isDemoMode ? "Demo active" : "Try Demo"}
          </button>
        )}
        {healthData && (
          <div className="editor-nav-health">
            <ShieldCheck size={14} className="text-emerald-300" />
            <HealthStatusBar healthData={healthData} />
          </div>
        )}
      </div>
    </header>
  );
}
