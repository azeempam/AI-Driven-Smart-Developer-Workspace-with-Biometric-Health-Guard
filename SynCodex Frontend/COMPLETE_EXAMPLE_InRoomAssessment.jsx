/**
 * COMPLETE EXAMPLE: In-Room Assessment Integration
 * 
 * Shows a full example of how the refactored components work together
 * in an active collaborative room/editor view
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// New components
import { AssessmentToggleButton } from '../components/interview/AssessmentToggleButton';
import { InRoomAssessmentPanel } from '../components/interview/InRoomAssessmentPanel';
import useInRoomAssessment from '../hooks/useInRoomAssessment';

/**
 * Main Room Editor Component
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────┐
 * │ Header (Room Info + Assessment Toggle)              │
 * ├─────────────────────┬───────────────────────────────┤
 * │                     │                               │
 * │  Editor Area        │ Assessment Panel (if enabled) │
 * │  (Monaco/Code)      │ - Recording controls          │
 * │                     │ - Permission status           │
 * │                     │ - Diagnostics                 │
 * │                     │                               │
 * ├─────────────────────┴───────────────────────────────┤
 * │ Terminal / Output                                   │
 * └─────────────────────────────────────────────────────┘
 */

export function RoomEditorWithAssessment() {
  const { roomId } = useParams();

  // Local state
  const [roomData, setRoomData] = useState({
    name: 'Interview Room',
    isInterviewMode: false,
    participants: [],
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Assessment hook
  const assessment = useInRoomAssessment();

  // Fetch room data on mount
  useEffect(() => {
    // Load room data from localStorage or API
    const collabActions = JSON.parse(localStorage.getItem('collabActions') || '{}');
    const roomAction = collabActions[roomId];

    if (roomAction) {
      setRoomData(prev => ({
        ...prev,
        isInterviewMode: roomAction.isInterviewMode || false,
      }));
    }
  }, [roomId]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50">
      {/* ====== MAIN LAYOUT ====== */}

      {/* Left: Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-b border-slate-800/50 px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Left: Room Info */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  {roomData.name}
                  {roomData.isInterviewMode && (
                    <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                      Interview Mode
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-1">{roomId}</p>
              </div>
            </div>

            {/* Center: Main Controls */}
            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-medium transition-colors"
              >
                ▶ Run
              </button>
              <button
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 border border-slate-600/30 rounded-lg font-medium transition-colors"
              >
                ◀ Debug
              </button>
            </div>

            {/* Right: Assessment Toggle + Sidebar Toggle */}
            <div className="flex items-center gap-2">
              {/* Assessment Toggle - Only show if interview mode */}
              {roomData.isInterviewMode && (
                <>
                  <AssessmentToggleButton
                    isEnabled={assessment.isAssessmentEnabled}
                    onToggle={assessment.enableAssessment}
                    isRecording={assessment.recordingActive}
                    variant="header"
                  />
                  <div className="w-px h-6 bg-slate-700/50" />
                </>
              )}

              {/* Sidebar Toggle */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-slate-300"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* EDITOR AREA */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* Code Editor */}
          <div className="flex-1 bg-slate-900 border-r border-slate-800/50">
            <div className="p-6">
              <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-sm text-slate-400 border border-slate-700/30">
                {/* Monaco Editor would go here */}
                <p>// Code editor canvas</p>
                <p>function calculateAge(birthYear) &#123;</p>
                <p>&nbsp;&nbsp;return 2026 - birthYear;</p>
                <p>&#125;</p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - Assessment Panel */}
          {isSidebarOpen && roomData.isInterviewMode && (
            <div className="w-96 bg-slate-900 border-l border-slate-800/50 flex flex-col">
              
              {/* Sidebar content - either Assessment Panel or CTA */}
              {assessment.isAssessmentEnabled ? (
                <div className="flex-1 overflow-y-auto">
                  <InRoomAssessmentPanel
                    roomId={roomId}
                    roomName={roomData.name}
                    onClose={() => assessment.disableAssessment()}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/30 mx-auto">
                      🎤
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      Interview Assessment
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enable assessment to start recording and analyzing your interview responses
                    </p>
                    <button
                      onClick={assessment.enableAssessment}
                      className="w-full mt-4 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-medium transition-colors"
                    >
                      Enable Assessment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TERMINAL / OUTPUT */}
        <div className="h-64 bg-slate-900 border-t border-slate-800/50 overflow-y-auto p-4 font-mono text-sm">
          <div className="text-slate-400">
            <p>$ npm run dev</p>
            <p className="text-green-400">✓ Compiled successfully</p>
            <p className="mt-2">Local: http://localhost:5174</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ====================================================================
 * ARCHITECTURE BENEFITS
 * ====================================================================
 * 
 * 1. NON-INTRUSIVE
 *    - Assessment panel is hidden until explicitly enabled
 *    - No automatic modals blocking the workflow
 *    - User has full control
 * 
 * 2. CLEAR VISUAL HIERARCHY
 *    - Header toggle shows assessment state at a glance
 *    - Recording indicator (red dot) visible when active
 *    - Sidebar panel can be toggled/hidden
 * 
 * 3. GRACEFUL DEGRADATION
 *    - If no interview mode: assessment controls never appear
 *    - If permissions denied: helpful diagnostics provided
 *    - No blocking on permission checks
 * 
 * 4. BETTER UX FLOW
 *    
 *    OLD FLOW:
 *    1. Create/Join room → InterviewRecorder modal pops up (blocking)
 *    2. User forced to deal with permissions
 *    3. User can't proceed without allowing/denying
 *    
 *    NEW FLOW:
 *    1. Create/Join room → Opens in editor (no modal)
 *    2. User sees room with assessment toggle available
 *    3. User can work for a while, then enable assessment when ready
 *    4. Permission check happens non-blocking
 *    5. User can grant permissions from within the panel
 * 
 * 5. ACCESSIBLE CONTROLS
 *    - Toggle button in header (always visible)
 *    - Call-to-action button in sidebar when disabled
 *    - Easy to enable/disable without modal
 * 
 * ====================================================================
 * PERMISSION FLOW (Non-Blocking)
 * ====================================================================
 * 
 * User clicks "Enable Assessment"
 *   ↓
 * Panel appears immediately (no wait)
 *   ↓
 * In background: checkPermissionsAsync() runs
 *   ↓
 * Permissions API queried (microphone, camera)
 *   ↓
 * UI updates with results (granted, denied, unknown, etc.)
 *   ↓
 * User can try to record (triggers getUserMedia if needed)
 *   ↓
 * If denied: Helpful message + "Request Again" button
 *   ↓
 * If granted: Start recording works immediately
 * 
 * ====================================================================
 * INTEGRATION CHECKLIST
 * ====================================================================
 * 
 * □ 1. Create useInRoomAssessment hook
 *      → src/hooks/useInRoomAssessment.js ✓
 * 
 * □ 2. Create InRoomAssessmentPanel component
 *      → src/components/interview/InRoomAssessmentPanel.jsx ✓
 * 
 * □ 3. Create AssessmentToggleButton component
 *      → src/components/interview/AssessmentToggleButton.jsx ✓
 * 
 * □ 4. Update editor.jsx with new components
 *      → Import and use useInRoomAssessment
 *      → Add AssessmentToggleButton to header
 *      → Add InRoomAssessmentPanel to sidebar
 * 
 * □ 5. Update CreateRoomModal (REMOVE InterviewRecorder)
 *      → Delete: import InterviewRecorder
 *      → Delete: showInterviewRecorder state
 *      → Delete: conditional rendering
 *      → Keep: simple room creation
 * 
 * □ 6. Update JoinRoomModal (REMOVE InterviewRecorder)
 *      → Delete: import InterviewRecorder
 *      → Delete: showInterviewRecorder state
 *      → Delete: conditional rendering
 *      → Keep: simple room join
 * 
 * □ 7. Pass roomIsInterviewMode to editor
 *      → From localStorage collabActions[roomId].isInterviewMode
 *      → Pass to useInRoomAssessment or conditionally render
 * 
 * □ 8. Test permission flows
 *      → Grant microphone → Should work
 *      → Deny microphone → Should show helpful message
 *      → No device → Should detect and inform
 * 
 * ====================================================================
 */

export default RoomEditorWithAssessment;
