/**
 * WhiteboardPanel.jsx
 *
 * Slide-out floating panel that houses the whiteboard. It can be opened as:
 *   - A side-panel (slide in from right, stacks beside the Monaco editor)
 *   - A full-overlay modal
 *
 * The panel is rendered as a portal so it sits on top of Monaco without
 * affecting the editor's DOM layout.
 */
import React, {
  useRef, useState, useEffect, useCallback, useCallback as usecb,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import WhiteboardCanvas from './WhiteboardCanvas';
import WhiteboardToolbar from './WhiteboardToolbar';
import { useWhiteboardSync } from '../../hooks/useWhiteboardSync';
import { Maximize2, Minimize2, PenLine, Users } from 'lucide-react';

const PANEL_WIDTH = 640;

export default function WhiteboardPanel({
  yDoc,
  provider,
  roomId,
  isOpen,
  onClose,
}) {
  const canvasRef = useRef(null);

  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#e2e8f0');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    elements,
    addElement,
    updateElement,
    deleteElement,
    undoLast,
    clearBoard,
    broadcastCursor,
    broadcastTool,
    peerCursors,
    exportAsJSON,
    importFromJSON,
  } = useWhiteboardSync(yDoc, provider, roomId);

  // ─── Keep awareness tool in sync ─────────────────────────────────────────
  useEffect(() => {
    broadcastTool(activeTool);
  }, [activeTool, broadcastTool]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLast(); }
      if (e.key === 'Escape') onClose();
      // Tool shortcuts
      const map = { p: 'pen', h: 'highlighter', r: 'rect', c: 'ellipse', a: 'arrow', t: 'text', s: 'sticky', e: 'eraser', v: 'select' };
      if (!e.ctrlKey && !e.metaKey && !e.altKey && map[e.key]) setActiveTool(map[e.key]);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, undoLast, onClose]);

  // ─── Export helpers ───────────────────────────────────────────────────────
  const handleExportImage = useCallback(() => {
    canvasRef.current?.exportAsImage(`syncodex-whiteboard-${roomId}.png`);
  }, [roomId]);

  const handleExportJSON = useCallback(() => {
    const json = exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `syncodex-whiteboard-${roomId}.json`;
    a.click();
  }, [exportAsJSON, roomId]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const panelContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim (only in fullscreen mode) */}
          {isFullscreen && (
            <motion.div
              key="wb-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                zIndex: 1000, backdropFilter: 'blur(4px)',
              }}
            />
          )}

          {/* Panel */}
          <motion.div
            key="wb-panel"
            initial={{ x: PANEL_WIDTH, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: PANEL_WIDTH, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed',
              top: isFullscreen ? '5vh' : '64px',        // below EditorNav
              right: 0,
              bottom: isFullscreen ? '5vh' : '24px',     // above status bar
              width: isFullscreen ? '92vw' : PANEL_WIDTH,
              left: isFullscreen ? '4vw' : 'auto',
              zIndex: 1001,
              borderRadius: isFullscreen ? 16 : '16px 0 0 16px',
              overflow: 'hidden',
              background: '#1a1d2e',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex', alignItems: 'center',
                padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <PenLine size={16} style={{ color: '#63b3ed' }} />
                <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>
                  Collaborative Whiteboard
                </span>
                {peerCursors.length > 0 && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'rgba(72, 187, 120, 0.15)',
                      border: '1px solid rgba(72, 187, 120, 0.3)',
                      borderRadius: 20, padding: '2px 8px',
                    }}
                  >
                    <Users size={11} style={{ color: '#68d391' }} />
                    <span style={{ color: '#68d391', fontSize: 11, fontWeight: 600 }}>
                      {peerCursors.length + 1} drawing
                    </span>
                  </div>
                )}
              </div>

              {/* Peer avatar stack */}
              <div style={{ display: 'flex', gap: -4, marginRight: 10 }}>
                {peerCursors.slice(0, 4).map((p) => (
                  <div
                    key={p.clientId}
                    title={p.name}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: p.color,
                      border: '2px solid #1a1d2e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 10, fontWeight: 700,
                      marginLeft: -6,
                    }}
                  >
                    {p.name ? p.name[0].toUpperCase() : '?'}
                  </div>
                ))}
              </div>

              <button
                title={isFullscreen ? 'Collapse' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Collapse whiteboard' : 'Expand whiteboard to fullscreen'}
                onClick={() => setIsFullscreen((v) => !v)}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#a0aec0', cursor: 'pointer', padding: 4,
                }}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>

            {/* ── Canvas area (takes remaining height) ─────────────────── */}
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
              <WhiteboardToolbar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                activeColor={activeColor}
                onColorChange={setActiveColor}
                strokeWidth={strokeWidth}
                onStrokeWidthChange={setStrokeWidth}
                onUndo={undoLast}
                onClear={clearBoard}
                onExportImage={handleExportImage}
                onExportJSON={handleExportJSON}
                onClose={onClose}
              />

              <WhiteboardCanvas
                ref={canvasRef}
                elements={elements}
                activeTool={activeTool}
                activeColor={activeColor}
                strokeWidth={strokeWidth}
                peerCursors={peerCursors}
                onElementAdd={addElement}
                onElementUpdate={updateElement}
                onCursorMove={broadcastCursor}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render into a portal so it floats above Monaco without layout disruption
  return createPortal(panelContent, document.body);
}
