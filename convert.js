(function () {
  const CFG = window.PEBBLE_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
  const CONV = isAddr(CFG.convert) ? CFG.convert : "";
  const TOKEN = isAddr(CFG.token) ? CFG.token : "";
  const WEEK = 7 * 86400;
  const ONE = 10n ** 18n;
  let state = { start: 0, parts: 0, next: 0 };
  let entry = null;
  let cur = "";
  let skew = 0;
  const nowS = () => Date.now() / 1000 + skew;

  function drawCrow(c, t) { c.width = 24; c.height = 24; Crows.draw(c.getContext("2d"), t); }
  ["#logo", "#logo2"].forEach((s) => drawCrow($(s), Object.assign({}, Px.HERO, { Background: 3 })));
  drawCrow($("#wlFallback"), Px.HERO);
  const menuBtn = $("#menuBtn");
  const links = $("#navLinks");
  menuBtn.addEventListener("click", () => { links.classList.toggle("open"); menuBtn.classList.toggle("open"); });
  $$(".open-x").forEach((a) => { a.href = CFG.xProfile || "https://x.com/PebbleCrows"; });

  let s3 = null, dropped = 0;
  const stage = $("#wlStage");
  import("./scene3d.js").then((m) => {
    s3 = m.createScene(stage, { max: 5, auto: false, dist: 7.6 });
    if (dropped) s3.fill(dropped);
  }).catch(() => stage.classList.add("no3d"));
  function pebbles(n) { n = Math.min(5, n); while (dropped < n) { dropped++; if (s3) s3.drop(); } }

  function say(text, bad) {
    const b = $("#bubble");
    b.classList.remove("pop", "bad");
    void b.offsetWidth;
    b.textContent = text;
    b.classList.add("pop");
    if (bad) b.classList.add("bad");
  }
  function msg(id, t) { const m = $("#msg-" + id); if (m) m.textContent = t || ""; }
  function toast(t) {
    const el = $("#toast");
    el.textContent = t;
    el.hidden = false;
    el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function go(id) {
    cur = id;
    $$(".wstep").forEach((s) => { s.hidden = s.dataset.step !== id; });
    const sec = $('.wstep[data-step="' + id + '"]');
    if (sec) { sec.classList.remove("enter"); void sec.offsetWidth; sec.classList.add("enter"); }
    $$(".msg").forEach((m) => { m.textContent = ""; });
  }

  const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  const bytes = (h) => { h = h.replace(/^0x/, ""); const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; };
  const word = (v) => BigInt.asUintN(256, BigInt(v)).toString(16).padStart(64, "0");
  const k256 = (h) => "0x" + hex(Keccak.keccak256(bytes(h)));
  function leaf(addr40, wei) { return k256(k256(word("0x" + addr40) + word(wei))); }
  function pair(a, b) { return a < b ? k256(a.slice(2) + b.slice(2)) : k256(b.slice(2) + a.slice(2)); }
  function subProof(leaves, i) {
    const p = [];
    let level = leaves;
    while (level.length > 1) {
      const s = i ^ 1;
      if (s < level.length) p.push(level[s]);
      const nx = [];
      for (let j = 0; j < level.length; j += 2) nx.push(j + 1 < level.length ? pair(level[j], level[j + 1]) : level[j]);
      level = nx;
      i >>= 1;
    }
    return p;
  }

  async function call(sel, args) {
    const r = await PW.rpc("eth_call", [{ to: CONV, data: sel + (args || "") }, "latest"]);
    return BigInt(r && r !== "0x" ? r : "0x0");
  }

  function fmt(wei) {
    const whole = wei / ONE, frac = wei % ONE;
    let s = whole.toLocaleString("en-US");
    const f = frac.toString().padStart(18, "0").slice(0, 2).replace(/0+$/, "");
    if (f) s += "." + f;
    return s;
  }
  function dur(sec) {
    sec = Math.max(0, Math.floor(sec));
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d) return d + "d " + h + "h";
    if (h) return h + "h " + m + "m";
    return m + "m";
  }

  function paintVest() {
    $$("#vest div").forEach((d) => { d.classList.toggle("on", +d.dataset.k <= state.parts); });
    const now = nowS();
    let t;
    if (!CONV || !state.start) t = "Converting opens 24 hours after the mint sells out.";
    else if (now < state.start) t = "Converting opens in " + dur(state.start - now) + ".";
    else if (state.parts >= 5) t = "Everything is unlocked.";
    else t = (state.parts * 20) + "% unlocked. Next 20% unlocks in " + dur(state.start + state.parts * WEEK - now) + ".";
    $("#vestWhen").textContent = t;
  }

  async function loadState() {
    const [start, parts, blk] = await Promise.all([call("0xbe9a6555"), call("0xc19d33be"), PW.rpc("eth_getBlockByNumber", ["latest", false]).catch(() => null)]);
    if (blk && blk.timestamp) skew = parseInt(blk.timestamp, 16) - Date.now() / 1000;
    state = { start: Number(start), parts: Number(parts) };
    paintVest();
  }

  async function loadEntry(addr) {
    const a = addr.toLowerCase().slice(2);
    const n = (parseInt(a.slice(0, 2), 16) >> 2).toString(16).padStart(2, "0");
    const r = await fetch("claims/" + n + ".json", { cache: "no-cache" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("The convert list could not be loaded. Please try again.");
    const j = await r.json();
    const i = j.rows.findIndex((x) => x[0] === a);
    if (i < 0) return null;
    const leaves = j.rows.map((x) => leaf(x[0], BigInt(x[1]) * ONE));
    return { total: BigInt(j.rows[i][1]) * ONE, proof: subProof(leaves, i).concat(j.top) };
  }

  async function refresh() {
    const acc = PW.state.account;
    if (!acc) { go("c1"); return; }
    $("#cLoad").hidden = false;
    try {
      await loadState();
      entry = await loadEntry(acc);
      if (!entry) { $("#c3Wallet").textContent = acc.slice(0, 6) + "..." + acc.slice(-4); go("c3"); say("No pebbles in this wallet.", true); return; }
      const done = await call("0xc884ef83", word(acc));
      const unlocked = entry.total * BigInt(state.parts) / 5n;
      const ready = unlocked > done ? unlocked - done : 0n;
      $("#cWalletK").textContent = "Wallet " + acc.slice(0, 6) + "..." + acc.slice(-4);
      $("#cReady").textContent = fmt(ready);
      $("#cPct").textContent = (state.parts * 20) + "% unlocked";
      $("#cTotal").textContent = fmt(entry.total);
      $("#cUnlocked").textContent = fmt(unlocked);
      $("#cDone").textContent = fmt(done);
      $("#cLocked").textContent = fmt(entry.total - unlocked);
      const now = nowS();
      $("#cNext").textContent = state.parts >= 5 ? "Everything is unlocked." : state.start && now >= state.start ? "Next 20% in " + dur(state.start + state.parts * WEEK - now) : "";
      $("#cHead").textContent = ready > 0n ? "Ready to convert" : state.parts >= 5 && done >= entry.total ? "All converted" : "Wait for the next unlock";
      $("#cGo").disabled = ready === 0n;
      $("#cGo").textContent = ready > 0n ? "Convert " + fmt(ready) + " $PEBBLE" : "Nothing to convert yet";
      $("#cAdd").hidden = !TOKEN;
      go("c2");
      pebbles(state.parts);
      say(ready > 0n ? "Shiny! Your pebbles are ready." : "Patience. More pebbles unlock soon.");
    } catch (e) {
      go("c1");
      msg("c1", e.message || "Something went wrong. Please try again.");
    } finally {
      $("#cLoad").hidden = true;
    }
  }

  $("#cConnect").addEventListener("click", async () => {
    try { await PW.connect(); } catch (e) { msg("c1", e.message); }
  });
  $("#cOther").addEventListener("click", () => { PW.disconnect(); go("c1"); });

  $("#cGo").addEventListener("click", async () => {
    if (!entry) return;
    const btn = $("#cGo");
    btn.disabled = true;
    msg("c2", "");
    say("Confirm in your wallet...");
    try {
      const data = "0x0c7eb2d6" + word(entry.total) + word(64) + word(entry.proof.length) + entry.proof.map((p) => p.slice(2)).join("");
      const hash = await PW.sendTx(CONV, data);
      say("Dropping your pebbles in...");
      btn.textContent = "Waiting for the block...";
      await PW.waitTx(hash);
      toast("Converted!");
      await sleep(600);
      await refresh();
    } catch (e) {
      msg("c2", PW.niceError(e));
      say("The pebble slipped! Try again.", true);
      btn.disabled = false;
    }
  });

  $("#cAdd").addEventListener("click", async () => {
    const W = PW.state;
    if (!W.p || !TOKEN) return;
    try {
      await W.p.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address: TOKEN, symbol: "PEBBLE", decimals: 18 } } });
    } catch (e) {
      msg("c2", PW.niceError(e));
    }
  });

  PW.chip($("#wChip"));
  window.addEventListener("pebble:wallet", () => { if (CONV && state.start && nowS() >= state.start) refresh(); });

  async function boot() {
    if (!CONV) { paintVest(); go("c0"); return; }
    try { await loadState(); } catch (e) { paintVest(); }
    if (!state.start || nowS() < state.start) { go("c0"); setInterval(paintVest, 30000); return; }
    setInterval(paintVest, 30000);
    if (PW.state.account) refresh(); else go("c1");
  }
  boot();
})();
