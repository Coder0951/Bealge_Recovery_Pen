import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { useState, useEffect, useRef } from 'react';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';
import DesignEditor from './components/DesignEditor';
import useLayout from './hooks/useLayout';
import { useConfiguration } from './hooks/useConfiguration';
import DragDropBridge from './components/DragDropBridge';
import './App.css';

function App() {
  const [mode, setMode] = useState('optimal'); // 'icu' | 'recovery' | 'grad' | 'optimal'
  const [beagleSize, setBeagleSize] = useState({ shoulder: 12, length: 24, weight: 28 });
  const [safetyMode, setSafetyMode] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [viewMode, setViewMode] = useState('perspective'); // 'perspective' | 'topDown'
  const [designMode, setDesignMode] = useState(false);
  const [prevViewMode, setPrevViewMode] = useState(null);
  const [topDownLocked, setTopDownLocked] = useState(false);

  const layoutApi = useLayout(mode);

  // helper to add stable ids to a layout object
  const addIdsToLayout = (seed) => {
    const now = Date.now();
    return {
      beds: (seed.beds || []).map((b, i) => ({ ...b, _id: `custom-bed-${now}-${i}` })),
      bowls: (seed.bowls || []).map((b, i) => ({ ...b, _id: `custom-bowl-${now}-${i}` })),
      pads: (seed.pads || []).map((p, i) => ({ ...p, _id: `custom-pad-${now}-${i}` })),
    };
  };

  const toggleDesignMode = (enabled) => {
    if (enabled) {
      // backup current preset into localStorage under custom_backup
      try {
        // prefer backing up the current editable layout if present
        const current = layoutApi && layoutApi.layout ? layoutApi.layout : useConfiguration(mode);
        const withIds = addIdsToLayout(current);
        localStorage.setItem('penLayout:custom_backup', JSON.stringify(withIds));
      } catch (e) {
        // ignore
      }

      // clear editable layout to present an empty pen for custom design
      layoutApi.setLayout({ beds: [], bowls: [], pads: [] });
      // remember previous view and switch to top-down for design
      setPrevViewMode(viewMode);
      setViewMode('topDown');
    }
    if (!enabled) {
      // restore previous view if any, unless topDownLocked is active
      if (!topDownLocked && prevViewMode) setViewMode(prevViewMode);
      setPrevViewMode(null);
    }
    setDesignMode(enabled);
  };

  // enforce top-down when locked
  useEffect(() => {
    if (topDownLocked) setViewMode('topDown');
  }, [topDownLocked]);

  const cameraRef = useRef();
  const controlsRef = useRef();

  useEffect(() => {
    if (!cameraRef.current) return;
    // when entering top-down mode ensure camera is exactly overhead and looking at origin
    if (viewMode === 'topDown') {
      try {
        cameraRef.current.position.set(0, 100, 0);
        cameraRef.current.lookAt(0, 0, 0);
      } catch (e) {}
    }
    // when lock changed, enforce controls state
    if (controlsRef.current) {
      controlsRef.current.enablePan = !topDownLocked;
      controlsRef.current.enableZoom = !topDownLocked;
      controlsRef.current.enableRotate = !topDownLocked;
      controlsRef.current.target.set(0, 0, 0);
      try { controlsRef.current.update(); } catch (e) {}
    }
  }, [viewMode, topDownLocked]);

  return (
    <div className="app-shell">
      <div className="app-shell__halo" aria-hidden="true" />
      <div className="app-shell__grid" aria-hidden="true" />

      <div className="canvas-panel">
        <div className="canvas-card">
          <Canvas
            shadows
            gl={{ localClippingEnabled: true }}
            style={{ height: '100%', width: '100%' }}
            className="scene-canvas"
          >
            <PerspectiveCamera
              ref={cameraRef}
              makeDefault
              position={viewMode === 'topDown' ? [0, 100, 0] : [60, 40, 60]}
              fov={50}
            />

            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 20, 10]}
              intensity={1}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <Environment preset="apartment" />

            {/* Scene with all 3D objects */}
            <Scene
              mode={mode}
              beagleSize={beagleSize}
              safetyMode={safetyMode}
              animationEnabled={animationEnabled}
              layout={designMode ? layoutApi.layout : undefined}
              layoutApi={designMode ? layoutApi : undefined}
            />

            {designMode && layoutApi && <DragDropBridge layoutApi={layoutApi} />}

            {/* Ground shadows */}
            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.4}
              scale={100}
              blur={2}
              far={10}
            />

            {/* Camera controls */}
            <OrbitControls
              ref={controlsRef}
              enablePan={!topDownLocked}
              enableZoom={!topDownLocked}
              enableRotate={!topDownLocked}
              enabled={!topDownLocked}
              minPolarAngle={topDownLocked ? Math.PI / 2 : 0}
              maxPolarAngle={topDownLocked ? Math.PI / 2 : Math.PI / 2.2}
              target={[0, 0, 0]}
            />
          </Canvas>
        </div>
      </div>

      {/* UI Overlay */}
      <ControlPanel
        mode={mode}
        setMode={setMode}
        beagleSize={beagleSize}
        setBeagleSize={setBeagleSize}
        safetyMode={safetyMode}
        setSafetyMode={setSafetyMode}
        animationEnabled={animationEnabled}
        setAnimationEnabled={setAnimationEnabled}
        viewMode={viewMode}
        setViewMode={setViewMode}
        designMode={designMode}
        setDesignMode={toggleDesignMode}
        topDownLocked={topDownLocked}
        setTopDownLocked={setTopDownLocked}
      />

      {designMode && <DesignEditor layoutApi={layoutApi} />}

      <div className="data-strip">
        <span>Recovery Apartment</span>
        <span>Configuration: {{
          icu: 'ICU (Days 1-3)',
          recovery: 'Recovery (Wk 2-4)',
          grad: 'Graduation (Wk 8-12)',
          optimal: 'Optimal (Balanced)'
        }[mode] || mode}</span>
        <span>View: {viewMode === 'perspective' ? 'Perspective' : 'Top-Down'}</span>
      </div>
    </div>
  );
}

export default App;
