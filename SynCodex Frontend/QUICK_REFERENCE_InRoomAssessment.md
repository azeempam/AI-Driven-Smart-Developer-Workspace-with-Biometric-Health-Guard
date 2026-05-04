/**
 * QUICK REFERENCE: In-Room Assessment Integration
 * 
 * Fast checklist for implementing the refactored assessment system
 */

// ============================================================================
// 1. ADD NEW COMPONENTS TO YOUR PROJECT
// ============================================================================

📍 Copy these files to your src/ directory:

✓ src/hooks/useInRoomAssessment.js
    → Manages assessment state, permissions, recording

✓ src/components/interview/InRoomAssessmentPanel.jsx
    → Panel UI with recording controls

✓ src/components/interview/AssessmentToggleButton.jsx
    → Header toggle button for enabling/disabling

// ============================================================================
// 2. UPDATE ROOM EDITOR (e.g., src/pages/editor.jsx)
// ============================================================================

// Add these imports:
import { AssessmentToggleButton } from '../components/interview/AssessmentToggleButton';
import { InRoomAssessmentPanel } from '../components/interview/InRoomAssessmentPanel';
import useInRoomAssessment from '../hooks/useInRoomAssessment';

// In your component:
export default function EditorPage() {
  const assessment = useInRoomAssessment();
  const isInterviewMode = /* get from room data */;

  return (
    <div className="flex h-screen">
      {/* HEADER: Add toggle button */}
      <header className="flex justify-between items-center px-6 py-3 bg-slate-900">
        <h1>{roomName}</h1>
        
        {isInterviewMode && (
          <AssessmentToggleButton
            isEnabled={assessment.isAssessmentEnabled}
            onToggle={assessment.enableAssessment}
            isRecording={assessment.recordingActive}
            variant="header"
          />
        )}
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1">
        {/* Editor area */}
        <div className="flex-1">
          {/* Your code editor here */}
        </div>

        {/* SIDEBAR: Assessment panel (if interview mode & enabled) */}
        {isInterviewMode && (
          <div className="w-96 border-l border-slate-800">
            <InRoomAssessmentPanel
              roomId={roomId}
              roomName={roomName}
              onClose={() => assessment.disableAssessment()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 3. CLEAN UP DASHBOARD MODALS
// ============================================================================

// In CreateRoomModal.jsx:
// ❌ DELETE:
// import InterviewRecorder from "../interview/InterviewRecorder";
// const [showInterviewRecorder, setShowInterviewRecorder] = useState(false);
// if (showInterviewRecorder) { return <InterviewRecorder ...> }

// ✅ REPLACE with:
const handleRoomCreation = async () => {
  // ... existing code ...
  if (res.status === 201) {
    toast.success("Room created successfully!");
    
    // Store interview mode flag
    localStorage.setItem("collabActions", JSON.stringify({
      ...JSON.parse(localStorage.getItem("collabActions") || "{}"),
      [roomId]: {
        action: "created",
        hostEmail: localStorage.getItem("email"),
        isInterviewMode: interviewMode,  // ← Important!
      },
    }));

    // Open room directly
    window.open(`/collab-editor/${roomId}`, "_blank");
    onClose();
  }
};

// Same changes for JoinRoomModal.jsx

// ============================================================================
// 4. ACCESS ROOM MODE IN EDITOR
// ============================================================================

// Get room metadata from localStorage:
const [isInterviewMode, setIsInterviewMode] = useState(false);

useEffect(() => {
  const collabActions = JSON.parse(
    localStorage.getItem('collabActions') || '{}'
  );
  const roomData = collabActions[roomId];
  
  if (roomData?.isInterviewMode) {
    setIsInterviewMode(true);
  }
}, [roomId]);

// ============================================================================
// 5. USE THE HOOK IN YOUR COMPONENTS
// ============================================================================

// Get all assessment controls:
const assessment = useInRoomAssessment();

// Available properties:
assessment.isAssessmentEnabled      // boolean - is panel active?
assessment.isAssessmentExpanded     // boolean - is panel expanded?
assessment.recordingActive          // boolean - is recording?
assessment.permissions              // object - mic/camera status
assessment.audioLevel               // number 0-1 - microphone level
assessment.recordingTime            // number - seconds elapsed
assessment.error                    // string - error message if any

// Available functions:
assessment.enableAssessment()                // Turn on assessment UI
assessment.disableAssessment()               // Turn off assessment UI
assessment.startRecording()                  // Start recording
assessment.stopRecording()                   // Stop recording
assessment.requestMicrophonePermission()     // Request mic access
assessment.requestCameraPermission()         // Request camera access
assessment.checkPermissionsAsync()           // Check permissions (runs in background)
assessment.toggleAssessmentPanel()           // Expand/collapse panel

// ============================================================================
// 6. PERMISSION STATES
// ============================================================================

// Permission states can be:
// 'granted'      - User allowed access
// 'denied'       - User denied access (show request button)
// 'prompt'       - User hasn't been asked yet
// 'unknown'      - Being checked
// 'unsupported'  - Browser doesn't support this API
// 'error'        - Error during check

// Check permission status:
const micStatus = assessment.permissions.microphone.state;
const hasMicDevice = assessment.permissions.microphone.hasDevice;

if (micStatus === 'granted') {
  // User can record
}
if (micStatus === 'denied') {
  // Show: "Grant permission in browser settings"
}
if (!hasMicDevice) {
  // Show: "No microphone device detected"
}

// ============================================================================
// 7. CONDITIONAL RENDERING PATTERNS
// ============================================================================

// Pattern 1: Only show in interview mode
{isInterviewMode && (
  <AssessmentToggleButton ... />
)}

// Pattern 2: Toggle button
<AssessmentToggleButton
  isEnabled={assessment.isAssessmentEnabled}
  onToggle={assessment.enableAssessment}
  isRecording={assessment.recordingActive}
  variant="header"
/>

// Pattern 3: Panel (auto-hides if disabled)
<InRoomAssessmentPanel
  roomId={roomId}
  roomName={roomName}
  onClose={() => assessment.disableAssessment()}
/>
// (InRoomAssessmentPanel returns null if !isAssessmentEnabled)

// Pattern 4: CTA button when disabled
{isInterviewMode && !assessment.isAssessmentEnabled && (
  <button onClick={assessment.enableAssessment}>
    Enable Interview Assessment
  </button>
)}

// Pattern 5: Show recording indicator
{assessment.recordingActive && (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    <span>Recording...</span>
  </div>
)}

// ============================================================================
// 8. ERROR HANDLING
// ============================================================================

// Check for errors from hook:
if (assessment.error) {
  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
      ⚠️ {assessment.error}
    </div>
  );
}

// Handle permission denial:
const startRecording = async () => {
  const success = await assessment.startRecording();
  if (!success) {
    // Recording failed - user may have denied permissions
    // UI will show error + option to request again
  }
};

// ============================================================================
// 9. STYLING (Tailwind Classes Used)
// ============================================================================

// Colors:
// Primary:    cyan-500 / cyan-400
// Background: slate-900 / slate-800 / slate-700
// Text:       white / slate-300 / slate-400
// Border:     slate-700 / slate-800

// Example button:
className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 
           text-cyan-400 border border-cyan-500/30 rounded-lg 
           font-medium transition-colors"

// Example badge:
className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 
           border border-orange-500/30 rounded"

// ============================================================================
// 10. TESTING SCENARIOS
// ============================================================================

// ✓ Scenario 1: User grants mic permission
// 1. Click toggle → panel opens
// 2. Click "Start Recording" → permission dialog
// 3. User clicks "Allow"
// 4. Recording starts → audio bars appear

// ✓ Scenario 2: User denies permission
// 1. Click toggle → panel opens
// 2. Click "Start Recording" → permission dialog
// 3. User clicks "Deny"
// 4. Panel shows "Denied" status + "Request Again" button

// ✓ Scenario 3: Non-interview room
// 1. Join non-interview room
// 2. Toggle button doesn't appear in header
// 3. Assessment panel not shown anywhere

// ✓ Scenario 4: Disable assessment
// 1. Enable assessment (click toggle)
// 2. Panel appears
// 3. Click X or "Close" in panel
// 4. Panel hides, toggle still visible for re-enabling

// ============================================================================
// 11. COMMON MISTAKES TO AVOID
// ============================================================================

// ❌ DON'T: Render InRoomAssessmentPanel outside a conditional
// ✅ DO: Check isAssessmentEnabled first
if (assessment.isAssessmentEnabled) {
  return <InRoomAssessmentPanel ... />
}

// ❌ DON'T: Block on permission checks
// ✅ DO: Let checkPermissionsAsync run in background

// ❌ DON'T: Leave InterviewRecorder in dashboard modals
// ✅ DO: Remove it completely from CreateRoomModal/JoinRoomModal

// ❌ DON'T: Forget to pass isInterviewMode from room data
// ✅ DO: Store it in localStorage and retrieve in editor

// ❌ DON'T: Show assessment controls for non-interview rooms
// ✅ DO: Wrap with `if (isInterviewMode)` conditional

// ============================================================================
// 12. DEPLOYMENT CHECKLIST
// ============================================================================

// Before deploying:
☐ Copy 3 new component files
☐ Import useInRoomAssessment hook in editor.jsx
☐ Import AssessmentToggleButton in editor.jsx
☐ Import InRoomAssessmentPanel in editor.jsx
☐ Add toggle button to header (conditional on interview mode)
☐ Add panel to sidebar (conditional on interview mode)
☐ Remove InterviewRecorder from CreateRoomModal
☐ Remove InterviewRecorder from JoinRoomModal
☐ Update modals to open room directly (not modal)
☐ Store isInterviewMode in localStorage
☐ Test permission grant flow
☐ Test permission deny flow
☐ Test non-interview room (no assessment UI)
☐ Test enable/disable toggle

// ============================================================================
// 13. HELPFUL LINKS
// ============================================================================

📖 Full Integration Guide:    INTEGRATION_IN_ROOM_ASSESSMENT.md
📖 Complete Example:          COMPLETE_EXAMPLE_InRoomAssessment.jsx
📖 Refactoring Guide:         IN_ROOM_ASSESSMENT_REFACTORING_GUIDE.md

🔗 Example CreateRoomModal:   REFACTORED_CreateRoomModal.jsx
🔗 Example JoinRoomModal:     REFACTORED_JoinRoomModal.jsx

// ============================================================================

Questions? Check the docs or examples for more details.
