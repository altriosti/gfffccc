(function () {
  const CFG = window.PEBBLE_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const API = (CFG.dropApi || "").trim();
  const PINNED = (CFG.pinnedPost || CFG.xPost || "").trim();
  const STORE = "pebble_drop_v2";
  const opened = {};
  const shardCache = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let meta = { tiers: [{ tier: 1, label: "30-59 transactions", amount: 1300 }, { tier: 2, label: "60-89 transactions", amount: 2000 }, { tier: 3, label: "90+ transactions", amount: 3000 }] };
  let wallet = "";
  let myCode = "";
  let tier = 0;
  let st = null;
  let skew = 0;
  let timer = 0;
  let poll = 0;
  let booted = false;
  let cur = "";

  const LINES = {
    d1: "Caw! Paste your wallet. I will look for your pebbles.",
    d2: "Follow my flock, then tap Verify.",
    d3: "Shiny! These pebbles are yours.",
    d4: "Connect the wallet so I know it is yours.",
    d5: "Help the flock grow. Like and repost!",
    d6: "Drop your code in the comments.",
    d7: "Splash! Your pebbles are saved.",
    n1: "No pebbles here. But you can mine them!",
    m2: "Three tasks and my beak starts digging.",
    m4: "Dig, dig, dig...",
    m5: "Tell the world, then we dig again.",
    m6: "The team is checking your post.",
    m7: "Three days of digging. Great work!",
    x0: "Almost ready. Come back soon!"
  };

  const ERR = {
    bad_wallet: "Please enter a valid ETH wallet address.",
    bad_link: "Please paste a valid post link, like https://x.com/yourname/status/123...",
    own_post: "That is the link of our post. Please paste the link of your own post.",
    old_post: "That post is too old. Please make a new one.",
    not_found: "We could not find that post. Make sure it is public and not deleted.",
    no_code: "Your code was not found in that post. Please add your code and try again.",
    no_mention: "Please tag @PebbleCrows in your post.",
    link_taken: "This link was already used. Please make a new one.",
    x_taken: "This X account is already used by another wallet.",
    x_mismatch: "Please post from the same X account you used to start mining.",
    claimed: "This wallet already claimed.",
    not_eligible: "This wallet is not on the airdrop list.",
    eligible: "This wallet is on the airdrop list. Please claim your airdrop instead.",
    already_mining: "This wallet is already mining.",
    not_mining: "This wallet is not mining yet.",
    too_early: "Not ready yet. Please wait for the timer.",
    day_full: "Today's mining pool is empty. Please claim again after 00:00 UTC.",
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

  function store(get, val) {
    try {
      if (get) return JSON.parse(localStorage.getItem(STORE) || "null") || {};
      localStorage.setItem(STORE, JSON.stringify(val));
    } catch (e) {
      return {};
    }
    return {};
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
  const siteUrl = location.href.replace(/[?#].*$/, "");
  $$(".handle").forEach((e) => { e.textContent = handle(); });
  $$(".open-x").forEach((a) => { a.href = CFG.xProfile || "https://x.com/PebbleCrows"; });
  $$(".open-post").forEach((a) => { a.href = PINNED || CFG.xProfile || "#"; });

  function reveal(key, now) {
    opened[key] = true;
    $$('[data-open="' + key + '"]').forEach((a) => a.classList.add("did"));
    const show = () => {
      $$('.after[data-for="' + key + '"]').forEach((el) => { if (el.hidden) { el.hidden = false; el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); } });
      $$('[data-hint="' + key + '"]').forEach((el) => { el.hidden = true; });
    };
    if (now) show(); else setTimeout(show, 900);
  }
  $$("[data-open]").forEach((a) => a.addEventListener("click", () => reveal(a.dataset.open, false)));

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
    if (id !== "m4" && id !== "m6") stopTimer();
    if (id !== "m6") stopPoll();
  }
  $$(".back").forEach((b) => b.addEventListener("click", () => go(b.dataset.back)));

  function short(w) { return w.slice(0, 6) + "..." + w.slice(-4); }
  function validWallet(v) {
    const w = String(v || "").trim();
    return /^0x[0-9a-fA-F]{40}$/.test(w) && !/^0x0{40}$/.test(w) ? w.toLowerCase() : "";
  }

  async function codeFor(w) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pebble:" + w.toLowerCase()));
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return "PBL-" + hex.slice(0, 6).toUpperCase();
  }

  async function setWallet(w) {
    wallet = w;
    myCode = await codeFor(w);
    $$(".mycode").forEach((e) => { e.textContent = myCode; });
    store(false, { wallet: w });
    const pid = postId(PINNED);
    const reply = (t) => "https://x.com/intent/post?" + (pid ? "in_reply_to=" + pid + "&" : "") + "text=" + encodeURIComponent(t);
    $("#dReply").href = reply("Claiming my $WPEBBLE from " + handle() + ". Code: " + myCode);
    $("#mReply").href = reply("Mining $WPEBBLE with " + handle() + ". Code: " + myCode);
    $("#mPost").href = "https://x.com/intent/post?text=" + encodeURIComponent("I am mining $WPEBBLE with " + handle() + " on Robinhood Chain. Drop a pebble, raise the water. Code: " + myCode) + "&url=" + encodeURIComponent(siteUrl);
  }

  $$(".copy-code").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(myCode); toast("Code copied"); } catch (e) { toast(myCode); }
  }));

  async function shard(w) {
    const n = parseInt(w.slice(2, 4), 16) >> 2;
    const name = n.toString(16).padStart(2, "0");
    if (!shardCache[name]) {
      shardCache[name] = fetch("drop/" + name + ".txt", { cache: "force-cache" }).then((r) => {
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
      const s = lines[t];
      let lo = 0, hi = Math.floor(s.length / 40) - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const v = s.substr(mid * 40, 40);
        if (v === h) return t + 1;
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
    return st;
  }

  function errText(e) {
    if (e && e.user) return e.message;
    const j = e && e.j;
    const code = (j && j.error) || (e && e.message) || "network";
    if (code === "soon") return "This opens soon. Please check back shortly.";
    if (code === "no_code" && j && j.code) return ERR.no_code + " Your code is " + j.code + ".";
    if (code === "x_mismatch" && j && j.x) return "Please post from " + j.x + ", the X account you used to start mining.";
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
    while (Date.now() < end) { work(id, true, 0.1 + 0.6 * (1 - (end - Date.now()) / ms)); await sleep(120); }
  }

  function signText(w, c) {
    return "Pebble Crows $WPEBBLE\n\nI own this wallet: " + w.toLowerCase() + "\nCode: " + c + "\n\nThis signature is free. It does not send a transaction or give any approval.";
  }
  const sigKey = (w) => "pebble_sig_" + w;
  function sigGet(w) { try { return localStorage.getItem(sigKey(w)) || ""; } catch (e) { return ""; } }
  function sigSet(w, v) { try { if (v) localStorage.setItem(sigKey(w), v); else localStorage.removeItem(sigKey(w)); } catch (e) {} }

  async function auth() {
    const U = (m) => Object.assign(new Error(m), { user: true });
    let sig = sigGet(wallet);
    if (sig) return sig;
    let acc = PW.state.account;
    if (!acc) {
      try { acc = await PW.connect(); } catch (e) { throw U(e.message || "Could not connect your wallet."); }
      if (!acc) throw U("Please connect your wallet to continue.");
    }
    if (acc !== wallet) throw U("Please connect " + short(wallet) + ". Your connected wallet is " + short(acc) + ".");
    say("Sign the free message in your wallet.");
    try { sig = await PW.sign(signText(wallet, myCode)); } catch (e) { throw U(e.message || "The message was not signed."); }
    sigSet(wallet, sig);
    return sig;
  }

  async function post(body, workId) {
    body.sig = await auth();
    work(workId, true, 0.05);
    const bar = slowBar(workId, 2600);
    let j;
    try {
      j = await api(null, Object.assign({ website: $$(".hpin").map((i) => i.value).join("") }, body));
    } finally {
      await bar;
    }
    if (!j.ok) { work(workId, false); if (j.error === "bad_sig") sigSet(wallet, ""); throw Object.assign(new Error(j.error || "server"), { j: j }); }
    work(workId, true, 1);
    await sleep(350);
    work(workId, false);
    return j;
  }

  function linkOk(v) {
    return /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status(?:es)?\/\d{5,25}(?:[/?#].*)?$/i.test(String(v || "").trim());
  }

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
    tier = res.t;
    showResult();
  });

  function showResult() {
    if (tier > 0) {
      if (st && st.claim) { done(st.claim.amount, st.claim.x); return; }
      const t = meta.tiers[tier - 1];
      $("#aTier").textContent = "Tier " + tier;
      $("#aTx").textContent = t.label;
      $("#aAmt").textContent = Number(t.amount).toLocaleString("en-US");
      $("#aWallet").textContent = short(wallet);
      go("d3");
      pebbles(5);
      return;
    }
    if (st && st.mine) { route(); return; }
    $("#nWallet").textContent = short(wallet);
    go("n1");
  }

  $("#dToClaim").addEventListener("click", () => {
    if (!API) { $("#x0Text").textContent = "Claiming opens soon. Your allocation is safe. Please check back shortly."; go("x0"); return; }
    if (st && !st.claimsOpen) { msg("d3", ERR.closed); return; }
    $("#d4Wallet").textContent = short(wallet);
    go(sigGet(wallet) ? "d5" : "d4");
  });

  $("#dConnect").addEventListener("click", async () => {
    const btn = $("#dConnect");
    btn.disabled = true;
    msg("d4", "");
    try {
      await auth();
      toast("Wallet verified");
      go("d5");
    } catch (e) {
      msg("d4", errText(e));
      say("That did not work. Try again.", true);
    }
    btn.disabled = false;
  });

  $("#dLikeNext").addEventListener("click", () => {
    if (!opened.dlike || !opened.drepost) { msg("d5", "Tap both tasks first, then come back."); say("Like and repost first, friend.", true); return; }
    go("d6");
  });

  $("#dClaim").addEventListener("click", async () => {
    const v = $("#dLink").value.trim();
    if (!linkOk(v)) { msg("d6", ERR.bad_link); say("That does not look like a comment link.", true); return; }
    if (postId(v) === postId(PINNED)) { msg("d6", ERR.own_post); return; }
    const btn = $("#dClaim");
    btn.disabled = true;
    msg("d6", "");
    say("Checking your comment...");
    try {
      const j = await post({ a: "claim", wallet: wallet, link: v }, "dWork");
      const m = v.match(/\.com\/([A-Za-z0-9_]+)/);
      done(j.amount, m ? "@" + m[1] : "");
    } catch (e) {
      msg("d6", errText(e));
      say("The pebble slipped! Fix it and try again.", true);
    }
    btn.disabled = false;
  });

  function done(amount, x) {
    $("#cAmt").textContent = Number(amount || 0).toLocaleString("en-US");
    $("#cX").textContent = x || "";
    $("#cWallet").textContent = short(wallet);
    const text = "I just claimed " + Number(amount || 0).toLocaleString("en-US") + " $WPEBBLE from " + handle() + ". Check your Robinhood Chain wallet:";
    $("#dShare").href = "https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(siteUrl);
    go("d7");
    pebbles(5);
  }

  $("#nMine").addEventListener("click", () => {
    if (!API) { $("#x0Text").textContent = "Mining opens soon. Please check back shortly."; go("x0"); return; }
    if (st && !st.miningOpen) { $("#x0Text").textContent = ERR.mining_closed; go("x0"); return; }
    go("m2");
  });

  function route() {
    const m = st && st.mine;
    if (!m) { go("n1"); return; }
    const max = st.maxDays || 3;
    $$(".mTotal").forEach((e) => { e.textContent = Number(m.total || 0).toLocaleString("en-US"); });
    $("#mDay").textContent = "Mining · Day " + Math.min(max, m.days || 1) + " of " + max;
    $("#mNext").textContent = "Mine again · Day " + Math.min(max, (m.days || 1) + 1) + " of " + max;
    if (m.state === "done") { go("m7"); pebbles(5); return; }
    if (m.state === "mining") { go("m4"); startTimer(); return; }
    if (m.state === "pending") { go("m6"); startTimer(); startPoll(); return; }
    const note = $("#mNote");
    note.hidden = !m.note;
    note.textContent = m.note ? m.note + ". Please make a new post and send it again." : "";
    go("m5");
  }

  $("#mStart").addEventListener("click", async () => {
    if (!opened.mlike || !opened.mrepost) { msg("m2", "Please tap Like and Repost first."); say("Do all three tasks, friend.", true); return; }
    const v = $("#mLink").value.trim();
    if (!linkOk(v)) { msg("m2", ERR.bad_link); return; }
    if (postId(v) === postId(PINNED)) { msg("m2", ERR.own_post); return; }
    const btn = $("#mStart");
    btn.disabled = true;
    say("Checking your comment...");
    try {
      await post({ a: "mstart", wallet: wallet, link: v }, "mStartWork");
      await loadStatus();
      route();
    } catch (e) {
      msg("m2", errText(e));
      say("The pebble slipped! Fix it and try again.", true);
    }
    btn.disabled = false;
  });

  $("#mClaim").addEventListener("click", async () => {
    const btn = $("#mClaim");
    btn.disabled = true;
    try {
      await post({ a: "mclaim", wallet: wallet }, "mClaimWork");
      await loadStatus();
      toast("+" + (st.reward || 300) + " $WPEBBLE");
      route();
    } catch (e) {
      msg("m4", errText(e));
      btn.disabled = false;
    }
  });

  $("#mSubmit").addEventListener("click", async () => {
    const v = $("#mPostLink").value.trim();
    if (!linkOk(v)) { msg("m5", ERR.bad_link); return; }
    const btn = $("#mSubmit");
    btn.disabled = true;
    say("Sending your post...");
    try {
      await post({ a: "mpost", wallet: wallet, link: v }, "mPostWork");
      await loadStatus();
      $("#mPostLink").value = "";
      route();
    } catch (e) {
      msg("m5", errText(e));
      say("Hmm, that post did not work.", true);
    }
    btn.disabled = false;
  });

  async function recheck(manual) {
    try {
      await loadStatus();
      if (st.mine && st.mine.state !== "pending") { if (st.mine.state === "mining") toast("Approved! Mining again."); route(); }
      else if (manual) msg("m6", "Still waiting. We will start mining as soon as it is approved.");
    } catch (e) {
      if (manual) msg("m6", errText(e));
    }
  }
  $("#mRefresh").addEventListener("click", () => recheck(true));
  function startPoll() { stopPoll(); poll = setInterval(() => recheck(false), 30000); }
  function stopPoll() { if (poll) clearInterval(poll); poll = 0; }

  function hms(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
  }
  function ago(ms) {
    const m = Math.max(0, Math.floor(ms / 60000));
    if (m < 60) return m + "m";
    return Math.floor(m / 60) + "h " + (m % 60) + "m";
  }

  function tick() {
    const m = st && st.mine;
    if (!m) return;
    const now = Date.now() + skew;
    if (cur === "m4") {
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
    } else if (cur === "m6") {
      $("#wSince").textContent = ago(now - (m.sent || now));
    }
  }
  function startTimer() { stopTimer(); tick(); timer = setInterval(tick, 250); }
  function stopTimer() { if (timer) clearInterval(timer); timer = 0; }

  fetch("drop/meta.json", { cache: "no-cache" }).then((r) => r.json()).then((j) => {
    if (!j || !j.tiers) return;
    meta = j;
    j.tiers.forEach((t) => { const b = $('[data-amt="' + t.tier + '"]'); if (b) b.textContent = Number(t.amount).toLocaleString("en-US"); });
  }).catch(() => {});

  if (API) {
    api({ a: "stats" }).then((j) => {
      if (j && j.ok && j.claims > 0) $("#dropTag").textContent = j.claims.toLocaleString("en-US") + (j.claims === 1 ? " wallet claimed" : " wallets claimed");
    }).catch(() => {});
  }

  const saved = store(true) || {};
  if (saved.wallet) $("#dWallet").value = saved.wallet;
  go("d1");
  booted = true;
})();
