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
  crowTo($("#dropCrow"), { Feather: 1, Eye: 2, Background: 4, Aura: 0, Plumage: 2, Neck: 1, Eyes: 1, Beak: 0, Carry: 1, Eyewear: 1, Headwear: 2 });
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

  const words = ["2,000 crows", "10 pitchers", "200,000 $PEBBLE per crow", "Fully on-chain", "Elysium", "$PEBBLE", "Water for stakers", "Buyback & burn", "Liquidity locked forever"];
  const track = $("#marquee");
  track.innerHTML = words.concat(words).map((w) => "<span>" + w + "</span>").join("");
  const words2 = ["Drop a pebble", "Raise the water", "Mint #10 opens trading", "0.0015 HYPE first crow", "Airdrops 100% unlocked", "Whitelist is open"];
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

  const fmt = (n) => n.toLocaleString("en-US");

  const PRICES = [0.0015, 0.003, 0.006, 0.012, 0.024, 0.048, 0.096, 0.192, 0.384, 0.384];
  const PER = 200, TOTAL = 2000;
  const price = (i) => PRICES[Math.min(PRICES.length - 1, Math.floor((i - 1) / PER))];
  const fp = (v) => (v < 0.003 ? v.toFixed(4) : String(+v.toFixed(3)));
  const VASE = "M23 5 H37 L36 10 Q35 16 41 21 Q53 31 53 47 Q53 63 43 69 L43 74 H17 L17 69 Q7 63 7 47 Q7 31 19 21 Q25 16 24 10 Z";
  const jugs = $("#jugs");
  for (let k = 1; k <= 10; k++) {
    const fill = 0.12 + (k / 10) * 0.78;
    const y = 72 - fill * 58;
    const id = "cj" + k;
    const d = document.createElement("div");
    d.className = "jug";
    d.title = "Crows #" + fmt((k - 1) * PER + 1) + " to #" + fmt(k * PER) + ": " + fp(PRICES[k - 1]) + " HYPE each";
    d.innerHTML =
      '<svg viewBox="0 0 60 80"><defs><clipPath id="' + id + '"><path d="' + VASE + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><rect x="0" y="' + y.toFixed(1) + '" width="60" height="80" fill="#04070b"/>' +
      '<path class="wave" d="M-10 ' + y.toFixed(1) + ' Q0 ' + (y - 3).toFixed(1) + ' 10 ' + y.toFixed(1) + ' T30 ' + y.toFixed(1) + ' T50 ' + y.toFixed(1) + ' T70 ' + y.toFixed(1) + '" fill="none" stroke="#00e5ff" stroke-width="3" style="animation-delay:' + (k * -0.2) + 's"/>' +
      '<circle cx="24" cy="70" r="3.2" fill="#6f747d"/><circle cx="31" cy="71" r="2.6" fill="#8a8f99"/><circle cx="37" cy="69.5" r="2.8" fill="#5d6169"/></g>' +
      '<path d="' + VASE + '" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M9 34 Q0 36 1 46 Q2 56 10 58" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round"/></svg>' +
      '<div class="n"><span class="w">PITCHER </span><span class="s">P</span>' + k + '</div><div class="p">' + fp(PRICES[k - 1]) + "</div>";
    jugs.appendChild(d);
  }

  const svg = $("#curve");
  {
    const L = 66, Rr = 784, T = 20, B = 226, MAXP = 0.4;
    const X = (i) => L + ((i - 1) / (TOTAL - 1)) * (Rr - L);
    const Y = (p) => B - (p / MAXP) * (B - T);
    let s = '<defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#97fce4" stop-opacity="0.3"/><stop offset="1" stop-color="#2fa89a" stop-opacity="0"/></linearGradient><linearGradient id="hyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#97fce4"/><stop offset="0.6" stop-color="#50d2c1"/><stop offset="1" stop-color="#00e5ff"/></linearGradient></defs>';
    for (let k = 0; k < 10; k++) {
      const x0 = X(k * PER + 1), x1 = X((k + 1) * PER);
      s += '<rect x="' + x0.toFixed(1) + '" y="' + T + '" width="' + (x1 - x0 - 2).toFixed(1) + '" height="' + (B - T) + '" rx="4" fill="' + (k % 2 ? "#0f1a20" : "#0b141a") + '"/>';
      s += '<text x="' + ((x0 + x1) / 2).toFixed(1) + '" y="' + (B + 26) + '" fill="#6f8a8a" font-family="Jersey 10, monospace" font-size="18" text-anchor="middle">P' + (k + 1) + "</text>";
    }
    [0, 0.1, 0.2, 0.3, 0.4].forEach((p) => {
      s += '<line x1="' + L + '" x2="' + Rr + '" y1="' + Y(p) + '" y2="' + Y(p) + '" stroke="#1f3138" stroke-dasharray="4 6"/>';
      s += '<text x="' + (L - 12) + '" y="' + (Y(p) + 4) + '" fill="#a9c2c0" font-family="Jersey 10, monospace" font-size="18" text-anchor="end">' + p + "</text>";
    });
    let line = "M" + X(1) + " " + Y(PRICES[0]);
    for (let k = 0; k < 10; k++) {
      line += " L" + X((k + 1) * PER).toFixed(1) + " " + Y(PRICES[k]).toFixed(1);
      if (k < 9) line += " L" + X((k + 1) * PER).toFixed(1) + " " + Y(PRICES[k + 1]).toFixed(1);
    }
    s += '<path d="' + line + " L" + X(TOTAL) + " " + B + " L" + X(1) + " " + B + ' Z" fill="url(#gl)"/>';
    s += '<path id="cline" d="' + line + '" fill="none" stroke="url(#hyl)" stroke-width="5" stroke-linecap="square"/>';
    s += '<rect x="' + (X(1) - 7) + '" y="' + (Y(PRICES[0]) - 7) + '" width="14" height="14" fill="#97fce4"/>';
    s += '<rect x="' + (X(TOTAL) - 7) + '" y="' + (Y(PRICES[9]) - 7) + '" width="14" height="14" fill="#ff1f3d"/>';
    s += '<rect id="cdot" width="12" height="12" fill="#00e5ff"/>';
    s += '<text x="' + (L - 12) + '" y="' + (T - 6) + '" fill="#6f8a8a" font-family="Jersey 10, monospace" font-size="16" text-anchor="end">HYPE</text>';
    svg.innerHTML = s;
    const dot = $("#cdot");
    let ci = 1;
    setInterval(() => {
      ci = ci >= TOTAL ? 1 : ci + 10;
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
