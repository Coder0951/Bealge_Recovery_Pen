import React, { useState } from 'react';

export default function DesignEditor({ layoutApi }) {
  const { addItem, resetToDefaults } = layoutApi;
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const items = [{
    key: 'bed-full', title: 'Bed', thumb: <div style={{ width: 48, height: 32, background: '#475569', borderRadius: 4 }} />,
    onStart: () => addItem('bed', { position: null, type: 'full' })
  },{
    key: 'bowl', title: 'Bowl', thumb: <div style={{ width: 32, height: 32, background: '#1f2937', borderRadius: 999 }} />,
    onStart: () => addItem('bowl', { position: null, height: 4.9 })
  },{
    key: 'pad-wash', title: 'Washable', thumb: <div style={{ width: 40, height: 24, background: '#38bdf8', borderRadius: 3 }} />,
    onStart: () => addItem('pad', { position: null, type: 'washable' })
  },{
    key: 'bed-pad', title: 'Interior Bed', thumb: <div style={{ width: 44, height: 28, background: '#94a3b8', borderRadius: 4 }} />,
    onStart: () => addItem('bed', { position: null, type: 'pad' })
  },{
    key: 'pad-disp', title: 'Disposable', thumb: <div style={{ width: 36, height: 18, background: '#fbbf24', borderRadius: 3 }} />,
    onStart: () => addItem('pad', { position: null, type: 'disposable' })
  }];

  const exportCurrent = () => {
    try {
      const cur = layoutApi && layoutApi.layout ? layoutApi.layout : { beds: [], bowls: [], pads: [] };
      // strip internal ids before exporting
      const stripIds = (arr) => (arr || []).map(({ _id, ...rest }) => rest);
      const out = {
        beds: stripIds(cur.beds),
        bowls: stripIds(cur.bowls),
        pads: stripIds(cur.pads)
      };
      const json = JSON.stringify(out, null, 2);

      // copy to clipboard if available
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).catch(() => {});
      }

      // download file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `penLayout-export-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // also write to localStorage as a convenience key
      try { localStorage.setItem('penLayout:custom_export', json); } catch (e) {}

      alert('Layout exported: downloaded and copied to clipboard (if supported).');
    } catch (e) {
      console.error('Export failed', e);
      alert('Export failed — see console.');
    }
  };

  return (
    <>
      <div className="design-editor-shell hidden sm:block" style={{ position: 'absolute', left: 320, right: '18rem', top: 12, zIndex: 140 }}>
        <div className="design-editor-card" style={{ background: 'rgba(255,255,255,0.95)', color: '#111', padding: '8px 12px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <strong style={{ marginRight: 8 }}>Design Mode</strong>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
            {items.map((it) => (
              <div
                key={it.key}
                draggable
                onDragStart={(e) => {
                  const id = it.onStart();
                  e.dataTransfer.setData('text/plain', id);
                  try { const img = document.createElement('canvas'); img.width = 1; img.height = 1; e.dataTransfer.setDragImage(img, 0, 0); } catch (err) {}
                  layoutApi && layoutApi.setPlacingId && layoutApi.setPlacingId(id);
                }}
                onDragEnd={() => {
                  if (layoutApi && layoutApi.placingId) {
                    const cur = layoutApi.layout.beds.concat(layoutApi.layout.bowls, layoutApi.layout.pads);
                    const itx = cur.find((i) => i._id === layoutApi.placingId);
                    if (itx && !itx.position) layoutApi.removeItem(layoutApi.placingId);
                    layoutApi.setPlacingId(null);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab', minWidth: 56 }}
                title={it.title}
              >
                {it.thumb}
                <div style={{ fontSize: 12, marginTop: 6 }}>{it.title}</div>
              </div>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={exportCurrent}>Export Current</button>
            <button onClick={resetToDefaults}>Reset</button>
            <button onClick={() => {
              try {
                const raw = localStorage.getItem('penLayout:custom_backup');
                if (!raw) return alert('No preset backup found.');
                const parsed = JSON.parse(raw);
                layoutApi.setLayout(parsed);
              } catch (e) {
                console.error('Failed to restore preset backup', e);
                alert('Failed to restore preset. See console.');
              }
            }}>Restore Preset</button>
          </div>
        </div>
      </div>

      {/* Mobile: FAB + bottom sheet inventory */}
      <div className="sm:hidden">
        <button
          aria-label="Open inventory"
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-4 bottom-4 z-50 inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg"
        >
          ＋
        </button>

        {isMobileOpen && (
          <div className="fixed inset-0 z-40 flex items-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsMobileOpen(false)} aria-hidden />
            <div className="relative w-full max-h-[70vh] overflow-auto bg-white rounded-t-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Add Items</h3>
                <button onClick={() => setIsMobileOpen(false)} className="text-gray-600">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {items.map((it) => (
                  <button
                    key={it.key}
                    onClick={() => {
                      const id = it.onStart();
                      layoutApi && layoutApi.setPlacingId && layoutApi.setPlacingId(id);
                      setIsMobileOpen(false);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-gray-50"
                  >
                    {it.thumb}
                    <div className="text-sm">{it.title}</div>
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <button onClick={exportCurrent} className="w-full rounded-md py-2 bg-gray-100">Export Current Layout</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
