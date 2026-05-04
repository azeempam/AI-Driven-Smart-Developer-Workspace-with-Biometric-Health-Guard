/**
 * REFACTORED JoinRoomModal
 * 
 * Changes:
 * - Removed: import InterviewRecorder
 * - Removed: showInterviewRecorder state
 * - Removed: setShowInterviewRecorder(true) calls
 * - Removed: Modal conditional rendering
 * - Result: Clean, simple room join flow with delayed assessment UI
 * 
 * Assessment will be available in the active room, not in the modal
 */

import { X, LogIn, Shield, Loader } from "lucide-react";
import { toast } from "react-toastify";
import { useState } from "react";
import axios from "axios";

export default function JoinRoomModal({ onClose }) {
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitButton, setSubmitButton] = useState("Check Room");
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [roomAvail, setRoomAvail] = useState(false);
  const [hostEmail, setHostEmail] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [focused, setFocused] = useState(false);

  const checkRoom = async () => {
    if (!joinRoomId.trim()) {
      toast.error("Please Enter Room ID To Join.");
      return;
    }
    
    setSubmitButton("Checking room...");
    try {
      const res = await axios.post(
        "http://localhost:5000/api/rooms/check-room",
        { roomId: joinRoomId }
      );

      if (res.status === 404) {
        setSubmitButton("Check Room");
        toast.error("Room Not Found.");
        return;
      }
      if (res.status === 200) {
        setSubmitButton("Join Room");
        setRoomAvail(true);
        setHostEmail(res.data.ownerEmail);
        setIsInterviewMode(res.data.isInterviewMode);
        setRoomName(res.data.name || joinRoomId);
        console.log("Room found :: ", res.data);
      }
    } catch (error) {
      console.error("Room Checking Failed:", error);
      toast.error("Failed to check room. It may not exist.");
      setSubmitButton("Check Room");
    } 
  };

  const joinRoom = async () => {
    if (!joinRoomId.trim()) {
      toast.error("Please Enter Room ID To Join.");
      return;
    }
    setLoading(true);
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
        setSubmitButton("Check Room");
        
        // Store room info for access in the editor
        localStorage.setItem(
          "collabActions",
          JSON.stringify({
            ...JSON.parse(localStorage.getItem("collabActions") || "{}"),
            [joinRoomId]: {
              action: "joined",
              hostEmail: hostEmail,
              isInterviewMode: isInterviewMode,
            },
          })
        );

        // Simply open the room - assessment UI will be available there
        window.open(`/collab-editor/${joinRoomId}`, "_blank");
        onClose();
      }
    } catch (error) {
      console.error("Room Join Failed:", error);
      toast.error("Failed to join room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50">
        
        {/* Header Section */}
        <div className="relative px-8 pt-8 pb-6 border-b border-slate-700/30">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <LogIn size={24} className="text-cyan-400" />
                Join Room
              </h2>
              <p className="text-sm text-slate-400">Connect to an active collaboration session</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-8 py-6 space-y-6">
          
          {/* Room ID Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              Room ID
            </label>
            <div className={`relative transition-all duration-300 ${focused ? 'ring-2 ring-cyan-500/30' : ''}`}>
              <input 
                type="text" 
                value={joinRoomId} 
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Enter 8-character code" 
                className="w-full px-4 py-3 bg-slate-700/40 text-white rounded-lg border border-slate-600/50 focus:border-cyan-500/50 focus:outline-none transition-all placeholder-slate-500 text-center tracking-widest font-mono text-lg"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Get this code from the room creator</p>
          </div>

          {/* Room Details (shown after checking) */}
          {roomAvail && (
            <div className="p-4 bg-slate-700/20 rounded-lg border border-slate-700/30 space-y-2">
              <div>
                <p className="text-xs text-slate-500">Room Name</p>
                <p className="text-sm font-semibold text-white">{roomName}</p>
              </div>
              {isInterviewMode && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-700/30">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  <p className="text-xs text-orange-400">Interview Mode Enabled</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!roomAvail ? (
              <button
                onClick={checkRoom}
                className="w-full py-3 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/50"
              >
                Check Room
              </button>
            ) : (
              <>
                <button
                  onClick={joinRoom}
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
                      Joining...
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Join Room
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setRoomAvail(false);
                    setJoinRoomId("");
                    setSubmitButton("Check Room");
                  }}
                  className="w-full py-2 px-4 rounded-lg font-medium transition-all bg-slate-700/20 text-slate-300 hover:bg-slate-700/40 border border-slate-700/30"
                >
                  Back
                </button>
              </>
            )}
          </div>

          {/* Info Text */}
          <div className="p-3 bg-slate-700/10 rounded-lg border border-slate-700/20">
            <p className="text-xs text-slate-400">
              💡 <strong>Tip:</strong> Ask the room creator for the 8-character Room ID. Assessment features will be available once you join.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
