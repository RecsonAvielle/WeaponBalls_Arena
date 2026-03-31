export class CameraManager {
  constructor() {
    this.ZOOM_STEPS = [0.35, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
    this.zoomIdx = this.ZOOM_STEPS.indexOf(1.0);
    this.wrapper = document.getElementById('canvas-wrapper');
    this.zoomLabel = document.getElementById('zoom-label');

    window._zoomReset = () => { 
      this.zoomIdx = this.ZOOM_STEPS.indexOf(1.0); 
      this.applyZoom(); 
    };
    window._applyZoom = () => this.applyZoom();

    this.applyZoom();

    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      if (this.zoomIdx < this.ZOOM_STEPS.length - 1) { 
        this.zoomIdx++; 
        this.applyZoom(); 
      }
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      if (this.zoomIdx > 0) { 
        this.zoomIdx--; 
        this.applyZoom(); 
      }
    });
  }

  applyZoom() {
    const z       = this.ZOOM_STEPS[this.zoomIdx];
    const canvas  = document.getElementById('game-canvas');
    const baseW   = canvas ? canvas.width  : 560;
    const baseH   = canvas ? canvas.height : 560;
    
    if (this.wrapper) {
      this.wrapper.style.width        = `${baseW}px`;
      this.wrapper.style.height       = `${baseH}px`;
      this.wrapper.style.transform    = `scale(${z})`;
      this.wrapper.style.marginBottom = `${baseH * (z - 1)}px`;
    }
    
    if (this.zoomLabel) {
      this.zoomLabel.textContent      = `${Math.round(z * 100)}%`;
    }
  }
}
