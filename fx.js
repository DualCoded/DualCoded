// Side transitions. Each run(swap) covers the screen, calls swap() while covered, then reveals.
//   732: one of four, picked at random: colorful cross wall, night city, bats, world tour.
//   508: a pile of thrifted clothes falls in and stacks up, then the whole pile drops off the bottom.
//   neutral: plain black wipe (back to map / "all").
(function () {
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const svgURI = s => "url(\"data:image/svg+xml," + encodeURIComponent(s) + "\")";

  // ---------- shared overlay ----------
  function layer(cls) {
    const el = document.createElement("div");
    el.className = "fx " + (cls || "");
    document.body.appendChild(el);
    return el;
  }
  const done = a => a.finished.catch(() => {});
  // frame-driven tween: step(easedT) every frame for `duration` ms
  function play(duration, step, curve = t => 1 - Math.pow(1 - t, 3)) {
    return new Promise(res => {
      const t0 = performance.now();
      const f = now => {
        const t = Math.min(1, (now - t0) / duration);
        step(curve(t));
        if (t < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
  }

  // ================== 732 · COLOR CROSS WALL ==================
  // Heraldic "cross fleury" (flared arms, three-petal ends, long bottom arm) in flat print colors: [fill, outline]
  const CEM = {
    pink: ["#f5a8bc", "#b8607a"], yellow: ["#f2d43a", "#9e8410"], blue: ["#1f6fe4", "#0c3f96"],
    green: ["#1fa24b", "#0d6a2e"], red: ["#e3262b", "#8f1216"], white: ["#f2f2f2", "#9a9a9a"],
  };
  const CEM_NAMES = Object.keys(CEM);
  function arm(L) {
    return `M-4,-6 Q-5,${-.5 * L} -10,${-.72 * L} Q-17.5,${-.8 * L} -15.5,${-.99 * L} Q-10,${-.93 * L} -6.5,${-.86 * L} ` +
           `Q-7.5,${-1.03 * L} 0,${-1.15 * L} Q7.5,${-1.03 * L} 6.5,${-.86 * L} Q10,${-.93 * L} 15.5,${-.99 * L} ` +
           `Q17.5,${-.8 * L} 10,${-.72 * L} Q5,${-.5 * L} 4,-6 Z`;
  }
  function grooves(L) {
    return `M0,${-.5 * L} L0,${-1.06 * L} M-8.5,${-.77 * L} Q-12,${-.85 * L} -13.5,${-.95 * L} M8.5,${-.77 * L} Q12,${-.85 * L} 13.5,${-.95 * L}`;
  }
  const ARMS = [[32, 0], [32, 90], [32, -90], [54, 180]];
  function cemSVG(name) {
    const [c, d] = CEM[name] || CEM.white;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 80 105">
      <g fill="${c}" stroke="${d}" stroke-width="1.5" stroke-linejoin="round">${ARMS.map(([L, r]) => `<path d="${arm(L)}" transform="rotate(${r})"/>`).join("")}</g>
      <g fill="none" stroke="${d}" stroke-width="1.2" stroke-linecap="round">${ARMS.map(([L, r]) => `<path d="${grooves(L)}" transform="rotate(${r})"/>`).join("")}</g>
      <circle r="8.2" fill="${c}" stroke="${d}" stroke-width="1.5"/><circle r="4.2" fill="none" stroke="${d}" stroke-width="1"/></svg>`;
  }
  const CEM_URI = {};
  CEM_NAMES.forEach(n => CEM_URI[n] = "data:image/svg+xml," + encodeURIComponent(cemSVG(n)));
  const CROSS_RATIO = 105 / 80, CROSS_CY = 40 / 105;   // height/width, center height fraction
  function bannerSVG(text) {
    return `<svg viewBox="0 0 420 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="#000" stroke="#fff" stroke-width="2.6" stroke-linejoin="round">
        <path d="M44,34 L4,30 L22,52 L4,74 L48,72 Z"/><path d="M376,34 L416,30 L398,52 L416,74 L372,72 Z"/>
        <path d="M44,34 L62,44 L62,78 L48,72 Z"/><path d="M376,34 L358,44 L358,78 L372,72 Z"/>
        <path d="M40,24 Q210,6 380,24 L380,70 Q210,52 40,70 Z"/></g>
      <path id="bnArc" d="M60,58 Q210,40 360,58" fill="none"/>
      <text font-family="UnifrakturCook, serif" font-weight="700" font-size="40" fill="#fff" text-anchor="middle">
        <textPath href="#bnArc" startOffset="50%">${text}</textPath></text></svg>`;
  }

  function paint(el, name) { el.src = CEM_URI[name] || CEM_URI.white; }

  async function cluster(swap, label) {
    const W = innerWidth, H = innerHeight;
    const root = layer("fx-cluster");
    const back = document.createElement("div");
    back.className = "fx-cluster-back";
    root.appendChild(back);
    const cw = W < 760 ? 120 : 190, ch = cw * CROSS_RATIO;
    const sx = cw * .72, sy = ch * .5;
    const cx = W / 2, cy = H / 2;
    const items = [];
    const rowsUp = Math.ceil(cy / sy) + 2, colsSide = Math.ceil(cx / sx) + 2;
    const frag = document.createDocumentFragment();
    for (let r = -rowsUp; r <= rowsUp; r++) {
      for (let c = -colsSide; c <= colsSide; c++) {
        const x = cx + c * sx + (Math.abs(r) % 2) * sx / 2, y = cy + r * sy;
        if (x < -cw * .6 || x > W + cw * .6 || y < -ch * .4 || y > H + ch * .7) continue;
        const d = Math.abs(x - cx) / sx + Math.abs(y - cy) / sy;      // diamond distance, like the print
        let color = CEM_NAMES[(Math.random() * CEM_NAMES.length) | 0];
        const im = document.createElement("img");
        im.className = "fx-cem";
        im.alt = "";
        im.style.cssText = `width:${cw}px;height:${ch}px;left:${x - cw / 2}px;top:${y - ch * CROSS_CY}px;z-index:${(Math.random() * 500) | 0}`;
        paint(im, color);
        items.push({ im, d, delay: d * 62, color, rot: rnd(-5, 5) });
        frag.appendChild(im);
      }
    }
    root.appendChild(frag);
    const banner = document.createElement("div");
    banner.className = "fx-banner";
    banner.innerHTML = bannerSVG("Dualcoded");
    root.appendChild(banner);

    back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: "ease-out", fill: "both" });
    // 1) numbers stamp in, growing out from the center as a diamond
    const ins = items.map(it => it.im.animate([
      { transform: `scale(0) rotate(${it.rot - 40}deg)`, opacity: 0 },
      { transform: `scale(1.18) rotate(${it.rot + 4}deg)`, opacity: 1, offset: .65 },
      { transform: `scale(1) rotate(${it.rot}deg)`, opacity: 1 }],
      { duration: 460, delay: it.delay, easing: "cubic-bezier(.2,.8,.25,1)", fill: "both" }));
    await Promise.all(ins.map(done));
    // 2) banner unfurls, color wave rolls through the wall
    banner.animate([{ transform: "translate(-50%,-50%) scaleX(0)", opacity: 0 },
                    { transform: "translate(-50%,-50%) scaleX(1.06)", opacity: 1, offset: .7 },
                    { transform: "translate(-50%,-50%) scaleX(1)", opacity: 1 }],
      { duration: 520, easing: "cubic-bezier(.2,.9,.25,1)", fill: "both" });
    items.forEach(it => setTimeout(() => {
      it.color = CEM_NAMES[(CEM_NAMES.indexOf(it.color) + 1) % CEM_NAMES.length];
      paint(it.im, it.color);
      it.im.animate([{ transform: `scale(1) rotate(${it.rot}deg)` }, { transform: `scale(1.1) rotate(${it.rot}deg)` }, { transform: `scale(1) rotate(${it.rot}deg)` }],
        { duration: 260, easing: "ease-out" });
    }, 120 + it.d * 32));
    await sleep(980);
    swap();
    await sleep(80);
    // 3) out: banner snaps away, numbers pop out center-first so the store opens from the middle
    banner.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1.3)", opacity: 0 }],
      { duration: 300, easing: "ease-in", fill: "forwards" });
    const outs = items.map(it => it.im.animate([
      { transform: `scale(1) rotate(${it.rot}deg)`, opacity: 1 },
      { transform: `scale(0) rotate(${it.rot + 50}deg)`, opacity: 0 }],
      { duration: 380, delay: 100 + it.d * 42, easing: "cubic-bezier(.6,0,.4,1)", fill: "forwards" }));
    back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 150, fill: "forwards" });
    await Promise.all(outs.map(done));
    root.remove();
  }

  // ================== shared: haze texture (night city) ==================
  // Fog textures: tileable fractal noise rendered once to a canvas, white with soft alpha.
  function fogTexture(seed, density, w = 512, h = 192) {
    let s = seed;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const octs = [[4, 2, .5], [8, 4, .26], [16, 8, .14], [32, 14, .08]];   // grid w, grid h, amplitude
    const grids = octs.map(([gx, gy]) => Float32Array.from({ length: gx * gy }, rand));
    const sm = t => t * t * (3 - 2 * t);
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), px = img.data;
    for (let y = 0; y < h; y++) {
      const fall = Math.sin(Math.PI * y / h);                          // fade out at top and bottom
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (let k = 0; k < octs.length; k++) {
          const [gx, gy, amp] = octs[k], g = grids[k];
          const fx = x / w * gx, fy = y / h * gy, x0 = Math.floor(fx), y0 = Math.floor(fy);
          const tx = sm(fx - x0), ty = sm(fy - y0);
          const at = (i, j) => g[(j % gy) * gx + (i % gx)];              // wraps in x, so it tiles sideways
          const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
          const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
          v += amp * (a + (b - a) * ty);
        }
        const al = Math.max(0, Math.min(1, (v - (1 - density)) / .42)) * fall;
        const i = (y * w + x) * 4;
        px[i] = 255; px[i + 1] = 252; px[i + 2] = 248; px[i + 3] = al * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL("image/png");
  }
  let FOG = null;
  const makeFog = () => FOG || (FOG = { mid: fogTexture(29, .5) });
  // build the textures when the browser is idle so the first transition doesn't pause
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(() => makeFog());

  // ================== 732 · NIGHT CITY ==================
  // Moody aerial night skyline (real photo), slow drone drift, haze. The red "dualcoded" box slams in,
  // then the camera dives into the box until the screen is solid red, and the red lifts off to the store.
  // Photo: Midtown Manhattan at night with the Empire State Building and One Vanderbilt ("city with high rise
  // buildings during night time"), free under the Unsplash License (https://unsplash.com/photos/IBnLN2anGkg).
  const CITY_URL = "https://images.unsplash.com/photo-1607606823587-85c1bbd76c8c?auto=format&fit=crop&q=78&w=" +
    (innerWidth < 760 ? 1100 : 2200);
  const cityImg = new Image();
  cityImg.referrerPolicy = "no-referrer";
  cityImg.alt = "";
  cityImg.src = CITY_URL;
  cityImg.decode?.().catch(() => {});

  async function nightcity(swap) {
    const W = innerWidth, H = innerHeight;
    const fog = makeFog();
    const usePhoto = cityImg.complete && cityImg.naturalWidth > 0;
    const root = layer("fx-city");
    root.innerHTML = `<div class="nc-scene">${usePhoto ? "" : '<div class="nc-fallback"></div>'}</div>
      <div class="nc-haze" style="background-image:url(${fog.mid});background-size:${W * 1.2}px 100%"></div>
      <div class="nc-grade"></div>
      <div class="nc-glow"></div>
      <div class="fb-box nc-box"><span>dualcoded</span></div>
      <div class="nc-red"></div>`;
    const $ = s => root.querySelector(s);
    const scene = $(".nc-scene"), haze = $(".nc-haze"), glow = $(".nc-glow"), box = $(".nc-box"), red = $(".nc-red");
    if (usePhoto) scene.prepend(cityImg);
    // how far the box has to grow to cover the screen (measured up front, untransformed size)
    const k = Math.max(W / box.offsetWidth, H / box.offsetHeight) * 1.25;

    // 1) up from black: slow drone drift down and in over the skyline, haze sliding across
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "ease-out", fill: "both" });
    const drift = scene.animate([{ transform: "translate3d(1.5%,-2%,0) scale(1.14)" }, { transform: "translate3d(0,0,0) scale(1.04)" }],
      { duration: 2300, easing: "cubic-bezier(.25,.6,.35,1)", fill: "both" });
    haze.animate([{ transform: "translate3d(-4%,0,0)" }, { transform: "translate3d(-22%,0,0)" }], { duration: 3000, easing: "linear", fill: "both" });
    await sleep(620);
    // 2) the box slams in with a red light spill on the city, then the word wipes across it
    box.animate([{ transform: "translate(-50%,-50%) scale(1.9)", opacity: 0 },
                 { transform: "translate(-50%,-50%) scale(.94)", opacity: 1, offset: .6 },
                 { transform: "translate(-50%,-50%) scale(1.02)", offset: .8 },
                 { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }],
      { duration: 460, easing: "cubic-bezier(.3,.7,.3,1)", fill: "both" });
    glow.animate([{ opacity: 0 }, { opacity: 1, offset: .35 }, { opacity: .75 }], { duration: 900, easing: "ease-out", fill: "both" });
    box.firstChild.animate([{ clipPath: "inset(-20% 105% -20% -10%)" }, { clipPath: "inset(-20% -15% -20% -10%)" }],
      { duration: 380, delay: 160, easing: "cubic-bezier(.6,0,.2,1)", fill: "both" });
    await sleep(1260);
    // 3) the dive: the city rushes toward the camera while the box grows past the screen edges
    drift.pause();
    scene.animate([{ transform: "translate3d(0,0,0) scale(1.04)" }, { transform: "translate3d(0,0,0) scale(1.5)" }],
      { duration: 620, easing: "cubic-bezier(.6,0,.9,.4)", fill: "both" });
    box.firstChild.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-in", fill: "both" });
    await done(box.animate([{ transform: "translate(-50%,-50%) scale(1)" }, { transform: `translate(-50%,-50%) scale(${k})` }],
      { duration: 620, easing: "cubic-bezier(.65,0,.85,.35)", fill: "both" }));
    // screen is solid red: swap in the store underneath and drop everything but the red panel
    red.style.opacity = 1;
    [scene, haze, glow, box, $(".nc-grade")].forEach(el => el.remove());
    root.style.background = "transparent";
    swap();
    await sleep(90);
    // 4) the red lifts off the top, its lower edge darkening like a shutter
    await done(red.animate([{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,-104%,0)" }],
      { duration: 640, easing: "cubic-bezier(.7,0,.2,1)", fill: "both" }));
    root.remove();
  }

  // ================== 732 · BATS (dark, Opium-style mood) ==================
  // A swarm of bats pours in from the edges while the screen sinks into a deep red-black haze, a wide
  // spaced-out DUALCODED wordmark strobes on in a soft glow with a thin swoosh ring, then the bats
  // burst outward toward the viewer and the store opens up behind them.
  // Bats: real wing structure (arm + finger bones, scalloped membrane), shaded body; far bats are
  // smaller, softer and hazier, near bats sharp and black. Pre-rendered flap frames keep it at 60 fps.
  function drawBat(ctx, f, tone) {
    // unit bat at the origin, wingspan ~2; f = flap, -1 (down) .. 1 (up)
    const P = (x, y) => [x, y];
    for (const m of [1, -1]) {
      const S = P(m * .07, -.06), E = P(m * .3, -.17 - .26 * f), Wr = P(m * .5, -.22 - .42 * f);
      const T1 = P(m * 1.0, -.34 - .55 * f), T2 = P(m * .93, .02 - .32 * f), T3 = P(m * .72, .24 - .16 * f);
      const T4 = P(m * .44, .3 - .05 * f), Hp = P(m * .09, .2);
      // concave scallop between two finger tips: control point pulled in toward the wrist
      const sc = (a, b, k) => [(a[0] + b[0]) / 2 * (1 - k) + Wr[0] * k, (a[1] + b[1]) / 2 * (1 - k) + Wr[1] * k];
      ctx.beginPath();
      ctx.moveTo(...S);
      ctx.quadraticCurveTo(...E, ...Wr);
      ctx.quadraticCurveTo(m * .78, -.36 - .52 * f, ...T1);
      ctx.quadraticCurveTo(...sc(T1, T2, .28), ...T2);
      ctx.quadraticCurveTo(...sc(T2, T3, .3), ...T3);
      ctx.quadraticCurveTo(...sc(T3, T4, .26), ...T4);
      ctx.quadraticCurveTo(m * .26, .16, ...Hp);
      ctx.closePath();
      ctx.fillStyle = tone.wing;
      ctx.fill();
      // arm and finger bones
      ctx.beginPath();
      ctx.moveTo(...S); ctx.quadraticCurveTo(...E, ...Wr);
      for (const T of [T1, T2, T3]) { ctx.moveTo(...Wr); ctx.lineTo(...T); }
      ctx.strokeStyle = tone.bone; ctx.lineWidth = .028; ctx.lineCap = "round";
      ctx.stroke();
    }
    // body, head, ears
    ctx.fillStyle = tone.body;
    ctx.beginPath();
    ctx.ellipse(0, .04, .085, .17, 0, 0, Math.PI * 2);
    ctx.moveTo(.07, -.12); ctx.arc(0, -.12, .07, 0, Math.PI * 2);
    ctx.moveTo(-.035, -.16); ctx.lineTo(-.065, -.27); ctx.lineTo(-.008, -.175);
    ctx.moveTo(.035, -.16); ctx.lineTo(.065, -.27); ctx.lineTo(.008, -.175);
    ctx.fill();
  }

  const BAT_FRAMES = 16, BAT_BASE = 56;
  // bones darker than the membrane (no "skeleton" look); a faint dark-red rim glow is baked in so
  // silhouettes still read against the red-black haze
  const BAT_TONES = {
    near: { wing: "#0c0809", bone: "#030202", body: "#030202", blur: 0, rim: "rgba(170,45,55,.55)" },
    far: { wing: "#1d0d10", bone: "#140709", body: "#150709", blur: 1.2, rim: "rgba(120,30,40,.35)" },
  };
  let batSprites = null;
  function getBatSprites() {
    if (batSprites) return batSprites;
    const w = Math.ceil(BAT_BASE * 2.4), h = Math.ceil(BAT_BASE * 2);
    const make = (tone, res) => Array.from({ length: BAT_FRAMES }, (_, i) => {
      const c = document.createElement("canvas");
      c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
      const x = c.getContext("2d");
      x.scale(res, res);
      x.filter = tone.blur ? `blur(${tone.blur}px)` : "none";
      x.shadowColor = tone.rim; x.shadowBlur = 5 * res;
      x.translate(w / 2, h / 2); x.scale(BAT_BASE, BAT_BASE);
      drawBat(x, -1 + 2 * i / (BAT_FRAMES - 1), tone);
      return c;
    });
    // two sizes of every frame: small bats use the small set, so nothing big gets shrunk every frame
    batSprites = {
      near: make(BAT_TONES.near, 2), nearSm: make(BAT_TONES.near, .6),
      far: make(BAT_TONES.far, 1), farSm: make(BAT_TONES.far, .5), w, h,
    };
    return batSprites;
  }
  let grainURL = null;
  function getGrain() {
    if (grainURL) return grainURL;
    const c = document.createElement("canvas"); c.width = c.height = 180;
    const x = c.getContext("2d"), img = x.createImageData(180, 180);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 14;
    }
    x.putImageData(img, 0, 0);
    return (grainURL = c.toDataURL());
  }
  (window.requestIdleCallback || (f => setTimeout(f, 1600)))(() => { getBatSprites(); getGrain(); });

  async function bats(swap) {
    const sprites = getBatSprites();
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    const root = layer("fx-bats");
    root.innerHTML = `<div class="bt-bg"></div><div class="bt-glow"></div><canvas></canvas>
      <div class="bt-mark"><svg viewBox="0 0 600 140" aria-hidden="true"><ellipse class="bt-ring" cx="300" cy="72" rx="290" ry="46" transform="rotate(-6 300 72)" pathLength="1"/></svg><span>DUALCODED</span></div>
      <div class="bt-grain" style="background-image:url(${getGrain()})"></div>`;
    const bg = root.querySelector(".bt-bg"), glow = root.querySelector(".bt-glow"), grain = root.querySelector(".bt-grain");
    const mark = root.querySelector(".bt-mark"), ring = root.querySelector(".bt-ring");
    const cv = root.querySelector("canvas");
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingQuality = "high";

    // swarm: each bat enters from an edge heading across the screen; drawn far-to-near
    const N = W < 760 ? 90 : 170, cx = W / 2, cy = H / 2;
    const swarm = Array.from({ length: N }, () => {
      const side = Math.random() * 4 | 0, depth = Math.random();
      const x = side === 0 ? -90 : side === 1 ? W + 90 : rnd(-40, W + 40);
      const y = side === 2 ? -90 : side === 3 ? H + 90 : rnd(-40, H + 40);
      const tx = rnd(W * .05, W * .95), ty = rnd(H * .05, H * .95);
      const sp = rnd(.55, 1.05) * (W < 760 ? .7 : 1) * (.6 + depth * .6);  // far bats drift slower
      const d = Math.hypot(tx - x, ty - y) || 1;
      return { x, y, vx: (tx - x) / d * sp, vy: (ty - y) / d * sp, s: 12 + depth * depth * 56, far: depth < .45,
               ph: rnd(0, 6.28), fs: rnd(.018, .03), delay: rnd(0, 420), wob: rnd(0, 6.28) };
    }).sort((a, b) => a.s - b.s);

    let phase = "in", t0 = performance.now(), last = t0, live = true;
    const frame = now => {
      if (!live) return;
      const dt = Math.min(40, now - last); last = now;
      const el = now - t0;
      ctx.clearRect(0, 0, W, H);
      for (const b of swarm) {
        if (phase === "in" && el < b.delay) continue;
        if (phase === "out") {                                   // burst outward, toward the viewer
          const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy) || 1;
          b.vx += dx / d * .09 * dt / 16; b.vy += dy / d * .09 * dt / 16;
          b.s *= 1 + .022 * dt / 16;
        } else {
          b.wob += .05 * dt / 16;
          b.vx += Math.cos(b.wob) * .006 * dt / 16; b.vy += Math.sin(b.wob * 1.3) * .006 * dt / 16;
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.ph += b.fs * dt;
        const far = b.far && phase !== "out", small = b.s < 30;
        const set = far ? (small ? sprites.farSm : sprites.far) : (small ? sprites.nearSm : sprites.near);
        const spr = set[Math.round((Math.sin(b.ph) + 1) / 2 * (BAT_FRAMES - 1))];
        const k = b.s / BAT_BASE, w = sprites.w * k, h = sprites.h * k;
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) * .22);
        ctx.drawImage(spr, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // 1) swarm pours in; the screen sinks into red-black haze behind it
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, delay: 260, easing: "ease-in", fill: "both" });
    grain.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 500, fill: "both" });
    await sleep(900);
    // 2) glow swells, wordmark strobes on, swoosh ring draws around it
    glow.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.7)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)" }],
      { duration: 1400, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" });
    // smooth reveal: fades up out of a soft blur and settles into focus (no flicker)
    mark.animate([{ opacity: 0, filter: "blur(14px)", transform: "translate(-50%,-50%) scale(1.08)" },
                  { opacity: 1, filter: "blur(0px)", transform: "translate(-50%,-50%) scale(1)" }],
      { duration: 850, easing: "cubic-bezier(.22,.8,.3,1)", fill: "both" });
    ring.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 800, delay: 180, easing: "cubic-bezier(.5,0,.2,1)", fill: "both" });
    await sleep(1150);
    swap();
    await sleep(60);
    // 3) out: wordmark cuts, bats burst toward the viewer, the haze lifts
    mark.animate([{ opacity: 1, transform: "translate(-50%,-50%) scale(1)" }, { opacity: 0, transform: "translate(-50%,-50%) scale(1.04)" }],
      { duration: 260, easing: "ease-in", fill: "forwards" });
    glow.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" });
    grain.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: 120, fill: "forwards" });
    phase = "out";
    await done(bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, delay: 160, easing: "ease-out", fill: "forwards" }));
    await sleep(380);
    live = false;
    root.remove();
  }

  // ================== 732 · WORLD TOUR (tour-tee back print) ==================
  // An off-white cotton tee fills the screen; "dualcoded" is written on in marker letter by letter with
  // a swash underline, a two-column city list stamps in like a tour-tee back print, then the whole
  // shirt flips over in 3D to reveal the store. All ink carries a worn screen-print texture (mask).
  const TOUR_CITIES = [["Holmdel", "732"], ["Brockton", "508"], ["New York"], ["Boston"], ["Tokyo"],
                       ["London"], ["Paris"], ["Los Angeles"], ["Osaka"], ["Milan"]];
  let tourTex = null;
  function getTourTextures() {
    if (tourTex) return tourTex;
    // cotton: fine horizontal + vertical threads and fiber speckle, tiled over the base color
    const f = document.createElement("canvas"); f.width = f.height = 256;
    const fx = f.getContext("2d");
    // threads in short broken runs with varying strength (a continuous grid reads as graph paper)
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256;) {
        const run = 6 + Math.random() * 40;
        fx.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "80,68,55"},${(Math.random() * .028).toFixed(3)})`;
        fx.fillRect(x, y, run, 1); x += run;
      }
    }
    for (let x = 0; x < 256; x++) {
      for (let y = 0; y < 256;) {
        const run = 6 + Math.random() * 40;
        fx.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "80,68,55"},${(Math.random() * .022).toFixed(3)})`;
        fx.fillRect(x, y, 1, run); y += run;
      }
    }
    for (let i = 0; i < 3200; i++) { fx.fillStyle = `rgba(60,50,40,${(Math.random() * .06).toFixed(3)})`; fx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() < .2 ? 2 : 1, 1); }
    // worn ink: opaque everywhere except speckled holes, a few blotches and hairline cracks
    const m = document.createElement("canvas"); m.width = m.height = 420;
    const mx = m.getContext("2d");
    mx.fillStyle = "#000"; mx.fillRect(0, 0, 420, 420);
    mx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 5200; i++) {
      mx.fillStyle = `rgba(0,0,0,${(.25 + Math.random() * .75).toFixed(2)})`;
      const r = Math.random() < .93 ? .5 + Math.random() * .7 : 1.2 + Math.random() * 1.6;
      mx.beginPath(); mx.arc(Math.random() * 420, Math.random() * 420, r, 0, Math.PI * 2); mx.fill();
    }
    for (let i = 0; i < 26; i++) {                                   // blotches: clusters of tiny holes
      const bx = Math.random() * 420, by = Math.random() * 420, br = 6 + Math.random() * 16;
      for (let j = 0; j < 70; j++) {
        const a = Math.random() * 6.28, d = Math.random() * br;
        mx.fillStyle = `rgba(0,0,0,${(.3 + Math.random() * .6).toFixed(2)})`;
        mx.fillRect(bx + Math.cos(a) * d, by + Math.sin(a) * d, 1.4, 1.4);
      }
    }
    mx.lineWidth = .7; mx.strokeStyle = "rgba(0,0,0,.85)";
    for (let i = 0; i < 34; i++) {                                   // hairline cracks: short random walks
      let x = Math.random() * 420, y = Math.random() * 420, a = Math.random() * 6.28;
      mx.beginPath(); mx.moveTo(x, y);
      for (let j = 0; j < 9; j++) { a += (Math.random() - .5) * 1.1; x += Math.cos(a) * 5; y += Math.sin(a) * 5; mx.lineTo(x, y); }
      mx.stroke();
    }
    return (tourTex = { fabric: f.toDataURL(), wear: m.toDataURL() });
  }
  (window.requestIdleCallback || (f => setTimeout(f, 1800)))(() => getTourTextures());

  async function tour(swap) {
    const tex = getTourTextures();
    const root = layer("fx-tour");
    const letters = [..."dualcoded"].map(c => `<span>${c}</span>`).join("");
    const rows = TOUR_CITIES.map(([city, code], i) =>
      `<div class="tr-row${code ? " home" : ""}" style="--i:${i}"><b>${city}</b>${code ? `<i>${code}</i>` : ""}</div>`).join("");
    root.innerHTML = `<div class="tr-sheet">
        <div class="tr-fabric" style="background-image:url(${tex.fabric})"></div>
        <div class="tr-print" style="-webkit-mask-image:url(${tex.wear});mask-image:url(${tex.wear})">
          <div class="tr-scrawl">${letters}</div>
          <svg class="tr-swash" viewBox="0 0 600 60" aria-hidden="true"><path d="M14,40 C110,16 230,52 352,30 S520,10 586,24" pathLength="1"/></svg>
          <div class="tr-sub">World Tour</div>
          <div class="tr-cities">${rows}</div>
          <div class="tr-foot">We buy and sell clothes</div>
        </div>
        <div class="tr-shade"></div>
      </div>`;
    const $ = s => root.querySelector(s);
    const sheet = $(".tr-sheet"), shade = $(".tr-shade");

    // Every reveal is scheduled up front (fill:"both" hides the print from the very first frame),
    // so nothing is visible while the shirt slides in and each piece appears exactly once.
    const B = 520; // print starts writing as the shirt settles
    // 1) the shirt slides up into view, settling with a slight tilt correction
    const slide = sheet.animate([{ transform: "translate3d(0,100%,0) rotate(2deg)" }, { transform: "translate3d(0,-1.5%,0) rotate(-.4deg)", offset: .75 },
                              { transform: "translate3d(0,0,0) rotate(0)" }], { duration: 560, easing: "cubic-bezier(.2,.8,.25,1)", fill: "both" });
    // 2) "dualcoded" written on in marker, letter by letter (clip reveal, slack on the right for the slant)
    root.querySelectorAll(".tr-scrawl span").forEach((s, i) => s.animate(
      [{ clipPath: "inset(-30% 100% -30% -10%)", transform: "translateY(2px)" }, { clipPath: "inset(-30% -30% -30% -10%)", transform: "translateY(0)" }],
      { duration: 150, delay: B + i * 62, easing: "cubic-bezier(.4,0,.3,1)", fill: "both" }));
    $(".tr-swash path").animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 380, delay: B + 9 * 62 + 40, easing: "cubic-bezier(.6,0,.2,1)", fill: "both" });
    $(".tr-sub").animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 480, delay: B + 520, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" });
    // 3) city rows stamp in like a back print
    root.querySelectorAll(".tr-row").forEach((r, i) => r.animate(
      [{ opacity: 0, transform: "perspective(500px) rotateX(-70deg) translateY(-6px)" }, { opacity: 1, transform: "perspective(500px) rotateX(0) translateY(0)" }],
      { duration: 380, delay: B + 760 + i * 55, easing: "cubic-bezier(.2,.8,.25,1)", fill: "both" }));
    $(".tr-foot").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: B + 1400, fill: "both" });
    await done(slide);
    await sleep(B + 2050 - 560);
    swap();
    await sleep(60);
    // 4) the shirt flips over (hinged at the left edge) with shading, revealing the store
    shade.animate([{ opacity: 0 }, { opacity: .55 }], { duration: 640, easing: "ease-in", fill: "forwards" });
    await done(sheet.animate([{ transform: "rotateY(0deg) scale(1)" }, { transform: "rotateY(-95deg) scale(.96)" }],
      { duration: 680, easing: "cubic-bezier(.55,0,.75,.35)", fill: "forwards" }));
    root.remove();
  }

  // ================== 508 · CLOTHES PILE ==================
  const PALETTE = ["#2d3a52", "#2b2a28", "#5b5a3a", "#9c4a2a", "#c79a3a", "#e6dcc4", "#4b6688", "#6f8db0", "#6e2430",
                   "#2f4a3a", "#8f8c86", "#a9783d", "#3f5b45", "#b8b1a2", "#7a3b2e", "#d8c9a3"];
  const SEAM = 'stroke="rgba(0,0,0,.28)" stroke-width="1.2" fill="none" stroke-linecap="round"';
  const GARMENTS = {
    tee: (c, d) => `<path d="M30 8 Q50 18 70 8 L96 22 L86 42 L76 37 L76 96 L24 96 L24 37 L14 42 L4 22 Z" fill="${c}"/>
      <path d="M38 9 Q50 22 62 9" ${SEAM}/><path d="M24 37 L24 30 M76 37 L76 30" ${SEAM}/>${d}`,
    hoodie: (c, d) => `<path d="M33 10 Q50 0 67 10 L94 24 L98 84 L84 86 L78 44 L78 96 L22 96 L22 44 L16 86 L2 84 L6 24 Z" fill="${c}"/>
      <path d="M36 12 Q50 32 64 12" ${SEAM}/><path d="M34 70 L66 70 L62 84 L38 84 Z" ${SEAM}/><path d="M46 22 L45 40 M54 22 L55 40" stroke="#ddd" stroke-width="1.4"/>${d}`,
    jeans: (c, d) => `<path d="M22 4 L78 4 L84 98 L58 98 L50 34 L42 98 L16 98 Z" fill="${c}"/>
      <path d="M22 12 L78 12" ${SEAM}/><path d="M50 12 L50 34" ${SEAM}/><path d="M28 14 Q34 26 44 22 M72 14 Q66 26 56 22" ${SEAM}/>
      <path d="M22 90 L42 90 M58 90 L84 90" stroke="rgba(255,255,255,.18)" stroke-width="2"/>`,
    jacket: (c, d) => `<path d="M30 8 L42 4 L50 14 L58 4 L70 8 L96 24 L94 88 L80 88 L78 46 L78 96 L22 96 L22 46 L20 88 L6 88 L4 24 Z" fill="${c}"/>
      <path d="M42 4 L46 22 L50 14 L54 22 L58 4" fill="#5a3a22"/><path d="M50 16 L50 96" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/>
      <rect x="28" y="58" width="14" height="14" ${SEAM}/><rect x="58" y="58" width="14" height="14" ${SEAM}/>${d}`,
    longsleeve: (c, d) => `<path d="M32 8 Q50 18 68 8 L92 20 L98 90 L86 92 L78 40 L78 96 L22 96 L22 40 L14 92 L2 90 L8 20 Z" fill="${c}"/>
      <path d="M40 9 Q50 20 60 9" ${SEAM}/>${d}`,
    shorts: (c, d) => `<path d="M18 20 L82 20 L90 82 L58 82 L50 50 L42 82 L10 82 Z" fill="${c}"/><path d="M18 28 L82 28" ${SEAM}/>`,
  };
  const KINDS = ["tee", "tee", "hoodie", "jeans", "jacket", "longsleeve", "tee", "hoodie", "shorts", "jeans"];
  function decor(kind) {
    const r = Math.random();
    if (kind === "jeans" || kind === "shorts") return "";
    if (r < .22) return `<g opacity=".55">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M24 ${44 + i * 9} L76 ${44 + i * 9}" stroke="${PALETTE[(Math.random() * PALETTE.length) | 0]}" stroke-width="3.5"/>`).join("")}</g>`; // stripes
    if (r < .42) return `<rect x="38" y="40" width="24" height="18" rx="2" fill="${PALETTE[(Math.random() * PALETTE.length) | 0]}" opacity=".9"/><path d="M41 45 L59 45 M41 50 L55 50" stroke="rgba(255,255,255,.5)" stroke-width="1.6"/>`; // graphic
    if (r < .52) return `<circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.4"/>`;
    return "";
  }
  function garment() {
    const kind = KINDS[(Math.random() * KINDS.length) | 0];
    const c = PALETTE[(Math.random() * PALETTE.length) | 0];
    const body = GARMENTS[kind](kind === "jeans" ? ["#3e5878", "#5f7fa6", "#2e3f57", "#7d98ba", "#2b2a28"][(Math.random() * 5) | 0] : c, decor(kind));
    return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g style="filter:drop-shadow(0 2px 1.5px rgba(0,0,0,.45))">${body}</g></svg>`);
  }

  async function pile(swap, label) {
    const W = innerWidth, H = innerHeight;
    const root = layer("fx-pile");
    const floor = document.createElement("div");
    floor.className = "fx-pile-floor";
    root.appendChild(floor);
    const s = Math.max(W, H) * (W < 760 ? .3 : .24);
    const pieces = [];
    let r = 0;
    for (let y = H - s * .32; y > -s * .55; y -= s * .42, r++) {
      for (let x = -s * .35 + (r % 2) * s * .25; x < W + s * .1; x += s * .5) {
        const el = document.createElement("i");
        el.className = "fx-garment";
        const sz = s * rnd(.9, 1.2);
        el.style.cssText = `width:${sz}px;height:${sz}px;left:${x + rnd(-s * .12, s * .12) - sz / 2 + s * .25}px;top:${y + rnd(-s * .1, s * .1) - sz / 2}px;background-image:${garment()};z-index:${r * 100 + ((Math.random() * 90) | 0)}`;
        pieces.push({ el, r, rot: rnd(-40, 40), drop: H + sz });
        root.appendChild(el);
      }
    }
    const rows = r;
    const tag = document.createElement("div");
    tag.className = "fx-tag";
    tag.innerHTML = `<span>${label || "Vintage / Y2K"}</span><b>508</b>`;
    root.appendChild(tag);

    floor.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
      { duration: 380 + rows * 150, delay: 120, easing: "cubic-bezier(.3,0,.3,1)", fill: "both" });
    // 1) fall in, bottom rows first; each piece lands, squashes a little, settles
    const ins = pieces.map(p => {
      const startY = -(p.el.offsetTop + s * 1.4) - rnd(0, H * .25);
      const spin = p.rot + rnd(-160, 160);
      return p.el.animate([
        { transform: `translateY(${startY}px) rotate(${spin}deg)` },
        { transform: `translateY(6px) rotate(${p.rot}deg) scaleY(.92)`, offset: .78, easing: "ease-out" },
        { transform: `translateY(-4px) rotate(${p.rot}deg) scaleY(1.02)`, offset: .9 },
        { transform: `translateY(0) rotate(${p.rot}deg)` }],
        { duration: rnd(560, 760), delay: p.r * 135 + rnd(0, 170), easing: "cubic-bezier(.55,0,.85,.4)", fill: "both" });
    });
    await Promise.all(ins.map(done));
    tag.animate([{ transform: "translate(-50%,-50%) rotate(-14deg) scale(1.6)", opacity: 0 },
                 { transform: "translate(-50%,-50%) rotate(-5deg) scale(.96)", opacity: 1, offset: .7 },
                 { transform: "translate(-50%,-50%) rotate(-6deg) scale(1)", opacity: 1 }],
      { duration: 380, easing: "cubic-bezier(.2,.9,.3,1)", fill: "both" });
    await sleep(520);
    swap();
    await sleep(80);
    // 2) the pile gives way: top rows tumble first, everything drops off the bottom
    tag.animate([{ opacity: 1 }, { opacity: 0, transform: "translate(-50%,60%) rotate(8deg)" }], { duration: 300, fill: "forwards" });
    const outs = pieces.map(p => p.el.animate([
      { transform: `translateY(0) rotate(${p.rot}deg)` },
      { transform: `translateY(${p.drop + rnd(0, 200)}px) rotate(${p.rot + rnd(-120, 120)}deg)` }],
      { duration: rnd(620, 820), delay: (rows - p.r) * 55 + rnd(0, 120), easing: "cubic-bezier(.6,0,.9,.6)", fill: "forwards" }));
    floor.animate([{ transform: "translateY(0)" }, { transform: "translateY(100%)" }],
      { duration: 600, delay: 260, easing: "cubic-bezier(.6,0,.9,.6)", fill: "forwards" });
    await Promise.all(outs.map(done));
    root.remove();
  }

  // ================== NEUTRAL ==================
  async function wipe(swap, label) {
    const root = layer("fx-wipe");
    root.innerHTML = `<span>${label || ""}</span>`;
    const a = root.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 520, easing: "cubic-bezier(.7,0,.2,1)", fill: "both" });
    root.firstChild.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 220, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" });
    await done(a); await sleep(260);
    swap(); await sleep(60);
    await done(root.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(100% 0 0 0)" }], { duration: 560, easing: "cubic-bezier(.7,0,.2,1)", fill: "both" }));
    root.remove();
  }

  // each big transition plays once per visit; after that, switching is a quick dip so browsing stays fast
  const SEEN_KEY = "dc_fx_seen_v1";
  const seen = (() => { try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); } catch (e) { return new Set(); } })();
  const markSeen = k => { seen.add(k); try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch (e) {} };
  async function quick(swap) {
    const root = layer("fx-quick");
    const ease = "cubic-bezier(0.23, 1, 0.32, 1)";
    await done(root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 130, easing: ease, fill: "both" }));
    swap();
    await done(root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: ease, fill: "both" }));
    root.remove();
  }

  let running = false;
  async function run(kind, swap, label) {
    if (REDUCE) { swap(); return; }
    if (running) { swap(); return; }
    running = true;
    // 732 picks one of its transitions at random each time
    const pool = [cluster, nightcity, bats, tour];
    const fx732 = pool[(Math.random() * pool.length) | 0];
    const key = kind === "732" || kind === "508" ? kind : "wipe";
    const full = !seen.has(key);
    if (full) markSeen(key);
    try { await (!full ? quick : kind === "732" ? fx732 : kind === "508" ? pile : wipe)(swap, label); }
    catch (e) { console.error(e); swap(); document.querySelectorAll(".fx").forEach(n => n.remove()); }
    finally { running = false; }
  }

  window.DCFX = { run, _nightcity: nightcity, _bats: bats, _tour: tour, cemURI: n => CEM_URI[n] || CEM_URI.white, CEM, CEM_NAMES, CROSS_RATIO };
})();
