/**
 * WhiteboardCanvas.jsx
 *
 * Rendering Strategy:
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-layer canvas architecture for 60fps performance:
 *
 *  ┌─────────────────────────────┐
 *  │  Layer 1 (committed)        │  ← All FINISHED elements from Y.Map
 *  │  <canvas id="wb-committed"> │    Only redrawn when elements[] changes
 *  └─────────────────────────────┘
 *         ↑ composited together
 *  ┌─────────────────────────────┐
 *  │  Layer 2 (live)             │  ← Active in-progress stroke/shape
 *  │  <canvas id="wb-live">      │    Redrawn on every pointer event (~60fps)
 *  └─────────────────────────────┘
 *
 * This avoids re-drawing all shapes on every mouse-move. The live layer only
 * renders the current in-flight element, then on pointer-up it is committed to
 * Y.Map (which triggers a redraw of the committed layer).
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';

const PIXEL_RATIO = window.devicePixelRatio || 1;
const CANVAS_BG = '#1a1d2e';

// ─── Drawing Utilities ────────────────────────────────────────────────────────

function drawElement(ctx, el) {
  ctx.save();
  ctx.strokeStyle = el.color || '#e2e8f0';
  ctx.fillStyle = el.fillColor || 'transparent';
  ctx.lineWidth = el.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = el.opacity ?? 1;

  switch (el.type) {
    case 'stroke': {
      if (!el.points || el.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        // Catmull-Rom smoothing for freehand
        const prev = el.points[i - 1];
        const curr = el.points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();
      break;
    }
    case 'rect': {
      if (el.fillColor && el.fillColor !== 'transparent') {
        ctx.fillRect(el.x, el.y, el.w, el.h);
      }
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      break;
    }
    case 'ellipse': {
      ctx.beginPath();
      ctx.ellipse(
        el.x + el.w / 2, el.y + el.h / 2,
        Math.abs(el.w / 2), Math.abs(el.h / 2),
        0, 0, Math.PI * 2
      );
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    }
    case 'arrow': {
      if (!el.points || el.points.length < 2) break;
      const start = el.points[0];
      const end = el.points[el.points.length - 1];
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = 14;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = `${el.fontSize || 16}px 'Inter', sans-serif`;
      ctx.fillStyle = el.color || '#e2e8f0';
      ctx.fillText(el.text || '', el.x, el.y);
      break;
    }
    case 'sticky': {
      // Sticky note: filled background + text
      const PAD = 10;
      const W = el.w || 180;
      const H = el.h || 120;
      ctx.fillStyle = el.bgColor || '#f6e05e';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(el.x, el.y, W, H, 6);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.font = `13px 'Inter', sans-serif`;
      ctx.fillStyle = '#2d3748';
      // Wrap text
      const words = (el.text || 'Double-click to edit').split(' ');
      let line = '';
      let lineY = el.y + PAD + 14;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > W - PAD * 2 && line !== '') {
          ctx.fillText(line.trim(), el.x + PAD, lineY);
          line = word + ' ';
          lineY += 18;
        } else {
          line = test;
        }
      }
      ctx.fillText(line.trim(), el.x + PAD, lineY);
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function drawPeerCursor(ctx, peer) {
  const { cursor, name, color } = peer;
  ctx.save();
  ctx.fillStyle = color;
  // Simple SVG-like cursor triangle
  ctx.beginPath();
  ctx.moveTo(cursor.x, cursor.y);
  ctx.lineTo(cursor.x + 10, cursor.y + 14);
  ctx.lineTo(cursor.x + 4, cursor.y + 12);
  ctx.closePath();
  ctx.fill();
  // Name label
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(name || '?', cursor.x + 12, cursor.y + 10);
  ctx.restore();
}

// ─── Main Component ───────────────────────────────────────────────────────────

const WhiteboardCanvas = forwardRef(function WhiteboardCanvas(
  {
    elements,
    activeTool,
    activeColor,
    strokeWidth,
    peerCursors,
    onElementAdd,
    onElementUpdate,
    onCursorMove,
    onCanvasReady,
  },
  ref
) {
  const committedRef = useRef(null); // bottom layer - finished elements
  const liveRef = useRef(null);      // top layer - in-progress drawing
  const containerRef = useRef(null);

  const isDrawingRef = useRef(false);
  const activeIdRef = useRef(null);
  const currentPointsRef = useRef([]);
  const startPosRef = useRef({ x: 0, y: 0 });

  // ─── Canvas sizing / HiDPI ─────────────────────────────────────────────────
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    [committedRef, liveRef].forEach((r) => {
      if (!r.current) return;
      r.current.width = width * PIXEL_RATIO;
      r.current.height = height * PIXEL_RATIO;
      r.current.style.width = `${width}px`;
      r.current.style.height = `${height}px`;
      r.current.getContext('2d').scale(PIXEL_RATIO, PIXEL_RATIO);
    });
  }, []);

  useEffect(() => {
    resizeCanvases();
    const ro = new ResizeObserver(resizeCanvases);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resizeCanvases]);

  // ─── Redraw committed layer when elements change ───────────────────────────
  useEffect(() => {
    const canvas = committedRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width / PIXEL_RATIO;
    const H = canvas.height / PIXEL_RATIO;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < W; x += 28) {
      for (let y = 0; y < H; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    elements.forEach((el) => drawElement(ctx, el));
  }, [elements]);

  // ─── Redraw live layer (peer cursors + in-progress element) ───────────────
  const redrawLive = useCallback((inProgressEl) => {
    const canvas = liveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width / PIXEL_RATIO;
    const H = canvas.height / PIXEL_RATIO;
    ctx.clearRect(0, 0, W, H);

    // Draw in-progress element
    if (inProgressEl) drawElement(ctx, inProgressEl);

    // Draw peer cursors
    peerCursors.forEach((p) => drawPeerCursor(ctx, p));
  }, [peerCursors]);

  // Re-render peer cursors when they update
  useEffect(() => {
    redrawLive(null);
  }, [peerCursors, redrawLive]);

  // ─── Pointer event helpers ─────────────────────────────────────────────────
  const getPos = (e) => {
    const rect = liveRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] ?? e;
    return {
      x: (touch.clientX - rect.left),
      y: (touch.clientY - rect.top),
    };
  };

  const handlePointerDown = useCallback((e) => {
    if (activeTool === 'select' || activeTool === 'hand') return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getPos(e);
    startPosRef.current = pos;
    currentPointsRef.current = [pos];

    if (activeTool === 'sticky') {
      // Immediately commit sticky note
      const id = onElementAdd({
        type: 'sticky',
        x: pos.x, y: pos.y,
        w: 180, h: 120,
        text: '',
        bgColor: '#f6e05e',
        color: activeColor,
        strokeWidth,
      });
      activeIdRef.current = id;
      isDrawingRef.current = false;
      return;
    }

    // Optimistic live preview
    activeIdRef.current = null;
  }, [activeTool, activeColor, strokeWidth, onElementAdd]);

  const handlePointerMove = useCallback((e) => {
    const pos = getPos(e);
    onCursorMove(pos.x, pos.y);

    if (!isDrawingRef.current) return;
    e.preventDefault();
    currentPointsRef.current.push(pos);

    // Build a temporary element for live preview
    const start = startPosRef.current;
    let liveEl = null;
    const base = { color: activeColor, strokeWidth, opacity: 0.9 };

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      liveEl = {
        type: 'stroke',
        points: [...currentPointsRef.current],
        color: activeTool === 'highlighter'
          ? activeColor + '88'
          : activeColor,
        strokeWidth: activeTool === 'highlighter' ? strokeWidth * 4 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.5 : 1,
      };
    } else if (activeTool === 'rect') {
      liveEl = { type: 'rect', ...base, x: start.x, y: start.y, w: pos.x - start.x, h: pos.y - start.y };
    } else if (activeTool === 'ellipse') {
      liveEl = { type: 'ellipse', ...base, x: start.x, y: start.y, w: pos.x - start.x, h: pos.y - start.y };
    } else if (activeTool === 'arrow') {
      liveEl = { type: 'arrow', ...base, points: [start, pos] };
    }

    redrawLive(liveEl);
  }, [activeTool, activeColor, strokeWidth, onCursorMove, redrawLive]);

  const handlePointerUp = useCallback((e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const start = startPosRef.current;
    const end = getPos(e);
    const base = { color: activeColor, strokeWidth };

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      if (currentPointsRef.current.length > 1) {
        onElementAdd({
          type: 'stroke',
          points: [...currentPointsRef.current],
          color: activeTool === 'highlighter' ? activeColor + '88' : activeColor,
          strokeWidth: activeTool === 'highlighter' ? strokeWidth * 4 : strokeWidth,
          opacity: activeTool === 'highlighter' ? 0.5 : 1,
        });
      }
    } else if (activeTool === 'rect') {
      onElementAdd({ type: 'rect', ...base, x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y });
    } else if (activeTool === 'ellipse') {
      onElementAdd({ type: 'ellipse', ...base, x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y });
    } else if (activeTool === 'arrow') {
      onElementAdd({ type: 'arrow', ...base, points: [start, end] });
    } else if (activeTool === 'text') {
      const text = window.prompt('Enter text:');
      if (text) {
        onElementAdd({ type: 'text', ...base, x: start.x, y: start.y, text, fontSize: 16 });
      }
    }

    currentPointsRef.current = [];
    redrawLive(null);
  }, [activeTool, activeColor, strokeWidth, onElementAdd, redrawLive]);

  // ─── Imperative handle: exportAsImage ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    exportAsImage: (filename = 'whiteboard.png') => {
      // Merge committed + live into a temp canvas for export
      const committed = committedRef.current;
      const W = committed.width;
      const H = committed.height;
      const tmp = document.createElement('canvas');
      tmp.width = W;
      tmp.height = H;
      const ctx = tmp.getContext('2d');
      ctx.drawImage(committed, 0, 0);
      ctx.drawImage(liveRef.current, 0, 0);
      tmp.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }, 'image/png');
    },
  }), []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* Layer 1: Committed elements */}
      <canvas
        id="wb-committed"
        ref={committedRef}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      />
      {/* Layer 2: Live drawing + peer cursors */}
      <canvas
        id="wb-live"
        ref={liveRef}
        style={{
          position: 'absolute', inset: 0, touchAction: 'none',
          cursor: activeTool === 'hand' ? 'grab'
            : activeTool === 'select' ? 'default'
            : activeTool === 'eraser' ? 'cell'
            : 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { isDrawingRef.current = false; }}
      />
    </div>
  );
});

export default WhiteboardCanvas;
