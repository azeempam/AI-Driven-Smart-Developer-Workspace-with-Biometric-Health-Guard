/**
 * WhiteboardToolbar.jsx
 * Premium floating toolbar with tool groups, color picker, stroke width slider,
 * and export options.
 */
import React, { useState } from 'react';
import {
  MousePointer2, Pen, Highlighter, Square, Circle, ArrowRight,
  Type, StickyNote, Eraser, Hand, Undo2, Trash2, Download,
  FileJson, ChevronDown, X, Minus, Plus,
} from 'lucide-react';

const PRESET_COLORS = [
  '#e2e8f0', // white-ish
  '#f56565', // red
  '#ed8936', // orange
  '#ecc94b', // yellow
  '#48bb78', // green
  '#4299e1', // blue
  '#9f7aea', // purple
  '#ed64a6', // pink
];

const TOOLS = [
  { id: 'select',      icon: MousePointer2, label: 'Select' },
  { id: 'hand',        icon: Hand,          label: 'Pan' },
  { id: 'pen',         icon: Pen,           label: 'Pen' },
  { id: 'highlighter', icon: Highlighter,   label: 'Highlight' },
  { id: 'rect',        icon: Square,        label: 'Rectangle' },
  { id: 'ellipse',     icon: Circle,        label: 'Ellipse' },
  { id: 'arrow',       icon: ArrowRight,    label: 'Arrow' },
  { id: 'text',        icon: Type,          label: 'Text' },
  { id: 'sticky',      icon: StickyNote,    label: 'Sticky Note' },
  { id: 'eraser',      icon: Eraser,        label: 'Eraser' },
];

export default function WhiteboardToolbar({
  activeTool, onToolChange,
  activeColor, onColorChange,
  strokeWidth, onStrokeWidthChange,
  onUndo, onClear, onExportImage, onExportJSON,
  onClose,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(30, 33, 50, 0.96)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(228, 230, 243, 0.12)',
        borderRadius: 14,
        padding: '6px 10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        userSelect: 'none',
      }}
    >
      {/* ─ Tool Buttons ───────────────────────────────────────────────── */}
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          aria-label={label}
          aria-pressed={activeTool === id}
          onClick={() => onToolChange(id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: activeTool === id
              ? 'rgba(66, 153, 225, 0.25)'
              : 'transparent',
            color: activeTool === id ? '#63b3ed' : '#a0aec0',
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
          onMouseEnter={e => {
            if (activeTool !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            if (activeTool !== id) e.currentTarget.style.background = 'transparent';
          }}
        >
          <Icon size={17} />
          {activeTool === id && (
            <span
              style={{
                position: 'absolute',
                bottom: 2,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#63b3ed',
              }}
            />
          )}
        </button>
      ))}

      {/* ─ Divider ───────────────────────────────────────────────────── */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

      {/* ─ Color Picker ──────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          title="Color"
          aria-label="Color picker"
          onClick={() => setShowColorPicker(!showColorPicker)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '2px solid rgba(255,255,255,0.2)',
            background: activeColor,
            cursor: 'pointer',
            transition: 'transform 0.15s',
          }}
        />
        {showColorPicker && (
          <div
            style={{
              position: 'absolute',
              top: 42,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(26, 29, 46, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 200,
            }}
          >
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                onClick={() => { onColorChange(c); setShowColorPicker(false); }}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: c,
                  border: activeColor === c ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
            {/* Native color input for custom colors */}
            <input
              type="color"
              value={activeColor}
              onChange={(e) => onColorChange(e.target.value)}
              title="Custom color"
              style={{ width: 26, height: 26, borderRadius: 6, cursor: 'pointer', border: 'none', padding: 0 }}
            />
          </div>
        )}
      </div>

      {/* ─ Stroke Width ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          aria-label="Decrease stroke width"
          onClick={() => onStrokeWidthChange(Math.max(1, strokeWidth - 1))}
          style={{ background: 'transparent', border: 'none', color: '#a0aec0', cursor: 'pointer', padding: 2 }}
        >
          <Minus size={13} />
        </button>
        <span style={{ color: '#e2e8f0', fontSize: 12, minWidth: 16, textAlign: 'center' }}>
          {strokeWidth}
        </span>
        <button
          aria-label="Increase stroke width"
          onClick={() => onStrokeWidthChange(Math.min(24, strokeWidth + 1))}
          style={{ background: 'transparent', border: 'none', color: '#a0aec0', cursor: 'pointer', padding: 2 }}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* ─ Divider ───────────────────────────────────────────────────── */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

      {/* ─ Action Buttons ────────────────────────────────────────────── */}
      <button
        title="Undo (Ctrl+Z)"
        aria-label="Undo last action"
        onClick={onUndo}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', color: '#a0aec0', cursor: 'pointer' }}
      >
        <Undo2 size={16} />
      </button>

      <button
        title="Clear board"
        aria-label="Clear all elements"
        onClick={() => {
          if (window.confirm('Clear the entire whiteboard? This affects all collaborators.')) {
            onClear();
          }
        }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', color: '#fc8181', cursor: 'pointer' }}
      >
        <Trash2 size={16} />
      </button>

      {/* Export dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          title="Export"
          aria-label="Export whiteboard"
          onClick={() => setShowExportMenu(!showExportMenu)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 8, border: 'none',
            background: 'rgba(66, 153, 225, 0.2)', color: '#63b3ed',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          <Download size={14} />
          Export
          <ChevronDown size={12} />
        </button>

        {showExportMenu && (
          <div
            style={{
              position: 'absolute', top: 42, right: 0,
              background: 'rgba(26, 29, 46, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 200, minWidth: 160,
            }}
          >
            <button
              onClick={() => { onExportImage(); setShowExportMenu(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '10px 14px', border: 'none',
                background: 'transparent', color: '#e2e8f0', cursor: 'pointer',
                fontSize: 13, textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Download size={14} />
              Export as PNG
            </button>
            <button
              onClick={() => { onExportJSON(); setShowExportMenu(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '10px 14px', border: 'none',
                background: 'transparent', color: '#e2e8f0', cursor: 'pointer',
                fontSize: 13, textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <FileJson size={14} />
              Export as JSON
            </button>
          </div>
        )}
      </div>

      {/* ─ Close ─────────────────────────────────────────────────────── */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
      <button
        title="Close whiteboard"
        aria-label="Close whiteboard panel"
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6, border: 'none',
          background: 'rgba(245, 101, 101, 0.15)', color: '#fc8181', cursor: 'pointer',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
