/**
 * useDiagramStore.ts
 * 
 * Zustand store for managing diagram panel state and user preferences.
 * Handles persistence to localStorage for session recovery.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DiagramPanelState,
  DiagramPanelPreferences,
  DiagramType,
  DiagramTheme,
  GeneratedDiagram,
  DiagramNode,
  CodeDiagramError,
} from '../types/CODE_TO_DIAGRAM_TYPES';

interface DiagramStore extends DiagramPanelState, DiagramPanelPreferences {
  // State setters
  setIsOpen: (isOpen: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setCurrentDiagram: (diagram: GeneratedDiagram | null) => void;
  setSelectedNode: (node: DiagramNode | null) => void;
  setZoomLevel: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setDimensions: (width: number, height: number) => void;
  setError: (error: CodeDiagramError | null) => void;

  // Preference setters
  setDefaultDiagramType: (type: DiagramType) => void;
  setAutoUpdate: (autoUpdate: boolean) => void;
  setUpdateDebounceMs: (ms: number) => void;
  setShowTypes: (show: boolean) => void;
  setShowComments: (show: boolean) => void;
  setTheme: (theme: DiagramTheme) => void;
  setPanelPosition: (position: 'left' | 'right' | 'bottom') => void;
  setPanelSize: (size: 'small' | 'medium' | 'large') => void;

  // Batch operations
  resetState: () => void;
  resetPreferences: () => void;
}

const defaultPreferences: DiagramPanelPreferences = {
  defaultDiagramType: DiagramType.FLOWCHART,
  autoUpdate: true,
  updateDebounceMs: 300,
  showTypes: true,
  showComments: false,
  theme: DiagramTheme.DARK,
  panelPosition: 'right',
  panelSize: 'medium',
  enableExport: true,
  cacheSize: 50,
};

const defaultState: DiagramPanelState = {
  isOpen: false,
  isLoading: false,
  currentDiagram: null,
  selectedNode: null,
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  width: 400,
  height: 600,
  error: null,
  diagramType: DiagramType.FLOWCHART,
  theme: DiagramTheme.DARK,
};

/**
 * Zustand store for diagram panel state
 */
export const useDiagramStore = create<DiagramStore>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultState,
      ...defaultPreferences,

      // State setters
      setIsOpen: (isOpen) => set({ isOpen }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setCurrentDiagram: (currentDiagram) => set({ currentDiagram }),
      setSelectedNode: (selectedNode) => set({ selectedNode }),
      setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.max(0.5, Math.min(3, zoomLevel)) }),
      setPan: (panX, panY) => set({ panX, panY }),
      setDimensions: (width, height) => set({ width, height }),
      setError: (error) => set({ error }),

      // Preference setters
      setDefaultDiagramType: (defaultDiagramType) => set({ defaultDiagramType }),
      setAutoUpdate: (autoUpdate) => set({ autoUpdate }),
      setUpdateDebounceMs: (updateDebounceMs) => set({ updateDebounceMs }),
      setShowTypes: (showTypes) => set({ showTypes }),
      setShowComments: (showComments) => set({ showComments }),
      setTheme: (theme) => set({ theme }),
      setPanelPosition: (panelPosition) => set({ panelPosition }),
      setPanelSize: (panelSize) => set({ panelSize }),

      // Batch operations
      resetState: () => set(defaultState),
      resetPreferences: () => set(defaultPreferences),
    }),
    {
      name: 'syncodex-diagram-store',
      version: 1,
      storage: typeof window !== 'undefined' 
        ? {
            getItem: (name) => {
              const item = localStorage.getItem(name);
              return item ? JSON.parse(item) : null;
            },
            setItem: (name, value) => {
              localStorage.setItem(name, JSON.stringify(value));
            },
            removeItem: (name) => {
              localStorage.removeItem(name);
            },
          }
        : undefined,
      partialize: (state) => ({
        // Only persist preferences, not transient state
        defaultDiagramType: state.defaultDiagramType,
        autoUpdate: state.autoUpdate,
        updateDebounceMs: state.updateDebounceMs,
        showTypes: state.showTypes,
        showComments: state.showComments,
        theme: state.theme,
        panelPosition: state.panelPosition,
        panelSize: state.panelSize,
        enableExport: state.enableExport,
        cacheSize: state.cacheSize,
        isOpen: state.isOpen, // Persist panel open state
      }),
    }
  )
);

/**
 * Hooks for common diagram store operations
 */
export function useDiagramPanelState() {
  return useDiagramStore((state) => ({
    isOpen: state.isOpen,
    isLoading: state.isLoading,
    currentDiagram: state.currentDiagram,
    selectedNode: state.selectedNode,
    error: state.error,
  }));
}

export function useDiagramPanelControls() {
  return useDiagramStore((state) => ({
    setIsOpen: state.setIsOpen,
    setIsLoading: state.setIsLoading,
    setCurrentDiagram: state.setCurrentDiagram,
    setSelectedNode: state.setSelectedNode,
    setError: state.setError,
  }));
}

export function useDiagramPreferences() {
  return useDiagramStore((state) => ({
    defaultDiagramType: state.defaultDiagramType,
    autoUpdate: state.autoUpdate,
    updateDebounceMs: state.updateDebounceMs,
    showTypes: state.showTypes,
    showComments: state.showComments,
    theme: state.theme,
    panelPosition: state.panelPosition,
    panelSize: state.panelSize,
    enableExport: state.enableExport,
    cacheSize: state.cacheSize,
  }));
}

export function useDiagramViewport() {
  return useDiagramStore((state) => ({
    zoomLevel: state.zoomLevel,
    panX: state.panX,
    panY: state.panY,
    width: state.width,
    height: state.height,
    setZoomLevel: state.setZoomLevel,
    setPan: state.setPan,
    setDimensions: state.setDimensions,
  }));
}

export function useDiagramActions() {
  return useDiagramStore((state) => ({
    setTheme: state.setTheme,
    setDefaultDiagramType: state.setDefaultDiagramType,
    setAutoUpdate: state.setAutoUpdate,
    resetState: state.resetState,
    resetPreferences: state.resetPreferences,
  }));
}

export default useDiagramStore;
