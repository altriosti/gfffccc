(function () {
  const CFG = window.PEBBLE_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const API = (CFG.sheetApi || "").trim();
  const READY = !!API;
  const STORE = "pebble_wl_v1";
  const T0 = Date.now();
  const opened = {};
  const data = { link: "", linkUser: "" };
  let challenge = null;
  let challengeAt = 0;
  let step = 0;

  const LINES = {
    0: "The pitcher is almost ready. Come back soon!",
    1: "Caw! First, join my flock on X.",
    2: "Nice! Now give our post a like.",
    3: "Help the flock grow. Repost it!",
    4: "Tag 3 friends. More crows, more pebbles.",
    5: "Almost there. Where should I bring your pebble?",
    6: "You are in! Watch the sky for the mint."
  };

  function store(get, val) {
    try {
      if (get) return JSON.parse(localStorage.getItem(STORE) || "null");
      localStorage.setItem(STORE, JSON.stringify(val));
    } catch (e) {
      return null;
    }
    return null;
  }

  function drawCrow(c, t) { c.width = 24; c.height = 24; Crows.draw(c.getContext("2d"), t); }
  ["#logo", "#logo2"].forEach((s) => drawCrow($(s), Object.assign({}, Px.HERO, { Background: 3 })));
  drawCrow($("#wlFallback"), Px.HERO);
  Px.icon($("#bell"), "bell");

  const menuBtn = $("#menuBtn");
  const links = $("#navLinks");
  menuBtn.addEventListener("click", () => { links.classList.toggle("open"); menuBtn.classList.toggle("open"); });

  let s3 = null, dropped = 0;
  const stage = $("#wlStage");
  import("./scene3d.js").then((m) => {
    s3 = m.createScene(stage, { max: 5, auto: false, dist: 7.6 });
    if (dropped) s3.fill(dropped);
  }).catch(() => stage.classList.add("no3d"));
  const scene = {
    drop() { dropped++; if (s3) s3.drop(); },
    fill(n) { dropped = Math.max(dropped, n); if (s3) s3.fill(n); },
    count() { return dropped; }
  };

  function handle() {
    const m = (CFG.xProfile || "").match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
    return m ? "@" + m[1] : "our X account";
  }
  $$(".handle").forEach((e) => { e.textContent = handle(); });
  $$(".open-x").forEach((a) => { if (CFG.xProfile) a.href = CFG.xProfile; else a.hidden = true; });
  $$(".open-post").forEach((a) => { if (CFG.xPost) a.href = CFG.xPost; else a.hidden = true; });
  if (!CFG.xProfile) reveal("follow", true);
  if (!CFG.xPost) ["like", "repost", "comment"].forEach((k) => reveal(k, true));
  function reveal(key, now) {
    opened[key] = true;
    $$('[data-need="' + key + '"]').forEach((b) => b.classList.add("ready"));
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

  function msg(n, text, good) {
    const m = $("#msg" + n);
    if (!m) return;
    m.textContent = text || "";
    m.classList.toggle("good", !!good);
  }

  function go(n) {
    step = n;
    $$(".wstep").forEach((s) => { s.hidden = +s.dataset.step !== n; });
    const cur = $('.wstep[data-step="' + n + '"]');
    if (cur) { cur.classList.remove("enter"); void cur.offsetWidth; cur.classList.add("enter"); }
    $$("#progress li").forEach((li) => {
      const p = +li.dataset.p;
      li.classList.toggle("done", p < n || n === 6);
      li.classList.toggle("now", p === n && n !== 6);
    });
    say(LINES[n] || "");
    for (let i = 1; i <= 5; i++) msg(i, "");
    while (scene.count() < Math.min(n - 1, 5)) scene.drop();
  }

  $$(".back").forEach((b) => b.addEventListener("click", () => go(+b.dataset.back)));

  $("#followYes").addEventListener("click", () => {
    if (!opened.follow) {
      msg(1, "Open our X profile first, follow, then come back here.");
      say("Tap the blue button to open X first.", true);
      return;
    }
    go(2);
  });
  $("#followNo").addEventListener("click", () => {
    msg(1, "Following is required to join. Please follow us and try again.");
    say("No follow, no pebble. Please follow to continue!", true);
  });

  $$(".confirm").forEach((b) => b.addEventListener("click", () => {
    const need = b.dataset.need;
    if (!opened[need]) {
      msg(step, "Open the post first, then confirm.");
      say("Open the post first, friend.", true);
      return;
    }
    go(+b.dataset.next);
  }));

  const LINK_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})(?:[/?#].*)?$/i;
  $("#linkNext").addEventListener("click", () => {
    const v = $("#link").value.trim();
    const m = v.match(LINK_RE);
    if (!opened.comment) {
      msg(4, "Open the post first and leave your comment.");
      say("Open the post and tag 3 friends first.", true);
      return;
    }
    if (!m) {
      msg(4, "Please paste a valid comment link, like https://x.com/yourname/status/123...");
      say("That does not look like a comment link.", true);
      return;
    }
    const post = (CFG.xPost || "").match(/status(?:es)?\/(\d+)/);
    if (post && post[1] === m[2]) {
      msg(4, "That is the link of our post. Please paste the link of your own comment.");
      say("I need the link to your comment, not our post.", true);
      return;
    }
    data.link = v;
    data.linkUser = m[1];
    const xu = $("#xuser");
    if (!xu.value) xu.value = m[1];
    go(5);
  });

  async function getChallenge() {
    const r = await fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + "a=challenge", { method: "GET" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "closed");
    challenge = j;
    challengeAt = Date.now();
    return j;
  }

  function solve(ch, onTick) {
    return new Promise((resolve, reject) => {
      let w;
      try { w = new Worker("pow.js"); } catch (e) { reject(e); return; }
      const expected = Math.pow(2, ch.bits);
      w.onmessage = (ev) => {
        if (ev.data.done) { w.terminate(); resolve(ev.data.nonce); }
        else onTick(Math.min(0.95, ev.data.tries / (expected * 1.5)));
      };
      w.onerror = (e) => { w.terminate(); reject(e); };
      w.postMessage({ salt: ch.salt, bits: ch.bits });
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const ERR = {
    wallet_taken: "This wallet is already on the whitelist.",
    x_taken: "This X account is already on the whitelist.",
    link_taken: "This comment link was already used.",
    link_user: "The comment link must be from the same X account you entered.",
    bad_wallet: "Please enter a valid ETH wallet address.",
    bad_user: "Please enter a valid X username.",
    bad_link: "Your comment link is not valid. Please go back and paste it again.",
    busy: "Many crows are joining right now. Please try again in a minute.",
    closed: "The whitelist is closed.",
    bot: "Something looked automated. Please refresh and try again.",
    steps: "Please complete all steps first."
  };

  function setWork(on, p, text) {
    $("#work").hidden = !on;
    if (p != null) $("#workBar").style.width = Math.round(p * 100) + "%";
    if (text) $("#workText").textContent = text;
  }

  async function submit(ev) {
    ev.preventDefault();
    msg(5, "");
    const wallet = $("#wallet").value.trim();
    const user = $("#xuser").value.trim().replace(/^@/, "");
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet) || /^0x0{40}$/.test(wallet)) {
      msg(5, ERR.bad_wallet);
      say("Hmm, that wallet looks wrong. It starts with 0x and has 42 characters.", true);
      return;
    }
    if (!/^[A-Za-z0-9_]{1,15}$/.test(user)) {
      msg(5, ERR.bad_user);
      say("Check your X username, please.", true);
      return;
    }
    if (user.toLowerCase() !== data.linkUser.toLowerCase()) {
      msg(5, "Your comment link is from @" + data.linkUser + ". Please use the same X account.");
      say("Your comment and username must match.", true);
      return;
    }
    const btn = $("#submit");
    btn.disabled = true;
    $$(".wstep[data-step='5'] .back").forEach((b) => { b.disabled = true; });
    say("Hold tight. I am carrying your pebble...");
    try {
      let tries = 0;
      for (;;) {
        tries++;
        setWork(true, 0.02, "Preparing your pebble...");
        if (!challenge || Date.now() - challengeAt > 50 * 60 * 1000) await getChallenge();
        const wait = 23000 - (Date.now() - challengeAt);
        if (wait > 0) {
          const end = Date.now() + wait;
          while (Date.now() < end) {
            setWork(true, 0.02 + 0.3 * (1 - (end - Date.now()) / wait), "Polishing your pebble...");
            await sleep(250);
          }
        }
        setWork(true, 0.35, "The crow is carrying your pebble...");
        const ch = challenge;
        const nonce = await solve(ch, (p) => setWork(true, 0.35 + p * 0.55));
        setWork(true, 0.93, "Dropping it into the pitcher...");
        const body = {
          id: ch.id, salt: ch.salt, ts: ch.ts, bits: ch.bits, sig: ch.sig, nonce: nonce,
          wallet: wallet, x: user, link: data.link,
          followed: true, liked: true, reposted: true,
          secs: Math.round((Date.now() - T0) / 1000),
          website: $("#website").value
        };
        const r = await fetch(API, { method: "POST", body: JSON.stringify(body) });
        const j = await r.json();
        challenge = null;
        if (j.ok) {
          setWork(true, 1, "Splash!");
          store(false, { wallet: wallet, x: user });
          await sleep(500);
          setWork(false);
          finish(wallet);
          return;
        }
        if ((j.error === "used" || j.error === "expired" || j.error === "pow" || j.error === "early" || j.error === "bad_request") && tries < 3) continue;
        throw new Error(j.error || "failed");
      }
    } catch (e) {
      setWork(false);
      const code = e && e.message;
      msg(5, ERR[code] || (code === "server" ? "The whitelist server had a problem. Please try again soon." : "Could not reach the whitelist server. Please try again in a minute.") + " (" + String(code || "network").slice(0, 60) + ")");
      say("The pebble slipped! Let us try again.", true);
      btn.disabled = false;
      $$(".wstep[data-step='5'] .back").forEach((b) => { b.disabled = false; });
      if (!ERR[code]) getChallenge().catch(() => {});
    }
  }
  $("#form").addEventListener("submit", submit);
  $("#xuser").addEventListener("input", (e) => { const v = e.target.value.replace(/^@+/, ""); if (v !== e.target.value) e.target.value = v; });

  function finish(wallet) {
    $("#doneWallet").textContent = wallet.slice(0, 6) + "..." + wallet.slice(-4);
    const text = "I just joined the Pebble Crows whitelist" + (handle().charAt(0) === "@" ? " " + handle() : "") + ". Drop a pebble, raise the water.";
    const url = location.href.replace(/[?#].*$/, "");
    $("#share").href = "https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
    scene.fill(5);
    go(6);
  }

  async function count() {
    try {
      const r = await fetch(API + (API.indexOf("?") < 0 ? "?" : "&") + "a=count");
      const j = await r.json();
      if (j.ok && j.count > 0) $("#flockTag").textContent = j.count.toLocaleString("en-US") + (j.count === 1 ? " crow joined" : " crows joined");
    } catch (e) {
      return;
    }
  }

  if (!READY) {
    go(0);
    return;
  }
  const saved = store(true);
  if (saved && saved.wallet) {
    finish(saved.wallet);
  } else {
    go(1);
    getChallenge().catch(() => {});
  }
  count();
})();
