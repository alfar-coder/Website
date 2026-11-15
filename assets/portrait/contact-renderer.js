import { projectPortraitPoint } from "./projection.js";
import {
  particleStyle,
  particleMaterialGLSL,
  portraitFrame,
  portraitCount,
  portraitReferenceSize,
} from "./material.js";
// The same hard-edged WebGL point language as the studio human.
// All buffers are stable; only view uniforms change during motion.
export class PortraitRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.points = [];
    this.available = false;
    try {
      this.setup();
    } catch {
      this.available = false;
    }
    if (!this.available) {
      const replacement = canvas.cloneNode();
      canvas.replaceWith(replacement);
      this.canvas = replacement;
      this.ctx = replacement.getContext("2d");
    }
  }
  setup() {
    const gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
    });
    if (!gl) return;
    this.gl = gl;
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error("Shader");
      return s;
    };
    const vs = shader(
      gl.VERTEX_SHADER,
      `attribute vec3 position;attribute vec3 grain;attribute vec3 normal;attribute float visibility;uniform float yaw;uniform float pitch;uniform float depth;uniform float zoom;uniform float dotSize;uniform float scatter;uniform float resolution;uniform float contrast;uniform float invert;uniform vec3 pointColor;uniform float customColor;varying float alpha;varying vec3 ink;
  ${particleMaterialGLSL}
  void main(){vec3 p=position;p.xy+=(grain.xy-.5)*scatter*.009;p.z*=depth;
   float c=cos(yaw),s=sin(yaw);p=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);vec3 n=vec3(normal.x*c+normal.z*s,normal.y,-normal.x*s+normal.z*c);
   c=cos(pitch);s=sin(pitch);p=vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);n=vec3(n.x,n.y*c-n.z*s,n.y*s+n.z*c);
   gl_Position=vec4(p.x*zoom*${portraitFrame},-p.y*zoom*${portraitFrame},0.,1.);
   gl_PointSize=(dotSize+(floor(grain.x*255.+.5)/255.)*${particleStyle.sizeVariation})*resolution;
   float tone;sculptureMaterial(n,grain.y,tone,alpha);tone=floor(clamp(.5+(tone-.5)*contrast,0.,1.)*255.+.5)/255.;alpha=floor(alpha*255.+.5)/255.;alpha*=visibility;
   ink=mix(vec3(mix(tone,1.-tone,invert)),pointColor,customColor);
  }`,
    );
    const fs = shader(
      gl.FRAGMENT_SHADER,
      `precision mediump float;varying float alpha;varying vec3 ink;void main(){float r=length(gl_PointCoord*2.-1.);float coverage=1.-smoothstep(${particleStyle.edge},1.,r);gl_FragColor=vec4(ink,alpha*coverage);}`,
    );
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error("Program");
    gl.useProgram(p);
    this.program = p;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    for (const [name, offset] of [
      ["position", 0],
      ["grain", 12],
      ["normal", 24],
    ]) {
      const a = gl.getAttribLocation(p, name);
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 36, offset);
    }
    this.visibilityBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.visibilityBuffer);
    const visibility = gl.getAttribLocation(p, "visibility");
    gl.enableVertexAttribArray(visibility);
    gl.vertexAttribPointer(visibility, 1, gl.UNSIGNED_BYTE, true, 0, 0);
    this.u = Object.fromEntries(
      [
        "yaw",
        "pitch",
        "depth",
        "zoom",
        "dotSize",
        "scatter",
        "resolution",
        "contrast",
        "invert",
        "pointColor",
        "customColor",
      ].map((n) => [n, gl.getUniformLocation(p, n)]),
    );
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    this.available = true;
    if (!this.contextEventsAttached) {
      this.contextEventsAttached = true;
      this.canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.available = false;
        this.onLost?.();
      });
      this.canvas.addEventListener("webglcontextrestored", () => {
        this.setup();
        this.setPoints(this.points);
        this.onRestore?.();
      });
    }
  }
  setPoints(points) {
    this.points = points.map((p) =>
      p.length >= 9 ? p : [...p, 0, 0, (p[5] - 0.2) / 0.55],
    );
    if (this.available) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array(this.points.flat()),
        this.gl.STATIC_DRAW,
      );
    }
    this.setVisibility(
      this.visibility?.length === this.points.length ? this.visibility : null,
      true,
    );
  }
  setVisibility(values, force = false) {
    const next = values ?? new Uint8Array(this.points.length).fill(255);
    if (next.length !== this.points.length)
      throw Error("Visibility must match the fixed point order");
    if (!force && next === this.visibility) return;
    this.visibility = next;
    if (this.available) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.visibilityBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, next, this.gl.DYNAMIC_DRAW);
    }
  }
  draw(s, size, logicalSize = this.canvas.clientWidth || 200) {
    if (!size) return;
    const canvas = this.canvas;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const bg = s.background === "black" ? 0.067 : 1,
      alpha = ["transparent", "image", "custom"].includes(s.background) ? 0 : 1,
      count = portraitCount(logicalSize, s.density, this.points.length),
      color =
        s.particleColor ??
        (s.background === "black" ? [0.94, 0.94, 0.94] : [0.09, 0.09, 0.09]);
    if (this.available) {
      const gl = this.gl;
      gl.viewport(0, 0, size, size);
      gl.clearColor(alpha ? bg : 0, alpha ? bg : 0, alpha ? bg : 0, alpha);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const [key, val] of Object.entries({
        yaw: s.yaw,
        pitch: s.pitch,
        depth: s.depth,
        zoom: s.zoom,
        dotSize: s.size,
        scatter: s.scatter,
        resolution: size / portraitReferenceSize,
        customColor: s.particleColor ? 1 : 0,
        contrast: s.contrast,
        invert: s.background === "black" ? 1 : 0,
      }))
        gl.uniform1f(this.u[key], val);
      gl.uniform3fv(this.u.pointColor, color);
      gl.drawArrays(gl.POINTS, 0, count);
      return;
    }
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, size, size);
    if (alpha) {
      ctx.fillStyle = s.background === "black" ? "#111" : "#fff";
      ctx.fillRect(0, 0, size, size);
    }
    ctx.fillStyle = `rgb(${color.map((v) => Math.round(v * 255)).join(",")})`;
    const ratio = size / portraitReferenceSize;
    for (let i = 0; i < count; i++) {
      if (this.visibility && this.visibility[i] === 0) continue;
      const sample = projectPortraitPoint(this.points[i], s);
      const tone = s.background === "black" ? 1 - sample.tone : sample.tone;
      const rgb = s.particleColor ?? [tone, tone, tone];
      ctx.fillStyle = `rgb(${rgb.map((v) => Math.round(v * 255)).join(",")})`;
      ctx.globalAlpha = sample.alpha;
      const px = size * sample.x,
        py = size * sample.y,
        r = (s.size + sample.grain * particleStyle.sizeVariation) * ratio * 0.5;
      const gradient = ctx.createRadialGradient(
        px,
        py,
        r * particleStyle.edge,
        px,
        py,
        r,
      );
      gradient.addColorStop(0, ctx.fillStyle);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
}
