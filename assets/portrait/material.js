// One material and camera language for the human and portrait sculptures.
export const particleStyle = Object.freeze({
  size: 1.38,
  sizeVariation: 0.4,
  edge: 0.78,
  angle: 0.18,
  rotationPeriod: 6,
  contrast: 1,
  scatter: 0,
  depth: 1,
  framing: 1,
});
export const portraitFrame = 0.88;
export function shadeParticle(n, grain) {
  const facing = Math.max(0, Math.min(1, n[2] + 0.35));
  const facingSmooth = facing * facing * (3 - 2 * facing);
  const light = Math.max(
    0,
    Math.min(1, n[0] * -0.35 + n[1] * -0.2 + n[2] * 0.55),
  );
  return {
    tone: 0.12 + 0.23 * (1 - light),
    alpha: (0.1 + 0.7 * facingSmooth) * (0.84 + 0.16 * grain),
  };
}
export function rotateNormal(n, angle) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c];
}
// Calibrate projected spacing to the actual hero mesh at its 660px framing cap.
// Portraits are composed at 200px. Scale the same dots with the head, never
// add samples when the editor or exported image is larger.
const heroHeadSamples = 2469,
  heroBodyHeight = 532.689,
  headUnits = 68;
export const portraitReferenceCount = Math.round(
  heroHeadSamples *
    ((200 * portraitFrame * 0.5) / ((headUnits * 660) / heroBodyHeight)) ** 2,
);
export const portraitReferenceSize = 200;
export function portraitCount(width, density = 1, maximum = 36000) {
  return Math.min(maximum, Math.round(portraitReferenceCount * density));
}

export const particleMaterialGLSL = `
void sculptureMaterial(vec3 n,float grain,out float tone,out float alpha){
 float facing=smoothstep(-.35,.65,n.z);
 float light=clamp(n.x*-.35+n.y*-.2+n.z*.55,0.0,1.0);
 tone=.12+.23*(1.0-light);
 alpha=(.10+.70*facing)*(.84+.16*grain);
}`;
