const url = new URL("./alfar-visibility.json", import.meta.url);
// Derived from Alfar's unchanged point cloud by oriented surface-depth tests.
// Visibility is tested at the particle CENTER. It never clips a circular dot.
// Shared by the assembly shader, low-attribute snapshot path and native/2D fallback.
export const visibilityWidth = 64,
  visibilityHeight = 43,
  visibilityCount = 2694,
  visibilitySteps = 1440;
const bytes = Uint8Array.from(atob(await (await fetch(url)).json()), (c) =>
  c.charCodeAt(0),
);
const rowBytes = Math.ceil(visibilityCount / 8),
  cache = new Map(),
  tau = Math.PI * 2;
export function visibilityFrameIndex(yaw) {
  if (!Number.isFinite(yaw)) throw Error("Finite portrait yaw required");
  return (
    Math.round(((((yaw % tau) + tau) % tau) * visibilitySteps) / tau) %
    visibilitySteps
  );
}
export function alfarVisibilityFrame(yaw) {
  const index = visibilityFrameIndex(yaw);
  let frame = cache.get(index);
  if (frame) return frame;
  const pixels = new Uint8Array(visibilityWidth * visibilityHeight),
    offset = index * rowBytes;
  for (let i = 0; i < visibilityCount; i++)
    pixels[i] = ((bytes[offset + (i >> 3)] >> (i & 7)) & 1) * 255;
  frame = { index, pixels, points: pixels.subarray(0, visibilityCount) };
  cache.set(index, frame);
  // Bound the cache while retaining current frame objects for all renderers.
  if (cache.size > 32) cache.delete(cache.keys().next().value);
  return frame;
}
