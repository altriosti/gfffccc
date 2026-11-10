(function () {
  const W = 1200, H = 675;
  const COL = { lime: "#97fce4", red: "#ff1f3d", cyan: "#00e5ff", violet: "#9d4dff", ink: "#04070b", card: "#0d161b", line: "#1f3138", text: "#effffb", muted: "#a9c2c0" };
  const TIER_NAMES = { 1: "PEBBLE FINDER", 2: "PEBBLE HUNTER", 3: "PEBBLE HOARDER" };

  function seedOf(wallet) {
    let h = 2166136261 >>> 0;
    const s = String(wallet || "").toLowerCase();
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }

  async function fonts() {
    try {
      await Promise.all([document.fonts.load('120px "Jersey 10"'), document.fonts.load('40px "VT323"')]);
    } catch (e) {
      return;
    }
  }

  function box(ctx, x, y, w, h, fill, shadow, off) {
    if (shadow) { ctx.fillStyle = shadow; ctx.fillRect(x + (off || 10), y + (off || 10), w, h); }
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }

  function text(ctx, s, x, y, size, color, font, align, shadow) {
    ctx.font = size + "px " + (font === "body" ? '"VT323", monospace' : '"Jersey 10", "VT323", monospace');
    ctx.textAlign = align || "left";
    ctx.textBaseline = "alphabetic";
    if (shadow) { ctx.fillStyle = shadow; ctx.fillText(s, x + 5, y + 5); }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    return ctx.measureText(s).width;
  }

  function fit(ctx, s, max, size, font) {
    let z = size;
    ctx.font = z + "px " + (font === "body" ? '"VT323", monospace' : '"Jersey 10", monospace');
    while (z > 20 && ctx.measureText(s).width > max) { z -= 4; ctx.font = z + "px " + (font === "body" ? '"VT323", monospace' : '"Jersey 10", monospace'); }
    return z;
  }

  async function render(o) {
    await fonts();
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = COL.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#10101a";
    for (let x = 0; x < W; x += 30) ctx.fillRect(x, 0, 2, H);
    for (let y = 0; y < H; y += 30) ctx.fillRect(0, y, W, 2);

    const rand = Px.rng(seedOf(o.wallet) ^ 0x5eed);
    const dots = [COL.lime, COL.cyan, COL.red, COL.violet];
    for (let i = 0; i < 26; i++) {
      const s = 6 + Math.floor(rand() * 3) * 6;
      ctx.fillStyle = dots[i % 4];
      ctx.globalAlpha = 0.35 + rand() * 0.5;
      ctx.fillRect(500 + Math.floor(rand() * 360 / 6) * 6, 24 + Math.floor(rand() * 96 / 6) * 6, s, s);
    }
    ctx.globalAlpha = 1;

    box(ctx, 0, 0, W, 12, COL.lime);
    box(ctx, 0, H - 12, W, 12, COL.violet);

    const brandW = text(ctx, "PEBBLE", 60, 86, 52, COL.text);
    text(ctx, "CROWS", 60 + brandW + 14, 86, 52, COL.lime);

    const tag = o.kind === "claim" ? "$WPEBBLE AIRDROP" : "$WPEBBLE MINING";
    ctx.font = '30px "Jersey 10", monospace';
    const tw = ctx.measureText(tag).width + 36;
    box(ctx, W - 60 - tw, 48, tw, 48, COL.lime, COL.red, 6);
    text(ctx, tag, W - 60 - tw / 2, 82, 30, COL.ink, null, "center");

    const fx = 60, fy = 130, fs = 432;
    box(ctx, fx, fy, fs, fs, COL.lime, COL.red, 16);
    const crow = document.createElement("canvas");
    crow.width = 24; crow.height = 24;
    const traits = o.traits || Crows.roll(Px.rng(seedOf(o.wallet)));
    Crows.draw(crow.getContext("2d"), traits);
    ctx.drawImage(crow, fx + 12, fy + 12, fs - 24, fs - 24);

    const rx = 548;
    text(ctx, o.kind === "claim" ? "I CLAIMED" : o.kind === "start" ? "I AM MINING" : "I MINED", rx, 200, 58, COL.text);
    const amt = Number(o.amount || 0).toLocaleString("en-US");
    const az = fit(ctx, amt, 600, 200);
    text(ctx, amt, rx, 200 + az * 0.86, az, COL.lime, null, "left", COL.red);
    const ay = 200 + az * 0.86;
    text(ctx, o.unit || "$WPEBBLE", rx + 4, ay + 66, 62, COL.cyan);

    const badge = o.badge || (o.kind === "claim" ? TIER_NAMES[o.tier] || "PEBBLE CROW" : "PEBBLE MINER");
    ctx.font = '34px "Jersey 10", monospace';
    const bw = ctx.measureText(badge).width + 40;
    box(ctx, rx, ay + 92, bw, 54, COL.violet, COL.ink, 0);
    text(ctx, badge, rx + bw / 2, ay + 131, 34, "#ffffff", null, "center");
    if (o.wallet) text(ctx, o.wallet.slice(0, 6) + "..." + o.wallet.slice(-4), rx + bw + 22, ay + 129, 30, COL.muted, "body");

    const by = 590;
    box(ctx, rx, by - 6, W - 60 - rx, 64, COL.card);
    ctx.fillStyle = COL.lime;
    ctx.fillRect(rx, by - 6, 6, 64);
    text(ctx, "CLAIM YOURS", rx + 24, by + 22, 26, COL.red);
    const link = String(o.link || "").replace(/^https?:\/\//, "");
    const lz = fit(ctx, link, W - 60 - rx - 48, 34, "body");
    text(ctx, link, rx + 24, by + 50, lz, COL.lime, "body");

    text(ctx, "Built on Elysium", fx, 636, 28, COL.muted, "body");

    return c;
  }


  async function renderEly(o) {
    await fonts();
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#97fce4");
    g.addColorStop(0.38, "#50d2c1");
    g.addColorStop(0.72, "#2c6fd6");
    g.addColorStop(1, "#9d4dff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(270, 360, 40, 270, 360, 420);
    glow.addColorStop(0, "rgba(255,255,255,0.45)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(4,7,11,0.08)";
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 2, H);
    for (let y = 0; y < H; y += 24) ctx.fillRect(0, y, W, 2);
    const rand = Px.rng(seedOf(o.wallet) ^ 0xe1e5);
    for (let i = 0; i < 30; i++) {
      const s = 6 + Math.floor(rand() * 3) * 6;
      ctx.fillStyle = i % 3 ? "rgba(255,255,255,0.7)" : "rgba(4,7,11,0.35)";
      ctx.fillRect(Math.floor(rand() * W / 6) * 6, Math.floor(rand() * H / 6) * 6, s, s);
    }

    box(ctx, 0, 0, W, 12, COL.ink);
    box(ctx, 0, H - 12, W, 12, COL.ink);
    const bw0 = text(ctx, "PEBBLE", 60, 86, 52, COL.ink);
    text(ctx, "CROWS", 60 + bw0 + 14, 86, 52, "#ffffff", null, "left", COL.ink);
    const tag = "ELYSIUM AIRDROP";
    ctx.font = '30px "Jersey 10", monospace';
    const tw = ctx.measureText(tag).width + 36;
    box(ctx, W - 60 - tw, 48, tw, 48, COL.ink, "#ffffff", 6);
    text(ctx, tag, W - 60 - tw / 2, 82, 30, COL.lime, null, "center");

    const fx = 60, fy = 130, fs = 420;
    box(ctx, fx, fy, fs, fs, COL.ink, "rgba(4,7,11,0.35)", 16);
    const crow = document.createElement("canvas");
    crow.width = 24; crow.height = 24;
    Crows.draw(crow.getContext("2d"), Crows.roll(Px.rng(seedOf(o.wallet))));
    ctx.drawImage(crow, fx + 12, fy + 12, fs - 24, fs - 24);

    const rx = 540;
    text(ctx, "MY $PEBBLE AIRDROP", rx, 196, 50, COL.ink);
    const amt = Number(o.amount || 0).toLocaleString("en-US");
    const az = fit(ctx, amt, 600, 190);
    text(ctx, amt, rx, 196 + az * 0.86, az, "#ffffff", null, "left", COL.ink);
    const ay = 196 + az * 0.86;
    text(ctx, "$PEBBLE", rx + 4, ay + 62, 58, COL.ink);
    const badge = o.badge || "ELYSIUM CROW";
    ctx.font = '34px "Jersey 10", monospace';
    const bw = ctx.measureText(badge).width + 40;
    box(ctx, rx, ay + 88, bw, 54, COL.ink, "#ffffff", 5);
    text(ctx, badge, rx + bw / 2, ay + 127, 34, COL.lime, null, "center");
    const who = o.user ? "@" + String(o.user).replace(/^@/, "") : (o.wallet ? o.wallet.slice(0, 6) + "..." + o.wallet.slice(-4) : "");
    if (who) text(ctx, who, rx + bw + 20, ay + 125, 34, COL.ink, "body");

    const by = 584;
    box(ctx, rx, by - 6, W - 60 - rx, 66, COL.ink);
    ctx.fillStyle = COL.lime;
    ctx.fillRect(rx, by - 6, 6, 66);
    text(ctx, "CHECK YOURS · 100% UNLOCKED", rx + 24, by + 22, 26, "#ffffff");
    const link = String(o.link || "").replace(/^https?:\/\//, "");
    const lz = fit(ctx, link, W - 60 - rx - 48, 34, "body");
    text(ctx, link, rx + 24, by + 52, lz, COL.lime, "body");
    text(ctx, "Built on Elysium", fx, 636, 30, COL.ink, "body");
    return c;
  }

  function toBlob(c) {
    return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
  }

  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name || "pebble-crows-card.png";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  async function share(blob, textBody, url) {
    const file = new File([blob], "pebble-crows-card.png", { type: "image/png" });
    if (navigator.canShare && navigator.share) {
      let can = false;
      try { can = navigator.canShare({ files: [file] }); } catch (e) { can = false; }
      if (can) {
        try {
          await navigator.share({ files: [file], text: textBody + " " + url });
          return "shared";
        } catch (e) {
          if (e && e.name === "AbortError") return "cancelled";
        }
      }
    }
    download(blob);
    window.open("https://x.com/intent/post?text=" + encodeURIComponent(textBody) + "&url=" + encodeURIComponent(url), "_blank", "noopener");
    return "intent";
  }

  window.PebbleCard = { render, renderEly, toBlob, download, share, TIER_NAMES };
})();
