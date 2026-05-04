# In-Room Assessment Refactoring Guide
## Decoupling Assessment from Dashboard → Moving to Active Room

---

## 📋 Executive Summary

**Problem:** Interview Assessment modal appears on dashboard (CreateRoomModal/JoinRoomModal) **before** users enter the active room, interrupting their workflow with permission dialogs.

**Solution:** Move assessment system into the **active collaborative room** with:
- ✅ Clean toggle button in room header
- ✅ Non-blocking permission checks
- ✅ Optional sidebar panel (only when enabled)
- ✅ Graceful degradation (hidden if not interview mode)

---

## 🎯 Key Changes

### Before (Current State)
```
Dashboard → Create/Join Modal → InterviewRecorder Modal pops up (BLOCKING)
                                 ↓
                            User forced to deal with permissions
                                 ↓
                            Permission dialog appears
                                 ↓
                            User continues to editor
```

### After (Refactored)
```
Dashboard → Create/Join Modal → Editor Room Opens (NO MODAL)
            (clean, simple)      ↓
                            User sees room with toggle button available
                                 ↓
                            User clicks toggle when ready
                                 ↓
                            Assessment panel appears (no modal)
                                 ↓
                            Permissions checked in background (non-blocking)
```

---

## 📦 New Components

### 1. **useInRoomAssessment Hook** 
📍 `src/hooks/useInRoomAssessment.js`

**Purpose:** Manages assessment state, permissions, and recording
- ✅ Non-blocking permission checks
- ✅ Graceful error handling
- ✅ Recording state management
- ✅ Permission request methods

**Key Functions:**
```javascript
enableAssessment()              // Turn on assessment UI
disableAssessment()             // Turn off assessment UI
startRecording()                // Start recording (checks perms)
stopRecording()                 // Stop recording
checkPermissionsAsync()         // Background permission check
requestMicrophonePermission()   // Request mic access
requestCameraPermission()       // Request camera access
```

**State Provided:**
```javascript
{
  isAssessmentEnabled,      // boolean
  isAssessmentExpanded,     // boolean
  recordingActive,          // boolean
  permissions: {
    microphone: { state, hasDevice },
    camera: { state, hasDevice }
  },
  audioLevel,               // 0-1
  recordingTime,            // seconds
  error                     // error message or null
}
```

---

### 2. **InRoomAssessmentPanel Component**
📍 `src/components/interview/InRoomAssessmentPanel.jsx`

**Purpose:** Clean, compact UI for recording and diagnostics
- ✅ Recording controls with audio level visualization
- ✅ Permission status indicators
- ✅ Expandable diagnostics panel
- ✅ Non-blocking design

**Features:**
- Mic/Camera status with quick visual indicators
- Audio level bars (only when recording)
- Recording timer
- Permission diagnostics with "Request Again" buttons
- Helpful error messages

**Conditional Rendering:**
```javascript
// Only renders if assessment is enabled
if (!assessment.isAssessmentEnabled) {
  return null;
}
```

---

### 3. **AssessmentToggleButton Component**
📍 `src/components/interview/AssessmentToggleButton.jsx`

**Purpose:** Non-intrusive toggle for enabling/disabling assessment

**Variants:**
- `variant="header"` - Compact icon button (for room header)
- `variant="toolbar"` - Full button with text (for toolbar)

**Visual States:**
- 🟢 Enabled - Cyan accent, visible toggle
- ⚫ Disabled - Slate color, subtle toggle
- 🔴 Recording - Red pulse indicator

---

## 🔄 Refactored Modal Components

### 4. **CreateRoomModal** (Refactored)
📍 `REFACTORED_CreateRoomModal.jsx`

**Changes:**
- ❌ Removed: `import InterviewRecorder`
- ❌ Removed: `showInterviewRecorder` state
- ❌ Removed: Modal conditional rendering
- ✅ Added: Simple room creation flow
- ✅ Result: Opens directly to editor

---

### 5. **JoinRoomModal** (Refactored)
📍 `REFACTORED_JoinRoomModal.jsx`

**Changes:**
- ❌ Removed: `import InterviewRecorder`
- ❌ Removed: `showInterviewRecorder` state
- ❌ Removed: Modal conditional rendering
- ✅ Added: Simple room join flow
- ✅ Result: Opens directly to editor

---

## 🏗️ Architecture

### Component Hierarchy
```
Room Editor (e.g., editor.jsx)
├── Header
│   ├── Room Info
│   ├── Main Controls (Run, Debug)
│   └── AssessmentToggleButton (if interview mode)
│
├── Editor Area
│   ├── Code Editor (Monaco/Ace)
│   └── [Right Sidebar - if assessment enabled]
│       └── InRoomAssessmentPanel
│           ├── Recording Controls
│           ├── Permission Status
│           └── Diagnostics Panel
│
└── Terminal/Output Area
```

### Data Flow
```
useInRoomAssessment Hook
├── Manages: isAssessmentEnabled, recordingActive, permissions
├── Provides: Control functions (enableAssessment, startRecording, etc.)
└── Used by:
    ├── AssessmentToggleButton (to toggle state)
    ├── InRoomAssessmentPanel (to display and control)
    └── Room Editor (to conditionally render components)
```

---

## 🚀 Integration Steps

### Step 1: Copy New Components
```
✓ src/hooks/useInRoomAssessment.js
✓ src/components/interview/InRoomAssessmentPanel.jsx
✓ src/components/interview/AssessmentToggleButton.jsx
```

### Step 2: Update Room Editor (e.g., editor.jsx)
```javascript
import { AssessmentToggleButton } from '../components/interview/AssessmentToggleButton';
import { InRoomAssessmentPanel } from '../components/interview/InRoomAssessmentPanel';
import useInRoomAssessment from '../hooks/useInRoomAssessment';

export function EditorPage() {
  const assessment = useInRoomAssessment();
  const isInterviewMode = roomData?.isInterviewMode; // From room data

  return (
    <div className="flex h-screen">
      {/* Header with toggle */}
      <header className="flex justify-between items-center">
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

      {/* Main area + Sidebar */}
      <div className="flex flex-1">
        {/* Code editor */}
        <div className="flex-1">{/* Editor content */}</div>

        {/* Assessment sidebar (only if interview mode) */}
        {isInterviewMode && (
          <div className="w-96 border-l">
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
```

### Step 3: Update CreateRoomModal
```javascript
// REMOVE:
// import InterviewRecorder
// const [showInterviewRecorder, setShowInterviewRecorder] = useState(false);
// if (showInterviewRecorder) { return <InterviewRecorder ...> }

// REPLACE with simple redirect:
const handleRoomCreation = async () => {
  // ... existing validation and API call ...
  if (res.status === 201) {
    toast.success("Room created successfully!");
    window.open(`/collab-editor/${roomId}`, "_blank");
    onClose();
  }
};
```

### Step 4: Update JoinRoomModal
```javascript
// SAME CHANGES as CreateRoomModal
// REMOVE InterviewRecorder import and state
// REPLACE with simple redirect to room
```

### Step 5: Pass Room Metadata
```javascript
// In editor.jsx, get room mode from localStorage or API:
const collabActions = JSON.parse(
  localStorage.getItem('collabActions') || '{}'
);
const roomAction = collabActions[roomId];
const isInterviewMode = roomAction?.isInterviewMode || false;
```

---

## 🔐 Permission Handling

### Non-Blocking Flow
```
User clicks "Enable Assessment"
    ↓
Panel renders immediately (NO WAIT)
    ↓
checkPermissionsAsync() called in background
    ↓
Permissions API polled:
  - navigator.permissions.query({ name: 'microphone' })
  - navigator.permissions.query({ name: 'camera' })
  - navigator.mediaDevices.enumerateDevices()
    ↓
UI updates with results:
  - "Granted" (green icon)
  - "Denied" (red icon + request button)
  - "Unknown" (gray icon, spinner)
  - "Unsupported" (warning icon)
```

### User Grants Permission
```
1. User clicks "Start Recording"
2. System checks if microphone is granted
3. If NOT granted → requestMicrophonePermission()
4. Browser shows native permission dialog
5. User grants → Recording starts
6. User denies → Error message + "Request Again" button in diagnostics
```

### Error Handling
```javascript
try {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  setPermissions(prev => ({
    ...prev,
    microphone: { state: 'granted', hasDevice: true }
  }));
} catch (err) {
  // Handle: NotAllowedError, NotFoundError, SecurityError, etc.
  const state = err?.name === 'NotAllowedError' ? 'denied' : 'error';
  setPermissions(prev => ({
    ...prev,
    microphone: { state, hasDevice: prev.microphone.hasDevice }
  }));
}
```

---

## 🎨 UI/UX Details

### Toggle Button States

**Header Button (variant="header")**
```
Enabled + Recording:
  🔴 Icon with pulse animation
  Cyan background
  Tooltip: "Recording..."

Enabled + Not Recording:
  🎤 Icon
  Cyan background
  Tooltip: "Assessment On"

Disabled:
  🎤 Icon
  Slate background
  Tooltip: "Enable Assessment"
```

**Toolbar Button (variant="toolbar")**
```
Similar to header but with text label
E.g., "Assessment", "Recording", etc.
```

### Panel States

**Collapsed (not visible)**
- Only toggle visible in header
- Nothing in sidebar

**Expanded + Not Recording**
- Recording button (Ready state)
- Mic/Camera status cards
- Settings button
- Close button

**Expanded + Recording**
- Stop Recording button (Active state)
- Audio level visualization
- Recording timer
- Mic/Camera status cards
- Settings button
- Close button

**Permission Diagnostics View**
- Expandable via Settings button
- Shows detailed permission state
- Shows device availability
- Provides "Request Again" buttons
- Shows helpful instructions

---

## 📊 Comparison: Old vs New

| Aspect | Old Flow | New Flow |
|--------|----------|----------|
| **When Assessment Appears** | Immediately after room join (modal) | User clicks toggle (non-modal) |
| **Permission Prompt** | Forces user to deal with it | Background check, user-triggered |
| **Interruption** | Very intrusive (modal overlay) | Non-intrusive (sidebar panel) |
| **User Control** | No choice (must allow/deny) | Full control (enable when ready) |
| **Workflow** | Disrupted | Smooth |
| **Assessment Availability** | Only after modal close | Available once room opens |
| **Error Recovery** | Unclear what to do | Clear diagnostic panel + retry |

---

## ✅ Testing Checklist

- [ ] **Permission Grant Flow**
  - [ ] Click toggle → panel opens
  - [ ] Click "Start Recording" → microphone granted → records
  - [ ] Audio level bars visible during recording
  - [ ] Timer counts up
  - [ ] Click "Stop Recording" → stops and resets

- [ ] **Permission Denied Flow**
  - [ ] Click toggle → panel opens
  - [ ] Grant mic, deny camera
  - [ ] "Start Recording" works (uses mic)
  - [ ] Diagnostics show: Mic = Granted, Camera = Denied
  - [ ] Click "Request Again" for camera

- [ ] **No Device Flow**
  - [ ] Detect system without microphone
  - [ ] Panel shows "No Device" status
  - [ ] Cannot record without device

- [ ] **Non-Interview Mode**
  - [ ] Toggle button NOT shown in header
  - [ ] Assessment panel NOT shown in sidebar
  - [ ] No assessment UI visible

- [ ] **Room State Persistence**
  - [ ] User enables assessment → works
  - [ ] User disables assessment → panel closes, toggle still available
  - [ ] Reload page → assessment disabled (fresh state)

---

## 🔧 Troubleshooting

### Issue: Assessment panel doesn't appear
**Solution:**
- Check `isInterviewMode` is true (from room data)
- Check `useInRoomAssessment()` hook is called
- Check browser console for errors

### Issue: Permission check hangs
**Solution:**
- Non-blocking by design (shouldn't hang)
- If it does, check browser console
- May be timeout in older browsers (graceful degradation)

### Issue: Recording doesn't start
**Solution:**
- Check microphone permission status in diagnostics
- Try "Request Again" button
- Check browser privacy settings

### Issue: Audio level bars don't show
**Solution:**
- Only shows when recording is active
- Start recording first
- Check `audioLevel` prop from hook

---

## 📚 Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useInRoomAssessment.js` | Assessment state management | ✅ New |
| `src/components/interview/InRoomAssessmentPanel.jsx` | Assessment panel UI | ✅ New |
| `src/components/interview/AssessmentToggleButton.jsx` | Toggle button | ✅ New |
| `REFACTORED_CreateRoomModal.jsx` | Example refactored modal | ✅ Example |
| `REFACTORED_JoinRoomModal.jsx` | Example refactored modal | ✅ Example |
| `COMPLETE_EXAMPLE_InRoomAssessment.jsx` | Full integration example | ✅ Example |
| `INTEGRATION_IN_ROOM_ASSESSMENT.md` | Integration guide | ✅ Guide |

---

## 🎯 Success Criteria

- ✅ Assessment UI does NOT appear in CreateRoomModal
- ✅ Assessment UI does NOT appear in JoinRoomModal
- ✅ Assessment toggle appears in room header (if interview mode)
- ✅ Clicking toggle opens assessment panel without blocking
- ✅ Permission checks happen in background (non-blocking)
- ✅ Recording can start/stop without issues
- ✅ Permission diagnostics are accessible and helpful
- ✅ User can work in editor while assessment is available

---

## 🚀 Deployment

1. Copy new component files to `src/`
2. Update `editor.jsx` to use new components
3. Update `CreateRoomModal.jsx` (remove InterviewRecorder)
4. Update `JoinRoomModal.jsx` (remove InterviewRecorder)
5. Test all permission flows
6. Deploy!

---

**Questions?** Check the integration guide or examples for detailed code patterns.
