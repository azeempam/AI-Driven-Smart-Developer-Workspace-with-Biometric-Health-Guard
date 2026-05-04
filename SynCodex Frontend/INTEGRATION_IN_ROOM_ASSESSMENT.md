/**
 * INTEGRATION GUIDE: In-Room Assessment System
 * 
 * How to integrate the new assessment panel into your collaborative editor
 * 
 * ============================================================================
 * STEP 1: Update Editor Navigation/Header Component
 * ============================================================================
 * 
 * Add the assessment toggle button to your header:
 */

// In your EditorNav.jsx or header component:

import { AssessmentToggleButton } from '../components/interview/AssessmentToggleButton';
import useInRoomAssessment from '../hooks/useInRoomAssessment';

export function EditorNav({ roomId, roomName, onRunClick, /* ... other props ... */ }) {
  const assessment = useInRoomAssessment();

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
      {/* Left side - Room info */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-white font-bold">{roomName}</h1>
          <p className="text-xs text-slate-400">{roomId}</p>
        </div>
      </div>

      {/* Middle - Main Controls */}
      <div className="flex items-center gap-2">
        <button onClick={onRunClick} className="px-4 py-2 bg-cyan-500 text-white rounded">
          Run
        </button>
      </div>

      {/* Right side - Interview Assessment Toggle */}
      <div className="flex items-center gap-3">
        {/* Only show toggle if room is in interview mode */}
        {roomIsInterviewMode && (
          <AssessmentToggleButton
            isEnabled={assessment.isAssessmentEnabled}
            onToggle={assessment.enableAssessment}
            isRecording={assessment.recordingActive}
            variant="header"
          />
        )}
      </div>
    </nav>
  );
}

/**
 * ============================================================================
 * STEP 2: Add Assessment Panel to Room Main View
 * ============================================================================
 * 
 * Add the assessment panel to the room layout, typically in a sidebar
 */

// In your editor.jsx or collaborative room component:

import { InRoomAssessmentPanel } from '../components/interview/InRoomAssessmentPanel';
import useInRoomAssessment from '../hooks/useInRoomAssessment';

export default function EditorPage() {
  const { projectId } = useParams();
  const assessment = useInRoomAssessment();

  const [isInterviewMode] = useState(false); // From room data
  const [roomName] = useState(''); // From room data

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with toggle button */}
        <EditorNav 
          roomIsInterviewMode={isInterviewMode}
          onToggleAssessment={assessment.enableAssessment}
        />

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden">
          {/* Your editor content here */}
        </div>
      </div>

      {/* Right Sidebar - Assessment Panel */}
      {isInterviewMode && (
        <div className="w-80 border-l border-slate-800 bg-slate-900 overflow-y-auto">
          {/* Assessment Panel - Only renders if enabled */}
          <InRoomAssessmentPanel
            roomId={projectId}
            roomName={roomName}
            onClose={() => assessment.disableAssessment()}
          />

          {/* Show CTA to enable if not active */}
          {!assessment.isAssessmentEnabled && (
            <div className="p-4">
              <button
                onClick={assessment.enableAssessment}
                className="w-full px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-medium transition-colors"
              >
                Enable Interview Assessment
              </button>
              <p className="text-xs text-slate-400 mt-2">
                Click to start recording and analyzing your interview responses
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * STEP 3: Remove Assessment from Dashboard Modals
 * ============================================================================
 * 
 * DELETE this from CreateRoomModal.jsx and JoinRoomModal.jsx:
 * 
 * ❌ REMOVE:
 * - import InterviewRecorder
 * - const [showInterviewRecorder, setShowInterviewRecorder] = useState(false)
 * - The conditional rendering of <InterviewRecorder /> modal
 * - setShowInterviewRecorder(true) calls
 * 
 * ✅ REPLACE with simple navigation:
 */

// In CreateRoomModal.jsx - handleRoomCreation():
const handleRoomCreation = async () => {
  // ... existing validation ...

  try {
    const res = await axios.post(
      "http://localhost:5000/api/rooms/create-room",
      sessionData
    );

    if (res.status === 201) {
      toast.success("Room created successfully!");
      
      // Simply redirect to the room - assessment will be available there
      window.open(`/collab-editor/${roomId}`, "_blank");
      onClose();
    }
  } catch (error) {
    toast.error("Failed to create room");
  }
};

// In JoinRoomModal.jsx - joinRoom():
const joinRoom = async () => {
  // ... existing code ...

  try {
    const res = await axios.post(
      "http://localhost:5000/api/rooms/join-room",
      {
        roomId: joinRoomId.trim(),
        email: localStorage.getItem("email"),
        creatorEmail: hostEmail,
      }
    );

    if (res.status === 200) {
      toast.success("Room Joined Successfully!");
      
      // Simply open the room - assessment will be available there
      window.open(`/collab-editor/${joinRoomId}`, "_blank");
      onClose();
    }
  } catch (error) {
    toast.error("Failed to join room");
  }
};

/**
 * ============================================================================
 * STEP 4: Hook Implementation Summary
 * ============================================================================
 * 
 * useInRoomAssessment() provides:
 * 
 * State:
 *  - isAssessmentEnabled: boolean
 *  - isAssessmentExpanded: boolean
 *  - permissions: { microphone: {state, hasDevice}, camera: {state, hasDevice} }
 *  - recordingActive: boolean
 *  - isCheckingPermissions: boolean
 *  - error: string | null
 * 
 * Controls:
 *  - enableAssessment(): void
 *  - disableAssessment(): void
 *  - startRecording(): Promise<boolean>
 *  - stopRecording(): Promise<void>
 *  - requestMicrophonePermission(): Promise<boolean>
 *  - requestCameraPermission(): Promise<boolean>
 *  - checkPermissionsAsync(): void (runs in background)
 *  - toggleAssessmentPanel(): void
 * 
 * ============================================================================
 * STEP 5: Conditional Rendering Examples
 * ============================================================================
 */

// Example 1: Toggle with visual indicator
function RoomHeaderWithToggle({ roomId, isInterviewMode }) {
  const assessment = useInRoomAssessment();

  return (
    <div className="flex items-center gap-4">
      {isInterviewMode && (
        <>
          <AssessmentToggleButton
            isEnabled={assessment.isAssessmentEnabled}
            onToggle={assessment.enableAssessment}
            isRecording={assessment.recordingActive}
            variant="header"
          />
          {assessment.isAssessmentEnabled && (
            <div className="text-xs text-slate-400">
              {assessment.recordingActive ? 'Recording in progress' : 'Ready to record'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Example 2: Sidebar CTA
function RoomSidebarWithCTA({ isInterviewMode }) {
  const assessment = useInRoomAssessment();

  if (!isInterviewMode) return null;

  if (!assessment.isAssessmentEnabled) {
    return (
      <button
        onClick={assessment.enableAssessment}
        className="w-full px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-medium"
      >
        Start Interview Assessment
      </button>
    );
  }

  return (
    <InRoomAssessmentPanel
      roomId={roomId}
      roomName={roomName}
      onClose={assessment.disableAssessment}
    />
  );
}

// Example 3: Floating action button
function FloatingAssessmentButton({ isInterviewMode }) {
  const assessment = useInRoomAssessment();

  if (!isInterviewMode) return null;

  return (
    <button
      onClick={
        assessment.isAssessmentEnabled
          ? assessment.disableAssessment
          : assessment.enableAssessment
      }
      className={`
        fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all
        ${assessment.isAssessmentEnabled
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }
      `}
    >
      {assessment.recordingActive ? '🔴' : '🎤'}
    </button>
  );
}

/**
 * ============================================================================
 * STEP 6: Non-Blocking Permission Flow
 * ============================================================================
 * 
 * The permission system is designed to NOT block the UI:
 * 
 * 1. User clicks "Enable Assessment" → Panel opens immediately
 * 2. Permissions checked in background (checkPermissionsAsync)
 * 3. UI updates as permissions are checked
 * 4. User can start recording if microphone is granted
 * 5. If denied, user can click "Request Again" button
 * 6. System gracefully handles all device/browser combinations
 * 
 * ============================================================================
 * STEP 7: Clean Up - Remove Old Components from Views
 * ============================================================================
 * 
 * Delete or don't render these in modals:
 * - InterviewRecorder (from dashboard modals)
 * - TroubleshootPanel (old blocking troubleshooting)
 * 
 * These are now:
 * - InRoomAssessmentPanel (new, non-blocking, in-room)
 * - Integrated permission diagnostics in panel
 * 
 * ============================================================================
 */

export default IntegrationGuide;
