// catnip 엔진 — CatStage: 고양이 렌더링(WebGL2 인스턴싱 퍼) + 물리(스프링 필드·verlet) + 인터랙션
// 사용: const stage = new CatStage({ tl, gl, ov, breeds: [0,1,2,3] });
//  - stage.goTo(i)                캐러셀 이동
//  - stage.lookOverride = {x,y}   시선 강제 (스크린 좌표, null이면 커서)
//  - stage.setExtraOffset(x, y)   전체 이동 (덮치기 등)
//  - stage.excite(n)              꼬리 임펄스
//  - stage.react('happy')         하트 + 깜빡
//  - stage.petMeter               0..1 쓰다듬 게이지 (골골은 자동)
//  - stage.onFrame = (t, octx, info) => {}   오버레이 위에 추가 드로잉
//  - stage.catCenter()            현재 고양이 스크린 좌표 {x, y, R}
//  - stage.snapshot()             합성 캔버스 반환

export const BREEDS = [
  { key: 'breed.0' }, { key: 'breed.1' }, { key: 'breed.2' }, { key: 'breed.3' },
];

const INK = '51,41,29';
const CREAM = '#f3eddc';

const GINGER_A = [0.66, 0.40, 0.21], GINGER_B = [0.95, 0.80, 0.60];
const CREAM_A = [0.87, 0.77, 0.59], CREAM_B = [0.995, 0.958, 0.868];
const WHITE_A = [0.85, 0.82, 0.75], WHITE_B = [0.995, 0.98, 0.945];
const BLACK_A = [0.11, 0.10, 0.095], BLACK_B = [0.33, 0.31, 0.29];
const GREY_A = [0.44, 0.41, 0.36], GREY_B = [0.80, 0.77, 0.70];
const GREY_D = [0.22, 0.20, 0.18];

const mix3 = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const CALICO_PATCHES = [
  { x: -0.55, y: -0.55, r: 0.60, A: BLACK_A, B: BLACK_B },
  { x: 0.62, y: 0.12, r: 0.45, A: BLACK_A, B: BLACK_B },
  { x: 0.45, y: -0.78, r: 0.55, A: GINGER_A, B: GINGER_B },
  { x: 0.95, y: 1.30, r: 0.75, A: BLACK_A, B: BLACK_B },
  { x: -0.90, y: 1.55, r: 0.65, A: GINGER_A, B: GINGER_B },
];

export const COATS = [
  {
    name: '치즈', nameKey: 'breed.0',
    fan: [0.80, 0.55, 0.32], muzzleFan: [0.93, 0.86, 0.72], chestFan: [0.93, 0.86, 0.72],
    iris: '#c98f3a', nose: '#c96b52', blush: 0.28, earBlush: 0.45,
    tail: { base: '#cf8244', ring: '#a85f2c', tip: null },
    color(lx, ly, z) {
      if (z.paw) return [WHITE_A, WHITE_B];
      if (z.muz) return [CREAM_A, CREAM_B];
      if (z.chest) {
        if (z.gap) return [CREAM_A.map(v => v * 0.86), CREAM_B.map(v => v * 0.89)];
        if (ly > 1.45) {
          const s = 0.5 + 0.5 * Math.sin(ly * 9);
          return [mix3(CREAM_A, GINGER_A, s * 0.25), mix3(CREAM_B, GINGER_B, s * 0.2)];
        }
        return [CREAM_A, CREAM_B];
      }
      if (z.eyeRing) return [mix3(GINGER_A, CREAM_A, 0.55), mix3(GINGER_B, CREAM_B, 0.6)];
      let s;
      if (ly < -0.25 && Math.abs(lx) < 0.65) s = 0.5 + 0.5 * Math.sin(lx * 11);
      else s = 0.5 + 0.5 * Math.sin((lx * 1.2 - ly * 0.7) * 4.4 + Math.sin(ly * 2.5) * 0.8);
      return [mix3(GINGER_A, [0.36, 0.18, 0.08], s * 0.85), mix3(GINGER_B, GINGER_A, s * 0.7)];
    },
  },
  {
    name: '고등어', nameKey: 'breed.1',
    fan: [0.58, 0.55, 0.48], muzzleFan: [0.90, 0.87, 0.80], chestFan: [0.88, 0.85, 0.78],
    iris: '#a8a03c', nose: '#8a5a52', blush: 0.22, earBlush: 0.40,
    tail: { base: '#8b8378', ring: '#6e675c', tip: null },
    color(lx, ly, z) {
      if (z.paw) return [WHITE_A, WHITE_B];
      if (z.muz) return [mix3(WHITE_A, GREY_A, 0.15), WHITE_B];
      if (z.chest) {
        if (z.gap) return [WHITE_A.map(v => v * 0.87), WHITE_B.map(v => v * 0.90)];
        if (ly > 1.45) {
          const s = 0.5 + 0.5 * Math.sin(ly * 9);
          return [mix3(WHITE_A, GREY_A, s * 0.3), mix3(WHITE_B, GREY_B, s * 0.25)];
        }
        return [mix3(WHITE_A, GREY_A, 0.1), WHITE_B];
      }
      if (z.eyeRing) return [mix3(GREY_A, WHITE_A, 0.5), mix3(GREY_B, WHITE_B, 0.55)];
      let s;
      if (ly < -0.18 && Math.abs(lx) < 0.8) s = 0.5 + 0.5 * Math.sin(lx * 11);
      else s = 0.5 + 0.5 * Math.sin((lx * 1.2 - ly * 0.7) * 4.4 + Math.sin(ly * 2.5) * 0.8);
      return [mix3(GREY_A, GREY_D, s * 0.85), mix3(GREY_B, GREY_D, s * 0.6)];
    },
  },
  {
    name: '삼색이', nameKey: 'breed.2',
    fan: [0.90, 0.87, 0.80], muzzleFan: [0.96, 0.94, 0.89], chestFan: [0.94, 0.91, 0.85],
    iris: '#c98f3a', nose: '#c96b52', blush: 0.26, earBlush: 0.45,
    tail: { base: '#cf8244', ring: '#cf8244', tip: '#2b2725' },
    color(lx, ly, z) {
      if (!z.muz && !z.paw && !z.chest)
        for (const p of CALICO_PATCHES)
          if (Math.hypot(lx - p.x, ly - p.y) < p.r * (1 + rand(-0.18, 0.12)))
            return [p.A, p.B];
      return [WHITE_A, WHITE_B];
    },
  },
  {
    name: '턱시도', nameKey: 'breed.3',
    fan: [0.16, 0.15, 0.14], muzzleFan: [0.94, 0.92, 0.87], chestFan: [0.93, 0.91, 0.86],
    iris: '#7fae5a', nose: '#6d4a44', blush: 0, earBlush: 0.5,
    tail: { base: '#2b2725', ring: '#2b2725', tip: '#ded5bd' },
    color(lx, ly, z) {
      if (z.paw || z.muz || z.chest) return [WHITE_A, WHITE_B];
      if (Math.abs(lx) < 0.10 + rand(-0.03, 0.03) && ly > -0.55 && ly < 0.2)
        return [WHITE_A, WHITE_B];
      return [BLACK_A, BLACK_B];
    },
  },
];

const BODY_DY = 1.42;
const EAR_L = -Math.PI / 2 - 0.58, EAR_R = -Math.PI / 2 + 0.58;
const GW = 64, GH = 36, ENC = 52;
const F_K = 0.14, F_C = 0.11;
const T_STEPS = 5;

export class CatStage {
  constructor({ tl, gl, ov, breeds = [0], initialIndex = 0 }) {
    this.tlC = tl; this.ovC = ov; this.glC = gl;
    this.tctx = tl.getContext('2d');
    this.octx = ov.getContext('2d');
    this.gl = gl.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!this.gl) throw new Error('WebGL2 unavailable');

    this.breeds = breeds;
    this.index = Math.min(initialIndex, breeds.length - 1);
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.mouse = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
    this.lookOverride = null;
    this.extra = { x: 0, y: 0 };
    this.petMeter = 0;
    this.muted = false;
    this.onFrame = null;
    this.hearts = [];
    this.offset = 0; this.prevOffset = 0;
    this.nextTwitch = 3000;
    this._raf = 0;
    this._destroyed = false;

    // 스프링 필드
    this.fdx = new Float32Array(GW * GH); this.fdy = new Float32Array(GW * GH);
    this.fvx = new Float32Array(GW * GH); this.fvy = new Float32Array(GW * GH);
    this.fieldBytes = new Uint8Array(GW * GH * 2);

    this._initGL();
    this._bindInput();
    this.build();
    this._raf = requestAnimationFrame(this._frame.bind(this));
    this._onResize = () => { clearTimeout(this._rt); this._rt = setTimeout(() => this.build(), 150); };
    addEventListener('resize', this._onResize);
  }

  // ── GL 셋업 ──────────────────────────────────────────────
  _compile(type, src) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  _program(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    gl.attachShader(p, this._compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this._compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  _initGL() {
    const gl = this.gl;
    this.furProg = this._program(`#version 300 es
precision highp float;
layout(location=0) in float aT;
layout(location=1) in float aSide;
layout(location=2) in vec2 aRoot;
layout(location=3) in vec2 aDir;
layout(location=4) in float aLen;
layout(location=5) in float aWidth;
layout(location=6) in float aSeed;
layout(location=7) in vec3 aColA;
layout(location=8) in vec3 aColB;
uniform vec2 uRes;
uniform float uTime;
uniform float uWind;
uniform vec2 uOff;
uniform float uSlide;
uniform sampler2D uField;
out vec3 vCol;
out float vAlpha;
void main(){
  float t = aT;
  vec2 root = aRoot + uOff;
  vec2 field = (texture(uField, root / uRes).rg - 0.5) * ${(ENC * 2).toFixed(1)};
  float wind = (sin(uTime * 1.4 + aSeed * 17.0 + root.x * 0.008) * 0.7
              + sin(uTime * 2.9 + aSeed * 43.0) * 0.3) * uWind;
  vec2 B = field * 1.15 + vec2(wind - uSlide * 0.6, -0.2 * wind);
  vec2 D = vec2(0.0, aLen * 0.22);
  vec2 pos = root + aDir * aLen * t + (B + D) * t * t;
  vec2 tang = normalize(aDir * aLen + 2.0 * t * (B + D));
  pos += vec2(-tang.y, tang.x) * aSide * aWidth * (1.0 - t * 0.9);
  gl_Position = vec4((pos / uRes * 2.0 - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);
  vCol = mix(aColA, aColB, t);
  vAlpha = 0.92 * (1.0 - t * 0.5);
}`, `#version 300 es
precision highp float;
in vec3 vCol; in float vAlpha;
out vec4 o;
void main(){ o = vec4(vCol * vAlpha, vAlpha); }`);

    this.flatProg = this._program(`#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aCol;
uniform vec2 uRes;
uniform vec2 uOff;
out vec4 vC;
void main(){
  vec2 p = aPos + uOff;
  gl_Position = vec4((p / uRes * 2.0 - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);
  vC = aCol;
}`, `#version 300 es
precision highp float;
in vec4 vC; out vec4 o;
void main(){ o = vC; }`);

    this.fieldTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, GW, GH, 0, gl.RG, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    const tmpl = new Float32Array(T_STEPS * 2 * 2);
    for (let i = 0; i < T_STEPS; i++) {
      const t = i / (T_STEPS - 1);
      tmpl.set([t, -1, t, 1], i * 4);
    }
    this.tmplBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tmplBuf);
    gl.bufferData(gl.ARRAY_BUFFER, tmpl, gl.STATIC_DRAW);

    this.instBuf = gl.createBuffer();
    this.flatBuf = gl.createBuffer();
    this.furVAO = gl.createVertexArray();
    this.flatVAO = gl.createVertexArray();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.u = {
      res: gl.getUniformLocation(this.furProg, 'uRes'),
      time: gl.getUniformLocation(this.furProg, 'uTime'),
      wind: gl.getUniformLocation(this.furProg, 'uWind'),
      off: gl.getUniformLocation(this.furProg, 'uOff'),
      slide: gl.getUniformLocation(this.furProg, 'uSlide'),
      field: gl.getUniformLocation(this.furProg, 'uField'),
      resF: gl.getUniformLocation(this.flatProg, 'uRes'),
      offF: gl.getUniformLocation(this.flatProg, 'uOff'),
    };
  }

  // ── 실루엣 ───────────────────────────────────────────────
  _headR(th) {
    const R = this.R;
    let r = R * (0.85 + 0.05 * Math.cos(2 * th));
    r += R * 0.55 * Math.exp(-Math.pow(Math.abs(angDiff(th, EAR_L)) / 0.21, 1.5) * 2.2);
    r += R * 0.55 * Math.exp(-Math.pow(Math.abs(angDiff(th, EAR_R)) / 0.21, 1.5) * 2.2);
    return r;
  }
  _bodyR(th) { return this.R * (0.98 + 0.10 * Math.cos(2 * th) + 0.16 * Math.sin(th)); }
  _insideHead(px, py) { return Math.hypot(px, py) < this._headR(Math.atan2(py, px)) * 0.995; }
  _insideBody(px, py) {
    const by = py - BODY_DY * this.R;
    return Math.hypot(px, by) < this._bodyR(Math.atan2(by, px)) * 0.995;
  }

  // ── 빌드 ─────────────────────────────────────────────────
  build() {
    const gl = this.gl;
    this.W = this.glC.clientWidth; this.H = this.glC.clientHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    for (const c of [this.glC, this.ovC, this.tlC]) { c.width = this.W * this.dpr; c.height = this.H * this.dpr; }
    gl.viewport(0, 0, this.W * this.dpr, this.H * this.dpr);

    this.R = Math.min(this.W * 0.15, this.H * 0.16, 185);
    this.CY = this.H * 0.5 - 0.72 * this.R;
    this.offset = this.prevOffset = -this.index * this.W;

    const { W, R, CY } = this;
    this.cats = [];
    const list = [];
    const flat = [];
    this.fans = [];
    const pushFan = (verts) => {
      const first = flat.length / 6;
      for (const v of verts) flat.push(...v);
      this.fans.push({ first, count: verts.length });
    };

    for (let ci = 0; ci < this.breeds.length; ci++) {
      const b = this.breeds[ci];
      const coat = typeof b === 'number' ? COATS[b] : b;
      const CX = W * 0.5 + ci * W;
      const muzX = CX, muzY = CY + R * 0.28, muzR = R * 0.36;

      const zonesOf = (lx, ly, inMuz) => ({
        muz: inMuz,
        chest: ly > 0.55 && ly < 2.30 && Math.abs(lx) < Math.min(0.52, 0.30 + (ly - 0.55) * 0.14),
        paw: ly > 2.20 && (Math.abs(lx - 0.36) < 0.25 || Math.abs(lx + 0.36) < 0.25),
        eyeRing: Math.hypot(Math.abs(lx) - 0.34, ly + 0.05) < 0.15,
        gap: ly > 1.75 && Math.abs(lx) < 0.06,
      });

      const pushStrand = (x, y, dirX, dirY, len, earF) => {
        const lx = (x - CX) / R, ly = (y - CY) / R;
        const inMuz = Math.hypot(x - muzX, y - muzY) < muzR;
        const z = zonesOf(lx, ly, inMuz);
        const [A, B2] = coat.color(lx, ly, z);
        const shade = rand(0.92, 1.06);
        const e = earF * 0.8;
        const colA = A.map(v => v * shade * (1 - e * 0.35));
        const colB = B2.map(v => v * shade * (1 - e * 0.25));
        const dl = Math.hypot(dirX, dirY);
        let L = len;
        if (inMuz) L *= 0.62;
        if (z.paw) L *= 0.5;
        if (ly > 2.0) L *= Math.max(0.45, 1 - (ly - 2.0) * 0.55);
        list.push({ x, y, dx: dirX / dl, dy: dirY / dl, len: L,
                    w: rand(0.9, 1.9), seed: rand(0, 100), colA, colB });
      };

      const N_H_IN = 8000, N_H_EDGE = 1500;
      for (let i = 0; i < N_H_IN + N_H_EDGE; i++) {
        const edge = i >= N_H_IN;
        const th = rand(0, Math.PI * 2);
        const rMax = this._headR(th);
        const rr = edge ? rMax * rand(0.96, 1.0) : rMax * Math.sqrt(rand(0, 0.985));
        const px = Math.cos(th) * rr, py = Math.sin(th) * rr;
        if (edge && this._insideBody(px, py)) continue;
        const earF = Math.exp(-Math.pow(angDiff(th, EAR_L) / 0.28, 2) * 1.6)
                   + Math.exp(-Math.pow(angDiff(th, EAR_R) / 0.28, 2) * 1.6);
        const cheek = Math.exp(-Math.pow(angDiff(th, 0) / 0.5, 2))
                    + Math.exp(-Math.pow(angDiff(th, Math.PI) / 0.5, 2));
        const len = (edge
          ? R * rand(0.08, 0.13) * (1 + 0.35 * cheek)
          : R * rand(0.05, 0.095)) * (earF > 0.5 ? 0.7 : 1);
        pushStrand(CX + px, CY + py,
          Math.cos(th) * 0.62 + rand(-0.2, 0.2), Math.sin(th) * 0.62 + 0.72 + rand(-0.2, 0.2),
          len, Math.min(1, earF * (rr / rMax)));
      }

      const N_B_IN = 12000, N_B_EDGE = 2200;
      for (let i = 0; i < N_B_IN + N_B_EDGE; i++) {
        const edge = i >= N_B_IN;
        const th = rand(0, Math.PI * 2);
        const rMax = this._bodyR(th);
        const rr = edge ? rMax * rand(0.96, 1.0) : rMax * Math.sqrt(rand(0, 0.985));
        const px = Math.cos(th) * rr, py = BODY_DY * R + Math.sin(th) * rr;
        if (this._insideHead(px, py) && (edge || rand(0, 1) < 0.85)) continue;
        if (edge && Math.sin(th) > 0.70) continue;
        const haunch = Math.exp(-Math.pow(angDiff(th, 0.5) / 0.6, 2))
                     + Math.exp(-Math.pow(angDiff(th, Math.PI - 0.5) / 0.6, 2));
        const len = edge
          ? R * rand(0.08, 0.15) * (1 + 0.5 * haunch)
          : R * rand(0.05, 0.10);
        pushStrand(CX + px, CY + py,
          Math.cos(th) * 0.5 + rand(-0.2, 0.2), Math.sin(th) * 0.5 + 0.85 + rand(-0.2, 0.2),
          len, 0);
      }

      // 바닥 레이어: 그림자 → 몸 → 머리 → 가슴 → 주둥이 → 앞발
      {
        const sx = CX + R * 0.4, sy = CY + R * 2.52;
        const verts = [[sx, sy, 0.627 * 0.28, 0.573 * 0.28, 0.451 * 0.28, 0.28]];
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          verts.push([sx + Math.cos(a) * R * 2.0, sy + Math.sin(a) * R * 0.38, 0, 0, 0, 0]);
        }
        pushFan(verts);
      }
      {
        const c = coat.fan;
        const verts = [[CX, CY + BODY_DY * R, ...c, 1]];
        for (let i = 0; i <= 160; i++) {
          const th = (i / 160) * Math.PI * 2;
          const r = this._bodyR(th) * 0.985;
          verts.push([CX + Math.cos(th) * r, CY + BODY_DY * R + Math.sin(th) * r, ...c, 1]);
        }
        pushFan(verts);
      }
      {
        const c = coat.fan;
        const verts = [[CX, CY, ...c, 1]];
        for (let i = 0; i <= 200; i++) {
          const th = (i / 200) * Math.PI * 2;
          const r = this._headR(th) * 0.985;
          verts.push([CX + Math.cos(th) * r, CY + Math.sin(th) * r, ...c, 1]);
        }
        pushFan(verts);
      }
      {
        const c = coat.chestFan;
        const chX = CX, chY = CY + R * 1.40;
        const verts = [[chX, chY, ...c, 1]];
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          verts.push([chX + Math.cos(a) * R * 0.36, chY + Math.sin(a) * R * 0.92, ...c, 1]);
        }
        pushFan(verts);
      }
      {
        const c = coat.muzzleFan;
        const verts = [[muzX, muzY, ...c, 1]];
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          verts.push([muzX + Math.cos(a) * muzR * 0.92, muzY + Math.sin(a) * muzR * 0.72, ...c, 1]);
        }
        pushFan(verts);
      }
      for (const side of [-1, 1]) {
        const c = [0.92, 0.895, 0.82];
        const pwX = CX + side * R * 0.36, pwY = CY + R * 2.34;
        const verts = [[pwX, pwY, ...c, 1]];
        for (let i = 0; i <= 30; i++) {
          const a = (i / 30) * Math.PI * 2;
          verts.push([pwX + Math.cos(a) * R * 0.26, pwY + Math.sin(a) * R * 0.16, ...c, 1]);
        }
        pushFan(verts);
      }

      // 수염
      const whiskers = [];
      for (const side of [-1, 1]) {
        const rootX = CX + side * R * 0.22, rootY = CY + R * 0.26;
        for (const f of [-0.26, -0.10, 0.07, 0.24]) {
          const ang = side > 0 ? f : Math.PI - f;
          whiskers.push(makeChain(rootX, rootY + rand(-4, 4), ang, R * rand(1.05, 1.35), 10, 0.22, 0.5));
        }
        const bx = CX + side * R * 0.28, by = CY - R * 0.38;
        for (const f of [-0.95, -1.2]) {
          const ang = side > 0 ? f : Math.PI - f;
          whiskers.push(makeChain(bx, by, ang, R * rand(0.38, 0.50), 6, 0.26, 0.1));
        }
      }

      const tailPath = [
        [0.42, 2.20], [1.22, 2.42], [1.65, 2.08], [1.72, 1.55], [1.50, 1.05],
      ].map(([x, y]) => [CX + x * R, CY + y * R]);
      const tail = makeTail(tailPath, 26);

      this.cats.push({ coat, CX, muzX, muzY, muzR, whiskers, tail,
                       blinkT: -1, nextBlink: rand(1500, 4000), phase: rand(0, Math.PI * 2) });
    }

    list.sort((a, b) => a.y - b.y);
    this.N_STRANDS = list.length;
    const data = new Float32Array(this.N_STRANDS * 13);
    list.forEach((s, i) => {
      data.set([s.x, s.y, s.dx, s.dy, s.len, s.w, s.seed, ...s.colA, ...s.colB], i * 13);
    });

    gl.bindVertexArray(this.furVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tmplBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 8, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 8, 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const S = 13 * 4;
    const attrs = [[2, 2, 0], [3, 2, 8], [4, 1, 16], [5, 1, 20], [6, 1, 24], [7, 3, 28], [8, 3, 40]];
    for (const [loc, size, off] of attrs) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, S, off);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);

    gl.bindVertexArray(this.flatVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.flatBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flat), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
    gl.bindVertexArray(null);
  }

  // ── 필드 ─────────────────────────────────────────────────
  splat(px, py, fx, fy) {
    const { W, H } = this;
    const cw = W / GW, ch = H / GH, rad = 95;
    const gx0 = Math.max(0, Math.floor((px - rad) / cw)), gx1 = Math.min(GW - 1, Math.ceil((px + rad) / cw));
    const gy0 = Math.max(0, Math.floor((py - rad) / ch)), gy1 = Math.min(GH - 1, Math.ceil((py + rad) / ch));
    for (let gy = gy0; gy <= gy1; gy++)
      for (let gx = gx0; gx <= gx1; gx++) {
        const cx = (gx + 0.5) * cw, cy = (gy + 0.5) * ch;
        const dx = cx - px, dy = cy - py;
        const d2 = dx * dx + dy * dy;
        if (d2 > rad * rad) continue;
        const d = Math.sqrt(d2) || 1;
        const f = Math.exp(-d2 / (rad * rad) * 3);
        const i = gy * GW + gx;
        this.fvx[i] += fx * f * 0.35 + (dx / d) * f * 1.6;
        this.fvy[i] += fy * f * 0.35 + (dy / d) * f * 1.6;
      }
  }

  _stepField() {
    const { fdx, fdy, fvx, fvy, fieldBytes } = this;
    for (let i = 0; i < GW * GH; i++) {
      fvx[i] += -F_K * fdx[i] - F_C * fvx[i];
      fvy[i] += -F_K * fdy[i] - F_C * fvy[i];
      fdx[i] += fvx[i]; fdy[i] += fvy[i];
      if (fdx[i] > 40) fdx[i] = 40; else if (fdx[i] < -40) fdx[i] = -40;
      if (fdy[i] > 40) fdy[i] = 40; else if (fdy[i] < -40) fdy[i] = -40;
      fieldBytes[i * 2] = Math.max(0, Math.min(255, (fdx[i] / (ENC * 2) + 0.5) * 255));
      fieldBytes[i * 2 + 1] = Math.max(0, Math.min(255, (fdy[i] / (ENC * 2) + 0.5) * 255));
    }
  }

  // ── 체인 스텝 ────────────────────────────────────────────
  _stepChain(s, damp, mouseR, wmx, wmy, gravity) {
    const { mouse } = this;
    const nodes = s.nodes, n = nodes.length - 1;
    for (let i = 1; i <= n; i++) {
      const nd = nodes[i];
      const vx = (nd.x - nd.px) * damp, vy = (nd.y - nd.py) * damp;
      nd.px = nd.x; nd.py = nd.y;
      nd.x += vx; nd.y += vy + gravity;
      const k = s.stiff * Math.pow(1 - i / (n + 1), 1.4) + 0.015;
      nd.x += (nd.rx - nd.x) * k;
      nd.y += (nd.ry - nd.y) * k;
      if (mouse.active) {
        const dx = nd.x - wmx, dy = nd.y - wmy;
        const d = Math.hypot(dx, dy);
        if (d < mouseR && d > 0.5) {
          const f = 1 - d / mouseR;
          nd.x += mouse.vx * f * 0.5 + (dx / d) * f * 1.4;
          nd.y += mouse.vy * f * 0.5 + (dy / d) * f * 1.4;
        }
      }
    }
    for (let k = 0; k < 2; k++)
      for (let i = 1; i <= n; i++) {
        const a = nodes[i - 1], b = nodes[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - s.seg) / d;
        if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
        else {
          a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
          b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
        }
      }
  }

  _stepChains(t) {
    const cat = this.cats[this.index];
    if (!this.reduceMotion && t > this.nextTwitch && cat) {
      const s = cat.whiskers[Math.floor(Math.random() * cat.whiskers.length)];
      const imp = rand(-3.5, 3.5);
      for (let i = 3; i < s.nodes.length; i++) s.nodes[i].px -= imp * (i / s.nodes.length);
      this.nextTwitch = t + rand(1800, 4800);
    }
    const wx = this.mouse.x - this.offset - this.extra.x;
    const wy = this.mouse.y - this.extra.y;
    for (const c of this.cats) {
      if (Math.abs(c.CX + this.offset - this.W / 2) > this.W) continue;
      for (const s of c.whiskers) this._stepChain(s, 0.90, 85, wx, wy, 0.05);
      if (!this.reduceMotion) {
        const sw = Math.sin(t * 0.0011 + c.phase) * 0.5 + this._tailImpulse;
        const nodes = c.tail.nodes;
        for (let i = Math.floor(nodes.length * 0.5); i < nodes.length; i++)
          nodes[i].px -= sw * ((i / nodes.length) ** 2) * 0.8;
      }
      this._stepChain(c.tail, 0.93, 100, wx, wy, 0.03);
    }
    this._tailImpulse *= 0.9;
  }
  _tailImpulse = 0;

  // ── 오디오 (골골) ────────────────────────────────────────
  _initAudio() {
    if (this.actx) return;
    try {
      this.actx = new (window.AudioContext || window.webkitAudioContext)();
      const len = this.actx.sampleRate * 2;
      const buf = this.actx.createBuffer(1, len, this.actx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {           // brown noise
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
      const src = this.actx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = this.actx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 380;
      this.purrGain = this.actx.createGain();
      this.purrGain.gain.value = 0;
      src.connect(lp).connect(this.purrGain).connect(this.actx.destination);
      src.start();
      this._purrLevel = 0;
    } catch { this.actx = null; }
  }

  // ── 입력 ─────────────────────────────────────────────────
  _bindInput() {
    const ov = this.ovC;
    this._onMove = (e) => {
      const r = ov.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const m = this.mouse;
      if (m.active) {
        m.vx = Math.max(-34, Math.min(34, x - m.x));
        m.vy = Math.max(-34, Math.min(34, y - m.y));
        this.splat(x, y, m.vx, m.vy);
        // 쓰다듬 감지: 고양이 몸 위에서 움직일 때
        const c = this.catCenter();
        const speed = Math.hypot(m.vx, m.vy);
        if (Math.abs(x - c.x) < c.R * 1.6 && y > c.y - c.R * 1.6 && y < c.y + c.R * 2.8 && speed > 1)
          this.petMeter = Math.min(1, this.petMeter + speed * 0.0035);
      }
      m.x = x; m.y = y; m.active = true;
    };
    this._onLeave = () => {
      const m = this.mouse;
      m.active = false; m.x = m.y = -9999; m.vx = m.vy = 0;
    };
    this._onDown = () => this._initAudio();
    ov.addEventListener('pointermove', this._onMove);
    ov.addEventListener('pointerleave', this._onLeave);
    ov.addEventListener('pointerdown', this._onDown);
  }

  // ── 퍼블릭 API ───────────────────────────────────────────
  goTo(i) {
    this.index = Math.max(0, Math.min(this.breeds.length - 1, i));
    if (this.onIndexChange) this.onIndexChange(this.index);
  }
  setExtraOffset(x, y) { this.extra.x = x; this.extra.y = y; }
  excite(n = 3) { this._tailImpulse += n; }
  react(type = 'happy') {
    const c = this.catCenter();
    const cat = this.cats[this.index];
    if (cat) cat.blinkT = performance.now();
    const count = type === 'happy' ? 6 : 3;
    for (let i = 0; i < count; i++)
      this.hearts.push({
        x: c.x + rand(-c.R * 0.7, c.R * 0.7),
        y: c.y + rand(-c.R * 0.3, c.R * 0.6),
        vy: rand(-1.6, -0.8), vx: rand(-0.4, 0.4),
        life: 1, size: rand(12, 20),
      });
    this.excite(4);
  }
  catCenter() {
    const cat = this.cats[this.index];
    return {
      x: (cat ? cat.CX : this.W / 2) + this.offset + this.extra.x,
      y: this.CY + this.extra.y,
      R: this.R,
    };
  }
  snapshot() {
    const c = document.createElement('canvas');
    c.width = this.glC.width; c.height = this.glC.height;
    const x = c.getContext('2d');
    x.fillStyle = '#e8e1ce';
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(this.tlC, 0, 0);
    x.drawImage(this.glC, 0, 0);
    x.drawImage(this.ovC, 0, 0);
    return c;
  }
  destroy() {
    this._destroyed = true;
    cancelAnimationFrame(this._raf);
    removeEventListener('resize', this._onResize);
    this.ovC.removeEventListener('pointermove', this._onMove);
    this.ovC.removeEventListener('pointerleave', this._onLeave);
    this.ovC.removeEventListener('pointerdown', this._onDown);
    if (this.actx) this.actx.close();
  }

  // ── 프레임 ───────────────────────────────────────────────
  _frame(t) {
    if (this._destroyed) return;
    const gl = this.gl, { W, H, dpr } = this;

    const target = -this.index * W;
    this.prevOffset = this.offset;
    this.offset += (target - this.offset) * 0.09;
    if (Math.abs(target - this.offset) < 0.3) this.offset = target;
    const slideVel = Math.max(-60, Math.min(60, this.offset - this.prevOffset));

    this._stepField();
    this._stepChains(t);
    this.mouse.vx *= 0.5; this.mouse.vy *= 0.5;

    // 쓰다듬 게이지 감쇠 + 골골 볼륨
    this.petMeter *= 0.988;
    if (this.petMeter < 0.01) this.petMeter = 0;
    if (this.actx && this.purrGain) {
      const target2 = (!this.muted && this.petMeter > 0.45) ? 0.11 : 0;
      this._purrLevel += (target2 - this._purrLevel) * 0.06;
      this.purrGain.gain.value = this._purrLevel * (0.7 + 0.3 * Math.sin(t * 0.0015 * 2 * Math.PI * 24));
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const offX = this.offset + this.extra.x, offY = this.extra.y;

    gl.useProgram(this.flatProg);
    gl.uniform2f(this.u.resF, W, H);
    gl.uniform2f(this.u.offF, offX, offY);
    gl.bindVertexArray(this.flatVAO);
    for (const f of this.fans) gl.drawArrays(gl.TRIANGLE_FAN, f.first, f.count);

    gl.useProgram(this.furProg);
    gl.uniform2f(this.u.res, W, H);
    gl.uniform1f(this.u.time, t / 1000);
    gl.uniform1f(this.u.wind, this.reduceMotion ? 0 : 1.0);
    gl.uniform2f(this.u.off, offX, offY);
    gl.uniform1f(this.u.slide, this.reduceMotion ? 0 : slideVel);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GW, GH, gl.RG, gl.UNSIGNED_BYTE, this.fieldBytes);
    gl.uniform1i(this.u.field, 0);
    gl.bindVertexArray(this.furVAO);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, T_STEPS * 2, this.N_STRANDS);
    gl.bindVertexArray(null);

    this._drawTails(offX, offY);
    this._drawOverlay(t, offX, offY);

    this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  _drawTails(offX, offY) {
    const tctx = this.tctx, { W, H, dpr, R } = this;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, W, H);
    tctx.save();
    tctx.translate(offX, offY);
    tctx.lineCap = 'round';
    for (const c of this.cats) {
      if (Math.abs(c.CX + this.offset - W / 2) > W * 0.9) continue;
      const nodes = c.tail.nodes, n = nodes.length - 1;
      for (let i = 1; i <= n; i++) {
        const tt = i / n;
        let col = (i % 6 < 3) ? c.coat.tail.base : c.coat.tail.ring;
        if (c.coat.tail.tip && tt > 0.86) col = c.coat.tail.tip;
        tctx.strokeStyle = col;
        tctx.lineWidth = R * (0.19 - 0.11 * tt);
        tctx.beginPath();
        tctx.moveTo(nodes[i - 1].x, nodes[i - 1].y);
        tctx.lineTo(nodes[i].x, nodes[i].y);
        tctx.stroke();
      }
    }
    tctx.restore();
  }

  _drawOverlay(t, offX, offY) {
    const octx = this.octx, { W, H, dpr, R, CY } = this;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    octx.save();
    octx.translate(offX, offY);

    const lookPt = this.lookOverride || (this.mouse.active ? this.mouse : null);
    const wmx = lookPt ? lookPt.x - offX : null;
    const wmy = lookPt ? lookPt.y - offY : null;

    for (const c of this.cats) {
      if (Math.abs(c.CX + this.offset - W / 2) > W * 0.9) continue;
      const coat = c.coat, CX = c.CX;

      for (const ea of [EAR_L, EAR_R]) {
        const tipD = this._headR(ea) * 0.90;
        const tx = CX + Math.cos(ea) * tipD, ty = CY + Math.sin(ea) * tipD;
        const bx = CX + Math.cos(ea) * R * 0.76, by = CY + Math.sin(ea) * R * 0.76;
        const px = Math.cos(ea + Math.PI / 2), py = Math.sin(ea + Math.PI / 2);
        octx.beginPath();
        octx.moveTo(tx, ty);
        octx.lineTo(bx + px * R * 0.13, by + py * R * 0.13);
        octx.lineTo(bx - px * R * 0.13, by - py * R * 0.13);
        octx.closePath();
        octx.fillStyle = `rgba(214,150,140,${0.45 + coat.earBlush * 0.6})`;
        octx.strokeStyle = octx.fillStyle;
        octx.lineJoin = 'round';
        octx.lineWidth = R * 0.05;
        octx.fill(); octx.stroke();
      }
      if (coat.blush > 0)
        for (const side of [-1, 1]) {
          const bx = CX + side * R * 0.55, by = CY + R * 0.16;
          const g = octx.createRadialGradient(bx, by, 0, bx, by, R * 0.15);
          g.addColorStop(0, `rgba(200,105,80,${coat.blush})`);
          g.addColorStop(1, 'rgba(200,105,80,0)');
          octx.fillStyle = g;
          octx.beginPath();
          octx.arc(bx, by, R * 0.15, 0, Math.PI * 2);
          octx.fill();
        }

      if (c.blinkT < 0 && t > c.nextBlink) c.blinkT = t;
      let eyeOpen = 1;
      if (c.blinkT > 0) {
        const p = (t - c.blinkT) / 240;
        if (p >= 1) { c.blinkT = -1; c.nextBlink = t + rand(2200, 5600); }
        else eyeOpen = Math.abs(Math.cos(p * Math.PI));
      }
      // eyeOpen = 깜빡임만 반영된 개폐. 쓰다듬 감김은 content로 분리 처리.
      const content = smoothstep(0.45, 0.95, this.petMeter);   // 문턱 넘어야 스르륵 감김
      const arcFade = smoothstep(0.6, 1, content);             // 타원↔눈웃음 크로스페이드
      const lookX = wmx !== null ? Math.max(-1, Math.min(1, (wmx - CX) / (R * 3))) : 0;
      const lookY = wmy !== null ? Math.max(-1, Math.min(1, (wmy - CY) / (R * 3))) : 0;
      for (const side of [-1, 1]) {
        const ex = CX + side * R * 0.34 + lookX * R * 0.045;
        const ey = CY - R * 0.05 + lookY * R * 0.04;

        // 평상시 타원 눈 — arcFade가 1에 가까우면 페이드아웃
        if (arcFade < 0.999) {
          const open = Math.max(0.07, eyeOpen * (1 - content * 0.35));  // 미묘한 감김
          octx.save();
          octx.globalAlpha = 1 - arcFade;
          octx.beginPath();
          octx.ellipse(ex, ey, R * 0.145, R * 0.135 * open, 0, 0, Math.PI * 2);
          octx.fillStyle = coat.iris;
          octx.fill();
          if (eyeOpen > 0.3) {
            octx.save();
            octx.clip();   // 동공·하이라이트가 홍채 밖으로 새지 않게
            octx.beginPath();
            octx.arc(ex + lookX * R * 0.03, ey + lookY * R * 0.02,
                     R * 0.055 * Math.min(1, eyeOpen + 0.2), 0, Math.PI * 2);
            octx.fillStyle = `rgba(${INK},0.97)`;
            octx.fill();
            octx.fillStyle = 'rgba(255,252,244,0.95)';
            octx.beginPath();
            octx.arc(ex - R * 0.04, ey - R * 0.045 * open, R * 0.024, 0, Math.PI * 2);
            octx.fill();
            octx.beginPath();
            octx.arc(ex + R * 0.045, ey + R * 0.03 * open, R * 0.011, 0, Math.PI * 2);
            octx.fill();
            octx.restore();  // 클립 해제
          }
          // 테두리 — 깜빡임으로 open이 작아지면 알파를 줄여 지저분함 제거
          octx.lineWidth = R * 0.018;
          octx.strokeStyle = `rgba(${INK},${0.6 * Math.min(1, open / 0.25)})`;
          octx.beginPath();
          octx.ellipse(ex, ey, R * 0.145, R * 0.135 * open, 0, 0, Math.PI * 2);
          octx.stroke();
          octx.restore();  // globalAlpha 복원
        }

        // 행복 눈웃음 아크 — content가 0.6→1로 갈수록 나타남
        if (arcFade > 0.001) {
          octx.save();
          octx.globalAlpha = arcFade;
          octx.strokeStyle = `rgba(${INK},0.75)`;
          octx.lineWidth = R * 0.028;
          octx.lineCap = 'round';
          octx.beginPath();
          octx.moveTo(ex - R * 0.10, ey);
          octx.quadraticCurveTo(ex, ey + R * 0.075, ex + R * 0.10, ey);
          octx.stroke();
          octx.restore();
        }
      }

      const nx = CX, ny = CY + R * 0.17;
      octx.fillStyle = coat.nose;
      octx.strokeStyle = coat.nose;
      octx.lineJoin = 'round';
      octx.lineWidth = R * 0.018;
      octx.beginPath();
      octx.moveTo(nx - R * 0.036, ny);
      octx.lineTo(nx + R * 0.036, ny);
      octx.lineTo(nx, ny + R * 0.042);
      octx.closePath();
      octx.fill(); octx.stroke();
      octx.strokeStyle = `rgba(${INK},0.55)`;
      octx.lineWidth = 1.4;
      octx.lineCap = 'round';
      octx.beginPath();
      octx.moveTo(nx, ny + R * 0.042);
      octx.lineTo(nx, ny + R * 0.10);
      octx.moveTo(nx, ny + R * 0.10);
      octx.quadraticCurveTo(nx, ny + R * 0.15, nx - R * 0.085, ny + R * 0.15);
      octx.moveTo(nx, ny + R * 0.10);
      octx.quadraticCurveTo(nx, ny + R * 0.15, nx + R * 0.085, ny + R * 0.15);
      octx.stroke();

      octx.strokeStyle = `rgba(${INK},0.22)`;
      octx.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        const pwX = CX + side * R * 0.36, pwY = CY + R * 2.34;
        for (const o of [-0.075, 0.075]) {
          octx.beginPath();
          octx.moveTo(pwX + o * R, pwY - R * 0.01);
          octx.lineTo(pwX + o * R, pwY + R * 0.07);
          octx.stroke();
        }
      }

      for (const s of c.whiskers) {
        octx.strokeStyle = `rgba(${INK},0.18)`;
        octx.lineWidth = 2.4;
        octx.save();
        octx.translate(0.5, 1.2);
        smoothPath(octx, s.nodes);
        octx.stroke();
        octx.restore();
        octx.strokeStyle = 'rgba(252,245,228,0.95)';
        octx.lineWidth = 1.5;
        smoothPath(octx, s.nodes);
        octx.stroke();
      }
    }

    octx.restore();

    // 하트 파티클 (스크린 좌표)
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.x += h.vx; h.y += h.vy; h.life -= 0.012;
      if (h.life <= 0) { this.hearts.splice(i, 1); continue; }
      octx.globalAlpha = Math.min(1, h.life * 1.5);
      octx.fillStyle = '#c96b52';
      octx.font = `${h.size}px serif`;
      octx.fillText('♥', h.x, h.y);
      octx.globalAlpha = 1;
    }

    if (this.onFrame) {
      octx.save();
      this.onFrame(t, octx, { W, H, center: this.catCenter() });
      octx.restore();
    }
  }
}

// ── 헬퍼 ───────────────────────────────────────────────────
function makeChain(ax, ay, ang, len, count, stiff, droop) {
  const nodes = [];
  const seg = len / count;
  for (let j = 0; j <= count; j++) {
    const d2 = j * j * droop;
    const x = ax + Math.cos(ang) * seg * j;
    const y = ay + Math.sin(ang) * seg * j + d2;
    nodes.push({ x, y, px: x, py: y, rx: x, ry: y });
  }
  return { nodes, seg, stiff };
}

function makeTail(path, count) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    segs.push(d); total += d;
  }
  const step = total / count;
  const nodes = [];
  let si = 0, acc = 0;
  for (let j = 0; j <= count; j++) {
    const target = j * step;
    while (si < segs.length - 1 && acc + segs[si] < target) { acc += segs[si]; si++; }
    const t = Math.min(1, Math.max(0, (target - acc) / segs[si]));
    const x = path[si][0] + (path[si + 1][0] - path[si][0]) * t;
    const y = path[si][1] + (path[si + 1][1] - path[si][1]) * t;
    nodes.push({ x, y, px: x, py: y, rx: x, ry: y });
  }
  return { nodes, seg: step, stiff: 0.12 };
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function smoothPath(octx, nodes) {
  octx.beginPath();
  octx.moveTo(nodes[0].x, nodes[0].y);
  for (let i = 1; i < nodes.length - 1; i++)
    octx.quadraticCurveTo(nodes[i].x, nodes[i].y,
      (nodes[i].x + nodes[i + 1].x) / 2, (nodes[i].y + nodes[i + 1].y) / 2);
  octx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
}
