(function () {
  const CFG = window.PEBBLE_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const API = (CFG.airdropApi || "").trim();
  const PROFILE = "pebble_ely_profile";
  const REF_KEY = "pebble_ref";
  const SITE = "https://pebblecrows.fun";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const shards = {};
  const opened = {};
  let me = null;
  let cardBlob = null;
  let refs = 0;

  const LINES = {
    s1: "Caw! Paste your wallet. I will look for your pebbles.",
    n1: "No pebbles on this wallet. But every crow you mint brings 200,000!",
    s2: "Shiny! Four quick tasks and the pebbles are yours.",
    s3: "Here are your pebbles. Invite friends to grow the pile!"
  };

  const ERR = {
    bad_wallet: "Please enter a valid EVM wallet address (0x...).",
    bad_user: "Please enter a valid X username.",
    bad_link: "Please paste the link to your comment on X.",
    link_user: "Your comment link must come from the same X account.",
    x_taken: "This X account is already used by another wallet.",
    link_taken: "This comment link is already used.",
    steps: "Please complete all four tasks first.",
    busy: "Many crows are here right now. Please try again in a minute.",
    bot: "Something looked automated. Please refresh and try again.",
    not_joined: "Please complete the tasks first.",
    list_down: "The wallet list could not be loaded. Please try again in a minute."
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
  function loadProfile() { try { return JSON.parse(ls(PROFILE) || "null"); } catch (e) { return null; } }
  function saveProfile(p) { ls(PROFILE, JSON.stringify(p)); }

  function drawCrow(c, t) { c.width = 24; c.height = 24; Crows.draw(c.getContext("2d"), t); }
  ["#logo", "#logo2"].forEach((s) => drawCrow($(s), Object.assign({}, Px.HERO, { Background: 3 })));
  drawCrow($("#wlFallback"), Px.HERO);
  function seedOf(w) {
    let h = 2166136261 >>> 0;
    const s = String(w || "").toLowerCase();
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }

  const menuBtn = $("#menuBtn");
  const links = $("#navLinks");
  menuBtn.addEventListener("click", () => { links.classList.toggle("open"); menuBtn.classList.toggle("open"); });

  let s3d = null, dropped = 0;
  const stage = $("#wlStage");
  import("./scene3d.js").then((m) => {
    s3d = m.createScene(stage, { max: 5, auto: false, dist: 7.6 });
    if (dropped) s3d.fill(dropped);
  }).catch(() => stage.classList.add("no3d"));
  function fill(n) { dropped = Math.max(dropped, n); if (s3d) s3d.fill(n); }
  function drop() { dropped++; if (s3d) s3d.drop(); }

  function handle() {
    const m = (CFG.xProfile || "").match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
    return m ? m[1] : "PebbleCrows";
  }
  $$(".handle").forEach((e) => { e.textContent = "@" + handle(); });
  const postId = ((CFG.pinnedPost || CFG.xPost || "").match(/status\/(\d+)/) || [])[1] || "";
  const TASK_URL = {
    follow: "https://x.com/intent/follow?screen_name=" + handle(),
    like: postId ? "https://x.com/intent/like?tweet_id=" + postId : CFG.pinnedPost,
    repost: postId ? "https://x.com/intent/retweet?tweet_id=" + postId : CFG.pinnedPost,
    comment: postId ? "https://x.com/intent/post?in_reply_to=" + postId + "&text=" + encodeURIComponent("Caw! Checking my Pebble Crows airdrop on Elysium.") : CFG.pinnedPost
  };

  function say(t, bad) {
    const b = $("#bubble");
    b.textContent = t;
    b.classList.toggle("bad", !!bad);
  }
  function msg(id, t) { const e = $("#msg-" + id); if (e) e.textContent = t || ""; }
  function toast(t) {
    const e = $("#toast");
    e.textContent = t;
    e.hidden = false;
    e.classList.remove("in"); void e.offsetWidth; e.classList.add("in");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { e.hidden = true; }, 2200);
  }
  function go(step) {
    $$(".wstep").forEach((s) => { s.hidden = s.dataset.step !== step; });
    const n = step === "s1" ? 1 : step === "s2" || step === "n1" ? 2 : 3;
    $$("#progress li").forEach((li) => {
      const p = +li.dataset.p;
      li.classList.toggle("now", p === n);
      li.classList.toggle("done", p < n);
    });
    if (LINES[step]) say(LINES[step], step === "n1");
    const panel = document.querySelector(".panel");
    if (panel && window.innerWidth < 900) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const params = new URLSearchParams(location.search);
  const inRef = (params.get("ref") || "").toLowerCase();
  if (/^[0-9a-f]{10}$/.test(inRef)) ls(REF_KEY, inRef);
  const refCode = () => { const r = (ls(REF_KEY) || "").toLowerCase(); return /^[0-9a-f]{10}$/.test(r) ? r : ""; };
  const codeOf = (w) => w.toLowerCase().slice(2, 12);
  if (refCode()) $("#invited").hidden = false;

  async function lookup(wallet) {
    const a = wallet.toLowerCase();
    const k = a.charAt(2);
    if (!shards[k]) {
      const r = await fetch("ely-" + k + ".txt", { cache: "no-cache" });
      if (!r.ok) throw new Error("list_down");
      const map = new Map();
      (await r.text()).split("\n").forEach((l) => {
        const i = l.indexOf(",");
        if (i > 0) map.set(l.slice(0, i), Number(l.slice(i + 1)));
      });
      shards[k] = map;
    }
    return shards[k].get(a.slice(3)) || 0;
  }

  async function api(method, payload) {
    if (!API) throw new Error("offline");
    let r;
    if (method === "GET") r = await fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + payload);
    else r = await fetch(API, { method: "POST", body: JSON.stringify(payload) });
    return r.json();
  }

  $("#aCheck").addEventListener("click", async () => {
    msg("s1", "");
    const w = $("#aWalletIn").value.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(w)) { msg("s1", ERR.bad_wallet); say("That does not look like a wallet. It starts with 0x.", true); return; }
    const btn = $("#aCheck");
    btn.disabled = true;
    say("Looking under every stone...");
    try {
      const amt = await lookup(w);
      await sleep(400);
      if (!amt) {
        $("#nWallet").textContent = w.slice(0, 6) + "..." + w.slice(-4);
        go("n1");
        return;
      }
      me = { wallet: w, base: amt };
      $("#eWallet").textContent = w.slice(0, 6) + "..." + w.slice(-4);
      fill(2);
      try {
        const j = await api("GET", "a=ad&w=" + w);
        if (j && j.ok && j.joined) {
          me.user = String(j.x || "").replace(/^@/, "");
          me.shared = !!j.shared;
          refs = j.refs || 0;
          saveProfile(me);
          showProfile();
          return;
        }
      } catch (e) {}
      go("s2");
    } catch (e) {
      msg("s1", ERR[e.message] || ERR.list_down);
      say("The list slipped from my beak. Try again.", true);
    } finally {
      btn.disabled = false;
    }
  });
  $("#aWalletIn").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#aCheck").click(); });

  $$(".task[data-task]").forEach((a) => {
    const t = a.dataset.task;
    a.href = TASK_URL[t] || "#";
    a.addEventListener("click", () => {
      setTimeout(() => {
        opened[t] = true;
        a.classList.add("did");
        drop();
        const left = ["follow", "like", "repost", "comment"].filter((x) => !opened[x]).length;
        say(left ? left + (left === 1 ? " task left." : " tasks left.") : "All done! Now your username and comment link.");
      }, 1200);
    });
  });
  $("#aUser").addEventListener("input", (e) => { const v = e.target.value.replace(/^@+/, ""); if (v !== e.target.value) e.target.value = v; });

  $("#aReveal").addEventListener("click", async () => {
    msg("s2", "");
    if (!["follow", "like", "repost", "comment"].every((t) => opened[t])) { msg("s2", ERR.steps); say("Tap all four tasks first.", true); return; }
    const user = $("#aUser").value.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{1,15}$/.test(user)) { msg("s2", ERR.bad_user); return; }
    const link = $("#aLink").value.trim();
    const m = link.match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/);
    if (!m) { msg("s2", ERR.bad_link); return; }
    if (m[1].toLowerCase() !== user.toLowerCase()) { msg("s2", ERR.link_user); return; }
    const btn = $("#aReveal");
    btn.disabled = true;
    $("#aWork").hidden = false;
    $("#aWork i").style.width = "40%";
    say("Counting your pebbles...");
    try {
      const ref = refCode();
      const j = await api("POST", { action: "ad_join", wallet: me.wallet, x: user, link: link, ref: ref !== codeOf(me.wallet) ? ref : "", followed: true, liked: true, reposted: true, commented: true, website: $("#website").value });
      if (!j || !j.ok) throw new Error((j && j.error) || "server");
      $("#aWork i").style.width = "100%";
      me.user = j.x ? String(j.x).replace(/^@/, "") : user;
      me.shared = false;
      saveProfile(me);
      await sleep(400);
      showProfile();
    } catch (e) {
      msg("s2", ERR[e.message] || "Could not save your tasks. Please try again in a minute.");
      say("The pebble slipped! Try again.", true);
    } finally {
      btn.disabled = false;
      $("#aWork").hidden = true;
    }
  });

  function mult() { return refs >= 30 ? 3 : refs >= 10 ? 2 : 1; }
  function total() { const t = me.base * mult(); return me.shared ? t * 1.05 : t; }
  function refLink() { return SITE + "/airdrop?ref=" + codeOf(me.wallet); }

  function paint() {
    $("#pUser").textContent = me.user ? "@" + me.user : "Elysium crow";
    $("#pWallet").textContent = me.wallet.slice(0, 6) + "..." + me.wallet.slice(-4);
    $("#pBase").textContent = fmt(me.base);
    $("#pMult").textContent = mult() + "x";
    $("#pShare").textContent = me.shared ? "+5% added" : "Locked";
    $("#pTotal").textContent = fmt(total());
    $("#pBonus").classList.toggle("on", !!me.shared);
    $("#pBonusTip").textContent = me.shared ? "Share bonus added. Thanks for spreading the word!" : "Share your card with your invite link to add 5%.";
    $("#pRefs").textContent = refs;
    $("#pRefBar").style.width = Math.min(100, (refs / 30) * 100) + "%";
    $("#pLink").textContent = refLink().replace(/^https?:\/\//, "");
    $("#pShareBtn").textContent = me.shared ? "Share my card again" : "Share card on X (+5%)";
  }

  let cardSeq = 0;
  async function drawCard() {
    const seq = ++cardSeq;
    $("#pLoad").hidden = false;
    try {
      const c = await PebbleCard.renderEly({ wallet: me.wallet, user: me.user, amount: Math.round(total()), link: refLink(), badge: mult() > 1 ? mult() + "X INVITER" : "ELYSIUM CROW" });
      const blob = await PebbleCard.toBlob(c);
      if (seq !== cardSeq) return;
      cardBlob = blob;
      const img = $("#pImg");
      if (img.src) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(cardBlob);
    } finally {
      $("#pLoad").hidden = true;
    }
  }

  async function showProfile() {
    drawCrow($("#pCrow"), Crows.roll(Px.rng(seedOf(me.wallet))));
    paint();
    go("s3");
    fill(5);
    drawCard();
    try {
      const j = await api("GET", "a=ad&w=" + me.wallet);
      if (j && j.ok) {
        refs = j.refs || 0;
        if (j.joined) { me.shared = me.shared || !!j.shared; if (j.x) me.user = String(j.x).replace(/^@/, ""); }
        saveProfile(me);
        paint();
        drawCard();
      }
    } catch (e) {}
  }

  $("#pCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(refLink()); toast("Invite link copied"); } catch (e) { toast(refLink()); }
  });
  $("#pDownload").addEventListener("click", () => { if (cardBlob) PebbleCard.download(cardBlob, "pebble-crows-airdrop.png"); });
  $("#pShareBtn").addEventListener("click", async () => {
    if (!cardBlob) await drawCard();
    const text = "My Pebble Crows airdrop on Elysium: " + fmt(total()) + " $PEBBLE, 100% unlocked. Check your wallet and claim yours:";
    await PebbleCard.share(cardBlob, text, refLink());
    if (!me.shared) {
      me.shared = true;
      saveProfile(me);
      paint();
      drawCard();
      toast("+5% share bonus added");
      try { await api("POST", { action: "ad_share", wallet: me.wallet }); } catch (e) {}
    }
  });
  $("#pBonus").addEventListener("click", () => { if (!me.shared) $("#pShareBtn").click(); else toast("+5% share bonus is active"); });
  $("#pOther").addEventListener("click", () => {
    ls(PROFILE, null);
    me = null;
    $("#aWalletIn").value = "";
    $$(".task").forEach((t) => t.classList.remove("did"));
    Object.keys(opened).forEach((k) => delete opened[k]);
    go("s1");
  });
  $$(".back").forEach((b) => b.addEventListener("click", () => go(b.dataset.back)));

  fetch("ely-meta.json", { cache: "no-cache" }).then((r) => r.json()).then((j) => { if (j.wallets) $("#fWallets").textContent = fmt(j.wallets); }).catch(() => {});

  const saved = loadProfile();
  if (saved && /^0x[0-9a-fA-F]{40}$/.test(saved.wallet) && saved.base > 0) {
    me = saved;
    showProfile();
  } else go("s1");

  const pb = $("#progressbar");
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    pb.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
