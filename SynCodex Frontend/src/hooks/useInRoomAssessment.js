/**
 * useInRoomAssessment Hook
 * Manages interview assessment state for active room sessions
 * Non-blocking permission checks and graceful degradation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useInterview } from '../context/InterviewContext';
import { useInterviewRecorder } from './useInterviewRecorder';

export function useInRoomAssessment() {
  const interview = useInterview();
  const recorder = useInterviewRecorder();
  
  // Assessment panel state
  const [isAssessmentEnabled, setIsAssessmentEnabled] = useState(false);
  const [isAssessmentExpanded, setIsAssessmentExpanded] = useState(false);
  
  // Permission states - non-blocking
  const [permissions, setPermissions] = useState({
    microphone: { state: 'unknown', hasDevice: false },
    camera: { state: 'unknown', hasDevice: false },
  });
  
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const permissionCheckTimeoutRef = useRef(null);

  /**
   * Non-blocking permission check
   * Runs in background, doesn't prevent panel from loading
   */
  const checkPermissionsAsync = useCallback(async () => {
    // Don't block - just run in background
    setIsCheckingPermissions(true);
    
    if (permissionCheckTimeoutRef.current) {
      clearTimeout(permissionCheckTimeoutRef.current);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setPermissions(prev => ({
          ...prev,
          microphone: { state: 'unsupported', hasDevice: false },
          camera: { state: 'unsupported', hasDevice: false },
        }));
        setIsCheckingPermissions(false);
        return;
      }

      // Get device list
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some(d => d.kind === 'audioinput');
      const hasCam = devices.some(d => d.kind === 'videoinput');

      // Check Permissions API if available
      let micState = 'unknown';
      let camState = 'unknown';

      if (navigator.permissions) {
        try {
          const micPerm = await navigator.permissions.query({ name: 'microphone' });
          micState = micPerm.state;
        } catch (e) {
          // Browser doesn't support microphone permission query
        }

        try {
          const camPerm = await navigator.permissions.query({ name: 'camera' });
          camState = camPerm.state;
        } catch (e) {
          // Browser doesn't support camera permission query
        }
      }

      setPermissions({
        microphone: { state: micState, hasDevice: hasMic },
        camera: { state: camState, hasDevice: hasCam },
      });
    } catch (err) {
      console.warn('[InRoomAssessment] Permission check error:', err);
      setPermissions(prev => ({
        microphone: { ...prev.microphone, state: 'error' },
        camera: { ...prev.camera, state: 'error' },
      }));
    } finally {
      setIsCheckingPermissions(false);
    }
  }, []);

  /**
   * Request microphone permission
   */
  const requestMicrophonePermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissions(prev => ({
        ...prev,
        microphone: { state: 'granted', hasDevice: true },
      }));
      return true;
    } catch (err) {
      const state = err?.name === 'NotAllowedError' ? 'denied' : 'error';
      setPermissions(prev => ({
        ...prev,
        microphone: { state, hasDevice: prev.microphone.hasDevice },
      }));
      return false;
    }
  }, []);

  /**
   * Request camera permission
   */
  const requestCameraPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setPermissions(prev => ({
        ...prev,
        camera: { state: 'granted', hasDevice: true },
      }));
      return true;
    } catch (err) {
      const state = err?.name === 'NotAllowedError' ? 'denied' : 'error';
      setPermissions(prev => ({
        ...prev,
        camera: { state, hasDevice: prev.camera.hasDevice },
      }));
      return false;
    }
  }, []);

  /**
   * Enable assessment and start permission checks
   */
  const enableAssessment = useCallback(async () => {
    setIsAssessmentEnabled(true);
    // Start non-blocking permission check
    checkPermissionsAsync();
  }, [checkPermissionsAsync]);

  /**
   * Disable assessment and stop recording
   */
  const disableAssessment = useCallback(async () => {
    setIsAssessmentEnabled(false);
    if (recordingActive) {
      await recorder.stopRecording();
      setRecordingActive(false);
    }
  }, [recordingActive, recorder]);

  /**
   * Toggle assessment panel expanded state
   */
  const toggleAssessmentPanel = useCallback(() => {
    setIsAssessmentExpanded(prev => !prev);
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    // Check if at least microphone is granted
    if (permissions.microphone.state !== 'granted') {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        interview.setError('Microphone permission required to record');
        return false;
      }
    }

    const success = await recorder.startRecording();
    if (success) {
      setRecordingActive(true);
    } else {
      interview.setError(interview.error || 'Failed to start recording');
    }
    return success;
  }, [permissions.microphone.state, recorder, interview, requestMicrophonePermission]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    await recorder.stopRecording();
    setRecordingActive(false);
  }, [recorder]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (permissionCheckTimeoutRef.current) {
        clearTimeout(permissionCheckTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Panel state
    isAssessmentEnabled,
    isAssessmentExpanded,
    
    // Permission state
    permissions,
    isCheckingPermissions,
    
    // Recording state
    recordingActive,
    
    // Panel controls
    enableAssessment,
    disableAssessment,
    toggleAssessmentPanel,
    
    // Permission controls
    checkPermissionsAsync,
    requestMicrophonePermission,
    requestCameraPermission,
    
    // Recording controls
    startRecording,
    stopRecording,
    
    // Interview data
    audioLevel: interview.audioLevel,
    recordingTime: interview.recordingTime,
    error: interview.error,
  };
}

export default useInRoomAssessment;
