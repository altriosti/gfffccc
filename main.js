(function () {
  const CFG = window.PEBBLE_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function crowTo(c, t) {
    if (!c) return;
    c.width = 24;
    c.height = 24;
    Crows.draw(c.getContext("2d"), t);
  }
  const LOGO = Object.assign({}, Px.HERO, { Background: 3 });
  crowTo($("#logo"), LOGO);
  crowTo($("#logo2"), LOGO);
  crowTo($("#heroFallback"), Px.HERO);
  crowTo($("#ctaCrow"), { Feather: 2, Eye: 5, Background: 8, Aura: 1, Plumage: 0, Neck: 3, Eyes: 2, Beak: 1, Carry: 2, Eyewear: 0, Headwear: 5 });
  $$("canvas[data-crow]").forEach((c) => crowTo(c, Crows.roll(Px.rng(+c.dataset.crow))));

  if (CFG.xProfile) ["#navX", "#footX"].forEach((s) => { const a = $(s); a.href = CFG.xProfile; a.hidden = false; });
  const links = $("#navLinks");
  const mb = $("#menuBtn");
  mb.addEventListener("click", () => { links.classList.toggle("open"); mb.classList.toggle("open"); });
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { links.classList.remove("open"); mb.classList.remove("open"); }));
  const pb = $("#progressbar");
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    pb.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const words = ["4,000 crows", "16 pitchers", "GPU + CPU mining", "Fully on-chain", "Robinhood Chain", "$PEBBLE", "Water for stakers", "Buyback & burn", "Liquidity locked forever"];
  const track = $("#marquee");
  track.innerHTML = words.concat(words).map((w) => "<span>" + w + "</span>").join("");
  const words2 = ["Drop a pebble", "Raise the water", "Mint #10 opens trading", "0.0005 ETH first crow", "Stake 30 days for 4x", "Whitelist is open"];
  $("#marquee2").innerHTML = words2.concat(words2).map((w) => "<span>" + w + "</span>").join("");

  const stage = $("#stage");
  import("./scene3d.js").then((m) => {
    m.createScene(stage, {
      max: 8,
      onChange: (n, pct) => {
        $("#hudCount").textContent = n + "/8";
        $("#hudWater").textContent = pct + "%";
        $("#hudBar").style.width = pct + "%";
      }
    });
  }).catch(() => stage.classList.add("no3d"));

  const hashes = $("#hashes");
  const finder = $("#finder");
  const hex = (n) => { let s = ""; for (let i = 0; i < n; i++) s += "0123456789abcdef"[Math.floor(Math.random() * 16)]; return s; };
  const fmt = (n) => n.toLocaleString("en-US");
  const F = { phase: "search", t: 0, until: 4 + Math.random() * 2.5, nonce: Math.floor(Math.random() * 9e8), tries: 0, next: 1, left: 0, rows: [] };
  let finderOn = false;
  function stepOn(i) { $$("#steps li").forEach((li) => li.classList.toggle("on", +li.dataset.s === i)); }
  function row(html, hit) {
    const d = document.createElement("div");
    if (hit) d.className = "hit";
    d.innerHTML = html;
    hashes.prepend(d);
    while (hashes.children.length > 12) hashes.lastChild.remove();
  }
  function btn(text, on, fill) {
    $("#fBtnText").textContent = text;
    $("#fBtn").disabled = !on;
    $("#fFill").style.width = (fill || 0) + "%";
  }
  function search() {
    F.phase = "search"; F.t = 0; F.until = 3.5 + Math.random() * 3;
    $("#fStatus").textContent = "SEARCHING";
    btn("Searching...", false, 0);
    $("#fMsg").innerHTML = "Your device is looking for a pebble.";
    stepOn(0);
  }
  function outcome(won) {
    F.phase = "rest"; F.t = 0;
    if (won) {
      $("#fStatus").textContent = "MINTED";
      btn("Minted!", false, 100);
      $("#fMsg").innerHTML = "<b>Crow #" + fmt(F.next) + "</b> joined the flock.";
      F.next += 1 + Math.floor(Math.random() * 3);
    } else {
      $("#fStatus").textContent = "SUNK";
      btn("Too late", false, 0);
      $("#fMsg").innerHTML = "Another crow minted <b>#" + fmt(F.next) + "</b> first. Your pebble sank.";
      F.next += 1 + Math.floor(Math.random() * 2);
    }
    $("#fNext").textContent = "#" + fmt(F.next);
  }
  $("#fBtn").addEventListener("click", () => { if (F.phase === "mint") outcome(true); });
  let lastF = performance.now(), acc = 0;
  function tickFinder(now) {
    requestAnimationFrame(tickFinder);
    const dt = Math.min(0.1, (now - lastF) / 1000);
    lastF = now;
    if (!finderOn || document.hidden) return;
    F.t += dt;
    acc += dt;
    if (F.phase === "search") {
      if (acc > 0.07) {
        acc = 0;
        const step = 180000 + Math.floor(Math.random() * 260000);
        F.nonce += step; F.tries += step;
        let h = hex(10);
        if (h.startsWith("0")) h = "7" + h.slice(1);
        row("<span>" + fmt(F.nonce) + "</span><span>0x" + h + "..</span>");
        $("#fTries").textContent = (F.tries / 1e6).toFixed(1) + "M";
        $("#fRate").textContent = (380 + Math.random() * 90).toFixed(1) + " MH/s";
      }
      if (F.t > F.until) {
        F.phase = "found"; F.t = 0;
        row("<span>" + fmt(F.nonce + 1337) + "</span><span>0x00000" + hex(5) + ".. PEBBLE</span>", true);
        $("#fStatus").textContent = "PEBBLE FOUND";
        $("#fMsg").innerHTML = "The crow drops the pebble. <b>The water rises.</b>";
        stepOn(1);
      }
    } else if (F.phase === "found") {
      if (F.t > 0.7) stepOn(2);
      if (F.t > 1.4) { F.phase = "mint"; F.t = 0; F.left = 10; F.auto = Math.random() < 0.55 ? 2.5 + Math.random() * 4 : 3 + Math.random() * 7; F.win = Math.random() < 0.55; stepOn(3); $("#fMsg").innerHTML = "Mint within 10 seconds. <b>Another crow may drop first.</b>"; }
    } else if (F.phase === "mint") {
      const left = Math.max(0, 10 - F.t);
      btn("Mint crow #" + fmt(F.next) + " · " + Math.ceil(left) + "s", true, (F.t / 10) * 100);
      if (F.t > F.auto) outcome(F.win);
      else if (left <= 0) outcome(false);
    } else if (F.phase === "rest") {
      if (F.t > 2.6) search();
    }
  }
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { finderOn = es[0].isIntersecting; }).observe(finder);
  else finderOn = true;
  for (let i = 0; i < 12; i++) { F.nonce += 250000; row("<span>" + fmt(F.nonce) + "</span><span>0x" + ("7" + hex(9)) + "..</span>"); }
  search();
  requestAnimationFrame(tickFinder);

  const price = (i) => 0.0005 + (0.0195 * (i - 1)) / 3999;
  const fp = (v) => v.toFixed(v < 0.01 ? 4 : 3);
  const VASE = "M23 5 H37 L36 10 Q35 16 41 21 Q53 31 53 47 Q53 63 43 69 L43 74 H17 L17 69 Q7 63 7 47 Q7 31 19 21 Q25 16 24 10 Z";
  const jugs = $("#jugs");
  for (let k = 1; k <= 16; k++) {
    const fill = 0.12 + (k / 16) * 0.78;
    const y = 72 - fill * 58;
    const id = "cj" + k;
    const d = document.createElement("div");
    d.className = "jug";
    d.title = "Crows #" + fmt((k - 1) * 250 + 1) + " to #" + fmt(k * 250) + ": " + fp(price((k - 1) * 250 + 1)) + " to " + fp(price(k * 250)) + " ETH";
    d.innerHTML =
      '<svg viewBox="0 0 60 80"><defs><clipPath id="' + id + '"><path d="' + VASE + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><rect x="0" y="' + y.toFixed(1) + '" width="60" height="80" fill="#07070b"/>' +
      '<path class="wave" d="M-10 ' + y.toFixed(1) + ' Q0 ' + (y - 3).toFixed(1) + ' 10 ' + y.toFixed(1) + ' T30 ' + y.toFixed(1) + ' T50 ' + y.toFixed(1) + ' T70 ' + y.toFixed(1) + '" fill="none" stroke="#00e5ff" stroke-width="3" style="animation-delay:' + (k * -0.2) + 's"/>' +
      '<circle cx="24" cy="70" r="3.2" fill="#6f747d"/><circle cx="31" cy="71" r="2.6" fill="#8a8f99"/><circle cx="37" cy="69.5" r="2.8" fill="#5d6169"/></g>' +
      '<path d="' + VASE + '" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M9 34 Q0 36 1 46 Q2 56 10 58" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round"/></svg>' +
      '<div class="n"><span class="w">PITCHER </span><span class="s">P</span>' + k + '</div><div class="p">' + fp(price((k - 1) * 250 + 1)) + "</div>";
    jugs.appendChild(d);
  }

  const svg = $("#curve");
  {
    const L = 66, Rr = 784, T = 20, B = 226;
    const X = (i) => L + ((i - 1) / 3999) * (Rr - L);
    const Y = (p) => B - (p / 0.02) * (B - T);
    let s = '<defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ccff00" stop-opacity="0.28"/><stop offset="1" stop-color="#ccff00" stop-opacity="0"/></linearGradient></defs>';
    for (let k = 0; k < 16; k++) {
      const x0 = X(k * 250 + 1), x1 = X((k + 1) * 250);
      s += '<rect x="' + x0.toFixed(1) + '" y="' + T + '" width="' + (x1 - x0 - 2).toFixed(1) + '" height="' + (B - T) + '" rx="4" fill="' + (k % 2 ? "#15151f" : "#101018") + '"/>';
      if (k % 3 === 0 || k === 15) s += '<text x="' + ((x0 + x1) / 2).toFixed(1) + '" y="' + (B + 26) + '" fill="#7a7a96" font-family="Jersey 10, monospace" font-size="18" text-anchor="middle">P' + (k + 1) + "</text>";
    }
    [0, 0.005, 0.01, 0.015, 0.02].forEach((p) => {
      s += '<line x1="' + L + '" x2="' + Rr + '" y1="' + Y(p) + '" y2="' + Y(p) + '" stroke="#2a2a3c" stroke-dasharray="4 6"/>';
      s += '<text x="' + (L - 12) + '" y="' + (Y(p) + 4) + '" fill="#b3b3cc" font-family="Jersey 10, monospace" font-size="18" text-anchor="end">' + p + "</text>";
    });
    const line = "M" + X(1) + " " + Y(price(1)) + " L" + X(4000) + " " + Y(price(4000));
    s += '<path d="' + line + " L" + X(4000) + " " + B + " L" + X(1) + " " + B + ' Z" fill="url(#gl)"/>';
    s += '<path id="cline" d="' + line + '" fill="none" stroke="#ccff00" stroke-width="5" stroke-linecap="square"/>';
    s += '<rect x="' + (X(1) - 7) + '" y="' + (Y(price(1)) - 7) + '" width="14" height="14" fill="#ccff00"/>';
    s += '<rect x="' + (X(4000) - 7) + '" y="' + (Y(price(4000)) - 7) + '" width="14" height="14" fill="#ff1f3d"/>';
    s += '<rect id="cdot" width="12" height="12" fill="#00e5ff"/>';
    s += '<text x="' + (L - 12) + '" y="' + (T - 6) + '" fill="#7a7a96" font-family="Jersey 10, monospace" font-size="16" text-anchor="end">ETH</text>';
    svg.innerHTML = s;
    const dot = $("#cdot");
    let ci = 1;
    setInterval(() => {
      ci = ci >= 4000 ? 1 : ci + 25;
      dot.setAttribute("x", X(ci) - 6);
      dot.setAttribute("y", Y(price(ci)) - 6);
    }, 40);
  }

  const viewer = $("#viewer");
  let vox = null, current = null;
  function traitsOf(t) {
    const D = Crows.D;
    const out = [["Feathers", D.feathers[t.Feather][0]], ["Eyes", D.eyes[t.Eye][0]], ["Background", D.bg[t.Background][0]]];
    ["Carry", "Beak", "Headwear", "Eyewear", "Neck", "Plumage", "Aura"].forEach((k) => {
      const n = D.layers[k][t[k]][0];
      if (n !== "None" && n !== "Plain") out.push([k === "Carry" ? "Carries" : k, n]);
    });
    return out;
  }
  function show(t) {
    current = t;
    $("#vTraits").innerHTML = traitsOf(t).map(([k, v]) => "<span>" + k + " <b>" + v + "</b></span>").join("");
    crowTo($("#viewerFallback"), t);
    if (vox) vox.show(t);
  }
  import("./voxel.js").then((m) => { vox = m.createVoxel(viewer); if (current) vox.show(current); }).catch(() => viewer.classList.add("no3d"));

  const gallery = $("#gallery");
  function fillGallery() {
    gallery.innerHTML = "";
    const list = Array.from({ length: 8 }, () => Crows.roll());
    list.forEach((t, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.animationDelay = i * 45 + "ms";
      b.setAttribute("aria-label", "Show crow in 3D");
      b.appendChild(Crows.canvas(t));
      b.addEventListener("click", () => { $$("#gallery button").forEach((x) => x.classList.remove("sel")); b.classList.add("sel"); show(t); });
      gallery.appendChild(b);
    });
    gallery.firstChild.classList.add("sel");
    show(list[0]);
  }
  fillGallery();
  $("#shuffle").addEventListener("click", fillGallery);
  const c = Crows.counts();
  const names = { Feather: "feathers", "Eye Color": "eye colors", Background: "backgrounds", Carry: "treasures", Headwear: "hats", Eyewear: "eyewear", Neck: "neckwear", Beak: "beaks" };
  $("#counts").innerHTML = Object.keys(names).map((k) => "<span><b>" + c[k] + "</b> " + names[k] + "</span>").join("");

  if (window.matchMedia("(hover: hover)").matches) {
    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateX(" + (-y * 8).toFixed(2) + "deg) rotateY(" + (x * 10).toFixed(2) + "deg) translateY(-4px)";
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  const els = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
  } else els.forEach((e) => e.classList.add("in"));
})();
