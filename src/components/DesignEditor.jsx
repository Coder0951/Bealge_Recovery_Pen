import React from 'react';

export default function DesignEditor({ layoutApi }) {
  const { addItem, resetToDefaults } = layoutApi;

  return (
    <div className="design-editor-shell" style={{ position: 'absolute', left: 320, right: '18rem', top: 12, zIndex: 140 }}>
      <div className="design-editor-card" style={{ background: 'rgba(255,255,255,0.95)', color: '#111', padding: '8px 12px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
        <strong style={{ marginRight: 8 }}>Design Mode</strong>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
          {[{
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
          }].map((it) => (
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
  );
}
