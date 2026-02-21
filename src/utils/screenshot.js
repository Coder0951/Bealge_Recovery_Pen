export function captureScreenshot(gl, scene, camera) {
  // Render the current frame
  gl.render(scene, camera);
  
  // Get the canvas element
  const canvas = gl.domElement;
  
  // Create a link element to download
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.download = `beagle-recovery-apartment-${timestamp}.png`;
  
  // Convert canvas to blob and download
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  });
}
