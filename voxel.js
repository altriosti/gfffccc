import * as THREE from "three";

function shape(t) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 24;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  Crows.draw(cx, Object.assign({}, t, { Aura: 0 }), { noBg: true });
  const img = cx.getImageData(0, 0, 24, 24).data;
  const on = (x, y) => (y >= 24 && x >= 0 && x < 24) || (x >= 0 && y >= 0 && x < 24 && y < 24 && img[(y * 24 + x) * 4 + 3] > 0);
  const out = [];
  for (let y = -1; y <= 24; y++) for (let x = -1; x <= 24; x++) if (!on(x, y)) out.push([x, y]);
  const d = new Float32Array(576);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    if (!on(x, y)) continue;
    let m = 99;
    for (const [ox, oy] of out) {
      const dx = ox - x, dy = oy - y;
      const v = dx * dx + dy * dy;
      if (v < m) m = v;
    }
    d[y * 24 + x] = Math.sqrt(m) - 0.5;
  }
  const cells = [];
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    if (!on(x, y)) continue;
    let R = 0;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      const X = x + i, Y = y + j;
      if (X >= 0 && Y >= 0 && X < 24 && Y < 24 && on(X, Y)) R = Math.max(R, d[Y * 24 + X]);
    }
    R = Math.min(6.5, Math.max(R, 0.8));
    const dd = Math.min(d[y * 24 + x], R);
    const h = Math.sqrt(Math.max(0, R * R - (R - dd) * (R - dd)));
    const o = (y * 24 + x) * 4;
    cells.push({ x, y, h: Math.max(1, Math.round(h * 0.82)), c: [img[o], img[o + 1], img[o + 2]] });
  }
  const H = new Map(cells.map((c) => [c.y * 24 + c.x, c.h]));
  const vox = [];
  for (const c of cells) {
    for (let z = -c.h; z < c.h; z++) {
      const az = z < 0 ? -z - 1 : z;
      const edge = az >= c.h - 1;
      const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => (H.get((c.y + j) * 24 + c.x + i) || 0) <= az);
      if (edge || side) vox.push([c.x, c.y, z, c.c]);
    }
  }
  return vox;
}

export function createVoxel(container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    container.classList.add("no3d");
    return { show() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "gl";
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221133, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(30, 50, 60);
  scene.add(key);
  const red = new THREE.DirectionalLight(0xff1f3d, 2.6);
  red.position.set(-50, 20, -30);
  scene.add(red);
  const cyan = new THREE.DirectionalLight(0x00e5ff, 2.4);
  cyan.position.set(50, 10, -40);
  scene.add(cyan);
  const lime = new THREE.PointLight(0xccff00, 140, 70);
  lime.position.set(0, -6, 34);
  scene.add(lime);

  const pivot = new THREE.Group();
  scene.add(pivot);
  const fig = new THREE.Group();
  pivot.add(fig);

  const base = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.6, flatShading: true });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(24, 2, 22), baseMat);
  b1.position.y = -13;
  base.add(b1);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(28, 2, 26), baseMat);
  b2.position.y = -15;
  base.add(b2);
  const glowCols = [0xccff00, 0xff1f3d, 0x00e5ff, 0x9d4dff];
  [[0, -14, 13.1, 28, 0.5, 0.3], [0, -14, -13.1, 28, 0.5, 0.3], [14.1, -14, 0, 0.3, 0.5, 26], [-14.1, -14, 0, 0.3, 0.5, 26]].forEach((p, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), new THREE.MeshBasicMaterial({ color: glowCols[i], toneMapped: false }));
    m.position.set(p[0], p[1], p[2]);
    base.add(m);
  });
  pivot.add(base);

  const shadowC = document.createElement("canvas");
  shadowC.width = shadowC.height = 64;
  const sc = shadowC.getContext("2d");
  const g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(157,77,255,0.55)");
  g.addColorStop(1, "rgba(157,77,255,0)");
  sc.fillStyle = g;
  sc.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowC), transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -16.1;
  scene.add(shadow);

  const box = new THREE.BoxGeometry(0.96, 0.96, 0.96);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.08, flatShading: true });
  let mesh = null;

  function show(t) {
    const vox = shape(t);
    if (mesh) { fig.remove(mesh); mesh.dispose(); }
    mesh = new THREE.InstancedMesh(box, mat, vox.length);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    vox.forEach(([x, y, z, col], i) => {
      m.makeTranslation(x - 11.5, 11.5 - y, z + 0.5);
      mesh.setMatrixAt(i, m);
      c.setRGB(col[0] / 255, col[1] / 255, col[2] / 255, THREE.SRGBColorSpace);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    fig.add(mesh);
    fig.scale.setScalar(0.001);
    grow = 0;
  }
  let grow = 1;

  let drag = null, rotY = -0.6, rotX = 0, spin = 0.55, idle = 0;
  container.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX }; container.setPointerCapture(e.pointerId); });
  container.addEventListener("pointermove", (e) => {
    if (!drag) return;
    rotY = drag.ry + (e.clientX - drag.x) * 0.012;
    rotX = Math.max(-0.4, Math.min(0.5, drag.rx + (e.clientY - drag.y) * 0.006));
  });
  const up = () => { drag = null; idle = 0; };
  container.addEventListener("pointerup", up);
  container.addEventListener("pointercancel", up);

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = 72 * Math.max(1, 0.95 / camera.aspect);
    camera.position.set(0, 16, dist);
    camera.lookAt(0, -2, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let running = true, last = performance.now();
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { running = es[0].isIntersecting; last = performance.now(); }).observe(container);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!drag) { idle += dt; rotY += spin * dt * Math.min(1, idle); rotX += (0 - rotX) * Math.min(1, dt * 2); }
    if (grow < 1) { grow = Math.min(1, grow + dt * 2.2); const k = 1 - Math.pow(1 - grow, 3); fig.scale.setScalar(Math.max(0.001, k)); }
    pivot.rotation.set(rotX, rotY, 0);
    fig.position.y = Math.sin(now / 700) * 0.6;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  return { show };
}
