import { useState } from 'react';
import { Html } from '@react-three/drei';

export function MeasurementTooltip({ visible, position, dimensions, title }) {
  if (!visible) return null;

  return (
    <Html position={position} center>
      <div className="bg-black/80 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
        <div className="font-bold text-xs mb-1">{title}</div>
        <div className="text-xs font-mono">{dimensions}</div>
      </div>
    </Html>
  );
}

export function useMeasurementTooltip() {
  const [tooltip, setTooltip] = useState({
    visible: false,
    position: [0, 0, 0],
    dimensions: '',
    title: ''
  });

  const showTooltip = (position, dimensions, title) => {
    setTooltip({ visible: true, position, dimensions, title });
  };

  const hideTooltip = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  return { tooltip, showTooltip, hideTooltip };
}
