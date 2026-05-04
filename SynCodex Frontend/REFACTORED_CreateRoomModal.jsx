/**
 * REFACTORED CreateRoomModal
 * 
 * Changes:
 * - Removed: import InterviewRecorder
 * - Removed: showInterviewRecorder state
 * - Removed: setShowInterviewRecorder(true) calls
 * - Removed: Modal conditional rendering
 * - Result: Clean, simple room creation flow with delayed assessment UI
 * 
 * Assessment will be available in the active room, not in the modal
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { X, Plus, Copy, Loader, CheckCircle } from "lucide-react";
import ToggleButton from "../toggleButton";
import axios from "axios";

export default function CreateRoomModal({ onClose }) {
  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [interviewMode, setInterviewMode] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const roomIdRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleRoomCreation = async () => {
    if (!sessionName.trim()) {
      toast.error("Session name is required.");
      return;
    }

    const sessionData = {
      token: localStorage.getItem("token"),
      email: localStorage.getItem("email"),
      roomId: roomId,
      name: sessionName,
      description: sessionDescription,
      isInterviewMode: interviewMode,
    };

    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/rooms/create-room",
        sessionData
      );

      console.log("Session Data :: ", res.data);
      if (res.status === 201) {
        toast.success("Room created successfully!");
        
        // Store room info for access in the editor
        localStorage.setItem(
          "collabActions",
          JSON.stringify({
            ...JSON.parse(localStorage.getItem("collabActions") || "{}"),
            [roomId]: {
              action: "created",
              hostEmail: localStorage.getItem("email"),
              isInterviewMode: interviewMode,
            },
          })
        );

        // Simply open the room - assessment UI will be available there
        window.open(`/collab-editor/${roomId}`, "_blank");
        onClose();
      }
    } catch (error) {
      console.error("Room Creation Failed :", error);
      toast.error("Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const generateRoomId = useCallback(() => {
    let room = "";
    let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 1; i <= 8; i++) {
      let char = Math.floor(Math.random() * str.length);
      room += str.charAt(char);
    }
    setRoomId(room);
  }, []);

  const copyRoomToClipBoard = useCallback(() => {
    if (roomIdRef.current) {
      roomIdRef.current.select();
      navigator.clipboard.writeText(roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }, [roomId]);

  useEffect(() => {
    generateRoomId();
  }, [generateRoomId]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50">
        
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-slate-700/30">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Plus size={24} className="text-cyan-400" />
                Create Room
              </h2>
              <p className="text-sm text-slate-400">Start a new collaboration session</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">

          {/* Session Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Session Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g., JavaScript Interview Round 1"
              className={`
                w-full px-4 py-3 bg-slate-700/40 text-white rounded-lg border transition-all
                focus:outline-none
                ${focusedField === "name"
                  ? "border-cyan-500/50 ring-2 ring-cyan-500/20"
                  : "border-slate-600/50 hover:border-slate-500/50"
                }
                placeholder-slate-500
              `}
            />
          </div>

          {/* Session Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Description (Optional)
            </label>
            <textarea
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              onFocus={() => setFocusedField("description")}
              onBlur={() => setFocusedField(null)}
              placeholder="Add any details about this session..."
              rows="3"
              className={`
                w-full px-4 py-3 bg-slate-700/40 text-white rounded-lg border transition-all resize-none
                focus:outline-none
                ${focusedField === "description"
                  ? "border-cyan-500/50 ring-2 ring-cyan-500/20"
                  : "border-slate-600/50 hover:border-slate-500/50"
                }
                placeholder-slate-500
              `}
            />
          </div>

          {/* Room ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Room ID
            </label>
            <div className="flex gap-2">
              <input
                ref={roomIdRef}
                type="text"
                value={roomId}
                readOnly
                className="flex-1 px-4 py-3 bg-slate-700/60 text-white font-mono text-center rounded-lg border border-slate-600/50 select-none"
              />
              <button
                onClick={copyRoomToClipBoard}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all border
                  ${copied
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border-slate-600/50"
                  }
                `}
              >
                <Copy size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Share this ID with participants</p>
          </div>

          {/* Interview Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-700/30">
            <div>
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                Interview Mode
              </h4>
              <p className="text-xs text-slate-500 mt-1">Enable assessment & recording features</p>
            </div>
            <ToggleButton
              isToggled={interviewMode}
              setIsToggled={setInterviewMode}
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleRoomCreation}
            disabled={loading}
            className={`
              w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
              ${loading
                ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/50"
              }
            `}
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Creating Room...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Create Room
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
