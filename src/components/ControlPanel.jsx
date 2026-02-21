import { useState } from 'react';

export default function ControlPanel({
  mode,
  setMode,
  beagleSize,
  setBeagleSize,
  safetyMode,
  setSafetyMode,
  animationEnabled,
  setAnimationEnabled,
  viewMode,
  setViewMode,
  designMode,
  setDesignMode,
  simulationRunning,
  setSimulationRunning,
  topDownLocked,
  setTopDownLocked,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `beagle-recovery-${timestamp}.png`;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  return (
    <>
      <div className="control-panel-shell hidden sm:block">
        <div className="control-panel-header">
        <h2 className="control-panel-title">Recovery Apartment</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="control-panel-collapse"
          aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="control-panel-body">
          <section className="control-panel-section">
            <h3>Recovery Phase</h3>
            <div className="grid grid-cols-1 gap-1">
              {[
                { key: 'icu',      label: 'ICU',        sub: 'Days 1-3' },
                { key: 'recovery', label: 'Recovery',   sub: 'Wk 2-4' },
                { key: 'grad',     label: 'Graduation', sub: 'Wk 8-12' },
                { key: 'optimal',  label: 'Optimal',    sub: 'Balanced' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`control-panel-btn ${mode === m.key ? 'control-panel-btn--active' : ''}`}
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>{m.label}</span>
                  <span style={{ fontSize: '0.7em', opacity: 0.7 }}>{m.sub}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="control-panel-section">
            <h3>Beagle Dimensions</h3>
            <div className="space-y-3">
              <div>
                <label className="control-panel-label">
                  <span>Shoulder Height</span>
                  <span className="font-mono">{beagleSize.shoulder}"</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="14"
                  step="0.5"
                  value={beagleSize.shoulder}
                  onChange={(e) => setBeagleSize({ ...beagleSize, shoulder: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="control-panel-label">
                  <span>Weight</span>
                  <span className="font-mono">{beagleSize.weight} lbs</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="35"
                  step="1"
                  value={beagleSize.weight}
                  onChange={(e) => setBeagleSize({ ...beagleSize, weight: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          <section className="control-panel-section">
            <h3>View</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (topDownLocked) return; // cannot toggle while locked
                  setViewMode(viewMode === 'perspective' ? 'topDown' : 'perspective');
                }}
                className="control-panel-btn control-panel-btn--ghost"
                disabled={topDownLocked}
              >
                {topDownLocked ? '🔒 Top-Down (locked)' : (viewMode === 'perspective' ? '📐 Top-Down' : '🎬 Perspective')}
              </button>
              <button
                onClick={() => setTopDownLocked && setTopDownLocked(!topDownLocked)}
                className="control-panel-btn control-panel-btn--ghost"
              >
                {topDownLocked ? '🔓 Unlock Top-Down' : '🔒 Lock Top-Down'}
              </button>
            </div>
          </section>

          <section className="control-panel-section">
            <h3>Features</h3>
              <div className="space-y-2">
              <label className="control-panel-toggle">
                <span>Safety Audit Mode</span>
                <input
                  type="checkbox"
                  checked={safetyMode}
                  onChange={(e) => setSafetyMode(e.target.checked)}
                />
              </label>
              <label className="control-panel-toggle">
                <span>Animation (Water Indicator)</span>
                <input
                  type="checkbox"
                  checked={animationEnabled}
                  onChange={(e) => setAnimationEnabled(e.target.checked)}
                />
              </label>

              <div>
                <button
                  onClick={() => setDesignMode && setDesignMode(!designMode)}
                  className={`w-full py-2 rounded-md text-sm font-medium ${designMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                  aria-pressed={designMode}
                >
                  {designMode ? 'Design Mode — Active' : 'Enter Design Mode'}
                </button>
              </div>
              <div>
                <button
                  onClick={() => setSimulationRunning && setSimulationRunning(!simulationRunning)}
                  className={`w-full mt-2 py-2 rounded-md text-sm font-medium ${simulationRunning ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                  aria-pressed={simulationRunning}
                >
                  {simulationRunning ? 'Stop Simulation' : 'Simulate Beagle'}
                </button>
              </div>
            </div>
          </section>

          <section className="control-panel-section control-panel-legend">
            <h3>Color Legend</h3>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#475569'}} />
              <span>Slate Grey · Full Bed Bolster (8" high)</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#94a3b8'}} />
              <span>Blue-Grey · Interior Pad Only (3")</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#38bdf8'}} />
              <span>Sky Blue · Washable Pad (36×36")</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#fbbf24'}} />
              <span>Amber Yellow · Disposable Pad (22×22")</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#1f2937'}} />
              <span>Dark Grey · Bowl Stands (4.9" & 8.7")</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#f8b4d9'}} />
              <span>Coral Pink · Floor Mat (1.3" thick)</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#4b5563'}} />
              <span>Steel Grey · Pen Frame (30" high)</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{backgroundColor: '#9ca3af', opacity: 0.3}} />
              <span>Grey Mesh · Walls (semi-transparent)</span>
            </div>
          </section>

          {safetyMode && (
            <section className="control-panel-section control-panel-warning">
              <h4>⚠️ Safety Audit Active</h4>
              <ul>
                <li>Red = 1.5" entry gap (hard surface)</li>
                <li>Yellow = Step transitions</li>
                <li>Check neck angles at bowls</li>
              </ul>
            </section>
          )}
        </div>
      )}
      </div>

      {/* Mobile: FAB + Bottom Sheet (below 640px) */}
      <div className="sm:hidden">
        <button
          aria-label="Open controls"
          onClick={() => setIsMobileOpen(true)}
          className="fixed right-4 bottom-4 z-50 inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg"
        >
          ⚙️
        </button>

        {isMobileOpen && (
          <div className="fixed inset-0 z-40 flex items-end">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden
            />
            <div className="relative w-full max-h-[80vh] overflow-auto bg-white rounded-t-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Controls</h3>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Close controls"
                  className="text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Reuse same body UI (compact) */}
              <div className="space-y-3 text-sm">
                <section>
                  <h4 className="font-medium">Recovery Phase</h4>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { key: 'icu',      label: 'ICU' },
                      { key: 'recovery', label: 'Recovery' },
                      { key: 'grad',     label: 'Graduation' },
                      { key: 'optimal',  label: 'Optimal' },
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={`control-panel-btn ${mode === m.key ? 'control-panel-btn--active' : ''} p-2 text-left`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-medium">View</h4>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        if (topDownLocked) return;
                        setViewMode(viewMode === 'perspective' ? 'topDown' : 'perspective');
                      }}
                      className="control-panel-btn control-panel-btn--ghost p-2 flex-1"
                      disabled={topDownLocked}
                    >
                      {topDownLocked ? '🔒 Top-Down' : (viewMode === 'perspective' ? '📐 Top-Down' : '🎬 Perspective')}
                    </button>
                    <button
                      onClick={() => setTopDownLocked && setTopDownLocked(!topDownLocked)}
                      className="control-panel-btn control-panel-btn--ghost p-2"
                    >
                      {topDownLocked ? '🔓' : '🔒'}
                    </button>
                  </div>
                </section>

                <section>
                  <h4 className="font-medium">Features</h4>
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="control-panel-toggle flex items-center justify-between">
                      <span className="mr-2">Safety Audit</span>
                      <input type="checkbox" checked={safetyMode} onChange={(e) => setSafetyMode(e.target.checked)} />
                    </label>
                    <label className="control-panel-toggle flex items-center justify-between">
                      <span className="mr-2">Animation</span>
                      <input type="checkbox" checked={animationEnabled} onChange={(e) => setAnimationEnabled(e.target.checked)} />
                    </label>
                    <div>
                      <button
                        onClick={() => setDesignMode && setDesignMode(!designMode)}
                        className={`w-full py-2 rounded-md text-sm font-medium ${designMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                        aria-pressed={designMode}
                      >
                        {designMode ? 'Design Mode — Active' : 'Enter Design Mode'}
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => setSimulationRunning && setSimulationRunning(!simulationRunning)}
                        className={`w-full py-2 rounded-md text-sm font-medium ${simulationRunning ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                        aria-pressed={simulationRunning}
                      >
                        {simulationRunning ? 'Stop Simulation' : 'Simulate Beagle'}
                      </button>
                    </div>
                  </div>
                </section>

                <div className="mt-3">
                  <button onClick={handleScreenshot} className="w-full control-panel-btn">Take Screenshot</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
