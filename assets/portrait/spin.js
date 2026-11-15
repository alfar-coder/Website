import { particleStyle } from './material.js';

const button = document.querySelector('.portrait');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const label = 'Álfar Smári’s rotating portrait';
let angle = particleStyle.angle;
let renderer;
let visibilityFrame;
let loading;
let visible = false;
let paused = motion.matches;
let frame = 0;
let lastTime = 0;

function draw() {
  renderer.setVisibility(visibilityFrame(angle).points);
  const size = Math.round(160 * Math.min(devicePixelRatio || 1, 2));
  renderer.draw({
    yaw: angle,
    pitch: 0,
    density: 1,
    depth: particleStyle.depth,
    scatter: particleStyle.scatter,
    size: particleStyle.size,
    contrast: particleStyle.contrast,
    zoom: particleStyle.framing,
    background: 'transparent',
  }, size, 160);
}

function animate(now) {
  const elapsed = lastTime ? Math.min(now - lastTime, 50) : 0;
  lastTime = now;
  angle = (angle + elapsed * 2 * Math.PI / (particleStyle.rotationPeriod * 1000)) % (2 * Math.PI);
  draw();
  frame = requestAnimationFrame(animate);
}

function syncPlayback() {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
  button.setAttribute('aria-label', (paused ? 'Play ' : 'Pause ') + label);
  if (renderer && visible && !paused && !document.hidden) {
    frame = requestAnimationFrame(animate);
  }
}

async function loadPortrait() {
  const [view, masks, response] = await Promise.all([
    import('./contact-renderer.js'),
    import('./data/alfar-visibility.js'),
    fetch(new URL('./data/alfar.json', import.meta.url)),
  ]);
  if (!response.ok) throw new Error('Portrait data failed to load');
  const points = await response.json();
  const portrait = new view.PortraitRenderer(button.querySelector('canvas'));
  portrait.setPoints(points);
  visibilityFrame = masks.alfarVisibilityFrame;
  renderer = portrait;
  renderer.onRestore = draw;
  draw();
}

button.addEventListener('click', () => {
  paused = !paused;
  syncPlayback();
});
motion.addEventListener('change', () => {
  paused = motion.matches;
  syncPlayback();
});
document.addEventListener('visibilitychange', syncPlayback);
syncPlayback();

new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible && !loading) {
    loading = loadPortrait().then(syncPlayback).catch(error => {
      button.hidden = true;
      console.error(error);
    });
  }
  syncPlayback();
}, { rootMargin: '120px' }).observe(button);
