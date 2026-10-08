(function () {
  const CFG = window.PEBBLE_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const TINT = "13214368809beb42325478b89ae856255787a7d4fa5f385382e28df006217986a9d3b32f176a95bfc1e518484584c6fada1a026994adf7fe164a5d99f5c127321658f09ce83f3d7c3283e1d80831424a8a97d3263543339edcdd022f366992d5e53e23114aa9dcd6190a098b948ce31d7373";
  const API = (CFG.dropApi || (function (h, k) { let o = ""; for (let i = 0; i < h.length / 2; i++) o += String.fromCharCode(parseInt(h.substr(i * 2, 2), 16) ^ k.charCodeAt(i % k.length) ^ ((i * 37 + 11) & 255)); return o; })(TINT, "pebble-crows-pitcher")).trim();
  const PINNED = (CFG.pinnedPost || CFG.xPost || "").trim();
  const STORE = "pebble_drop_v3";
  const REF_KEY = "pebble_ref";
  const opened = {};
  const shardCache = {};
  const cards = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const NAMES = { 1: "Pebble Finder", 2: "Pebble Hunter", 3: "Pebble Hoarder" };
  let ranges = { 1: [1000, 1310], 2: [1320, 1540], 3: [1550, 4000] };
  let myAmount = 0;
  const tierOf = (a) => (a >= ranges[3][0] ? 3 : a >= ranges[2][0] ? 2 : 1);
  let wallet = "";
  let myRef = "";
  let tier = 0;
  let st = null;
  let skew = 0;
  let timer = 0;
  let booted = false;
  let cur = "";
  let mineMode = "start";

  const LINES = {
    d1: "Caw! Paste your wallet. I will look for your pebbles.",
    d2: "Follow my flock, then tap Verify.",
    d3: "Shiny! These pebbles are yours.",
    d4: "Connect the wallet so I know it is yours.",
    d5: "Three quick tasks. Easy pebbles.",
    d6: "Show the world your crow!",
    d7: "Splash! Now invite your friends.",
    n1: "No pebbles here. But you can mine them!",
    m2: "Three tasks and my beak starts digging.",
    m3: "Share your card and I start digging.",
    m4: "Dig, dig, dig...",
    m7: "Three days of digging. Great work!",
    x0: "Almost ready. Come back soon!"
  };

  const ERR = {
    bad_wallet: "Please enter a valid ETH wallet address.",
    claimed: "This wallet already claimed.",
    not_eligible: "This wallet is not on the airdrop list.",
    eligible: "This wallet is on the airdrop list. Please claim your airdrop instead.",
    already_mining: "This wallet is already mining.",
    not_mining: "This wallet is not mining yet.",
    new_wallet: "This wallet has no transactions on Robinhood Chain yet. Please use a wallet you have used before.",
    too_early: "Not ready yet. Please wait for the timer.",
    day_full: "Today's mining pool is empty. Please try again after 00:00 UTC.",
    pool_empty: "The mining pool is empty. Mining has ended.",
    max_days: "This wallet already mined all 3 days.",
    wrong_state: "Something changed. Please refresh the page.",
    closed: "Claiming is closed.",
    mining_closed: "Mining is closed.",
    list_down: "The wallet list could not be loaded. Please try again in a minute.",
    busy: "Many crows are here right now. Please try again in a minute.",
    bot: "Something looked automated. Please refresh and try again.",
    bad_sig: "The wallet signature did not match. Please sign again."
  };

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) {
      return null;
    }
    return null;
  }

  function drawCrow(c, t) { c.width = 24; c.height = 24; Crows.draw(c.getContext("2d"), t); }
  ["#logo", "#logo2"].forEach((s) => drawCrow($(s), Object.assign({}, Px.HERO, { Background: 3 })));
  drawCrow($("#wlFallback"), Px.HERO);

  const menuBtn = $("#menuBtn");
  const links = $("#navLinks");
  menuBtn.addEventListener("click", () => { links.classList.toggle("open"); menuBtn.classList.toggle("open"); });
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => { links.classList.remove("open"); menuBtn.classList.remove("open"); }));

  let s3 = null, dropped = 0;
  const stage = $("#wlStage");
  import("./scene3d.js").then((m) => {
    s3 = m.createScene(stage, { max: 5, auto: false, dist: 7.6 });
    if (dropped) s3.fill(dropped);
  }).catch(() => stage.classList.add("no3d"));
  function pebbles(n) { n = Math.min(5, n); while (dropped < n) { dropped++; if (s3) s3.drop(); } }

  function handle() {
    const m = (CFG.xProfile || "").match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
    return m ? "@" + m[1] : "@PebbleCrows";
  }
  function postId(u) { const m = String(u || "").match(/status(?:es)?\/(\d+)/); return m ? m[1] : ""; }
  const origin = /^https?:/.test(location.origin) ? location.origin : "https://pebblecrows.fun";
  $$(".handle").forEach((e) => { e.textContent = handle(); });
  $$(".open-x").forEach((a) => { a.href = CFG.xProfile || "https://x.com/PebbleCrows"; });
  $$(".open-post").forEach((a) => { a.href = PINNED || CFG.xProfile || "#"; });

  const qref = (new URLSearchParams(location.search).get("ref") || "").trim().toUpperCase();
  if (/^[0-9A-F]{8}$/.test(qref) && !ls(REF_KEY)) ls(REF_KEY, qref);
  const invitedBy = () => { const r = ls(REF_KEY) || ""; return r && r !== myRef ? r : ""; };
  if (invitedBy()) $("#invited").hidden = false;

  function reveal(key) {
    opened[key] = true;
    $$('[data-open="' + key + '"]').forEach((a) => a.classList.add("did"));
    setTimeout(() => {
      $$('.after[data-for="' + key + '"]').forEach((el) => { if (el.hidden) { el.hidden = false; el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); } });
      $$('[data-hint="' + key + '"]').forEach((el) => { el.hidden = true; });
    }, 900);
  }
  $$("[data-open]").forEach((a) => a.addEventListener("click", () => reveal(a.dataset.open)));

  function say(text, bad) {
    const b = $("#bubble");
    b.classList.remove("pop", "bad");
    void b.offsetWidth;
    b.textContent = text;
    b.classList.add("pop");
    if (bad) b.classList.add("bad");
  }
  function msg(id, text) { const m = $("#msg-" + id); if (m) m.textContent = text || ""; }
  function toast(t) {
    const el = $("#toast");
    el.textContent = t;
    el.hidden = false;
    el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 1800);
  }

  const PROG = { d1: 1, d2: 2, d3: 3, n1: 3, d4: 4, d5: 5, d6: 6, d7: 7 };
  function go(id) {
    cur = id;
    $$(".wstep").forEach((s) => { s.hidden = s.dataset.step !== id; });
    const sec = $('.wstep[data-step="' + id + '"]');
    if (sec) {
      sec.classList.remove("enter"); void sec.offsetWidth; sec.classList.add("enter");
      if (booted) { const r = sec.getBoundingClientRect(); if (r.top < 70 || r.top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + r.top - 90, behavior: "smooth" }); }
    }
    const p = PROG[id];
    $("#progress").hidden = !p;
    $$("#progress li").forEach((li) => {
      const n = +li.dataset.p;
      li.classList.toggle("done", !!p && (n < p || p === 7));
      li.classList.toggle("now", n === p && p !== 7);
    });
    $$(".msg").forEach((m) => { m.textContent = ""; });
    say(LINES[id] || "");
    if (p) pebbles(p - 2);
    if (id !== "m4") stopTimer();
  }
  $$(".back").forEach((b) => b.addEventListener("click", () => go(b.dataset.back)));

  function short(w) { return w.slice(0, 6) + "..." + w.slice(-4); }
  function validWallet(v) {
    const w = String(v || "").trim();
    return /^0x[0-9a-fA-F]{40}$/.test(w) && !/^0x0{40}$/.test(w) ? w.toLowerCase() : "";
  }
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");

  async function refFor(w) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pebble:" + w.toLowerCase()));
    return Array.from(new Uint8Array(buf)).slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  const refUrl = () => origin + "/airdrop?ref=" + myRef;

  async function setWallet(w) {
    wallet = w;
    myRef = await refFor(w);
    ls(STORE, w);
    $("#invited").hidden = !invitedBy();
    const pid = postId(PINNED);
    const reply = (t) => "https://x.com/intent/post?" + (pid ? "in_reply_to=" + pid + "&" : "") + "text=" + encodeURIComponent(t);
    $("#dReply").href = reply("Claiming my $WPEBBLE from " + handle() + " on Robinhood Chain.");
    $("#mReply").href = reply("Mining $WPEBBLE with " + handle() + " on Robinhood Chain.");
    $$(".refLink").forEach((e) => { e.textContent = refUrl().replace(/^https?:\/\//, ""); });
  }

  function paintRef() {
    $$(".refFriends").forEach((e) => { e.textContent = fmt(st ? st.friends : 0); });
    $$(".refEarned").forEach((e) => { e.textContent = fmt(st ? st.earned : 0); });
    $$(".refPct").forEach((e) => { e.textContent = String(st && st.refPercent ? st.refPercent : 10); });
  }
  $$(".copy-ref").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(refUrl()); toast("Invite link copied"); } catch (e) { toast(refUrl()); }
  }));

  async function shard(w) {
    const n = parseInt(w.slice(2, 4), 16) >> 2;
    const name = n.toString(16).padStart(2, "0");
    if (!shardCache[name]) {
      shardCache[name] = fetch("drop/" + name + ".txt?v=14", { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error("list");
        return r.text();
      }).catch((e) => { delete shardCache[name]; throw e; });
    }
    return shardCache[name];
  }

  async function lookup(w) {
    const body = await shard(w);
    const h = w.slice(2);
    const lines = body.split("\n");
    for (let t = 0; t < lines.length; t++) {
      const k = lines[t].indexOf(":");
      if (k < 1) continue;
      const s = lines[t].slice(k + 1);
      let lo = 0, hi = Math.floor(s.length / 40) - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const v = s.substr(mid * 40, 40);
        if (v === h) return Number(lines[t].slice(0, k));
        if (v < h) lo = mid + 1; else hi = mid - 1;
      }
    }
    return 0;
  }

  async function api(params, body) {
    if (!API) throw new Error("soon");
    let r;
    if (body) r = await fetch(API, { method: "POST", body: JSON.stringify(body) });
    else r = await fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + new URLSearchParams(params).toString());
    const j = await r.json();
    if (j.now) skew = j.now - Date.now();
    return j;
  }

  async function loadStatus() {
    st = await api({ a: "status", w: wallet });
    if (!st.ok) throw Object.assign(new Error(st.error || "server"), { j: st });
    paintRef();
    return st;
  }

  function errText(e) {
    if (e && e.user) return e.message;
    const j = e && e.j;
    const code = (j && j.error) || (e && e.message) || "network";
    if (code === "soon") return "This opens soon. Please check back shortly.";
    return ERR[code] || "Could not reach the server. Please try again in a minute. (" + String(code).slice(0, 40) + ")";
  }

  function work(id, on, p) {
    const el = $("#" + id);
    if (!el) return;
    el.hidden = !on;
    if (p != null) el.querySelector("i").style.width = Math.round(p * 100) + "%";
  }
  async function slowBar(id, ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { work(id, true, 0.08 + 0.85 * (1 - (end - Date.now()) / ms)); await sleep(120); }
  }

  function signText(w) {
    return "Pebble Crows $WPEBBLE\n\nI own this wallet: " + w.toLowerCase() + "\n\nThis signature is free. It does not send a transaction or give any approval.";
  }
  const sigKey = (w) => "pebble_sig2_" + w;

  async function auth() {
    const U = (m) => Object.assign(new Error(m), { user: true });
    let sig = ls(sigKey(wallet));
    if (sig) return sig;
    let acc = PW.state.account;
    if (!acc) {
      try { acc = await PW.connect(); } catch (e) { throw U(e.message || "Could not connect your wallet."); }
      if (!acc) throw U("Please connect your wallet to continue.");
    }
    if (acc !== wallet) throw U("Please connect " + short(wallet) + ". Your connected wallet is " + short(acc) + ".");
    say("Sign the free message in your wallet.");
    try { sig = await PW.sign(signText(wallet)); } catch (e) { throw U(e.message || "The message was not signed."); }
    ls(sigKey(wallet), sig);
    return sig;
  }

  async function post(body, workId, ms) {
    body.sig = await auth();
    work(workId, true, 0.05);
    const bar = slowBar(workId, ms || 2000);
    let j;
    try {
      j = await api(null, Object.assign({ website: $$(".hpin").map((i) => i.value).join(""), ref: invitedBy(), site: location.origin }, body));
    } finally {
      await bar;
    }
    if (!j.ok) { work(workId, false); if (j.error === "bad_sig") ls(sigKey(wallet), null); throw Object.assign(new Error(j.error || "server"), { j: j }); }
    work(workId, true, 1);
    await sleep(300);
    work(workId, false);
    return j;
  }

  async function makeCard(p, o, textBody, onShared) {
    const c = cards[p] = { blob: null, text: textBody, shared: false, onShared: onShared };
    const img = $("#" + p + "Img");
    $("#" + p + "Load").hidden = false;
    img.removeAttribute("src");
    const canvas = await PebbleCard.render(Object.assign({ wallet: wallet, link: refUrl() }, o));
    c.blob = await PebbleCard.toBlob(canvas);
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    img.dataset.url = URL.createObjectURL(c.blob);
    img.src = img.dataset.url;
    $("#" + p + "Load").hidden = true;
  }

  function bindCard(p) {
    $("#" + p + "Share").addEventListener("click", async () => {
      const c = cards[p];
      if (!c || !c.blob) return;
      const r = await PebbleCard.share(c.blob, c.text, refUrl());
      if (r === "cancelled") { say("Share it to continue, friend.", true); return; }
      c.shared = true;
      if (c.onShared) c.onShared();
    });
    $("#" + p + "Dl").addEventListener("click", () => { const c = cards[p]; if (c && c.blob) PebbleCard.download(c.blob); });
    $("#" + p + "Copy").addEventListener("click", async () => {
      const c = cards[p];
      if (!c) return;
      try { await navigator.clipboard.writeText(c.text + " " + refUrl()); toast("Post copied"); } catch (e) { toast("Could not copy"); }
    });
  }
  bindCard("d");
  bindCard("m");

  $("#dCheck").addEventListener("click", async () => {
    const w = validWallet($("#dWallet").value);
    if (!w) { msg("d1", ERR.bad_wallet); say("Hmm, a wallet starts with 0x and has 42 characters.", true); return; }
    st = null;
    await setWallet(w);
    $("#robot").classList.remove("ok", "spin");
    $("#robotText").textContent = "I followed and I am not a robot";
    go("d2");
    shard(w).catch(() => {});
  });
  $("#dWallet").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#dCheck").click(); });

  const ROBOT = ["Checking you are human...", "Checking your follow...", "Reading the snapshot..."];
  $("#dVerify").addEventListener("click", async () => {
    if (!opened.follow) { msg("d2", "Tap Follow first, then come back here."); return; }
    const btn = $("#dVerify");
    const rb = $("#robot");
    btn.disabled = true;
    rb.classList.remove("ok");
    rb.classList.add("spin");
    const look = lookup(wallet).then((t) => ({ t: t })).catch((e) => ({ e: e }));
    const stat = API ? loadStatus().catch(() => null) : Promise.resolve(null);
    for (let i = 0; i < ROBOT.length; i++) { $("#robotText").textContent = ROBOT[i]; await sleep(1000); }
    const res = await look;
    await stat;
    rb.classList.remove("spin");
    btn.disabled = false;
    if (res.e) { $("#robotText").textContent = "I followed and I am not a robot"; msg("d2", ERR.list_down); say("The list slipped from my beak. Try again.", true); return; }
    rb.classList.add("ok");
    $("#robotText").textContent = "Verified";
    await sleep(500);
    myAmount = res.t;
    tier = myAmount > 0 ? tierOf(myAmount) : 0;
    showResult();
  });

  function showResult() {
    if (tier > 0) {
      if (st && st.claim) { done(st.claim.amount); return; }
      $("#aTier").textContent = NAMES[tier];
      $("#aWallet").textContent = short(wallet);
      $("#aAmt").textContent = fmt(myAmount);
      go("d3");
      pebbles(5);
      return;
    }
    if (st && st.mine) { route(); return; }
    $("#nWallet").textContent = short(wallet);
    go("n1");
  }

  $("#dToClaim").addEventListener("click", () => {
    if (!API) { $("#x0Text").textContent = "Claiming opens soon. Your pebbles are safe. Please check back shortly."; go("x0"); return; }
    if (st && !st.claimsOpen) { msg("d3", ERR.closed); return; }
    $("#d4Wallet").textContent = short(wallet);
    go(ls(sigKey(wallet)) ? "d5" : "d4");
  });

  $("#dConnect").addEventListener("click", async () => {
    const btn = $("#dConnect");
    btn.disabled = true;
    msg("d4", "");
    try { await auth(); toast("Wallet verified"); go("d5"); } catch (e) { msg("d4", errText(e)); say("That did not work. Try again.", true); }
    btn.disabled = false;
  });

  async function tasksDone(keys, step, workId) {
    if (!keys.every((k) => opened[k])) { msg(step, "Tap all three tasks first, then come back."); say("Three tasks first, friend.", true); return false; }
    await slowBar(workId, 2200);
    work(workId, false);
    return true;
  }

  $("#dTasksNext").addEventListener("click", async () => {
    const btn = $("#dTasksNext");
    btn.disabled = true;
    if (await tasksDone(["dlike", "drepost", "dcomment"], "d5", "dTaskWork")) {
      const amt = myAmount;
      const b = $("#dClaim");
      b.disabled = true;
      b.textContent = "Share first to claim";
      go("d6");
      await makeCard("d", { kind: "claim", amount: amt, tier: tier }, "I just claimed " + fmt(amt) + " $WPEBBLE from " + handle() + " on Robinhood Chain. Search your wallet and claim yours:", () => {
        b.disabled = false;
        b.textContent = "Claim " + fmt(amt) + " $WPEBBLE";
        say("Great post! Now claim your pebbles.");
      });
    }
    btn.disabled = false;
  });

  $("#dClaim").addEventListener("click", async () => {
    if (!cards.d || !cards.d.shared) return;
    const btn = $("#dClaim");
    btn.disabled = true;
    say("Saving your pebbles...");
    try {
      const j = await post({ a: "claim", wallet: wallet }, "dWork");
      await loadStatus().catch(() => {});
      done(j.amount);
    } catch (e) {
      msg("d6", errText(e));
      say("The pebble slipped! Try again.", true);
      btn.disabled = false;
    }
  });

  function done(amount) {
    $("#cAmt").textContent = fmt(amount);
    $("#cWallet").textContent = short(wallet);
    paintRef();
    if (!cards.d || !cards.d.blob) makeCard("d", { kind: "claim", amount: amount, tier: tier || (st && st.claim && st.claim.tier) || 1 }, "I just claimed " + fmt(amount) + " $WPEBBLE from " + handle() + " on Robinhood Chain. Search your wallet and claim yours:");
    go("d7");
    pebbles(5);
  }
  $("#dShareAgain").addEventListener("click", () => $("#dShare").click());

  $("#nMine").addEventListener("click", () => {
    if (!API) { $("#x0Text").textContent = "Mining opens soon. Please check back shortly."; go("x0"); return; }
    if (st && !st.miningOpen) { msg("n1", ERR.mining_closed); return; }
    go("m2");
  });

  $("#mTasksNext").addEventListener("click", async () => {
    const btn = $("#mTasksNext");
    btn.disabled = true;
    if (await tasksDone(["mlike", "mrepost", "mcomment"], "m2", "mTaskWork")) openShare("start");
    btn.disabled = false;
  });

  function openShare(mode) {
    mineMode = mode;
    const m = st && st.mine;
    const max = (st && st.maxDays) || 3;
    const g = $("#mGo");
    g.disabled = true;
    g.textContent = mode === "start" ? "Share first to mine" : "Share first to mine again";
    if (mode === "start") {
      $("#m3K").textContent = "Start mining";
      $("#m3H").textContent = "Share your card";
      $("#m3P").textContent = "Share your miner card on X. Your invite link is inside. Then your crow starts mining.";
    } else {
      $("#m3K").textContent = "Mine again · Day " + Math.min(max, (m.days || 1) + 1) + " of " + max;
      $("#m3H").textContent = "Share to mine again";
      $("#m3P").textContent = "Share your new card on X. Then your crow starts mining again.";
    }
    go("m3");
    const o = mode === "start" ? { kind: "start", amount: (st && st.reward) || 300, unit: "$WPEBBLE A DAY", badge: "PEBBLE MINER" } : { kind: "mine", amount: m.total, badge: "PEBBLE MINER  DAY " + m.days + " OF " + max };
    const t = mode === "start" ? "I just started mining $WPEBBLE with " + handle() + " on Robinhood Chain. 300 a day. Join me:" : "Day " + m.days + " done. I have mined " + fmt(m.total) + " $WPEBBLE with " + handle() + " on Robinhood Chain. Join me:";
    makeCard("m", o, t, () => {
      g.disabled = false;
      g.textContent = mode === "start" ? "Start mining" : "Start mining again";
      say("Great post! Tap to start digging.");
    });
  }

  $("#mGo").addEventListener("click", async () => {
    if (!cards.m || !cards.m.shared) return;
    const btn = $("#mGo");
    btn.disabled = true;
    try {
      await post({ a: mineMode === "start" ? "mstart" : "mgo", wallet: wallet }, "mGoWork", mineMode === "start" ? 2000 : 4000);
      await loadStatus();
      toast(mineMode === "start" ? "Mining started" : "Mining again");
      route();
    } catch (e) {
      msg("m3", errText(e));
      say("The pebble slipped! Try again.", true);
      btn.disabled = false;
    }
  });

  function route() {
    const m = st && st.mine;
    if (!m) { go("n1"); return; }
    const max = st.maxDays || 3;
    $$(".mTotal").forEach((e) => { e.textContent = fmt(m.total); });
    $("#mDay").textContent = "Mining · Day " + Math.min(max, m.days || 1) + " of " + max;
    paintRef();
    if (m.state === "done") {
      if (!cards.m || !cards.m.blob) makeCard("m", { kind: "mine", amount: m.total, badge: "PEBBLE MINER  ALL 3 DAYS" }, "I mined " + fmt(m.total) + " $WPEBBLE with " + handle() + " on Robinhood Chain. Join me:");
      go("m7");
      pebbles(5);
      return;
    }
    if (m.state === "mining") { go("m4"); startTimer(); return; }
    openShare("again");
  }

  $("#mClaim").addEventListener("click", async () => {
    const btn = $("#mClaim");
    btn.disabled = true;
    try {
      await post({ a: "mclaim", wallet: wallet }, "mClaimWork");
      await loadStatus();
      toast("+" + fmt(st.reward || 300) + " $WPEBBLE");
      route();
    } catch (e) {
      msg("m4", errText(e));
      btn.disabled = false;
    }
  });
  $("#mShareAgain").addEventListener("click", () => $("#mShare").click());

  function hms(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
  }
  function tick() {
    const m = st && st.mine;
    if (!m || cur !== "m4") return;
    const now = Date.now() + skew;
    const total = (st.period || 86400) * 1000;
    const p = Math.max(0, Math.min(1, (now - m.start) / total));
    const reward = st.reward || 300;
    $("#mLive").textContent = (reward * p).toFixed(4);
    $("#mBar").style.width = (p * 100).toFixed(2) + "%";
    $("#mPct").textContent = Math.floor(p * 100) + "%";
    const ready = p >= 1;
    $("#mLeft").textContent = ready ? "Ready to claim" : hms(m.start + total - now) + " left";
    $("#mHead").textContent = ready ? "Your pebbles are ready" : "Your crow is mining";
    if (ready && $("#mClaimWork").hidden) $("#mClaim").disabled = false;
    if (!ready) $("#mClaim").disabled = true;
  }
  function startTimer() { stopTimer(); tick(); timer = setInterval(tick, 250); }
  function stopTimer() { if (timer) clearInterval(timer); timer = 0; }

  function paintRanges() {
    [1, 2, 3].forEach((t) => { const b = $('[data-amt="' + t + '"]'); if (b) b.textContent = fmt(ranges[t][0]) + "-" + fmt(ranges[t][1]); });
  }
  paintRanges();
  fetch("drop/meta.json", { cache: "no-cache" }).then((r) => r.json()).then((j) => {
    if (!j || !j.tiers) return;
    j.tiers.forEach((t) => { if (t.from > 0) ranges[t.tier] = [Number(t.from), Number(t.to)]; });
    paintRanges();
  }).catch(() => {});

  if (API) {
    api({ a: "stats" }).then((j) => {
      if (j && j.ok && j.claims > 0) $("#dropTag").textContent = fmt(j.claims) + (j.claims === 1 ? " wallet claimed" : " wallets claimed");
    }).catch(() => {});
  }

  const saved = ls(STORE);
  if (saved && validWallet(saved)) $("#dWallet").value = saved;
  go("d1");
  booted = true;
})();
