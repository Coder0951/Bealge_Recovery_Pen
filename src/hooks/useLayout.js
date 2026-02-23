import { useEffect, useState, useCallback } from 'react';
import { useConfiguration } from './useConfiguration';

const STORAGE_KEY = (mode) => `penLayout:${mode}`;
const STORAGE_VERSION_KEY = (mode) => `penLayout:${mode}:version`;
const LAYOUT_VERSION = '3';

function withIds(seed) {
  const now = Date.now();
  return {
    beds: (seed.beds || []).map((b, i) => ({ ...b, _id: `bed-${now}-${i}` })),
    bowls: (seed.bowls || []).map((b, i) => ({ ...b, _id: `bowl-${now}-${i}` })),
    pads: (seed.pads || []).map((p, i) => ({ ...p, _id: `pad-${now}-${i}` })),
  };
}

export default function useLayout(mode) {
  const defaultSeed = useConfiguration(mode);
  const [layout, setLayout] = useState(() => {
    try {
      const persistedVersion = localStorage.getItem(STORAGE_VERSION_KEY(mode));
      if (persistedVersion === LAYOUT_VERSION) {
        const raw = localStorage.getItem(STORAGE_KEY(mode));
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      // ignore
    }
    return withIds(defaultSeed);
  });

  const [placingId, setPlacingId] = useState(null);

  useEffect(() => {
    // when mode changes, try to restore saved layout if version matches
    try {
      const persistedVersion = localStorage.getItem(STORAGE_VERSION_KEY(mode));
      if (persistedVersion === LAYOUT_VERSION) {
        const raw = localStorage.getItem(STORAGE_KEY(mode));
        if (raw) {
          setLayout(JSON.parse(raw));
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setLayout(withIds(useConfiguration(mode)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(mode), JSON.stringify(layout));
      localStorage.setItem(STORAGE_VERSION_KEY(mode), LAYOUT_VERSION);
    } catch (e) {
      // ignore
    }
  }, [layout, mode]);

  const setItemPosition = useCallback((itemId, newPosition) => {
    setLayout((cur) => {
      const mapAndReplace = (arr) => arr.map((it) => (it._id === itemId ? { ...it, position: newPosition } : it));
      return {
        beds: mapAndReplace(cur.beds || []),
        bowls: mapAndReplace(cur.bowls || []),
        pads: mapAndReplace(cur.pads || []),
      };
    });
  }, []);

  const setItemRotation = useCallback((itemId, rotationY) => {
    setLayout((cur) => {
      const mapAndReplace = (arr) => arr.map((it) => (it._id === itemId ? { ...it, rotationY } : it));
      return {
        beds: mapAndReplace(cur.beds || []),
        bowls: mapAndReplace(cur.bowls || []),
        pads: mapAndReplace(cur.pads || []),
      };
    });
  }, []);

  const addItem = useCallback((type, props = {}) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item = { rotationY: 0, ...props, _id: id };
    setLayout((cur) => {
      if (type === 'bed') return { ...cur, beds: [...(cur.beds || []), item] };
      if (type === 'bowl') return { ...cur, bowls: [...(cur.bowls || []), item] };
      return { ...cur, pads: [...(cur.pads || []), item] };
    });
    return id;
  }, []);

  const removeItem = useCallback((itemId) => {
    setLayout((cur) => ({
      beds: (cur.beds || []).filter((i) => i._id !== itemId),
      bowls: (cur.bowls || []).filter((i) => i._id !== itemId),
      pads: (cur.pads || []).filter((i) => i._id !== itemId),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    const seed = withIds(useConfiguration(mode));
    setLayout(seed);
  }, [mode]);

  return {
    layout,
    setLayout,
    setItemPosition,
    addItem,
    removeItem,
    resetToDefaults,
    setItemRotation,
    placingId,
    setPlacingId,
  };
}
