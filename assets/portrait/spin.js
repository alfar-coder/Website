import { particleStyle } from './material.js';

const portrait = document.querySelector('.portrait');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let angle = particleStyle.angle;
let renderer;
let visibilityFrame;
let loading;
let visible = false;
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
  if (renderer && visible && !motion.matches && !document.hidden) {
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
  renderer = new view.PortraitRenderer(portrait.querySelector('canvas'));
  renderer.setPoints(points);
  visibilityFrame = masks.alfarVisibilityFrame;
  renderer.onRestore = draw;
  draw();
}

motion.addEventListener('change', syncPlayback);
document.addEventListener('visibilitychange', syncPlayback);

new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible && !loading) {
    loading = loadPortrait().then(syncPlayback).catch(error => {
      portrait.hidden = true;
      console.error(error);
    });
  }
  syncPlayback();
}, { rootMargin: '120px' }).observe(portrait);
