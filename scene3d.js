import * as THREE from "three";

const OUTER = [[0, 0], [0.5, 0], [0.6, 0.04], [0.64, 0.12], [0.6, 0.2], [0.74, 0.42], [0.88, 0.72], [0.92, 1.0], [0.87, 1.26], [0.72, 1.5], [0.52, 1.7], [0.4, 1.86], [0.37, 2.0], [0.4, 2.14], [0.5, 2.24], [0.53, 2.3]];
const TOP = 2.3;
const WALL = 0.05;
const FLOOR = 0.13;
const BASE = 0.5;
const FULL = 1.78;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const bell = (t) => Math.sin(Math.PI * clamp(t, 0, 1));

function outerR(y) {
  for (let i = 2; i < OUTER.length; i++) {
    const a = OUTER[i - 1], b = OUTER[i];
    if (y <= b[1]) return lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1] || 1));
  }
  return OUTER[OUTER.length - 1][0];
}
const innerR = (y) => Math.max(0.02, outerR(y) - WALL);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pebbleGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.sin(Math.round(v.x * 97) * 12.9898 + Math.round(v.y * 97) * 78.233 + Math.round(v.z * 97) * 37.719 + seed * 4.1) * 43758.5453;
    const k = 1 + ((h - Math.floor(h)) - 0.5) * 0.34;
    p.setXYZ(i, v.x * k * 1.25, v.y * k * 0.78, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

function environment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: 0x2a2f22, side: THREE.BackSide }));
  env.add(room);
  const glow = (w, h, x, y, z, c, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  glow(5, 3, 0, 3.9, 0, 0xffffff, 3);
  glow(3, 4, -5.9, 1, 2, 0xffffff, 2.2);
  glow(4, 2, 5.9, 0.5, -2, 0xccff00, 1.6);
  glow(3, 3, 0, 1, 5.9, 0xffffff, 1.2);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.035).texture;
  pm.dispose();
  return tex;
}

function buildCrow() {
  const black = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.42, metalness: 0.15, sheen: 1, sheenColor: new THREE.Color(0x5b74ff), sheenRoughness: 0.35, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.55, flatShading: true });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x2e3036, roughness: 0.3, metalness: 0.35, flatShading: true });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.6 });
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const add = (parent, geo, mat, x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (sx) m.scale.set(sx, sy, sz);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  for (const z of [-0.09, 0.09]) {
    add(inner, new THREE.CylinderGeometry(0.022, 0.018, 0.26, 6), legMat, 0.02, 0.13, z);
    add(inner, new THREE.BoxGeometry(0.16, 0.02, 0.05), legMat, 0.07, 0.01, z);
  }
  const body = add(inner, new THREE.SphereGeometry(0.42, 12, 9), black, 0, 0.62, 0, 1.35, 0.95, 0.86);
  body.rotation.z = 0.32;
  add(inner, new THREE.SphereGeometry(0.3, 10, 8), black, 0.28, 0.78, 0, 1, 1.05, 0.95);
  const tail = add(inner, new THREE.BoxGeometry(0.62, 0.05, 0.3), dark, -0.66, 0.42, 0);
  tail.rotation.z = 0.5;
  const tail2 = add(inner, new THREE.BoxGeometry(0.5, 0.04, 0.2), dark, -0.62, 0.47, 0);
  tail2.rotation.z = 0.38;
  const wings = [];
  const shape = new THREE.Shape();
  const pts = [[0.1, 0], [0.16, 0.28], [0.12, 0.55], [0.02, 0.78], [-0.1, 0.95], [-0.2, 0.9], [-0.27, 0.78], [-0.21, 0.74], [-0.33, 0.6], [-0.26, 0.56], [-0.37, 0.4], [-0.29, 0.36], [-0.36, 0.2], [-0.27, 0.16], [-0.3, 0]];
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 });
  wingGeo.translate(0, 0, -0.017);
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.12, 0.8, 0.26 * s);
    pivot.rotation.order = "XYZ";
    inner.add(pivot);
    const w = add(pivot, wingGeo, dark, 0, 0, 0);
    w.rotation.x = (Math.PI / 2) * s;
    wings.push({ pivot, s });
  }
  const neck = new THREE.Group();
  neck.position.set(0.4, 0.92, 0);
  inner.add(neck);
  add(neck, new THREE.SphereGeometry(0.27, 11, 9), black, 0.12, 0.14, 0);
  add(neck, new THREE.SphereGeometry(0.2, 9, 7), black, 0.02, 0.0, 0, 1, 1.1, 1);
  const upper = add(neck, new THREE.ConeGeometry(0.09, 0.44, 7), beakMat, 0.52, 0.14, 0, 1, 1, 0.9);
  upper.rotation.z = -Math.PI / 2 - 0.08;
  const lowerPivot = new THREE.Group();
  lowerPivot.position.set(0.32, 0.1, 0);
  neck.add(lowerPivot);
  const lower = add(lowerPivot, new THREE.ConeGeometry(0.06, 0.34, 6), beakMat, 0.17, -0.02, 0, 1, 1, 0.9);
  lower.rotation.z = -Math.PI / 2 + 0.05;
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.2, emissive: 0x3a2200 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const z of [0.2, -0.2]) {
    add(neck, new THREE.SphereGeometry(0.05, 10, 8), eyeMat, 0.25, 0.22, z * 0.98);
    add(neck, new THREE.SphereGeometry(0.03, 8, 6), pupil, 0.27, 0.22, z * 1.13);
    add(neck, new THREE.SphereGeometry(0.012, 6, 4), shine, 0.285, 0.24, z * 1.2);
  }
  const tip = new THREE.Object3D();
  tip.position.set(0.62, 0.06, 0);
  neck.add(tip);
  return { root, inner, neck, wings, lowerPivot, tip };
}

export function createScene(container, opt) {
  opt = opt || {};
  const MAX = opt.max || 8;
  const auto = opt.auto !== false;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    container.classList.add("no3d");
    return { drop() {}, fill() {}, count: () => 0 };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = "gl";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const bg = new THREE.Color(opt.bg || "#ccff00");
  scene.background = bg;
  scene.environment = environment(renderer);
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 60);
  const look = new THREE.Vector3(0.9, 1.32, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa600, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(3.5, 6, 3.2);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const halo = document.createElement("canvas");
  halo.width = halo.height = 128;
  const hc = halo.getContext("2d");
  const grad = hc.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(40,60,0,0.22)");
  grad.addColorStop(0.55, "rgba(40,60,0,0.08)");
  grad.addColorStop(1, "rgba(40,60,0,0)");
  hc.fillStyle = grad;
  hc.fillRect(0, 0, 128, 128);
  const haloTex = new THREE.CanvasTexture(halo);
  const stage = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.55 }));
  stage.rotation.x = -Math.PI / 2;
  stage.position.set(0.9, 0.001, 0.2);
  scene.add(stage);
  const blobC = document.createElement("canvas");
  blobC.width = blobC.height = 64;
  const bc = blobC.getContext("2d");
  const bg2 = bc.createRadialGradient(32, 32, 0, 32, 32, 32);
  bg2.addColorStop(0, "rgba(20,30,0,0.55)");
  bg2.addColorStop(0.5, "rgba(20,30,0,0.28)");
  bg2.addColorStop(1, "rgba(20,30,0,0)");
  bc.fillStyle = bg2;
  bc.fillRect(0, 0, 64, 64);
  const blobTex = new THREE.CanvasTexture(blobC);
  const blob = (w, d, x, z, o) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false, opacity: o }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.003, z);
    scene.add(m);
    return m;
  };
  blob(2.6, 2.3, 0.05, 0.1, 0.95);
  blob(1.2, 1.0, 2.42, 0.18, 0.6);

  const path = OUTER.map(([r, y]) => new THREE.Vector2(r, y));
  path.push(new THREE.Vector2(0.53 - WALL, TOP));
  for (let i = 1; i <= 48; i++) {
    const y = lerp(TOP - 0.02, FLOOR, i / 48);
    path.push(new THREE.Vector2(innerR(y), y));
  }
  path.push(new THREE.Vector2(0, FLOOR));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.3, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.04, attenuationColor: new THREE.Color("#f4ffe0"), attenuationDistance: 3 });
  const jug = new THREE.Group();
  scene.add(jug);
  const body = new THREE.Mesh(new THREE.LatheGeometry(path, 72), glass);
  jug.add(body);
  const handleCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.8, 1.36, 0), new THREE.Vector3(-1.18, 1.34, 0), new THREE.Vector3(-1.34, 1.02, 0), new THREE.Vector3(-1.2, 0.66, 0), new THREE.Vector3(-0.86, 0.5, 0)]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 40, 0.06, 12, false), glass);
  jug.add(handle);

  const waterMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#00c6ff"), roughness: 0.1, metalness: 0, emissive: new THREE.Color("#0088cc"), emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const water = new THREE.Mesh(new THREE.BufferGeometry(), waterMat);
  jug.add(water);
  const surfGeo = new THREE.RingGeometry(0, 1, 44, 10);
  const surfBase = surfGeo.attributes.position.array.slice();
  const surface = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color("#5cc8ff"), roughness: 0.03, metalness: 0.2, emissive: new THREE.Color("#1382c4"), emissiveIntensity: 0.45, side: THREE.DoubleSide }));
  surface.rotation.x = -Math.PI / 2;
  jug.add(surface);
  let level = BASE, target = BASE, built = -1;
  const ripples = [];

  function buildWater(l) {
    const pts = [new THREE.Vector2(0, FLOOR + 0.01)];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const y = lerp(FLOOR + 0.01, l, i / n);
      pts.push(new THREE.Vector2(innerR(y) - 0.012, y));
    }
    water.geometry.dispose();
    water.geometry = new THREE.LatheGeometry(pts, 56);
    const r = innerR(l) - 0.012;
    surface.position.y = l;
    surface.scale.set(r, r, 1);
    built = l;
  }

  function rippleUpdate(now) {
    const pos = surfGeo.attributes.position;
    const r = surface.scale.x;
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 2.4) ripples.splice(i, 1);
    for (let i = 0; i < pos.count; i++) {
      const x = surfBase[i * 3], y = surfBase[i * 3 + 1];
      let z = 0;
      for (const rp of ripples) {
        const age = now - rp.t;
        const dx = x * r - rp.x, dy = y * r - rp.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const front = age * 0.7;
        if (d < front + 0.05) z += 0.035 * Math.exp(-age * 1.8) * Math.sin(d * 26 - age * 10) * (1 - d / (front + 0.3));
      }
      z += Math.sin(now * 1.7 + x * 4) * 0.004;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    surfGeo.computeVertexNormals();
  }

  const PEB_GEOS = Array.from({ length: 6 }, (_, i) => pebbleGeometry(i + 1));
  const PEB_COL = ["#6f747d", "#8a8f99", "#a7abb3", "#5d6169", "#9a8f7e", "#c2b59b"];
  const PEB_MATS = PEB_COL.map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.75, metalness: 0.05, flatShading: true }));
  const GOLD = new THREE.MeshStandardMaterial({ color: new THREE.Color("#f5c542"), roughness: 0.3, metalness: 0.7, flatShading: true });
  const R = rng(11);
  function pebble(scale, gold) {
    const m = new THREE.Mesh(PEB_GEOS[Math.floor(R() * PEB_GEOS.length)], gold ? GOLD : PEB_MATS[Math.floor(R() * PEB_MATS.length)]);
    m.scale.setScalar(scale);
    m.rotation.set(R() * 6, R() * 6, R() * 6);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const G = new THREE.Vector3(1.78, 0, 0.62);
  const PILE = new THREE.Vector3(2.42, 0, 0.18);
  for (let i = 0; i < 18; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.42;
    const p = pebble(0.07 + R() * 0.06, i === 7);
    p.position.set(PILE.x + Math.cos(a) * d, 0.05 + (0.42 - d) * 0.12 * R(), PILE.z + Math.sin(a) * d);
    scene.add(p);
  }
  [[0.95, 0.95], [1.3, -0.7], [2.9, 0.8], [-0.7, -0.6]].forEach(([x, z], i) => {
    const p = pebble(0.045 + (i % 3) * 0.012, false);
    p.position.set(x, 0.03, z);
    scene.add(p);
  });

  const crow = buildCrow();
  crow.root.scale.setScalar(0.78);
  scene.add(crow.root);
  const crowBlob = blob(1.1, 0.8, G.x, G.z, 0.75);
  const carry = pebble(0.085 / 0.78, false);
  carry.visible = false;
  crow.tip.add(carry);

  const dirOut = new THREE.Vector3(G.x, 0, G.z).normalize();
  const RIM = dirOut.clone().multiplyScalar(0.47);
  RIM.y = TOP;
  const yawTo = (from, to) => Math.atan2(-(to.z - from.z), to.x - from.x);
  const YAW_PILE = yawTo(G, PILE);
  const YAW_JUG = yawTo(RIM, new THREE.Vector3(0, 0, 0));
  crow.root.position.copy(G);
  crow.root.rotation.y = YAW_PILE;

  const inside = [];
  const falling = [];
  const drops = Array.from({ length: 26 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshStandardMaterial({ color: 0xbff0ff, emissive: 0x3aa7d8, emissiveIntensity: 0.5, roughness: 0.1 }));
    m.visible = false;
    scene.add(m);
    return { m, v: new THREE.Vector3(), life: 0 };
  });

  function splash(p, now) {
    let n = 0;
    for (const d of drops) {
      if (d.life > 0 || n >= 12) continue;
      n++;
      const a = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 0.5;
      d.m.position.set(p.x, level + 0.02, p.z);
      d.v.set(Math.cos(a) * s, 1.3 + Math.random() * 1.2, Math.sin(a) * s);
      d.life = 0.9;
      d.m.visible = true;
    }
    ripples.push({ t: now, x: p.x, y: -p.z });
  }

  function slotFor(n) {
    const layer = Math.floor(n / 5);
    const a = n * 2.39996 + 0.6;
    const y = FLOOR + 0.07 + layer * 0.085;
    const rr = (innerR(y) - 0.12) * (0.35 + ((n * 0.618) % 1) * 0.65);
    return new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
  }

  function restCount() { return inside.length; }
  function changed() { if (opt.onChange) opt.onChange(inside.length, Math.round((inside.length / MAX) * 100)); }

  let phase = "idle", pt = 0, queued = 0, ordered = 0;
  const set = (p) => { phase = p; pt = 0; };

  function releasePebble() {
    carry.visible = false;
    const m = pebble(0.085, inside.length + falling.length === 3);
    crow.tip.getWorldPosition(m.position);
    scene.add(m);
    falling.push({ m, v: new THREE.Vector3(0, -0.2, 0), target: slotFor(inside.length + falling.length), wet: false });
  }

  function wings(open, flap) {
    for (const w of crow.wings) {
      w.pivot.rotation.y = lerp(-1.42, -0.25, open) * w.s;
      w.pivot.rotation.x = -flap * w.s;
    }
  }

  function pose(dt, now) {
    pt += dt;
    const c = crow;
    let neckZ = 0, pitch = 0, open = 0, flap = 0, beak = 0;
    if (phase === "idle") {
      neckZ = Math.sin(now * 2.1) * 0.05;
      const want = auto ? pt > 0.5 : queued > 0;
      if (want && inside.length + falling.length < MAX) { if (!auto) queued--; set("pick"); }
    } else if (phase === "pick") {
      const k = pt / 0.95;
      neckZ = k < 0.4 ? -1.05 * ease(k / 0.4) : k < 0.55 ? -1.05 : -1.05 * (1 - ease((k - 0.55) / 0.45));
      pitch = -0.28 * bell(k);
      beak = k > 0.3 && k < 0.5 ? 0.35 : 0;
      if (k > 0.45) carry.visible = true;
      if (k >= 1) set("up");
    } else if (phase === "up") {
      const k = clamp(pt / 1.1, 0, 1);
      const e = ease(k);
      c.root.position.lerpVectors(G, RIM, e);
      c.root.position.y += Math.sin(Math.PI * k) * 0.55;
      c.root.rotation.y = lerp(YAW_PILE, YAW_JUG, ease(clamp(k / 0.6, 0, 1)));
      open = Math.min(1, bell(k) * 2.2);
      flap = Math.sin(pt * 26) * 0.95 * open;
      pitch = 0.18 * bell(k);
      if (k >= 1) set("drop");
    } else if (phase === "drop") {
      const k = pt / 0.85;
      neckZ = -0.62 * bell(k);
      pitch = -0.22 * bell(k);
      beak = k > 0.35 && k < 0.8 ? 0.4 : 0;
      if (carry.visible && k > 0.42) releasePebble();
      if (k >= 1) set(inside.length + falling.length >= MAX && auto ? "wait" : "down");
    } else if (phase === "wait") {
      neckZ = Math.sin(now * 3) * 0.06;
      if (falling.length === 0 && pt > 0.4) set("drink");
    } else if (phase === "drink") {
      const k = pt / 2.4;
      neckZ = -1.0 * bell(Math.min(1, k * 1.25));
      pitch = -0.3 * bell(Math.min(1, k * 1.25));
      beak = k > 0.25 && k < 0.7 ? 0.25 + Math.sin(pt * 18) * 0.15 : 0;
      if (k > 0.3) target = BASE;
      inside.forEach((p) => p.scale.multiplyScalar(k > 0.3 ? Math.pow(0.08, dt) : 1));
      if (k >= 1) {
        inside.splice(0).forEach((p) => { scene.remove(p); });
        changed();
        set("down");
      }
    } else if (phase === "down") {
      const k = clamp(pt / 1.0, 0, 1);
      const e = ease(k);
      c.root.position.lerpVectors(RIM, G, e);
      c.root.position.y += Math.sin(Math.PI * k) * 0.4;
      c.root.rotation.y = lerp(YAW_JUG, YAW_PILE, ease(clamp(k / 0.6, 0, 1)));
      open = Math.min(1, bell(k) * 2.2);
      flap = Math.sin(pt * 26) * 0.9 * open;
      pitch = 0.14 * bell(k);
      if (k >= 1) { c.root.position.copy(G); set("idle"); }
    }
    crowBlob.position.x = c.root.position.x;
    crowBlob.position.z = c.root.position.z;
    const hgt = c.root.position.y;
    crowBlob.material.opacity = hgt > 1.5 ? 0 : 0.75 * Math.max(0, 1 - hgt / 1.2);
    crowBlob.scale.setScalar(1 + hgt * 0.4);
    c.neck.rotation.z = neckZ;
    c.inner.rotation.z = pitch;
    c.lowerPivot.rotation.z = -beak;
    wings(open, flap);
  }

  function physics(dt, now) {
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i];
      const p = f.m.position;
      if (!f.wet) {
        f.v.y -= 9.8 * dt;
        p.y += f.v.y * dt;
        p.x += (f.target.x - p.x) * Math.min(1, dt * 5);
        p.z += (f.target.z - p.z) * Math.min(1, dt * 5);
        if (p.y <= level) { f.wet = true; splash(p, now); f.v.y = -0.7; }
      } else {
        p.y = Math.max(f.target.y, p.y - 0.75 * dt);
        p.x += (f.target.x - p.x) * Math.min(1, dt * 3);
        p.z += (f.target.z - p.z) * Math.min(1, dt * 3);
        f.m.rotation.x += dt * 1.5;
        if (p.y <= f.target.y + 0.001) {
          falling.splice(i, 1);
          inside.push(f.m);
          target = BASE + (FULL - BASE) * (inside.length / MAX);
          changed();
        }
      }
    }
    for (const d of drops) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.v.y -= 7 * dt;
      d.m.position.addScaledVector(d.v, dt);
      d.m.scale.setScalar(Math.max(0.2, d.life));
      if (d.life <= 0 || d.m.position.y < level - 0.05) { d.life = 0; d.m.visible = false; }
    }
    level += (target - level) * Math.min(1, dt * 2.2);
    if (Math.abs(level - built) > 0.0025) buildWater(level);
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  container.addEventListener("pointermove", (e) => {
    const r = container.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  container.addEventListener("pointerleave", () => { mouse.tx = 0; mouse.ty = 0; });

  let aspect = 1;
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let running = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { running = es[0].isIntersecting; if (running) last = performance.now(); }).observe(container);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) last = performance.now(); });

  buildWater(level);
  changed();
  let last = performance.now();
  const t0 = last;
  function frame(nowMs) {
    requestAnimationFrame(frame);
    if (!running || document.hidden) return;
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    const now = (nowMs - t0) / 1000;
    pose(dt, now);
    physics(dt, now);
    rippleUpdate(now);
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
    const dist = (opt.dist || 7.1) * Math.max(1, 1.05 / aspect);
    const ang = 0.18 + Math.sin(now * 0.15) * 0.12 + mouse.x * 0.35;
    camera.position.set(look.x + Math.sin(ang) * dist, 2.45 - mouse.y * 0.6, Math.cos(ang) * dist);
    camera.lookAt(look);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    drop() { queued += 1; ordered += 1; },
    fill(n) {
      while (inside.length < Math.min(n, MAX)) {
        const m = pebble(0.085, inside.length === 3);
        m.position.copy(slotFor(inside.length));
        scene.add(m);
        inside.push(m);
      }
      ordered = Math.max(ordered, inside.length);
      target = level = BASE + (FULL - BASE) * (inside.length / MAX);
      buildWater(level);
      changed();
    },
    count() { return ordered; }
  };
}
