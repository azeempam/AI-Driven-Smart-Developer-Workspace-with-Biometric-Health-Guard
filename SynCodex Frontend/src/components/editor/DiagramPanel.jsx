import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCcw,
  Maximize2,
  Grid3x3,
  GitBranch,
  Activity,
  Layers,
} from 'lucide-react';
import mermaid from 'mermaid';
import { useCodeDiagramEngine } from '../../hooks/useCodeDiagramEngine';
import { useDiagramStore } from '../../stores/useDiagramStore';
import { DiagramType } from '../../types/CODE_TO_DIAGRAM_TYPES';

/**
 * DiagramPanel Component
 * 
 * Displays generated code diagrams in real-time as user types in the editor.
 * Supports multiple diagram types, zooming, panning, and export functionality.
 */
export const DiagramPanel = ({ code, language, isOpen, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Use diagram store for state management
  const {
    currentDiagram,
    isLoading,
    error,
    setZoomLevel: setStoreZoom,
    setPan: setStorePan,
    defaultDiagramType,
    setDefaultDiagramType,
  } = useDiagramStore();

  // Use diagram engine hook
  const { generateDiagram, switchDiagramType, exportDiagram } =
    useCodeDiagramEngine(300, defaultDiagramType, true);

  // Initialize mermaid on mount
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  }, []);

  // Generate/update diagram when code changes
  useEffect(() => {
    if (!code || !language || !isOpen) return;

    const generateAsync = async () => {
      try {
        await generateDiagram(code, language, {
          diagramType: defaultDiagramType,
          includeComments: true,
          maxDepth: 5,
        });
      } catch (err) {
        console.error('Failed to generate diagram:', err);
      }
    };

    generateAsync();
  }, [code, language, defaultDiagramType, generateDiagram, isOpen]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoomLevel + 0.2, 3);
    setZoomLevel(newZoom);
    setStoreZoom(newZoom);
  }, [zoomLevel, setStoreZoom]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoomLevel - 0.2, 0.5);
    setZoomLevel(newZoom);
    setStoreZoom(newZoom);
  }, [zoomLevel, setStoreZoom]);

  // Handle reset zoom
  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
    setStoreZoom(1);
    setStorePan(0, 0);
  }, [setStoreZoom, setStorePan]);

  // Handle panning
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setPanX(panX + dx);
      setPanY(panY + dy);
      setStorePan(panX + dx, panY + dy);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart, panX, panY, setStorePan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle diagram type change
  const handleDiagramTypeChange = useCallback(
    async (type) => {
      setDefaultDiagramType(type);
      try {
        await switchDiagramType(type);
      } catch (err) {
        console.error('Failed to switch diagram type:', err);
      }
    },
    [switchDiagramType, setDefaultDiagramType]
  );

  // Handle export
  const handleExport = useCallback(
    async (format) => {
      try {
        const blob = await exportDiagram(format);
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export diagram:', err);
      }
    },
    [exportDiagram]
  );

  // Diagram type icons
  const diagramTypeIcons = useMemo(
    () => ({
      [DiagramType.FLOWCHART]: <Grid3x3 size={16} />,
      [DiagramType.SEQUENCE]: <Activity size={16} />,
      [DiagramType.STATE]: <GitBranch size={16} />,
      [DiagramType.CLASS]: <Layers size={16} />,
    }),
    []
  );

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-[#2a2d38] border-l border-[#4C5068] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#4C5068] bg-[#21232f]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Grid3x3 size={16} />
          Code Diagram
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#3D415A] rounded transition-colors"
          aria-label="Close diagram panel"
        >
          <X size={16} className="text-gray-300" />
        </button>
      </div>

      {/* Diagram Type Selector */}
      <div className="flex gap-1 p-2 border-b border-[#4C5068] bg-[#21232f] overflow-x-auto">
        {Object.values(DiagramType).map((type) => (
          <button
            key={type}
            onClick={() => handleDiagramTypeChange(type)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors flex items-center gap-1 ${
              defaultDiagramType === type
                ? 'bg-blue-600 text-white'
                : 'bg-[#3D415A] text-gray-300 hover:bg-[#4C5068]'
            }`}
            title={type}
          >
            {diagramTypeIcons[type]}
            {type}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-1 p-2 border-b border-[#4C5068] bg-[#21232f]">
        <div className="flex gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-[#3D415A] rounded transition-colors"
            title="Zoom in"
            disabled={zoomLevel >= 3}
          >
            <ZoomIn size={16} className="text-gray-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-[#3D415A] rounded transition-colors"
            title="Zoom out"
            disabled={zoomLevel <= 0.5}
          >
            <ZoomOut size={16} className="text-gray-300" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 hover:bg-[#3D415A] rounded transition-colors"
            title="Reset zoom and pan"
          >
            <RotateCcw size={16} className="text-gray-300" />
          </button>
          <span className="text-xs text-gray-400 px-2 py-1">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => handleExport('svg')}
            className="p-1 hover:bg-[#3D415A] rounded transition-colors"
            title="Export as SVG"
          >
            <Download size={16} className="text-gray-300" />
          </button>
          <button
            onClick={() => handleExport('png')}
            className="p-1 hover:bg-[#3D415A] rounded transition-colors"
            title="Export as PNG"
          >
            <Maximize2 size={16} className="text-gray-300" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className="flex-1 overflow-auto bg-[#2a2d38]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-xs text-gray-400">Generating diagram...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="h-full flex items-center justify-center p-4">
            <div className="bg-red-900/20 border border-red-700 rounded p-3 text-sm text-red-200">
              <p className="font-semibold mb-1">Error</p>
              <p>{error.message}</p>
            </div>
          </div>
        )}

        {currentDiagram && !isLoading && !error && (
          <div
            className="h-full flex items-center justify-center p-4"
            style={{
              transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div
              className="mermaid"
              dangerouslySetInnerHTML={{
                __html: currentDiagram.mermaidSyntax,
              }}
            />
          </div>
        )}

        {!currentDiagram && !isLoading && !error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-gray-500">
              Open a code file to generate a diagram
            </p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {currentDiagram && (
        <div className="p-2 border-t border-[#4C5068] bg-[#21232f] text-xs text-gray-400">
          <p>
            Nodes: {currentDiagram.nodes?.length || 0} | Edges:{' '}
            {currentDiagram.edges?.length || 0}
          </p>
        </div>
      )}
    </div>
  );
};

export default DiagramPanel;
