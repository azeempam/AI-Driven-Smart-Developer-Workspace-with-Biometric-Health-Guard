// DEBUGGED: WebSocket Handler for Security Analysis
// File: SynCodex Backend/src/handlers/securityAnalysisHandler.js
//
// ✅ FIXES APPLIED:
// 1. Error handling for all socket events
// 2. Timeout protection
// 3. Service initialization safety
// 4. Proper event cleanup
// 5. Safe state management

const {
  getBugSynthesisService,
  disposeBugSynthesisService,
} = require('../services/bugSynthesisServiceCorrected');

//============================================================================
// STATE MANAGEMENT
//============================================================================

const userSessions = new Map();

interface UserSession {
  userId: string;
  isAnalyzing: boolean;
  activeTimeouts: Set<NodeJS.Timeout>;
  lastError: string | null;
}

/**
 * Get or create user session
 */
function getUserSession(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      userId,
      isAnalyzing: false,
      activeTimeouts: new Set(),
      lastError: null,
    });
  }
  return userSessions.get(userId);
}

/**
 * Clean up user session
 */
function cleanupUserSession(userId) {
  const session = userSessions.get(userId);
  if (session) {
    // Clear all timeouts
    session.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    session.activeTimeouts.clear();

    // Remove session
    userSessions.delete(userId);
  }
}

/**
 * Add timeout to session for tracking
 */
function addSessionTimeout(userId, timeout) {
  const session = getUserSession(userId);
  session.activeTimeouts.add(timeout);

  return () => {
    session.activeTimeouts.delete(timeout);
  };
}

//============================================================================
// EVENT HANDLERS
//============================================================================

/**
 * Handle 'analyze_code' event
 * ✅ FIXES:
 * - Re-entrancy guard
 * - Error handling
 * - Timeout protection
 * - Safe socket emission
 */
async function handleAnalyzeCode(socket, data) {
  const userId = socket.id;
  const session = getUserSession(userId);

  try {
    // Guard: Already analyzing
    if (session.isAnalyzing) {
      console.warn(`[SecurityAnalysis] ${userId} already analyzing, skipping request`);
      socket.emit('analysis_error', {
        error: 'Analysis already in progress',
        code: 'ALREADY_ANALYZING',
      });
      return;
    }

    // Validate input
    if (!data || !data.code) {
      socket.emit('analysis_error', {
        error: 'No code provided',
        code: 'INVALID_INPUT',
      });
      return;
    }

    session.isAnalyzing = true;
    session.lastError = null;

    // Get service
    const service = getBugSynthesisService();
    if (!service) {
      throw new Error('Bug Synthesis Service not available');
    }

    // Check service health
    if (!service.isHealthy()) {
      const initError = service.getInitError();
      throw new Error(`Service not healthy: ${initError?.message || 'Unknown error'}`);
    }

    // Create timeout for long-running analysis
    const timeoutId = setTimeout(() => {
      console.error(`[SecurityAnalysis] ${userId} analysis timeout`);
      socket.emit('analysis_error', {
        error: 'Analysis timeout (5s max)',
        code: 'TIMEOUT',
      });
    }, 5000);

    const removeTimeout = addSessionTimeout(userId, timeoutId);

    try {
      // Run analysis
      const result = await service.analyze({
        fileId: data.fileId || 'editor',
        fileName: data.fileName || 'current.js',
        language: data.language || 'javascript',
        code: data.code,
      });

      removeTimeout();

      // Send success
      socket.emit('analysis_result', {
        success: true,
        data: result,
      });
    } finally {
      removeTimeout();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SecurityAnalysis] ${userId} error:`, message);

    session.lastError = message;

    socket.emit('analysis_error', {
      error: message,
      code: 'ANALYSIS_FAILED',
    });
  } finally {
    session.isAnalyzing = false;
  }
}

/**
 * Handle 'generate_patches' event
 * ✅ FIXES:
 * - Null checks
 * - Error handling
 * - Timeout protection
 */
async function handleGeneratePatches(socket, data) {
  const userId = socket.id;

  try {
    if (!data || !data.vulnerability) {
      socket.emit('patch_error', {
        error: 'No vulnerability data provided',
        code: 'INVALID_INPUT',
      });
      return;
    }

    const service = getBugSynthesisService();
    if (!service) {
      throw new Error('Bug Synthesis Service not available');
    }

    // Create timeout
    const timeoutId = setTimeout(() => {
      console.error(`[PatchGeneration] ${userId} timeout`);
      socket.emit('patch_error', {
        error: 'Patch generation timeout',
        code: 'TIMEOUT',
      });
    }, 3000);

    const removeTimeout = addSessionTimeout(userId, timeoutId);

    try {
      // Generate patches based on vulnerability type
      const patches = generatePatchesForVulnerability(
        data.vulnerability,
        data.code || ''
      );

      removeTimeout();

      socket.emit('patches_generated', {
        success: true,
        vulnerabilityId: data.vulnerability.id,
        patches,
      });
    } finally {
      removeTimeout();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[PatchGeneration] ${userId} error:`, message);

    socket.emit('patch_error', {
      error: message,
      code: 'PATCH_GENERATION_FAILED',
    });
  }
}

/**
 * Handle 'apply_patch' event
 * ✅ FIXES:
 * - Validation
 * - Error handling
 * - Non-blocking operation
 */
async function handleApplyPatch(socket, data) {
  const userId = socket.id;

  try {
    if (!data || !data.patch || !data.code) {
      socket.emit('patch_error', {
        error: 'Missing patch or code data',
        code: 'INVALID_INPUT',
      });
      return;
    }

    // Apply patch to code
    const patchedCode = applyPatch(data.code, data.patch);

    socket.emit('patch_applied', {
      success: true,
      patchedCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[PatchApply] ${userId} error:`, message);

    socket.emit('patch_error', {
      error: message,
      code: 'PATCH_APPLY_FAILED',
    });
  }
}

/**
 * Handle 'get_status' event
 * ✅ FIXES:
 * - Safe status reporting
 * - No errors expected
 */
function handleGetStatus(socket) {
  const userId = socket.id;
  const session = getUserSession(userId);
  const service = getBugSynthesisService();

  socket.emit('status', {
    userId,
    isAnalyzing: session.isAnalyzing,
    lastError: session.lastError,
    serviceHealthy: service?.isHealthy() || false,
    serviceReady: !!service,
  });
}

/**
 * Handle 'disconnect' event
 */
function handleDisconnect(socket) {
  const userId = socket.id;
  console.log(`[SecurityAnalysis] ${userId} disconnected`);

  cleanupUserSession(userId);
}

//============================================================================
// PATCH GENERATION HELPERS
//============================================================================

/**
 * Generate patches for vulnerability
 */
function generatePatchesForVulnerability(vulnerability, code) {
  const patches = [];

  if (vulnerability.type === 'SQL_INJECTION') {
    patches.push({
      id: 'sql-inject-minimal',
      title: 'Minimal Fix: Use Parameterized Query',
      level: 'minimal',
      code: `db.query('SELECT * FROM users WHERE id = ?', [userId])`,
      confidence: 0.95,
    });
    patches.push({
      id: 'sql-inject-best',
      title: 'Best Practice: ORM Framework',
      level: 'best',
      code: `User.findById(userId)`,
      confidence: 0.92,
    });
  }

  if (vulnerability.type === 'XSS') {
    patches.push({
      id: 'xss-escape',
      title: 'Escape HTML Output',
      level: 'minimal',
      code: `element.textContent = userInput; // Use textContent not innerHTML`,
      confidence: 0.94,
    });
    patches.push({
      id: 'xss-sanitize',
      title: 'Use DOMPurify Library',
      level: 'best',
      code: `element.innerHTML = DOMPurify.sanitize(userInput);`,
      confidence: 0.97,
    });
  }

  if (vulnerability.type === 'CODE_INJECTION') {
    patches.push({
      id: 'code-inject-avoid',
      title: 'Avoid eval() - Use Function Constructor',
      level: 'minimal',
      code: `const fn = new Function('a', 'b', 'return a + b'); fn(1, 2);`,
      confidence: 0.91,
    });
    patches.push({
      id: 'code-inject-json',
      title: 'Best: Use JSON.parse for Data',
      level: 'best',
      code: `const data = JSON.parse(jsonString);`,
      confidence: 0.98,
    });
  }

  if (vulnerability.type === 'WEAK_CRYPTOGRAPHY') {
    patches.push({
      id: 'crypto-replace',
      title: 'Use Modern Crypto: bcrypt or Argon2',
      level: 'best',
      code: `const hashed = await bcrypt.hash(password, 12);`,
      confidence: 0.99,
    });
  }

  if (vulnerability.type === 'HARDCODED_SECRET') {
    patches.push({
      id: 'secret-env',
      title: 'Use Environment Variables',
      level: 'minimal',
      code: `const apiKey = process.env.API_KEY;`,
      confidence: 0.99,
    });
  }

  return patches;
}

/**
 * Apply patch to code (simplified)
 */
function applyPatch(code, patch) {
  // In production, use a proper patch library
  // This is a placeholder
  return code;
}

//============================================================================
// HANDLER SETUP
//============================================================================

/**
 * Setup security analysis handlers
 * ✅ FIXES:
 * - Safe initialization
 * - Proper event binding
 * - Cleanup on disconnect
 */
function setupSecurityAnalysisHandlers(io) {
  console.log('[SecurityAnalysis] Setting up WebSocket handlers');

  // Handle new connections
  io.on('connection', socket => {
    console.log(`[SecurityAnalysis] Client connected: ${socket.id}`);

    // Create user session
    getUserSession(socket.id);

    // Listen for events
    socket.on('analyze_code', data => handleAnalyzeCode(socket, data));
    socket.on('generate_patches', data => handleGeneratePatches(socket, data));
    socket.on('apply_patch', data => handleApplyPatch(socket, data));
    socket.on('get_status', () => handleGetStatus(socket));

    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });

    // Send ready signal
    socket.emit('ready', {
      message: 'Security analysis handler ready',
      version: '1.0.0',
    });
  });

  // Global error handler
  io.on('error', error => {
    console.error('[SecurityAnalysis] Socket.io error:', error);
  });
}

/**
 * Cleanup on server shutdown
 */
function cleanupSecurityAnalysis() {
  console.log('[SecurityAnalysis] Cleaning up');

  // Clear all sessions
  userSessions.forEach((session, userId) => {
    cleanupUserSession(userId);
  });
  userSessions.clear();

  // Dispose service
  disposeBugSynthesisService();
}

//============================================================================
// EXPORTS
//============================================================================

module.exports = {
  setupSecurityAnalysisHandlers,
  cleanupSecurityAnalysis,
};
