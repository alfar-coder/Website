import {
  particleStyle,
  portraitFrame,
  rotateNormal,
  shadeParticle,
} from "./material.js";
const byte = (value) => Math.round(value * 255) / 255;
// Canonical editor camera and material, also used for the footer destinations.
export function projectPortraitPoint(point, state = {}) {
  const {
    yaw = particleStyle.angle,
    pitch = 0,
    depth = 1,
    zoom = 1,
    scatter = 0,
    contrast = 1,
  } = state;
  let [x, y, z, g, h, , nx, ny, nz] = point;
  x += (g - 0.5) * scatter * 0.009;
  y += (h - 0.5) * scatter * 0.009;
  z *= depth;
  const p = rotateNormal([x, y, z], yaw),
    n = rotateNormal([nx, ny, nz], yaw),
    c = Math.cos(pitch),
    s = Math.sin(pitch);
  const ry = p[1] * c - p[2] * s,
    normal = [n[0], n[1] * c - n[2] * s, n[1] * s + n[2] * c];
  const material = shadeParticle(normal, h);
  return {
    x: 0.5 + p[0] * zoom * portraitFrame * 0.5,
    y: 0.5 + ry * zoom * portraitFrame * 0.5,
    tone: byte(
      Math.max(0, Math.min(1, 0.5 + (material.tone - 0.5) * contrast)),
    ),
    alpha: byte(material.alpha),
    grain: byte(g),
  };
}
