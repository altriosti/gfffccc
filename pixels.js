(function () {
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const HERO = { Feather: 1, Eye: 5, Background: 0, Aura: 0, Plumage: 0, Neck: 0, Eyes: 2, Beak: 0, Carry: 0, Eyewear: 0, Headwear: 0 };

  const ICONS = {
    search: {
      rows: [
        "..aaaa......",
        ".abbbba.....",
        "abwbbbba....",
        "abwbbbba....",
        "abbbbbba....",
        "abbbbbba....",
        ".abbbba.....",
        "..aaaaca....",
        ".......cc...",
        "........cc..",
        ".........cc.",
        "..........c."
      ],
      map: { a: "#8fd3ff", b: "#1f5fae", w: "#ffffff", c: "#c9931f" }
    },
    pebble: {
      rows: [
        "............",
        "............",
        "....aaaa....",
        "..aawwbbaa..",
        ".abwwbbbbca.",
        ".abbbbbbbca.",
        "abbbbbbbbcca",
        "abbbbbbbccca",
        ".acbbbbccca.",
        "..accccccaa.",
        "...aaaaaa...",
        "............"
      ],
      map: { a: "#3a4f86", b: "#aeb6c6", c: "#7c859a", w: "#eef2ff" }
    },
    drop: {
      rows: [
        ".....a......",
        ".....a......",
        "....aba.....",
        "...abwba....",
        "...abbba....",
        "..abbbbba...",
        "..abbbbba...",
        "...abbba....",
        "....aaa.....",
        ".c.......c..",
        "..ccccccc...",
        "............"
      ],
      map: { a: "#8fd3ff", b: "#4aa8ff", w: "#ffffff", c: "#1f5fae" }
    },
    mint: {
      rows: [
        "...aaaaaa...",
        "..abbbbbba..",
        ".abbwwbbbca.",
        "abbwbbbbbbca",
        "abbwbbddbbca",
        "abbbbdbbbbca",
        "abbbbbdbbbca",
        "abbbbbbbbbca",
        ".abbbbbbbca.",
        "..accccccca.",
        "...aaaaaa...",
        "............"
      ],
      map: { a: "#6b4a10", b: "#f5c542", c: "#c9931f", w: "#fff3c4", d: "#8a6a18" }
    },
    bell: {
      rows: [
        ".....aa.....",
        "....abba....",
        "...abwbba...",
        "..abwbbbba..",
        "..abbbbbba..",
        "..abbbbbba..",
        ".abbbbbbbba.",
        "abbbbbbbbbba",
        "aaaaaaaaaaaa",
        ".....cc.....",
        "............",
        "............"
      ],
      map: { a: "#6b4a10", b: "#f5c542", w: "#fff3c4", c: "#c9931f" }
    }
  };

  function icon(canvas, name) {
    const ic = ICONS[name];
    if (!ic) return;
    canvas.width = 12;
    canvas.height = 12;
    const ctx = canvas.getContext("2d");
    ic.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = ic.map[row[x]];
        if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
      }
    });
  }

  window.Px = { rng, HERO, icon };
})();
