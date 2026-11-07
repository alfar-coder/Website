(() => {
  const portfolio = document.querySelector('.portfolio');
  const carousel = document.querySelector('.carousel');
  const track = document.querySelector('.track');
  const sequence = document.querySelector('.sequence');
  const control = document.querySelector('.motion-control');
  const label = control.querySelector('.control-label');
  const icon = control.querySelector('.control-icon');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const speed = 28; // CSS pixels per second, including at the loop boundary.
  let distance = 0;
  let position = 0;
  let lastTime = null;
  let frame = null;
  let paused = false;
  let hovered = false;
  let focused = false;
  let initialized = false;

  // Whole decorative copies cover even an ultrawide viewport. Only the original
  // five projects are exposed to assistive technology.
  function measure() {
    const previousDistance = distance;
    distance = sequence.getBoundingClientRect().width;
    if (!distance) return;
    if (!initialized) {
      position = innerWidth <= 600 ? 24 : Math.max(24, Math.min(600, innerWidth / 2 - 156));
      initialized = true;
    } else if (previousDistance) {
      position *= distance / previousDistance;
    }
    const copies = Math.ceil(carousel.clientWidth / distance) + 1;
    const existing = track.querySelectorAll('[data-copy]');
    if (existing.length !== copies) {
      existing.forEach(copy => copy.remove());
      for (let i = 0; i < copies; i++) {
        const copy = sequence.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('inert', '');
        copy.dataset.copy = '';
        copy.querySelectorAll('img').forEach(image => {
          image.alt = '';
          image.removeAttribute('fetchpriority');
        });
        track.append(copy);
      }
    }
    render();
  }

  function render() {
    track.style.transform = `translate3d(${position}px, 0, 0)`;
  }

  function animate(time) {
    if (lastTime !== null) {
      // Returning from a background tab must not make the artwork jump.
      position -= speed * Math.min(time - lastTime, 64) / 1000;
      if (position <= -distance) position += distance;
      render();
    }
    lastTime = time;
    frame = requestAnimationFrame(animate);
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    const isStatic = reducedMotion.matches;
    portfolio.classList.toggle('is-static', isStatic);
    if (isStatic) {
      track.style.transform = '';
    } else if (!paused && !hovered && !focused && !document.hidden && distance) {
      frame = requestAnimationFrame(animate);
    }
  }

  control.addEventListener('click', () => {
    paused = !paused;
    control.setAttribute('aria-pressed', String(paused));
    control.setAttribute('aria-label', paused ? 'Resume carousel' : 'Pause carousel');
    label.textContent = paused ? 'Play' : 'Pause';
    icon.textContent = paused ? '▷' : 'Ⅱ';
    updatePlayback();
  });
  carousel.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    updatePlayback();
  });
  carousel.addEventListener('pointerleave', () => { hovered = false; updatePlayback(); });
  carousel.addEventListener('focusin', () => { focused = true; updatePlayback(); });
  carousel.addEventListener('focusout', () => { focused = false; updatePlayback(); });
  carousel.addEventListener('keydown', event => {
    if (reducedMotion.matches) return; // Preserve native horizontal scrolling.
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    position += event.key === 'ArrowRight' ? -160 : 160;
    position = ((position % distance) - distance) % distance;
    render();
  });
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', () => {
    portfolio.classList.toggle('is-static', reducedMotion.matches);
    measure();
    updatePlayback();
  });
  new ResizeObserver(() => { measure(); updatePlayback(); }).observe(carousel);

  portfolio.classList.toggle('is-static', reducedMotion.matches);
  measure();
  updatePlayback();
})();
