/**
 * useWhiteboardSync.js
 *
 * Binds the collaborative whiteboard's entire drawing state to a shared Y.Map.
 * Each shape/stroke/note is a Y.Map entry keyed by a UUID, so concurrent edits
 * from multiple peers merge conflict-free via CRDT semantics.
 *
 * Y.Map structure per element:
 *   key   → elementId (UUID)
 *   value → {
 *     type: 'stroke' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'sticky',
 *     tool, points, x, y, w, h, text, color, strokeWidth,
 *     author: { id, name, color }, createdAt, updatedAt
 *   }
 *
 * Ephemeral awareness extensions (non-persisted, per-peer):
 *   whiteboard.cursor: { x, y }        → live pointer position
 *   whiteboard.activeTool: string       → which tool the peer is using
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import * as Y from 'yjs';

/**
 * @param {Y.Doc | null} yDoc   - Shared Y.Doc from useYjsProvider
 * @param {object | null} provider - WebRTC provider (for awareness)
 * @param {string} roomId
 */
export function useWhiteboardSync(yDoc, provider, roomId) {
  const [elements, setElements] = useState([]); // local reactive snapshot
  const yElementsRef = useRef(null);            // Y.Map<elementId, elementData>
  const historyRef = useRef([]);                // undo stack (local only)

  // ─── 1. Bootstrap shared Y.Map once yDoc is ready ──────────────────────────
  useEffect(() => {
    if (!yDoc) return;

    // Namespace the map per room so a single Y.Doc can host multiple boards
    const yMap = yDoc.getMap(`whiteboard:${roomId}`);
    yElementsRef.current = yMap;

    // Hydrate local state from existing map contents (offline/reconnect case)
    const snapshot = [];
    yMap.forEach((val, key) => snapshot.push({ id: key, ...val }));
    setElements(snapshot);

    // ─── 2. Observe remote changes and apply to local React state ───────────
    const observer = (event) => {
      // Process Yjs event synchronously before passing to React async state updater
      const syncChanges = [];
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'delete') {
          syncChanges.push({ action: 'delete', key });
        } else {
          syncChanges.push({ action: change.action, key, value: yMap.get(key) });
        }
      });

      setElements((prev) => {
        const next = [...prev];
        syncChanges.forEach(({ action, key, value }) => {
          if (action === 'delete') {
            const idx = next.findIndex((el) => el.id === key);
            if (idx !== -1) next.splice(idx, 1);
          } else {
            // 'add' | 'update'
            const idx = next.findIndex((el) => el.id === key);
            if (idx !== -1) {
              next[idx] = { id: key, ...value };
            } else {
              next.push({ id: key, ...value });
            }
          }
        });
        return next;
      });
    };

    yMap.observe(observer);
    return () => yMap.unobserve(observer);
  }, [yDoc, roomId]);

  // ─── 3. Helpers for reading user identity from awareness ───────────────────
  const getAuthor = useCallback(() => {
    if (!provider) return { id: 'local', name: 'You', color: '#4299E1' };
    const state = provider.awareness.getLocalState();
    return state?.user ?? { id: 'local', name: 'You', color: '#4299E1' };
  }, [provider]);

  // ─── 4. Mutation API (all writes go into Y.Map inside a transaction) ────────

  /** Add a brand-new element. Returns the generated id. */
  const addElement = useCallback((elementData) => {
    if (!yElementsRef.current) return null;
    const id = crypto.randomUUID();
    const author = getAuthor();
    const payload = {
      ...elementData,
      author,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    yDoc.transact(() => {
      yElementsRef.current.set(id, payload);
    });
    historyRef.current.push({ type: 'add', id });
    return id;
  }, [yDoc, getAuthor]);

  /** Partially update an existing element (e.g., extend stroke points). */
  const updateElement = useCallback((id, partialData) => {
    if (!yElementsRef.current) return;
    const existing = yElementsRef.current.get(id);
    if (!existing) return;
    yDoc.transact(() => {
      yElementsRef.current.set(id, {
        ...existing,
        ...partialData,
        updatedAt: Date.now(),
      });
    });
    historyRef.current.push({ type: 'update', id, prev: existing });
  }, [yDoc]);

  /** Permanently delete an element. */
  const deleteElement = useCallback((id) => {
    if (!yElementsRef.current) return;
    const existing = yElementsRef.current.get(id);
    yDoc.transact(() => {
      yElementsRef.current.delete(id);
    });
    if (existing) historyRef.current.push({ type: 'delete', id, prev: existing });
  }, [yDoc]);

  /** Undo the last local action (local-only; shared undo requires y-undo). */
  const undoLast = useCallback(() => {
    const last = historyRef.current.pop();
    if (!last || !yElementsRef.current) return;
    yDoc.transact(() => {
      if (last.type === 'add') {
        yElementsRef.current.delete(last.id);
      } else if (last.type === 'update' || last.type === 'delete') {
        yElementsRef.current.set(last.id, last.prev);
      }
    });
  }, [yDoc]);

  /** Wipe the entire board (dangerous — broadcast to all peers). */
  const clearBoard = useCallback(() => {
    if (!yElementsRef.current) return;
    yDoc.transact(() => {
      yElementsRef.current.forEach((_, key) => yElementsRef.current.delete(key));
    });
    historyRef.current = [];
  }, [yDoc]);

  // ─── 5. Ephemeral Cursor Awareness ─────────────────────────────────────────
  const broadcastCursor = useCallback((x, y) => {
    if (!provider) return;
    provider.awareness.setLocalStateField('whiteboard', {
      cursor: { x, y },
      activeTool: provider.awareness.getLocalState()?.whiteboard?.activeTool ?? 'select',
    });
  }, [provider]);

  const broadcastTool = useCallback((tool) => {
    if (!provider) return;
    provider.awareness.setLocalStateField('whiteboard', {
      cursor: provider.awareness.getLocalState()?.whiteboard?.cursor ?? { x: 0, y: 0 },
      activeTool: tool,
    });
  }, [provider]);

  // ─── 6. Peer cursors derived from awareness ─────────────────────────────────
  const [peerCursors, setPeerCursors] = useState([]);

  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;

    const updateCursors = () => {
      const localId = awareness.clientID;
      const cursors = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === localId) return;
        if (state?.whiteboard?.cursor) {
          cursors.push({
            clientId,
            name: state?.user?.name ?? 'Peer',
            color: state?.user?.color ?? '#F56565',
            cursor: state.whiteboard.cursor,
            activeTool: state.whiteboard.activeTool,
          });
        }
      });
      setPeerCursors(cursors);
    };

    awareness.on('change', updateCursors);
    updateCursors();
    return () => awareness.off('change', updateCursors);
  }, [provider]);

  // ─── 7. Serialisation helpers ───────────────────────────────────────────────
  const exportAsJSON = useCallback(() => {
    const data = [];
    if (!yElementsRef.current) return '[]';
    yElementsRef.current.forEach((val, key) => data.push({ id: key, ...val }));
    return JSON.stringify(data, null, 2);
  }, []);

  const importFromJSON = useCallback((jsonString) => {
    if (!yElementsRef.current || !yDoc) return;
    try {
      const parsed = JSON.parse(jsonString);
      yDoc.transact(() => {
        yElementsRef.current.clear();
        parsed.forEach((el) => {
          const { id, ...rest } = el;
          yElementsRef.current.set(id, rest);
        });
      });
    } catch (e) {
      console.error('[Whiteboard] JSON import failed:', e);
    }
  }, [yDoc]);

  return {
    elements,           // live reactive array of all board elements
    addElement,         // (data) => id
    updateElement,      // (id, partial) => void
    deleteElement,      // (id) => void
    undoLast,           // () => void
    clearBoard,         // () => void
    broadcastCursor,    // (x, y) => void
    broadcastTool,      // (tool) => void
    peerCursors,        // [{ clientId, name, color, cursor, activeTool }]
    exportAsJSON,       // () => string
    importFromJSON,     // (str) => void
  };
}
