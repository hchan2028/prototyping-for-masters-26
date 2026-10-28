// A small original pixel cooking game. Four mouse minigames make one bowl of veggie fried rice.
// The canvas draws at 256×144 and is scaled up with crisp pixels.
const W = 256;
const H = 144;
const STEP = 1000 / 60;
const COUNTER = 104;
const INK = "#3b2433";

const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111",
  2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110",
  6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110",
  "!": "010010010000010", ".": "000000000000010", ":": "000010000010000", "-": "000000111000000",
  "/": "001001010100100", ",": "000000000010100", "'": "010010000000000", "?": "110001010000010",
  " ": "000000000000000",
};

const STAR = ["0001000", "0011100", "1111111", "0111110", "0011100", "0110110", "1100011"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const drawText = (ctx, text, x, y, { scale = 1, color = INK, align = "left", outline = null } = {}) => {
  const chars = [...String(text).toUpperCase()];
  const advance = 4 * scale;
  const width = chars.length * advance - scale;
  const startX = Math.round(align === "center" ? x - width / 2 : align === "right" ? x - width : x);
  const pass = (ox, oy, fill) => {
    ctx.fillStyle = fill;
    chars.forEach((char, index) => {
      const glyph = FONT[char];
      if (!glyph) return;
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          if (glyph[row * 3 + col] === "1") {
            ctx.fillRect(startX + index * advance + col * scale + ox, y + row * scale + oy, scale, scale);
          }
        }
      }
    });
  };
  if (outline) {
    const s = Math.max(1, Math.ceil(scale / 2));
    [[-s, 0], [s, 0], [0, -s], [0, s], [s, s]].forEach(([ox, oy]) => pass(ox, oy, outline));
  }
  pass(0, 0, color);
};

const ellipse = (ctx, cx, cy, rx, ry, color) => {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y += 1) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
};

const drawStar = (ctx, x, y, filled) => {
  STAR.forEach((row, r) => {
    [...row].forEach((bit, c) => {
      if (bit !== "1") return;
      ctx.fillStyle = INK;
      ctx.fillRect(x + c * 2 - 1, y + r * 2 - 1, 4, 4);
    });
  });
  STAR.forEach((row, r) => {
    [...row].forEach((bit, c) => {
      if (bit !== "1") return;
      ctx.fillStyle = filled ? (r < 2 ? "#fff1a0" : "#ffcc33") : "#c9b2a6";
      ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
    });
  });
};

// Chef Miso, a tabby cat in a chef's hat. Parts are [x, y, w, h, color] in a 28×32 box.
const CHEF_COLORS = {
  fur: "#f0a860", stripe: "#cf7c3a", hat: "#ffffff", band: "#e6dff0", apron: "#fffaf2",
  nose: "#ff7aa0", eye: INK, whisker: "#8a6a6a", sweat: "#7cc8ff", blush: "#ff9db5",
};
const chefParts = (mood) => {
  const parts = [
    [4, 8, 4, 5, "fur"], [20, 8, 4, 5, "fur"],
    [7, 0, 14, 5, "hat"], [5, 2, 18, 4, "hat"], [7, 6, 14, 3, "band"],
    [5, 9, 18, 13, "fur"], [11, 9, 6, 2, "stripe"], [5, 12, 2, 1, "stripe"], [21, 12, 2, 1, "stripe"],
    [13, 17, 2, 1, "nose"], [12, 18, 1, 1, "eye"], [15, 18, 1, 1, "eye"],
    [7, 22, 14, 10, "fur"], [9, 23, 10, 9, "apron"], [9, 23, 10, 1, "band"],
    [4, 24, 4, 5, "fur"], [20, 24, 4, 5, "fur"],
  ];
  if (mood === "happy") {
    parts.push([8, 15, 1, 1, "eye"], [9, 14, 2, 1, "eye"], [11, 15, 1, 1, "eye"],
      [16, 15, 1, 1, "eye"], [17, 14, 2, 1, "eye"], [19, 15, 1, 1, "eye"],
      [7, 17, 2, 1, "blush"], [19, 17, 2, 1, "blush"]);
  } else if (mood === "sad") {
    parts.push([9, 15, 3, 1, "eye"], [16, 15, 3, 1, "eye"], [24, 11, 2, 3, "sweat"]);
  } else {
    parts.push([9, 14, 2, 2, "eye"], [17, 14, 2, 2, "eye"]);
  }
  return parts;
};

const drawChef = (ctx, x, y, mood, scale = 1) => {
  const parts = chefParts(mood);
  ctx.fillStyle = INK;
  parts.forEach(([px, py, w, h, color]) => {
    if (color === "eye" || color === "blush" || color === "nose") return;
    ctx.fillRect(x + (px - 1) * scale, y + (py - 1) * scale, (w + 2) * scale, (h + 2) * scale);
  });
  parts.forEach(([px, py, w, h, color]) => {
    ctx.fillStyle = CHEF_COLORS[color];
    ctx.fillRect(x + px * scale, y + py * scale, w * scale, h * scale);
  });
  ctx.fillStyle = CHEF_COLORS.whisker;
  [[0, 16], [0, 18], [24, 16], [24, 18]].forEach(([px, py]) => ctx.fillRect(x + px * scale, y + py * scale, 4 * scale, scale));
};

const buildBackground = () => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fde9d4";
  ctx.fillRect(0, 0, W, COUNTER);
  ctx.fillStyle = "#f3d3b6";
  for (let x = 0; x < W; x += 12) ctx.fillRect(x, 0, 1, COUNTER);
  for (let y = 0; y < COUNTER; y += 12) ctx.fillRect(0, y, W, 1);

  // Window with a night sky.
  ctx.fillStyle = INK;
  ctx.fillRect(196, 22, 46, 38);
  ctx.fillStyle = "#3c3a78";
  ctx.fillRect(198, 24, 42, 34);
  ctx.fillStyle = "#5a4f9a";
  ctx.fillRect(198, 46, 42, 12);
  ctx.fillStyle = "#fff1c2";
  ellipse(ctx, 228, 32, 4, 4, "#fff1c2");
  ctx.fillStyle = INK;
  ctx.fillRect(218, 24, 2, 34);
  ctx.fillRect(198, 40, 42, 2);
  ctx.fillStyle = "#e8b48a";
  ctx.fillRect(193, 60, 52, 3);

  // Shelf with jars.
  ctx.fillStyle = "#a8693f";
  ctx.fillRect(10, 44, 50, 3);
  [[14, "#ff8a5c"], [26, "#7cc86a"], [38, "#ffd35c"], [50, "#b48cff"]].forEach(([x, lid]) => {
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1, 31, 9, 14);
    ctx.fillStyle = "#e6f4ff";
    ctx.fillRect(x, 34, 7, 10);
    ctx.fillStyle = lid;
    ctx.fillRect(x, 32, 7, 2);
    ctx.fillRect(x + 1, 38, 5, 5);
  });

  ctx.fillStyle = INK;
  ctx.fillRect(0, COUNTER - 1, W, 1);
  ctx.fillStyle = "#d9965f";
  ctx.fillRect(0, COUNTER, W, 5);
  ctx.fillStyle = "#a8693f";
  ctx.fillRect(0, COUNTER + 5, W, H - COUNTER - 5);
  ctx.fillStyle = "#93592f";
  for (let x = 20; x < W; x += 64) ctx.fillRect(x, COUNTER + 5, 1, H - COUNTER - 5);
  ctx.fillRect(0, COUNTER + 5, W, 1);
  return canvas;
};

// Steps ----------------------------------------------------------------

const GUIDES = [112, 128, 144, 160, 176];

const chopStep = {
  title: "Chop",
  hint: "Click to chop on each dotted line",
  time: 12 * 60,
  init: () => ({ cuts: [], used: GUIDES.map(() => false), knife: 0, points: 0 }),
  score: (s) => Math.round(s.points),
  update(s, ptr, fx) {
    if (s.knife > 0) s.knife -= 1;
    if (!ptr.pressed || s.knife > 0) return;
    const x = clamp(Math.round(ptr.x), 100, 196);
    let best = -1;
    let bestDistance = Infinity;
    GUIDES.forEach((guide, index) => {
      const distance = Math.abs(guide - x);
      if (!s.used[index] && distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    s.used[best] = true;
    s.cuts.push(x);
    s.knife = 10;
    const points = Math.max(0, 20 - bestDistance * 2.5);
    s.points += points;
    fx.chop();
    fx.bits(x, 88, ["#ff8a3d", "#ffb36b"], 5);
    fx.say(x, 62, points >= 17 ? "Nice" : points >= 8 ? "OK" : "Miss", points >= 17 ? "good" : points >= 8 ? "ok" : "bad");
    if (s.used.every(Boolean)) s.finished = true;
  },
  draw(ctx, s, ptr) {
    ctx.fillStyle = INK;
    ctx.fillRect(83, 69, 134, 42);
    ctx.fillStyle = "#e7b77f";
    ctx.fillRect(84, 70, 132, 40);
    ctx.fillStyle = "#d29d63";
    ctx.fillRect(84, 106, 132, 4);
    ctx.fillRect(206, 76, 6, 6);

    // Carrot pieces, nudged apart at each cut.
    const edges = [96, ...[...s.cuts].sort((a, b) => a - b), 202];
    ctx.fillStyle = "#3f9a3a";
    ctx.fillRect(86, 82, 10, 3);
    ctx.fillRect(84, 86, 12, 3);
    ctx.fillRect(88, 90, 8, 3);
    for (let i = 0; i < edges.length - 1; i += 1) {
      const x0 = edges[i] + i * 2;
      const x1 = edges[i + 1] + i * 2 - (i < edges.length - 2 ? 1 : 0);
      const taper = (x) => Math.max(0, Math.floor((x - 180) / 6));
      for (let x = x0; x < x1; x += 1) {
        const t = taper(x - i * 2);
        ctx.fillStyle = INK;
        ctx.fillRect(x, 81 + t, 1, 14 - t * 2);
        if (x > x0 && x < x1 - 1 && 14 - t * 2 > 2) {
          ctx.fillStyle = "#ff8a3d";
          ctx.fillRect(x, 82 + t, 1, 12 - t * 2);
          ctx.fillStyle = "#ffb36b";
          ctx.fillRect(x, 83 + t, 1, 2);
        }
      }
    }

    GUIDES.forEach((guide, index) => {
      if (s.used[index]) return;
      ctx.fillStyle = "#ffffff";
      for (let y = 74; y < 104; y += 4) ctx.fillRect(guide, y, 1, 2);
    });

    const kx = clamp(Math.round(ptr.x), 100, 196);
    const drop = s.knife > 5 ? (10 - s.knife) * 6 : s.knife * 6;
    const ky = 40 + drop;
    ctx.fillStyle = INK;
    ctx.fillRect(kx - 3, ky - 1, 7, 30);
    ctx.fillStyle = "#8a4f2c";
    ctx.fillRect(kx - 2, ky, 5, 11);
    ctx.fillStyle = "#d7dde8";
    ctx.fillRect(kx - 2, ky + 11, 5, 17);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(kx - 2, ky + 11, 1, 17);
    ctx.fillStyle = "#9aa3b5";
    ctx.fillRect(kx + 2, ky + 11, 1, 17);
  },
};

const BAR_X = 90;
const BAR_W = 120;
const newZone = () => ({ x: BAR_X + 8 + Math.random() * (BAR_W - 32), w: 16 });

const eggStep = {
  title: "Crack eggs",
  hint: "Click when the marker is in the green",
  time: 15 * 60,
  init: () => ({ egg: 0, marker: BAR_X, dir: 1, speed: 1.5, zone: newZone(), crack: 0, yolks: 0, shells: 0, points: 0 }),
  score: (s) => Math.round(Math.min(100, s.points)),
  update(s, ptr, fx) {
    if (s.crack > 0) {
      s.crack -= 1;
      if (s.crack === 16) s.yolks += 1;
      if (s.crack === 0) {
        s.egg += 1;
        if (s.egg >= 3) {
          s.finished = true;
        } else {
          s.zone = newZone();
          s.speed += 0.6;
          s.marker = BAR_X;
          s.dir = 1;
        }
      }
      return;
    }
    s.marker += s.dir * s.speed;
    if (s.marker >= BAR_X + BAR_W) {
      s.marker = BAR_X + BAR_W;
      s.dir = -1;
    } else if (s.marker <= BAR_X) {
      s.marker = BAR_X;
      s.dir = 1;
    }
    if (!ptr.pressed) return;
    const { x, w } = s.zone;
    const inZone = s.marker >= x && s.marker <= x + w;
    const near = s.marker >= x - 8 && s.marker <= x + w + 8;
    s.points += inZone ? 34 : near ? 20 : 6;
    if (!inZone) s.shells += near ? 1 : 3;
    s.crack = 42;
    fx.crack();
    fx.bits(150, 62, ["#ffffff", "#f4e6cf"], inZone ? 3 : 8);
    fx.say(150, 40, inZone ? "Clean!" : near ? "Close" : "Shells!", inZone ? "good" : near ? "ok" : "bad");
  },
  draw(ctx, s) {
    // Timing bar.
    ctx.fillStyle = INK;
    ctx.fillRect(BAR_X - 1, 27, BAR_W + 2, 8);
    ctx.fillStyle = "#fff6ea";
    ctx.fillRect(BAR_X, 28, BAR_W, 6);
    ctx.fillStyle = "#ffd28a";
    ctx.fillRect(Math.round(s.zone.x - 8), 28, s.zone.w + 16, 6);
    ctx.fillStyle = "#6cc85c";
    ctx.fillRect(Math.round(s.zone.x), 28, s.zone.w, 6);
    const mx = Math.round(s.marker);
    ctx.fillStyle = INK;
    ctx.fillRect(mx - 1, 25, 3, 12);
    ctx.fillRect(mx - 2, 23, 5, 2);
    drawText(ctx, `Egg ${Math.min(s.egg + 1, 3)}/3`, BAR_X + BAR_W / 2, 39, { align: "center", outline: "#fde9d4" });

    // Bowl.
    ellipse(ctx, 150, 98, 31, 5, INK);
    ellipse(ctx, 150, 98, 29, 4, "#f7d6a8");
    for (let y = 0; y < 14; y += 1) {
      const half = Math.round(31 * Math.sqrt(1 - (y / 15) ** 2));
      ctx.fillStyle = INK;
      ctx.fillRect(150 - half, 99 + y, half * 2 + 1, 1);
      if (half > 1) {
        ctx.fillStyle = y < 4 ? "#7cc8ff" : "#5aa6e6";
        ctx.fillRect(151 - half, 99 + y, half * 2 - 1, 1);
      }
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(130, 102, 8, 1);
    for (let i = 0; i < s.yolks; i += 1) {
      ellipse(ctx, 140 + i * 10, 97, 5, 2, "#fff6dd");
      ellipse(ctx, 140 + i * 10, 97, 2, 1, "#ffb21e");
    }
    const rand = mulberry32(7);
    for (let i = 0; i < s.shells * 2; i += 1) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(126 + rand() * 48), 96 + Math.round(rand() * 3), 2, 1);
    }

    // The egg, whole or cracking.
    if (s.egg >= 3) return;
    if (s.crack === 0) {
      const wobble = Math.round(Math.sin(performance.now() / 120));
      ellipse(ctx, 150 + wobble, 58, 8, 10, INK);
      ellipse(ctx, 150 + wobble, 58, 7, 9, "#fff6ea");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(146 + wobble, 52, 2, 4);
      return;
    }
    const t = 42 - s.crack;
    const apart = Math.min(10, t);
    [[-1, 0], [1, 0]].forEach(([side]) => {
      const cx = 150 + side * (4 + apart);
      ellipse(ctx, cx, 54 + Math.min(t, 6), 5, 5, INK);
      ellipse(ctx, cx, 54 + Math.min(t, 6), 4, 4, "#fff6ea");
    });
    if (t < 26) {
      const y = 62 + Math.min(1, t / 24) ** 2 * 34;
      ellipse(ctx, 150, Math.round(y), 3, 3, INK);
      ellipse(ctx, 150, Math.round(y), 2, 2, "#ffb21e");
    }
  },
};

const heatStep = {
  title: "Heat the wok",
  hint: "Hold to turn up the flame. Stay in the green",
  time: 9 * 60,
  init: () => ({ heat: 0.2, t: 0, inZone: 0 }),
  zone: (s) => 0.55 + 0.25 * Math.sin(s.t / 70),
  score: (s) => Math.round(Math.min(100, (s.inZone / (9 * 60 * 0.8)) * 100)),
  update(s, ptr, fx) {
    s.t += 1;
    s.heat = clamp(s.heat + (ptr.down ? 0.013 : -0.01), 0, 1);
    const center = heatStep.zone(s);
    const good = Math.abs(s.heat - center) < 0.11;
    if (good) s.inZone += 1;
    if (s.heat > center + 0.11 && s.t % 4 === 0) fx.smoke(150 + (Math.random() - 0.5) * 40, 84);
    if (good && s.t % 6 === 0) fx.bits(150 + (Math.random() - 0.5) * 36, 86, ["#ffe066", "#ffffff"], 1);
    if (s.heat > 0.5 && s.t % 18 === 0) fx.sizzle(s.heat);
    s.good = good;
  },
  draw(ctx, s) {
    // Stove and flame.
    ctx.fillStyle = INK;
    ctx.fillRect(105, 109, 92, 10);
    ctx.fillStyle = "#4a4458";
    ctx.fillRect(106, 110, 90, 8);
    const flame = 3 + Math.round(s.heat * 22);
    const flicker = Math.floor(performance.now() / 80) % 2;
    [[22, "#ff6a3d"], [14, "#ffb03b"], [7, "#fff1a0"]].forEach(([width, color], layer) => {
      const h = Math.max(1, flame - layer * 4 + flicker);
      for (let y = 0; y < h; y += 1) {
        const half = Math.round((width / 2) * (1 - y / (h + 2)));
        ctx.fillStyle = color;
        ctx.fillRect(150 - half, 108 - y, half * 2 + 1, 1);
      }
    });
    ctx.fillStyle = "#6c9cff";
    ctx.fillRect(140, 107, 21, 2);

    // Wok from the side.
    ctx.fillStyle = INK;
    ctx.fillRect(178, 84, 30, 4);
    ctx.fillStyle = "#8a4f2c";
    ctx.fillRect(186, 85, 21, 2);
    for (let y = 0; y < 12; y += 1) {
      const half = Math.round(34 * Math.sqrt(1 - (y / 13) ** 2));
      ctx.fillStyle = INK;
      ctx.fillRect(150 - half, 82 + y, half * 2 + 1, 1);
      if (half > 1) {
        ctx.fillStyle = y < 2 ? "#6b6a7d" : "#3d3b4d";
        ctx.fillRect(151 - half, 82 + y, half * 2 - 1, 1);
      }
    }
    ctx.fillStyle = "#f4e3b0";
    ctx.fillRect(126, 81, 48, 2);

    // Thermometer.
    const top = 26;
    const height = 74;
    const toY = (value) => Math.round(top + height - value * height);
    const center = heatStep.zone(s);
    ctx.fillStyle = INK;
    ctx.fillRect(225, top - 1, 10, height + 2);
    ellipse(ctx, 230, top + height + 4, 6, 6, INK);
    ctx.fillStyle = "#fff6ea";
    ctx.fillRect(226, top, 8, height);
    ctx.fillStyle = "#6cc85c";
    ctx.fillRect(226, toY(center + 0.11), 8, toY(center - 0.11) - toY(center + 0.11));
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(228, toY(s.heat), 4, top + height - toY(s.heat));
    ellipse(ctx, 230, top + height + 4, 4, 4, "#ff4d4d");
    ctx.fillStyle = INK;
    ctx.fillRect(223, toY(s.heat), 14, 1);
    drawText(ctx, s.good ? "Good" : s.heat > center ? "Hot!" : "Cold", 230, 112, { outline: "#fde9d4", align: "center", color: s.good ? "#3f9a3a" : s.heat > center ? "#e0402f" : "#4a78d0" });
  },
};

const STIR_TARGET = Math.PI * 2 * 6;
const stirStep = {
  title: "Stir fry",
  hint: "Hold and drag in circles around the wok",
  time: 12 * 60,
  init: () => {
    const rand = mulberry32(11);
    const colors = ["#fff1c9", "#fff1c9", "#f4e3b0", "#fff1c9", "#ff8a3d", "#6cc85c", "#ffcf3f"];
    const grains = Array.from({ length: 110 }, () => ({
      r: Math.sqrt(rand()) * 0.85, a: rand() * Math.PI * 2, speed: 0.6 + rand() * 0.6,
      color: colors[Math.floor(rand() * colors.length)],
    }));
    return { angle: 0, last: null, progress: 0, grains, half: 0, spoon: null };
  },
  score: (s) => Math.round(Math.min(1, s.progress / STIR_TARGET) * 100),
  update(s, ptr, fx) {
    const dx = ptr.x - 150;
    const dy = (ptr.y - 80) * 1.35;
    const distance = Math.hypot(dx, dy);
    if (ptr.down && distance > 5 && distance < 60) {
      const a = Math.atan2(dy, dx);
      if (s.last !== null) {
        let delta = a - s.last;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) < 1.2) {
          s.angle += delta;
          s.progress += Math.abs(delta);
        }
      }
      s.last = a;
    } else {
      s.last = null;
    }
    const half = Math.floor(s.progress / Math.PI);
    if (half > s.half) {
      s.half = half;
      fx.swish();
      fx.steam(150 + (Math.random() - 0.5) * 50, 70);
    }
    if (s.progress >= STIR_TARGET) s.finished = true;
  },
  draw(ctx, s, ptr) {
    ctx.fillStyle = INK;
    ctx.fillRect(186, 78, 40, 5);
    ctx.fillStyle = "#8a4f2c";
    ctx.fillRect(196, 79, 29, 3);
    ellipse(ctx, 150, 80, 43, 31, INK);
    ellipse(ctx, 150, 80, 42, 30, "#6b6a7d");
    ellipse(ctx, 150, 81, 37, 26, "#3d3b4d");
    s.grains.forEach((grain) => {
      const a = grain.a + s.angle * grain.speed;
      ctx.fillStyle = grain.color;
      ctx.fillRect(Math.round(150 + Math.cos(a) * grain.r * 36), Math.round(81 + Math.sin(a) * grain.r * 25), 2, 1);
    });

    // Spatula follows the pointer.
    const sx = Math.round(ptr.x);
    const sy = Math.round(ptr.y);
    ctx.fillStyle = INK;
    ctx.fillRect(sx - 5, sy - 3, 11, 7);
    ctx.fillRect(sx + 4, sy - 12, 4, 11);
    ctx.fillStyle = "#c9cfdb";
    ctx.fillRect(sx - 4, sy - 2, 9, 5);
    ctx.fillStyle = "#8a4f2c";
    ctx.fillRect(sx + 5, sy - 11, 2, 9);

    const progress = Math.min(1, s.progress / STIR_TARGET);
    ctx.fillStyle = INK;
    ctx.fillRect(99, 117, 102, 6);
    ctx.fillStyle = "#fff6ea";
    ctx.fillRect(100, 118, 100, 4);
    ctx.fillStyle = "#ff8a3d";
    ctx.fillRect(100, 118, Math.round(progress * 100), 4);
  },
};

const STEPS = [chopStep, eggStep, heatStep, stirStep];

const ratingFor = (score) => (score >= 90 ? ["Perfect!", "#ff5d8f"] : score >= 70 ? ["Great!", "#ff8a3d"] : score >= 45 ? ["Good", "#3f9a3a"] : ["Oops...", "#4a78d0"]);
const starsFor = (score) => (score >= 85 ? 3 : score >= 65 ? 2 : score >= 40 ? 1 : 0);
const VERDICTS = ["Let's order in...", "Edible, mostly.", "Tasty! Nice work.", "Purrfect dinner!"];

export default {
  student: "Matthew Chan",
  title: "Pixel Kitchen",
  width: 640,
  height: 400,
  mount(root) {
    const style = document.createElement("style");
    style.textContent = `
      canvas {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #fde9d4;
        image-rendering: pixelated;
        cursor: pointer;
        outline: none;
        touch-action: none;
      }
      canvas:focus-visible {
        box-shadow: inset 0 0 0 2px #ff8a3d;
      }
    `;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", "Pixel Kitchen, a cooking game. Use the mouse to chop, crack, heat and stir.");
    root.append(style, canvas);

    const ctx = canvas.getContext("2d");
    const background = buildBackground();
    const ptr = { x: W / 2, y: H / 2, down: false, pressed: false, over: false };
    const game = { phase: "title", t: 0, step: 0, state: null, endT: 0, scores: [], mood: "idle", moodT: 0, bubble: "", muted: false };
    let particles = [];
    let floaters = [];

    // Sound ------------------------------------------------------------
    let audio = null;
    const withAudio = (play) => {
      if (game.muted) return;
      try {
        audio ??= new AudioContext();
        play(audio, audio.currentTime);
      } catch {
        // Audio is optional.
      }
    };
    const tone = (from, to, duration, type = "square", volume = 0.05) => withAudio((ac, now) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + duration);
    });
    const noise = (duration, volume, cutoff, type = "lowpass") => withAudio((ac, now) => {
      const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = ac.createBufferSource();
      const filter = ac.createBiquadFilter();
      const gain = ac.createGain();
      source.buffer = buffer;
      filter.type = type;
      filter.frequency.value = cutoff;
      gain.gain.value = volume;
      source.connect(filter).connect(gain).connect(ac.destination);
      source.start(now);
    });
    const jingle = (notes) => notes.forEach((freq, i) => setTimeout(() => tone(freq, freq, 0.14, "triangle", 0.06), i * 110));

    // Effects shared by the steps.
    const fx = {
      chop: () => { noise(0.05, 0.2, 2500); tone(220, 120, 0.05, "square", 0.04); },
      crack: () => { noise(0.08, 0.18, 3000, "highpass"); tone(500, 300, 0.06, "triangle", 0.04); },
      sizzle: (heat) => noise(0.3, 0.04 + heat * 0.05, 5000, "highpass"),
      swish: () => noise(0.12, 0.06, 1200),
      bits: (x, y, colors, count) => {
        for (let i = 0; i < count; i += 1) {
          particles.push({ x, y, vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 2 - 0.5, g: 0.15, life: 24, color: colors[i % colors.length] });
        }
      },
      smoke: (x, y) => particles.push({ x, y, vx: (Math.random() - 0.5) * 0.3, vy: -0.5, g: 0, life: 40, color: "#8f8a99", size: 2 }),
      steam: (x, y) => {
        for (let i = 0; i < 3; i += 1) particles.push({ x: x + i * 3, y, vx: (Math.random() - 0.5) * 0.2, vy: -0.4, g: 0, life: 36, color: "#ffffff", size: 2 });
      },
      say: (x, y, text, kind) => {
        floaters.push({ x, y, text, life: 40, color: kind === "good" ? "#3f9a3a" : kind === "ok" ? "#d07a1c" : "#d0402f" });
        setMood(kind === "good" ? "happy" : kind === "bad" ? "sad" : "idle", kind === "good" ? "Yum!" : kind === "bad" ? "Eek!" : "Okay!");
        if (kind === "good") tone(880, 1320, 0.1, "triangle", 0.05);
      },
    };

    const setMood = (mood, bubble = "", duration = 50) => {
      game.mood = mood;
      game.bubble = bubble;
      game.moodT = duration;
    };

    // Flow -------------------------------------------------------------
    const beginStep = (index) => {
      game.step = index;
      game.state = STEPS[index].init();
      game.phase = "intro";
      game.t = 0;
      game.endT = 0;
      game.timeLeft = STEPS[index].time;
      particles = [];
      floaters = [];
      setMood("idle");
    };

    const finishStep = () => {
      const score = clamp(STEPS[game.step].score(game.state), 0, 100);
      game.scores[game.step] = score;
      game.phase = "result";
      game.t = 0;
      if (score >= 70) {
        setMood("happy", "Meow-velous!", 90);
        jingle([660, 880, 1100]);
      } else if (score >= 45) {
        setMood("idle", "Not bad!", 90);
        jingle([660, 780]);
      } else {
        setMood("sad", "We'll fix it...", 90);
        jingle([440, 330]);
      }
    };

    const advance = () => {
      if (game.phase === "title") {
        game.scores = [];
        beginStep(0);
      } else if (game.phase === "intro") {
        game.phase = "play";
        game.t = 0;
      } else if (game.phase === "result" && game.t > 20) {
        if (game.step + 1 < STEPS.length) {
          beginStep(game.step + 1);
        } else {
          game.phase = "final";
          game.t = 0;
          const stars = starsFor(average());
          setMood(stars >= 2 ? "happy" : stars === 1 ? "idle" : "sad", "", 9999);
          jingle(stars >= 2 ? [523, 659, 784, 1047] : [523, 440, 392]);
        }
      } else if (game.phase === "final" && game.t > 30) {
        game.phase = "title";
        game.t = 0;
        setMood("idle");
      }
    };

    const average = () => Math.round(game.scores.reduce((sum, score) => sum + score, 0) / STEPS.length);

    const update = () => {
      game.t += 1;
      if (game.moodT > 0 && (game.moodT -= 1) === 0) {
        game.mood = "idle";
        game.bubble = "";
      }
      const paused = game.phase === "play" && !ptr.over && !ptr.down;

      if (!paused) {
        particles = particles.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.g;
          return (p.life -= 1) > 0;
        });
        floaters = floaters.filter((f) => {
          f.y -= 0.3;
          return (f.life -= 1) > 0;
        });
      }

      if (game.phase === "play") {
        if (paused) return;
        const step = STEPS[game.step];
        step.update(game.state, ptr, fx);
        game.timeLeft -= 1;
        if (game.state.finished || game.timeLeft <= 0) {
          game.endT += 1;
          if (game.endT > 30 || game.timeLeft <= -30) finishStep();
        }
      } else {
        // Results move on by themselves; a step only starts when the player clicks.
        if (game.phase === "result" && game.t > 150) advance();
        if (ptr.pressed) advance();
      }
    };

    // Drawing ----------------------------------------------------------
    const panel = (x, y, w, h, fill = "#fff6ea") => {
      ctx.fillStyle = INK;
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };

    const drawChefCorner = () => {
      const bob = game.mood === "happy" ? Math.abs(Math.round(Math.sin(game.t / 5) * 2)) : Math.floor(game.t / 30) % 2;
      drawChef(ctx, 10, COUNTER - 30 - bob, game.mood);
      if (game.bubble) {
        const width = game.bubble.length * 4 + 7;
        panel(6, COUNTER - 50, width, 11, "#ffffff");
        ctx.fillStyle = INK;
        ctx.fillRect(16, COUNTER - 38, 3, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(16, COUNTER - 39, 2, 2);
        drawText(ctx, game.bubble, 10, COUNTER - 47);
      }
    };

    const drawHud = () => {
      const step = STEPS[game.step];
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, 12);
      drawText(ctx, `${game.step + 1}/${STEPS.length} ${step.title}`, 4, 4, { color: "#ffd28a" });
      const fraction = clamp(game.timeLeft / step.time, 0, 1);
      ctx.fillStyle = "#6b4a5e";
      ctx.fillRect(150, 4, 100, 4);
      ctx.fillStyle = fraction > 0.25 ? "#7cd36a" : "#ff5d5d";
      ctx.fillRect(150, 4, Math.round(100 * fraction), 4);
      drawText(ctx, step.hint, W / 2, 16, { align: "center", color: INK, outline: "#fde9d4" });
    };

    const drawDish = (x, y) => {
      ellipse(ctx, x, y + 6, 48, 13, INK);
      ellipse(ctx, x, y + 6, 47, 12, "#ffffff");
      ellipse(ctx, x, y + 6, 38, 8, "#e6f0ff");
      ellipse(ctx, x, y, 31, 11, INK);
      ellipse(ctx, x, y, 30, 10, "#fff1c9");
      const rand = mulberry32(3);
      const toppings = ["#ff8a3d", "#6cc85c", "#ffcf3f", "#f4e3b0", "#f4e3b0"];
      for (let i = 0; i < 90; i += 1) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand());
        ctx.fillStyle = toppings[Math.floor(rand() * toppings.length)];
        ctx.fillRect(Math.round(x + Math.cos(a) * r * 27), Math.round(y + Math.sin(a) * r * 8), 2, 1);
      }
      for (let i = 0; i < 3; i += 1) {
        const sway = Math.round(Math.sin((game.t + i * 20) / 12) * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(x - 12 + i * 12 + sway, y - 18 - ((game.t / 3 + i * 7) % 12), 2, 4);
      }
    };

    const render = () => {
      ctx.drawImage(background, 0, 0);

      if (game.phase === "title") {
        drawText(ctx, "Pixel", W / 2, 6, { scale: 5, align: "center", color: "#ff8a3d", outline: INK });
        drawText(ctx, "Kitchen", W / 2, 32, { scale: 5, align: "center", color: "#ff5d8f", outline: INK });
        drawChef(ctx, 18, 62, "happy", 2);
        drawDish(196, 96);
        panel(86, 72, 90, 13, "#ffffff");
        drawText(ctx, "Tonight: fried rice", 131, 76, { align: "center" });
        if (Math.floor(game.t / 30) % 2 === 0) drawText(ctx, "Click to cook", W / 2, 124, { scale: 2, align: "center", color: "#fff6ea", outline: INK });
        return;
      }

      if (game.phase === "final") {
        const score = average();
        const stars = starsFor(score);
        drawText(ctx, "Dinner is served!", W / 2, 6, { scale: 2, align: "center", color: "#ff8a3d", outline: INK });
        drawDish(150, 72);
        for (let i = 0; i < 3; i += 1) {
          const pop = game.t > 20 + i * 15;
          drawStar(ctx, 130 + i * 18 - 7, 24, pop && i < stars);
        }
        panel(70, 92, 160, 34);
        STEPS.forEach((step, i) => {
          drawText(ctx, step.title, 76 + (i % 2) * 80, 96 + Math.floor(i / 2) * 8);
          drawText(ctx, String(game.scores[i]), 146 + (i % 2) * 80, 96 + Math.floor(i / 2) * 8, { align: "right", color: "#d07a1c" });
        });
        drawText(ctx, `Total ${score}`, 150, 114, { align: "center", color: "#ff5d8f" });
        game.bubble = VERDICTS[stars];
        drawChefCorner();
        if (game.t > 30 && Math.floor(game.t / 30) % 2 === 0) drawText(ctx, "Click to cook again", 150, 134, { align: "center", color: "#fff6ea", outline: INK });
        return;
      }

      const step = STEPS[game.step];
      step.draw(ctx, game.state, ptr);
      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        const size = p.size ?? 1;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      });
      floaters.forEach((f) => drawText(ctx, f.text, f.x, Math.round(f.y), { align: "center", color: f.color, outline: "#ffffff" }));
      drawHud();
      drawChefCorner();

      if (game.phase === "intro") {
        ctx.fillStyle = "rgba(59, 36, 51, 0.55)";
        ctx.fillRect(0, 12, W, H - 12);
        drawText(ctx, `Step ${game.step + 1}`, W / 2, 34, { scale: 2, align: "center", color: "#ffd28a", outline: INK });
        drawText(ctx, step.title, W / 2, 50, { scale: 4, align: "center", color: "#ffffff", outline: INK });
        drawText(ctx, step.hint, W / 2, 78, { align: "center", color: "#fff6ea", outline: INK });
        if (Math.floor(game.t / 25) % 2 === 0) drawText(ctx, "Click to start", W / 2, 96, { align: "center", color: "#ffd28a", outline: INK });
      } else if (game.phase === "result") {
        const score = game.scores[game.step];
        const [word, color] = ratingFor(score);
        panel(68, 38, 120, 48);
        drawText(ctx, word, 128, 44, { scale: 3, align: "center", color });
        drawText(ctx, `${score} points`, 128, 64, { align: "center" });
        drawText(ctx, game.step + 1 < STEPS.length ? "Click for next step" : "Click to serve", 128, 76, { align: "center", color: "#a07a6a" });
      } else if (game.phase === "play" && !ptr.over && !ptr.down) {
        ctx.fillStyle = "rgba(59, 36, 51, 0.5)";
        ctx.fillRect(0, 12, W, H - 12);
        drawText(ctx, "Paused", W / 2, 54, { scale: 3, align: "center", color: "#ffffff", outline: INK });
        drawText(ctx, "Point at the kitchen to keep cooking", W / 2, 76, { align: "center", color: "#fff6ea", outline: INK });
      }
      if (game.muted) drawText(ctx, "Muted", W - 4, H - 8, { align: "right", color: "#fff6ea" });
    };

    // Input ------------------------------------------------------------
    const toCanvas = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(rect.width / W, rect.height / H);
      const offsetX = (rect.width - W * scale) / 2;
      const offsetY = (rect.height - H * scale) / 2;
      ptr.x = clamp((event.clientX - rect.left - offsetX) / scale, 0, W - 1);
      ptr.y = clamp((event.clientY - rect.top - offsetY) / scale, 0, H - 1);
    };
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Capture is a nicety; stirring still works without it.
      }
      toCanvas(event);
      ptr.down = true;
      ptr.pressed = true;
      ptr.over = true;
    });
    canvas.addEventListener("pointermove", (event) => {
      toCanvas(event);
      ptr.over = true;
    });
    const release = () => { ptr.down = false; };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerenter", () => { ptr.over = true; });
    // Only a mouse leaving pauses the game; a lifted finger always "leaves".
    canvas.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") ptr.over = false;
    });
    canvas.addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === "KeyM") {
        game.muted = !game.muted;
      } else if ((event.code === "Enter" || event.code === "Space") && game.phase !== "play") {
        event.preventDefault();
        advance();
      }
    });

    let last = performance.now();
    let pending = 0;
    const frame = (now) => {
      if (!canvas.isConnected) return;
      pending = Math.min(pending + now - last, STEP * 5);
      last = now;
      while (pending >= STEP) {
        update();
        ptr.pressed = false;
        pending -= STEP;
      }
      render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
};
