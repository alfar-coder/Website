const gallery = document.querySelector('.work-gallery');
const strip = gallery.querySelector('.work-strip');
const slides = Array.from(strip.querySelectorAll('.work-item'));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, lower, upper) => Math.min(upper, Math.max(lower, value));

let centers = [];
let measuredWidth = 0;
let active = 0;
let frame = 0;
let settlingTo = null;
let gesture = null;
let suppressClick = false;

function nearest(position) {
  return centers.reduce((closest, center, index) =>
    Math.abs(center - position) < Math.abs(centers[closest] - position) ? index : closest, 0);
}

function updateEmphasis() {
  // Native snapping can scroll during resize before the new centers are measured.
  if (gallery.clientWidth !== measuredWidth) return;
  const position = gallery.scrollLeft;
  const index = nearest(position);
  if (index !== active) {
    slides[active].classList.remove('is-centered');
    slides[index].classList.add('is-centered');
    active = index;
  }

  const spacing = centers[1] - centers[0];
  slides.forEach((slide, index) => {
    const proximity = clamp(1 - Math.abs(centers[index] - position) / spacing, 0, 1);
    const emphasis = proximity * proximity * (3 - 2 * proximity);
    slide.style.setProperty('--card-scale', 1 + 0.036 * emphasis);
    slide.style.setProperty('--glow-opacity', emphasis ** 1.35);
  });
}

function stopSpring() {
  cancelAnimationFrame(frame);
  frame = 0;
  settlingTo = null;
}

function settle(index, releaseSpeed = 0) {
  stopSpring();
  gallery.classList.remove('is-dragging');
  gallery.classList.add('is-interacting');

  const target = centers[index];
  const displacement = gallery.scrollLeft - target;
  function finish() {
    gallery.scrollLeft = target;
    gallery.classList.remove('is-interacting');
    settlingTo = null;
    frame = 0;
    updateEmphasis();
  }

  if (reduceMotion.matches || Math.abs(displacement) < 1) {
    finish();
    return;
  }

  settlingTo = index;
  // Critical damping carries the release speed into a firm landing without bounce.
  const damping = 19;
  const maxSpeed = Math.abs(displacement) * damping;
  const speed = clamp(releaseSpeed, -maxSpeed, maxSpeed);
  const travel = speed + damping * displacement;
  const start = performance.now();

  function animate(now) {
    const seconds = (now - start) / 1000;
    const decay = Math.exp(-damping * seconds);
    const distance = (displacement + travel * seconds) * decay;
    const velocity = (speed - damping * travel * seconds) * decay;
    if (Math.abs(distance) < 0.5 && Math.abs(velocity) < 10) {
      finish();
      return;
    }
    gallery.scrollLeft = target + distance;
    updateEmphasis();
    frame = requestAnimationFrame(animate);
  }

  frame = requestAnimationFrame(animate);
}

function measure() {
  const width = gallery.clientWidth;
  if (width === measuredWidth) return;
  const keep = settlingTo ?? active;
  const viewport = gallery.getBoundingClientRect();
  centers = slides.map(slide => {
    const card = slide.getBoundingClientRect();
    return Math.round(card.left - viewport.left + gallery.scrollLeft + (card.width - viewport.width) / 2);
  });
  measuredWidth = width;

  stopSpring();
  if (gesture?.dragging) suppressClick = true;
  gesture = null;
  gallery.classList.add('is-interacting');
  gallery.scrollLeft = centers[keep];
  gallery.classList.remove('is-interacting', 'is-dragging');
  updateEmphasis();
}

gallery.classList.add('is-interactive');
measure();
new ResizeObserver(measure).observe(gallery);
gallery.addEventListener('scroll', updateEmphasis, { passive: true });

strip.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  suppressClick = false;
  gesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    samples: [],
    dragging: false,
  };
});

strip.addEventListener('pointermove', event => {
  if (gesture?.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  if (!gesture.dragging) {
    const dy = event.clientY - gesture.y;
    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
      gesture = null;
      return;
    }
    if (Math.abs(dx) < 8) return;

    stopSpring();
    gesture.dragging = true;
    gesture.position = gallery.scrollLeft;
    gesture.index = nearest(gesture.position);
    gesture.samples.push([gesture.position, event.timeStamp]);
    strip.setPointerCapture(event.pointerId);
    gallery.classList.add('is-interacting', 'is-dragging');
  }

  const first = centers[Math.max(0, gesture.index - 1)];
  const last = centers[Math.min(slides.length - 1, gesture.index + 1)];
  const proposed = gesture.position - dx;
  const limit = clamp(proposed, first, last);
  const stretch = proposed - limit;
  // Ease the pull past the adjacent card. Release still settles one card away.
  gallery.scrollLeft = limit + 24 * stretch / (24 + Math.abs(stretch));
  gesture.samples.push([gallery.scrollLeft, event.timeStamp]);
  gesture.samples = gesture.samples.filter(([, time]) => event.timeStamp - time <= 90);
});

function release(event, cancelled = false) {
  if (gesture?.id !== event.pointerId) return;
  const drag = gesture;
  gesture = null;
  if (!drag.dragging) return;
  suppressClick = true;

  if (cancelled) {
    settle(nearest(gallery.scrollLeft));
    return;
  }

  const recent = drag.samples.find(([, time]) => event.timeStamp - time <= 90);
  const velocity = recent ? (gallery.scrollLeft - recent[0]) * 1000 / Math.max(16, event.timeStamp - recent[1]) : 0;
  const moved = gallery.scrollLeft - centers[drag.index];
  const projection = moved + velocity * 0.12;
  const threshold = Math.min(96, slides[drag.index].offsetWidth * 0.22);
  const step = Math.abs(projection) >= threshold ? Math.sign(projection) : 0;
  settle(clamp(drag.index + step, 0, slides.length - 1), velocity);
}

strip.addEventListener('pointerup', event => release(event));
strip.addEventListener('pointercancel', event => release(event, true));
strip.addEventListener('lostpointercapture', event => {
  if (event.target === strip) release(event, true);
});
strip.addEventListener('pointerleave', () => {
  if (gesture && !gesture.dragging) gesture = null;
});
strip.addEventListener('dragstart', event => event.preventDefault());
strip.addEventListener('click', event => {
  if (!suppressClick || event.detail === 0) return;
  event.preventDefault();
  suppressClick = false;
}, { capture: true });

gallery.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || gesture?.dragging) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  const step = event.key === 'ArrowRight' ? 1 : -1;
  const start = settlingTo ?? nearest(gallery.scrollLeft);
  settle(clamp(start + step, 0, slides.length - 1));
});

gallery.addEventListener('wheel', event => {
  if (!frame || (!event.deltaX && !event.shiftKey)) return;
  stopSpring();
  gallery.classList.remove('is-interacting');
}, { passive: true });
