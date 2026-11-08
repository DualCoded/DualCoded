// dualcoded.supply storefront: map landing -> 732 / 508 / all -> item view.
(function () {
  const C = window.DC_CONFIG, SIDES = C.SIDES;
  const $ = s => document.querySelector(s);
  const IG_URL = `https://www.instagram.com/${C.INSTAGRAM}/`;
  const DM_URL = `https://ig.me/m/${C.INSTAGRAM}`;
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let ITEMS = [];
  let view = "map";
  let modalOpen = false, modalPushed = false, busy = false;
  const st = { side: "all", cat: "All", size: "", q: "", sort: "new", brand: "" };
  let map = null;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => { const v = Number(n); return v ? "$" + (v % 1 ? v.toFixed(2) : v) : ""; };
  const avail = side => ITEMS.filter(i => i.status !== "sold" && (side === "all" || i.side === side));
  const isNew = i => i.created_at && (Date.now() - Date.parse(i.created_at)) < 7 * 864e5;
  // small diamond of colored "732"s for the 732 hero (rows of 1-2-3-2-1, overlapping like a print)
  function clusterHTML() {
    const rows = [1, 2, 3, 2, 1], w = 96, sx = w * .76, sy = w * DCFX.CROSS_RATIO * .5, out = [];
    let k = 0;
    rows.forEach((n, r) => {
      for (let c = 0; c < n; c++) {
        const x = 170 + (c - (n - 1) / 2) * sx - w / 2, y = 20 + r * sy;
        const color = DCFX.CEM_NAMES[(r * 3 + c * 2 + 1) % DCFX.CEM_NAMES.length];
        // wrapper takes the scroll drift (data-dx/dy = direction away from the diamond's center), the img keeps its stamp-in
        out.push(`<i class="hc" data-dx="${(x + w / 2 - 170).toFixed(1)}" data-dy="${(y + w * .6 - 210).toFixed(1)}" style="left:${x}px;top:${y}px;z-index:${(k * 7) % 9}">` +
          `<img src="${DCFX.cemURI(color)}" alt="" style="animation-delay:${.08 + (Math.abs(r - 2) + Math.abs(c - (n - 1) / 2)) * .09}s"></i>`);
        k++;
      }
    });
    return `<div class="hero-cluster" aria-hidden="true">${out.join("")}</div>`;
  }
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };

  for (const id of ["landIg", "headIg", "footIg"]) $("#" + id).href = IG_URL;
  $("#footDepop").href = C.DEPOP_SHOP;

  function theme(t) { document.body.dataset.theme = t; }

  // ======================= MAP =======================
  function buildMap() {
    const svg = d3.select("#map");
    const world = svg.append("g").attr("transform", "translate(0,0) scale(1)");
    const gWater = world.append("rect").attr("class", "water");
    const gStates = world.append("g");
    const gNames = world.append("g");
    const gCities = world.append("g");
    const gRoute = world.append("g");
    const gMarkers = world.append("g");

    const bbox = { type: "MultiPoint", coordinates: [[-76.4, 39.1], [-69.7, 43.5]] };
    const CITIES = [
      { n: "Boston", lat: 42.3601, lon: -71.0589, dx: -7, anchor: "end" },
      { n: "Providence", lat: 41.824, lon: -71.4128, dx: -7, anchor: "end" },
      { n: "Hartford", lat: 41.7658, lon: -72.6734, dx: 7, anchor: "start" },
      { n: "New York", lat: 40.7128, lon: -74.006, dx: 7, anchor: "start" },
    ];
    const NAMES = { "34": "New Jersey", "36": "New York", "42": "Pennsylvania", "09": "Conn.", "25": "Massachusetts", "50": "Vermont", "33": "N.H." };
    const miles = Math.round(d3.geoDistance([SIDES["732"].lon, SIDES["732"].lat], [SIDES["508"].lon, SIDES["508"].lat]) * 3959);
    let proj, path, W, H, mobile, states = null, hovered = null;

    function layout() {
      W = innerWidth; H = innerHeight; mobile = W < 760;
      svg.attr("viewBox", `0 0 ${W} ${H}`);
      const ext = mobile ? [[14, 200], [W - 14, H - 170]] : [[W * 0.3, 80], [W - 60, H - 70]];
      proj = d3.geoMercator().fitExtent(ext, mobile ? { type: "MultiPoint", coordinates: [[-75.1, 39.6], [-69.8, 42.9]] } : bbox);
      path = d3.geoPath(proj);
      render();
      justIn(null);
    }

    function render() {
      gWater.attr("x", -W * 10).attr("y", -H * 10).attr("width", W * 21).attr("height", H * 21);
      if (states) {
        gStates.selectAll("path").data(states, d => d.id).join("path")
          .attr("class", d => "state" + (d.id === "25" || d.id === "34" ? " home" : "")).attr("d", path);
        gNames.selectAll("text").data(states.filter(d => NAMES[d.id] && !(mobile && d.id !== "34" && d.id !== "25")), d => d.id)
          .join("text").attr("class", "state-name").text(d => NAMES[d.id])
          .attr("transform", d => {
            const c = d.id === "36" ? proj([-75.2, 42.3]) : d.id === "34" ? proj([-74.65, 39.75]) : d.id === "25" ? proj([-72.2, 42.47]) : path.centroid(d);
            return `translate(${c})`;
          });
      }
      gCities.selectAll("g").data(CITIES).join(enter => {
        const g = enter.append("g").attr("class", "city");
        g.append("circle").attr("r", 1.8); g.append("text").attr("dy", 3.5); return g;
      }).attr("transform", d => `translate(${proj([d.lon, d.lat])})`)
        .each(function (d) { d3.select(this).select("text").attr("dx", d.dx).attr("text-anchor", d.anchor).text(d.n); });

      const a = proj([SIDES["732"].lon, SIDES["732"].lat]), b = proj([SIDES["508"].lon, SIDES["508"].lat]);
      const dx = b[0] - a[0], dy = b[1] - a[1], cx = (a[0] + b[0]) / 2 + dy * .22, cy = (a[1] + b[1]) / 2 - dx * .22;
      gRoute.selectAll("path").data([0]).join("path").attr("class", "route").attr("d", `M${a[0]},${a[1]} Q${cx},${cy} ${b[0]},${b[1]}`);
      gRoute.selectAll("text").data([0]).join("text").attr("class", "route-lbl")
        .attr("x", (a[0] + 2 * cx + b[0]) / 4 + (mobile ? -40 : -60)).attr("y", (a[1] + 2 * cy + b[1]) / 4 - 6).text(`${miles} miles apart`);

      const code = mobile ? 54 : 76;
      gMarkers.selectAll("g.marker").data(["732", "508"], d => d).join(enter => {
        const g = enter.append("g").attr("class", "marker").attr("tabindex", 0).attr("role", "button")
          .attr("aria-label", d => `${d}: ${SIDES[d].owner}, ${SIDES[d].name}`);
        const inner = g.append("g").attr("class", "marker-in").style("animation-delay", (d, i) => (.35 + i * .18) + "s");
        inner.append("circle").attr("class", "hit").attr("r", 46);
        inner.each(function (d) {
          const el = d3.select(this);
          // live radar pings behind the pin (three staggered rings, CSS-animated)
          const rings = el.append("g").attr("class", "rings").attr("aria-hidden", "true");
          ["", " d2", " d3"].forEach(k => rings.append("circle").attr("class", `ring r${d}${k}`).attr("r", 8));
          if (d === "732") {
            el.append("image").attr("class", "pin").attr("href", DCFX.cemURI("white")).attr("x", -14).attr("y", -14).attr("width", 28).attr("height", 37);
          }
          else {
            const p = el.append("g").attr("class", "pin");
            p.append("path").attr("d", "M-9,-13 L9,-13 L9,9 L0,16 L-9,9 Z").attr("fill", "#e9dfbf").attr("stroke", "#1d1914").attr("stroke-width", 1).attr("transform", "rotate(180)");
            p.append("circle").attr("cx", 0).attr("cy", 8).attr("r", 2.2).attr("fill", "#0b0b0b");
            p.append("text").attr("x", 0).attr("y", 1).attr("text-anchor", "middle").attr("font-family", "Permanent Marker").attr("font-size", 9).attr("fill", "#1d1914").text("$");
          }
        });
        const lbl = inner.append("g").attr("class", "lbl");
        lbl.append("text").attr("class", "code").text(d => d);
        lbl.append("text").attr("class", "who").text(d => `${SIDES[d].owner} · ${SIDES[d].place}`);
        lbl.append("text").attr("class", "what").text(d => d === "732" ? "Streetwear, artist merch" : "Vintage, Y2K, workwear");
        lbl.append("text").attr("class", "go").attr("fill", d => d === "508" ? "#d9894a" : "#e6e6e6").text(d => `Enter ${d} →`);
        g.on("mouseenter", (e, d) => hover(d)).on("mouseleave", () => hover(null))
          .on("click", (e, d) => pickSide(d))
          .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickSide(d); } });
        return g;
      }).attr("transform", d => `translate(${proj([SIDES[d].lon, SIDES[d].lat])})`)
        .each(function (d) {
          const g = d3.select(this);
          let anchor, x, y;
          if (mobile) { anchor = d === "508" ? "end" : "start"; x = d === "508" ? 14 : -10; y = d === "508" ? -64 : 66; }
          else if (d === "508") { anchor = "start"; x = 30; y = 26; }
          else { anchor = "end"; x = -30; y = 26; }
          g.selectAll(".lbl text").attr("text-anchor", anchor).attr("x", x);
          g.select(".code").attr("y", y).style("font-size", code + "px");
          g.select(".who").attr("y", y + 22);
          g.select(".what").attr("y", y + 40);
          g.select(".go").attr("y", y + 62).style("display", mobile ? "none" : null);
          if (mobile) { g.select(".what").style("display", "none"); }
        });
    }

    function hover(side) {
      hovered = side;
      gStates.selectAll("path").classed("hot-508", d => side === "508" && d.id === "25").classed("hot-732", d => side === "732" && d.id === "34");
    }

    // ---- "Just in": each side's newest pieces pop out of its pin as polaroids ----
    // fans are offsets from the pin in polaroid widths (+ tilt), aimed at open space:
    // desktop: 732 down-right over the Atlantic, 508 up-left over Massachusetts; phone: 732 right, 508 below Cape Cod
    const FANS = {
      desk: { "732": [[0.55, 0.55, -8], [1.55, 0.95, 5], [2.5, 0.45, -3]], "508": [[-2.5, -1.6, -4], [-1.5, -2.0, 5], [-0.5, -1.55, -6]] },
      phone: { "732": [[1.15, -0.2, -7], [2.2, 0.1, 6]], "508": [[0.03, 1.5, 5], [0.85, 1.25, -6]] },
    };
    const polaLayer = document.createElement("div"); polaLayer.className = "pola-layer";
    $("#landing").appendChild(polaLayer);
    polaLayer.addEventListener("click", e => {
      const p = e.target.closest(".pola"); if (!p || e.metaKey || e.ctrlKey || e.shiftKey) return;   // modifier-click keeps the plain link
      e.preventDefault(); openItemNav(p.dataset.id, p);   // the popup opens over the map; closing lands back here
    });
    function justIn(delay) {   // delay: ms before they pop out; null = place without animating
      const fans = FANS[mobile ? "phone" : "desk"], w = mobile ? 60 : 96;
      const newest = side => avail(side).filter(i => i.photos?.[0]).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      let html = "";
      const pops = [];
      ["732", "508"].forEach(side => {
        const [px, py] = proj([SIDES[side].lon, SIDES[side].lat]);
        const list = newest(side).slice(0, fans[side].length);
        list.forEach((it, k) => {
          const [fx, fy, r] = fans[side][k], x = px + fx * w - w / 2, y = py + fy * w - w / 2;
          html += `<a class="pola" data-id="${esc(it.id)}" data-side="${side}" href="#/item/${encodeURIComponent(it.id)}" aria-label="New: ${esc(it.title)}, ${money(it.price)}"
            style="left:${x}px;top:${y}px;width:${w}px;--r:${r}deg;--tilt:${r}deg;z-index:${k + 1}">${side === "508" ? '<i class="pola-tape"></i>' : ""}<img src="${esc(it.photos[0])}" alt="" referrerpolicy="no-referrer"><span><b>$${Math.round(+it.price)}</b><small>new</small></span></a>`;
          pops.push([px - x - w / 2, py - y - w / 2, side === "508" ? 260 : 0, k, r]);
        });
        if (list.length && !mobile) {   // a quiet label over the highest polaroid, clear of the pin
          const [fx, fy] = fans[side].slice(0, list.length).reduce((a, b) => (b[1] < a[1] ? b : a));
          html += `<span class="pola-label" style="left:${px + fx * w - w / 2}px;top:${py + fy * w - w / 2 - 20}px">Just in</span>`;
        }
      });
      polaLayer.innerHTML = html;
      if (delay == null || REDUCE) return;
      // each one shoots out of its pin: tiny on the pin, overshoots a touch, settles at its tilt
      polaLayer.querySelectorAll(".pola").forEach((el, n) => {
        const [dx, dy, extra, k, r] = pops[n];
        el.animate([
          { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(.15)`, opacity: 0 },
          { transform: `translate(0,-6px) rotate(${r * 1.6}deg) scale(1.04)`, opacity: 1, offset: .7 },
          { transform: `rotate(${r}deg)`, opacity: 1 },
        ], { duration: 700, delay: delay + extra + k * 130, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      });
      polaLayer.querySelectorAll(".pola-label").forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: delay + 700, fill: "backwards" }));
    }

    async function zoomIn(side) {
      hover(null);
      const [x, y] = proj([SIDES[side].lon, SIDES[side].lat]);
      [gMarkers.selectAll(".lbl"), gMarkers.selectAll(".rings"), gCities, gRoute, gNames].forEach(s => s.transition().duration(280).style("opacity", 0));
      gStates.selectAll("path").classed("hot-508", d => side === "508" && d.id === "25").classed("hot-732", d => side === "732" && d.id === "34");
      if (REDUCE) return;
      await world.transition().duration(1000).ease(d3.easeCubicInOut)
        .attr("transform", `translate(${W / 2},${H / 2}) scale(7) translate(${-x},${-y})`).end().catch(() => {});
    }

    async function zoomOut(fromSide) {
      layout();
      gStates.selectAll("path").classed("hot-508", false).classed("hot-732", false);
      if (SIDES[fromSide] && !REDUCE) {
        const [x, y] = proj([SIDES[fromSide].lon, SIDES[fromSide].lat]);
        world.interrupt().attr("transform", `translate(${W / 2},${H / 2}) scale(7) translate(${-x},${-y})`);
        await world.transition().duration(1000).ease(d3.easeCubicInOut).attr("transform", "translate(0,0) scale(1)").end().catch(() => {});
      } else world.interrupt().attr("transform", "translate(0,0) scale(1)");
      [gMarkers.selectAll(".lbl"), gMarkers.selectAll(".rings"), gCities, gRoute, gNames].forEach(s => s.transition().duration(400).style("opacity", 1));
      justIn(100);
    }

    layout();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (view === "map") layout(); }, 150); });
    fetch("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json").then(r => r.json())
      .then(us => { states = topojson.feature(us, us.objects.states).features; render(); }).catch(() => {});
    return { zoomIn, zoomOut, justIn };
  }

  $("#landSides").innerHTML = ["732", "508"].map(s =>
    `<button data-side="${s}"><b>${s}</b><small>${esc(SIDES[s].owner)} · ${s === "732" ? "Streetwear" : "Vintage / Y2K"}</small></button>`).join("");
  $("#landSides").addEventListener("click", e => { const b = e.target.closest("button"); if (b) pickSide(b.dataset.side); });
  $("#shopAll").addEventListener("click", () => pickSide("all"));

  // ======================= NAVIGATION =======================
  const fxLabel = s => s === "732" ? "Streetwear" : s === "508" ? "Vintage / Y2K" : "Everything";

  async function pickSide(side) {
    if (busy) return; busy = true;
    try {
      $("#landing").classList.add("leaving");
      if (side !== "all") await map.zoomIn(side);
      await DCFX.run(side, () => { history.pushState(null, "", "#/" + side); showStore(side); }, fxLabel(side));
    } finally { busy = false; }
  }

  function showStore(side) {
    view = "store";
    $("#landing").classList.remove("is-active");
    $("#store").classList.add("is-active");
    setSide(side, true);
    scrollTo(0, 0);
  }

  async function backToMap() {
    if (busy) return; busy = true;
    const from = st.side;
    try {
      await DCFX.run("wipe", () => {
        view = "map"; theme("map");
        $("#store").classList.remove("is-active");
        $("#landing").classList.add("is-active");
        $("#landing").classList.remove("leaving");
      }, "508 × 732");
      await map.zoomOut(from);
    } finally { busy = false; }
  }
  $("#toMap").addEventListener("click", () => { history.pushState(null, "", "#/"); backToMap(); });

  async function switchSide(side) {
    if (busy || side === st.side) return; busy = true;
    try { await DCFX.run(side === "all" ? "wipe" : side, () => { setSide(side); scrollTo(0, 0); }, fxLabel(side)); }
    finally { busy = false; }
  }
  $("#switch").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.dataset.side === st.side) return;
    history.pushState(null, "", "#/" + b.dataset.side);
    switchSide(b.dataset.side);
  });

  // ======================= STORE =======================
  // ---- brand chips: counts from the item's brand + title; "always" brands show dimmed at 0 ----
  const BRANDS = Object.fromEntries(Object.entries(C.BRANDS || {}).map(([s, list]) =>
    [s, list.map(([name, pat, always]) => ({ name, re: new RegExp(pat, "i"), always: !!always, side: s }))]));
  const brandText = i => `${i.brand || ""} ${i.title || ""}`;
  function brandsFor(side) {
    const pool = avail(side), defs = side === "all" ? [...(BRANDS["732"] || []), ...(BRANDS["508"] || [])] : (BRANDS[side] || []);
    const seen = new Set(), out = [];
    for (const b of defs) {
      if (seen.has(b.name)) continue; seen.add(b.name);
      const n = pool.filter(i => (side === "all" ? i.side === b.side : true) && b.re.test(brandText(i))).length;
      if (n || (b.always && side !== "all")) out.push({ ...b, n });
    }
    return out;
  }
  const promise = side => side === "all" ? `${C.PROMISE["732"]} · ${C.PROMISE["508"].toLowerCase()}` : C.PROMISE[side];
  function chipsHTML(side) {
    const n = avail(side).length;
    return `<div class="brands" role="group" aria-label="Filter by brand">
      <button class="brand${st.brand ? "" : " on"}" data-brand="" aria-pressed="${!st.brand}">All <em>${n}</em></button>
      ${brandsFor(side).map(b => `<button class="brand${b.n ? "" : " zero"}${st.brand === b.name ? " on" : ""}" data-brand="${esc(b.name)}" aria-pressed="${st.brand === b.name}">${esc(b.name)} <em>${b.n}</em></button>`).join("")}</div>`;
  }

  function heroHTML(side) {
    const check = `<p class="hero-promise"><i aria-hidden="true">✓</i>${esc(promise(side))}</p>`;
    if (side === "732") return `<div class="hero-732">
        ${clusterHTML()}
        <p class="hero-who"><b>${esc(SIDES["732"].owner)}</b> · ${esc(SIDES["732"].place)} · 732</p>
        <div class="ht"><h1 class="hero-title">Streetwear</h1></div>${check}${chipsHTML(side)}</div>`;
    if (side === "508") return `<div class="hero-508">
        <span class="hero-tape">508</span>
        <p class="hero-who"><b>${esc(SIDES["508"].owner)}</b> · ${esc(SIDES["508"].place)} · 508</p>
        <div class="ht"><h1 class="hero-title">Vintage / Y2K</h1></div>${check}${chipsHTML(side)}</div>`;
    return `<div class="hero-all">
        <p class="hero-who">Both racks · <b>${esc(SIDES["732"].owner)}</b> (732) and <b>${esc(SIDES["508"].owner)}</b> (508)</p>
        <div class="ht"><h1 class="hero-title">732 <span>×</span> 508</h1></div>${check}${chipsHTML(side)}</div>`;
  }
  $("#hero").addEventListener("click", e => {
    const b = e.target.closest(".brand"); if (!b) return;
    st.brand = b.dataset.brand === st.brand ? "" : b.dataset.brand;   // tapping the active chip again clears it
    $("#hero").querySelectorAll(".brand").forEach(c => {
      const on = c.dataset.brand === st.brand; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on);
    });
    renderGrid(true);
    if (st.brand && innerWidth < 760) $(".filters").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
  });

  function setSide(side, force) {
    if (!force && side === st.side) return;
    st.side = side; st.cat = "All"; st.size = ""; st.q = ""; st.brand = ""; $("#search").value = "";
    theme(side);
    document.querySelectorAll("#switch button").forEach(b => b.classList.toggle("on", b.dataset.side === side));
    moveBar();
    const hero = $("#hero");
    hero.innerHTML = heroHTML(side);
    hero.classList.remove("anim"); void hero.offsetWidth; hero.classList.add("anim");
    setupHeroScroll();
    buildFilters(); renderGrid(); renderSold(); playJustSold();
  }

  // ---- scroll-linked hero: the title sinks back slower than the page, the 732 crosses drift apart and fade ----
  let heroFX = null, heroTick = false;
  function setupHeroScroll() {
    const hero = $("#hero");
    heroFX = { hero, ht: hero.querySelector(".ht"),
      hcs: [...hero.querySelectorAll(".hc")].map((el, i) => ({ el, i, dx: +el.dataset.dx || 0, dy: +el.dataset.dy || 0 })) };
    heroScroll();
  }
  function heroScroll() {
    heroTick = false;
    if (!heroFX || REDUCE || view !== "store") return;
    const { hero, ht, hcs } = heroFX;
    const p = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight * .9)));
    const e = 1 - (1 - p) * (1 - p);
    if (ht) { ht.style.transform = e ? `translate3d(0,${(e * 50).toFixed(1)}px,0) scale(${(1 - e * .12).toFixed(4)})` : ""; ht.style.opacity = e ? (1 - e * .35).toFixed(3) : ""; }
    hcs.forEach(({ el, i, dx, dy }) => {
      if (!e) { el.style.transform = ""; el.style.opacity = ""; return; }
      const s = e * 1.6;
      el.style.transform = `translate3d(${(dx * s).toFixed(1)}px,${(dy * s - e * 40).toFixed(1)}px,0) rotate(${(e * (i % 2 ? 24 : -24)).toFixed(1)}deg) scale(${(1 - e * .25).toFixed(3)})`;
      el.style.opacity = Math.max(0, 1 - e * 1.1).toFixed(3);
    });
  }
  addEventListener("scroll", () => { if (!heroTick && heroFX && view === "store") { heroTick = true; requestAnimationFrame(heroScroll); } }, { passive: true });

  function moveBar() {
    const on = document.querySelector("#switch button.on"), bar = $("#switchBar");
    if (!on) return;
    bar.style.width = on.offsetWidth + "px";
    bar.style.transform = `translateX(${on.offsetLeft}px)`;
  }
  addEventListener("resize", moveBar);

  function buildFilters() {
    const items = avail(st.side), counts = {};
    items.forEach(i => counts[i.category || "Other"] = (counts[i.category || "Other"] || 0) + 1);
    const cats = ["All", ...C.CATEGORIES.filter(c => counts[c])];
    $("#cats").innerHTML = cats.map(c => `<button class="cat${c === st.cat ? " on" : ""}" data-cat="${esc(c)}">${esc(c)}<sup>${c === "All" ? items.length : counts[c]}</sup></button>`).join("");
    const sizes = [...new Set(items.map(i => (i.size || "").trim()).filter(Boolean))].sort();
    $("#size").innerHTML = `<option value="">All sizes</option>` + sizes.map(s => `<option>${esc(s)}</option>`).join("");
  }
  $("#cats").addEventListener("click", e => {
    const b = e.target.closest(".cat"); if (!b) return;
    st.cat = b.dataset.cat;
    document.querySelectorAll(".cat").forEach(c => c.classList.toggle("on", c === b));
    renderGrid(true);
  });
  $("#size").addEventListener("change", e => { st.size = e.target.value; renderGrid(true); });
  $("#sort").addEventListener("change", e => { st.sort = e.target.value; renderGrid(true); });
  let qt; $("#search").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value.trim().toLowerCase(); renderGrid(); }, 120); });

  function filtered() {
    let list = avail(st.side);
    if (st.brand) {
      const defs = [...(BRANDS["732"] || []), ...(BRANDS["508"] || [])].filter(b => b.name === st.brand);
      list = list.filter(i => defs.some(b => (st.side === "all" ? i.side === b.side : true) && b.re.test(brandText(i))));
    }
    if (st.cat !== "All") list = list.filter(i => (i.category || "Other") === st.cat);
    if (st.size) list = list.filter(i => (i.size || "").trim() === st.size);
    if (st.q) list = list.filter(i => `${i.title} ${i.brand} ${i.category} ${i.description}`.toLowerCase().includes(st.q));
    if (st.sort === "low") list.sort((a, b) => (+a.price || 0) - (+b.price || 0));
    else if (st.sort === "high") list.sort((a, b) => (+b.price || 0) - (+a.price || 0));
    else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.created_at || "").localeCompare(a.created_at || ""));
    return list;
  }

  const io = new IntersectionObserver(entries => {
    let n = 0;
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const d = n++ * 70;
      en.target.style.transitionDelay = d + "ms";
      en.target.classList.add("seen"); io.unobserve(en.target);
      if (en.target.querySelector(".card-tag")) playDrop(en.target, d);
    });
  }, { rootMargin: "0px 0px -30px 0px" });

  // ---- "just dropped": a new piece first shows as a hang tag that flips over to the photo, then a NEW stamp lands.
  //      Plays once per piece per visitor (remembered in this browser), so returning buyers aren't shown it again.
  const DROP_KEY = "dc_drop_seen_v1";
  const dropSeen = (() => { try { return new Set(JSON.parse(localStorage.getItem(DROP_KEY) || "[]")); } catch (e) { return new Set(); } })();
  const markDropSeen = id => { dropSeen.add(String(id)); try { localStorage.setItem(DROP_KEY, JSON.stringify([...dropSeen].slice(-200))); } catch (e) {} };
  function playDrop(card, delay) {
    const tag = card.querySelector(".card-tag"), img = card.querySelector(".card-img"), badge = img.querySelector(".badge");
    if (!tag) return;
    markDropSeen(card.dataset.id);
    const tilt = img.style.getPropertyValue("--tilt").trim(), rot = tilt && tilt !== "0deg" ? `rotate(${tilt}) ` : "";
    const ease = "cubic-bezier(.2,.7,.25,1)";
    img.style.visibility = "hidden";
    if (badge) badge.style.opacity = "0";
    tag.animate([{ transform: `${rot}rotateY(0deg)` }, { transform: `${rot}rotateY(0deg) translateY(-4px)`, offset: .4 }, { transform: `${rot}rotateY(90deg)` }],
      { duration: 520, delay: delay + 450, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }).finished.then(() => {
        tag.remove();
        img.style.visibility = "";
        img.animate([{ transform: `${rot}rotateY(-90deg)` }, { transform: `${rot}rotateY(10deg)`, offset: .75 }, { transform: `${rot}rotateY(0deg)` }], { duration: 480, easing: ease });
        if (badge) {
          badge.style.opacity = "";
          const b = getComputedStyle(badge).transform, base = b === "none" ? "" : b + " ";
          badge.animate([{ opacity: 0, transform: `${base}scale(2.4)` }, { opacity: 1, transform: `${base}scale(.92)`, offset: .7 }, { opacity: 1, transform: `${base}scale(1)` }],
            { duration: 380, delay: 420, easing: "cubic-bezier(.5,0,.3,1)", fill: "backwards" });
        }
        card.animate([{ translate: "0 0" }, { translate: "1px -1px" }, { translate: "-1px 1px" }, { translate: "0 0" }], { duration: 160, delay: 690 });
      }).catch(() => { tag.remove(); img.style.visibility = ""; if (badge) badge.style.opacity = ""; });
  }

  function cardHTML(i) {
    const vintage = st.side === "508";
    const tilt = vintage ? ((hash(i.id) % 5) - 2) * 0.45 : 0;
    const badge = i.status === "hold" ? `<span class="badge hold">On hold</span>` : isNew(i) ? `<span class="badge">New</span>` : "";
    const mark = st.side === "all" ? (i.side === "732" ? `<span class="side-mark t732">732</span>` : `<span class="side-mark t508">508</span>`) : "";
    const alt = i.photos?.[1] ? `<img class="alt" src="${esc(i.photos[1])}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
    const tape = vintage ? `<span class="tape">${money(i.price)}${i.size ? `<small>size ${esc(i.size)}</small>` : ""}</span>` : "";
    const drop = !REDUCE && i.status !== "hold" && isNew(i) && !dropSeen.has(String(i.id))
      ? `<div class="card-tag" aria-hidden="true" style="${tilt ? `transform:rotate(${tilt}deg)` : ""}"><b>just dropped</b><span>dualcoded · ${esc(i.side)}</span></div>` : "";
    return `<article class="card" data-id="${esc(i.id)}" tabindex="0">
      <div class="card-img" style="--tilt:${tilt}deg">${badge}${mark}
        <img src="${esc(i.photos?.[0] || "")}" alt="${esc(i.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">${alt}${tape}<span class="shine" aria-hidden="true"></span><span class="sold-stamp" aria-hidden="true">SOLD</span></div>${drop}
      <div class="card-info">
        <p class="card-brand">${esc(i.brand)}</p>
        <h3 class="card-title">${esc(i.title)}</h3>
        ${vintage ? "" : `<div class="card-meta"><span>${esc(i.size)}</span><b>${money(i.price)}</b></div>`}
      </div></article>`;
  }

  // ---- SOLD stamp: pieces that were for sale on this visitor's last visit and have sold since get a red SOLD stamp,
  //      then move into "Recently sold". Each sale plays once per browser. ----
  const SEEN_AVAIL_KEY = "dc_seen_avail_v1";
  let JUST_SOLD = [];
  function computeJustSold() {
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(SEEN_AVAIL_KEY) || "null"); } catch (e) {}
    if (Array.isArray(prev)) { const p = new Set(prev); JUST_SOLD = ITEMS.filter(i => i.status === "sold" && p.has(String(i.id))); }
    try { localStorage.setItem(SEEN_AVAIL_KEY, JSON.stringify(ITEMS.filter(i => i.status !== "sold").map(i => String(i.id)))); } catch (e) {}
  }
  const soldIO = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    soldIO.unobserve(en.target);
    setTimeout(() => stampSold(en.target), 350 + (+en.target.dataset.n || 0) * 700);
  }), { threshold: .5 });
  function playJustSold() {
    if (REDUCE || !JUST_SOLD.length) return;
    const mine = JUST_SOLD.filter(i => st.side === "all" || i.side === st.side).slice(0, 3);
    if (!mine.length) return;
    JUST_SOLD = JUST_SOLD.filter(i => !mine.includes(i));
    const grid = $("#grid"), tmp = document.createElement("div");
    mine.slice().reverse().forEach((i, n) => {
      tmp.innerHTML = cardHTML(i);
      const c = tmp.firstElementChild;
      c.querySelector(".card-tag")?.remove(); c.querySelector(".badge")?.remove();
      c.classList.add("seen", "just-sold"); c.dataset.n = mine.length - 1 - n;
      grid.prepend(c); soldIO.observe(c);
    });
  }
  async function stampSold(card) {
    if (!card.isConnected) return;
    const ci = card.querySelector(".card-img"), stamp = card.querySelector(".sold-stamp"), img = ci.querySelector("img");
    stamp.animate([{ opacity: 0, transform: "translate(-50%,-50%) rotate(-12deg) scale(2.6)" }, { opacity: 1, transform: "translate(-50%,-50%) rotate(-12deg) scale(.9)", offset: .72 },
      { opacity: 1, transform: "translate(-50%,-50%) rotate(-12deg) scale(1)" }], { duration: 360, easing: "cubic-bezier(.55,0,.3,1)", fill: "forwards" });
    card.animate([{ translate: "0 0" }, { translate: "2px -2px" }, { translate: "-2px 1px" }, { translate: "0 0" }], { duration: 180, delay: 250 });
    img.animate([{ filter: "none" }, { filter: "grayscale(1) contrast(.9) brightness(.8)" }], { duration: 700, delay: 300, fill: "forwards" });
    await new Promise(r => setTimeout(r, 1500));
    if (!card.isConnected) return;
    // into "Recently sold" if it's close by, otherwise it just leaves the rack; the grid closes the gap either way
    const grid = $("#grid"), from = ci.getBoundingClientRect();
    const target = $(`#soldRow .sold-item[data-id="${CSS.escape(card.dataset.id)}"]`), tr = target?.getBoundingClientRect();
    const others = [...grid.querySelectorAll(".card")].filter(c => c !== card), before = others.map(c => c.getBoundingClientRect());
    let fly = false;
    if (target && tr.top < innerHeight * 1.3 && tr.bottom > 0) {
      fly = true;
      target.style.visibility = "hidden";
    } else {
      // "Recently sold" is off screen: the card shrinks off the rack first
      await card.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.8) translateY(10px)" }],
        { duration: 380, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).finished.catch(() => {});
      before.splice(0, before.length, ...others.map(c => c.getBoundingClientRect()));
    }
    const f = fly ? flight([img], from, from, from, 1, 1, 1, t => t) : null;   // parked on the card's spot for the swap
    if (f) { f.el.querySelectorAll("img").forEach(im => im.style.filter = "grayscale(1) contrast(.9) brightness(.8)"); f.el.style.visibility = ""; }
    card.remove();
    others.forEach((c, k) => { const a = before[k], b = c.getBoundingClientRect(); if (a.left !== b.left || a.top !== b.top) c.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }); });
    if (f) {
      const t = target.querySelector("img").getBoundingClientRect();
      const f2 = flight([img], from, t, from, 1, 1, 700, bez(.6, 0, .25, 1));
      f2.el.querySelectorAll("img").forEach(im => im.style.filter = "grayscale(1) contrast(.9) brightness(.8)");
      await f2.ready;
      f2.go(); f.el.remove();
      await f2.go();
      f2.el.remove(); target.style.visibility = "";
      target.querySelector("span")?.animate([{ transform: "translate(-50%,-50%) rotate(-10deg) scale(1.6)", opacity: 0 }, { transform: "translate(-50%,-50%) rotate(-10deg) scale(1)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.5,0,.3,1)" });
    }
    $("#empty").hidden = grid.querySelectorAll(".card").length > 0;
  }

  const parked = new Map();   // cards filtered out by the morph, kept for reuse (cleared when the grid is rebuilt)
  function renderGrid(morph) {
    const list = filtered(), grid = $("#grid"), empty = $("#empty");
    empty.hidden = list.length > 0;
    // nothing to show: a brand you're out of turns into an invitation to DM instead of a dead end
    const what = st.brand + (st.cat !== "All" ? " " + st.cat.toLowerCase() : "");
    empty.innerHTML = st.brand && !list.length
      ? `No ${esc(what)} right now. <a href="${DM_URL}" target="_blank" rel="noopener">DM us what you're looking for →</a> We find pieces all the time.`
      : `Nothing here right now. New pieces go up all the time, <a href="${DM_URL}" target="_blank" rel="noopener">DM us what you're looking for →</a>`;
    if (!morph || REDUCE || !grid.children.length) {
      parked.clear();
      grid.innerHTML = list.map(cardHTML).join("");
      grid.querySelectorAll(".card").forEach(c => REDUCE ? c.classList.add("seen") : io.observe(c));
      return;
    }
    // ---- morph (filters): cards that stay glide to their new spot, leavers shrink away, arrivals pop in ----
    grid.querySelectorAll(".card.just-sold").forEach(c => { soldIO.unobserve(c); c.remove(); });   // temporary sold cards don't take part
    const gb = grid.getBoundingClientRect();
    const old = new Map([...grid.querySelectorAll(".card")].filter(c => !c.classList.contains("leaving"))
      .map(c => [c.dataset.id, { el: c, r: c.getBoundingClientRect() }]));
    const keep = new Set(list.map(i => String(i.id)));
    old.forEach(({ el, r }, id) => {
      if (keep.has(id)) return;
      el.classList.add("leaving");
      Object.assign(el.style, { position: "absolute", left: (r.left - gb.left) + "px", top: (r.top - gb.top) + "px", width: r.width + "px", margin: "0", zIndex: "0", pointerEvents: "none" });
      const park = () => {   // keep the node (photos already decoded) so it can come back without a hitch
        el.getAnimations().forEach(a => a.cancel()); el.remove();
        el.classList.remove("leaving"); el.removeAttribute("style"); el.classList.add("seen");
        parked.set(id, el);
      };
      el.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.82)" }], { duration: 260, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" })
        .finished.then(park, park);
    });
    const tmp = document.createElement("div"), arrivals = [];
    list.forEach(i => {
      const id = String(i.id);
      let el = old.get(id)?.el;
      if (!el && parked.has(id)) { el = parked.get(id); parked.delete(id); arrivals.push(el); }
      if (!el) { tmp.innerHTML = cardHTML(i); el = tmp.firstElementChild; el.classList.add("seen"); el.querySelector(".card-tag")?.remove(); arrivals.push(el); }
      grid.appendChild(el);
    });
    old.forEach(({ el, r }, id) => {
      if (!keep.has(id)) return;
      const n = el.getBoundingClientRect(), dx = r.left - n.left, dy = r.top - n.top;
      if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
    arrivals.forEach((el, n) => el.animate([{ opacity: 0, transform: "scale(.86) translateY(14px)" }, { opacity: 1, transform: "none" }],
      { duration: 480, delay: 140 + n * 55, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }));
  }
  $("#grid").addEventListener("click", e => { const c = e.target.closest(".card"); if (c && !c.classList.contains("just-sold")) openItemNav(c.dataset.id, c); });

  // ---- tilt & shine (desktop mouse only; Bao's paper-print cards keep their own lift) ----
  const FINE = matchMedia("(pointer: fine)").matches;
  let tiltCard = null, tiltRaf = 0;
  function untilt() {
    if (!tiltCard) return;
    const im = tiltCard.querySelector(".card-img");
    im.classList.remove("tilting"); im.style.transform = ""; im.style.boxShadow = "";
    tiltCard = null;
  }
  if (FINE && !REDUCE) {
    $("#grid").addEventListener("pointermove", e => {
      const card = e.target.closest(".card");
      if (card !== tiltCard) untilt();
      if (!card || st.side === "508" || document.body.dataset.theme === "508" || card.classList.contains("leaving")) return;
      tiltCard = card;
      const im = card.querySelector(".card-img"), r = im.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      cancelAnimationFrame(tiltRaf);
      tiltRaf = requestAnimationFrame(() => {
        im.classList.add("tilting");
        im.style.transform = `perspective(800px) rotateX(${((.5 - y) * 10).toFixed(2)}deg) rotateY(${((x - .5) * 12).toFixed(2)}deg) scale(1.02)`;
        im.style.boxShadow = `${((.5 - x) * 18).toFixed(1)}px ${(18 + (.5 - y) * 10).toFixed(1)}px 40px -18px rgba(0,0,0,.9)`;
        im.style.setProperty("--sx", (x * 100).toFixed(1) + "%"); im.style.setProperty("--sy", (y * 100).toFixed(1) + "%");
      });
    });
    $("#grid").addEventListener("pointerleave", () => { cancelAnimationFrame(tiltRaf); untilt(); });
  }
  $("#grid").addEventListener("keydown", e => { const c = e.target.closest(".card"); if (c && e.key === "Enter") openItemNav(c.dataset.id); });

  const SOLD_MAX = 40;
  function renderSold() {
    const all = ITEMS.filter(i => i.status === "sold" && (st.side === "all" || i.side === st.side))
      .sort((a, b) => (b.sold_at || b.created_at || "").localeCompare(a.sold_at || a.created_at || ""));
    const sold = all.slice(0, SOLD_MAX);
    $("#soldWrap").hidden = !sold.length;
    $("#soldRow").innerHTML = sold.map(i => `<button class="sold-item" data-id="${esc(i.id)}" aria-label="${esc(i.title)}, sold">
        <img src="${esc(i.photos?.[0] || "")}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>SOLD</span>
        <p>${esc(i.title)}</p>${money(i.price) ? `<small>Sold for ${money(i.price)}</small>` : ""}</button>`).join("")
      + (all.length > SOLD_MAX || STATS ? `<a class="sold-more" href="${esc(C.DEPOP_SHOP)}" target="_blank" rel="noopener">
        <b>${STATS?.sold || all.length}</b><span>sold on Depop</span><em>See them all ↗</em></a>` : "");
  }
  $("#soldRow").addEventListener("click", e => { const b = e.target.closest(".sold-item"); if (b) openItemNav(b.dataset.id); });

  // ======================= DEPOP RATING / SOLD =======================
  let STATS = null;
  function stars(r) {
    const pct = Math.max(0, Math.min(5, Number(r) || 0)) / 5 * 100;
    return `<span class="stars" aria-hidden="true"><span>★★★★★</span><span class="stars-on" style="width:${pct}%">★★★★★</span></span>`;
  }
  function renderStats(s) {
    if (!s) return;
    STATS = s;
    const r = Number(s.rating);
    $("#landWho").innerHTML = `<a href="${esc(C.DEPOP_SHOP)}" target="_blank" rel="noopener" aria-label="Rated ${r.toFixed(1)} out of 5 from ${s.reviews} reviews, ${s.sold} sold on Depop">
      <span class="ls-line">${stars(r)}<b>${r.toFixed(1)}</b><span class="ls-dim">${s.reviews} reviews</span></span>
      <span class="ls-line"><b>${s.sold}</b> sold on Depop</span></a>`;
    $("#soldCount").textContent = `· ${s.sold} sold on Depop`;
    renderTicker(s.recent);
  }

  // reviews ticker along the bottom of the map: real Depop reviews (kept fresh by the sync), loops seamlessly
  function renderTicker(list) {
    const el = $("#ticker"); if (!el || !Array.isArray(list)) return;
    // descriptive reviews read best; one-word ones ("great", "GOOD") only fill in when there are few others
    const all = list.filter(r => r && r.t && r.t.trim().length > 2);
    const long = all.filter(r => r.t.trim().length >= 14);
    const good = (long.length >= 6 ? long : all).slice(0, 20);
    if (!good.length) { el.hidden = true; return; }
    const one = good.map(r => `<span class="rv"><span class="rv-st" aria-hidden="true">★★★★★</span><q>${esc(r.t)}</q><span class="rv-who">@${esc(r.u)}</span></span>`).join("");
    el.querySelector(".tk-track").innerHTML = one + `<span aria-hidden="true" class="tk-copy">${one}</span>`;
    const tr = el.querySelector(".tk-track");
    tr.style.animationDuration = Math.max(40, Math.round(good.reduce((n, r) => n + r.t.length, 0) / 9)) + "s";   // same reading speed however many reviews
    el.querySelector(".tk-src").href = C.DEPOP_SHOP;
    el.hidden = false;
  }
  renderStats(C.DEPOP_STATS);
  DC.stats().then(s => { if (s) { renderStats(s); if (view === "store") renderSold(); } }).catch(() => {});

  // ======================= ITEM =======================
  function openItemNav(id, fromCard) {
    history.pushState(null, "", "#/item/" + encodeURIComponent(id));
    modalPushed = true; openItem(id, fromCard);
  }

  // ---- the tapped card's photo flies into the popup (and back out on close) ----
  let flyFrom = null;
  // never let a flight hold the page hostage (background tabs, slow phones): finish it after a cap
  const capped = (anim, ms) => { const t = setTimeout(() => { try { anim.finish(); } catch (e) {} }, ms); return anim.finished.catch(() => {}).finally(() => clearTimeout(t)); };
  // cubic-bezier as a JS function, so the flight can be baked into keyframes
  const bez = (x1, y1, x2, y2) => t => {
    let lo = 0, hi = 1, s = t;
    for (let k = 0; k < 18; k++) { s = (lo + hi) / 2; const x = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s; if (x < t) lo = s; else hi = s; }
    return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  };
  const EASE_OUT = bez(.2, .8, .2, 1), EASE_BACK = bez(.4, 0, .2, 1);
  // The box (overflow hidden) morphs from one shape to the other while each photo inside is counter-scaled
  // every step, so it always looks object-fit: cover and never stretches. Only transforms/opacity animate.
  // imgs: source <img>s (2nd = hover photo to fade out), base: the bigger rect the flyer is laid out at.
  // rot: the card's hover tilt at the start ({rx, ry, rz, s}); it eases out to flat over the flight.
  // The flight is built paused: call go() once the photos are decoded, so the first frames never stall.
  function flight(imgs, from, to, base, z0, z1, dur, ease, rot) {
    const W = base.width, H = base.height, N = 40, R = rot || { rx: 0, ry: 0, rz: 0, s: 1 };
    const f = document.createElement("div"); f.className = "flyer";
    Object.assign(f.style, { left: base.left + "px", top: base.top + "px", width: W + "px", height: H + "px" });
    const steps = [...Array(N + 1)].map((_, k) => {
      const e = ease(k / N), L = (a, b) => a + (b - a) * e;
      return { x: L(from.left, to.left), y: L(from.top, to.top), w: Math.max(1, L(from.width, to.width)), h: Math.max(1, L(from.height, to.height)), z: L(z0, z1), q: 1 - e };
    });
    const tilt = s => R.rx || R.ry || R.rz || R.s !== 1
      ? `translate(${s.w / 2}px,${s.h / 2}px) perspective(800px) rotateX(${R.rx * s.q}deg) rotateY(${R.ry * s.q}deg) rotate(${R.rz * s.q}deg) scale(${1 + (R.s - 1) * s.q}) translate(${-s.w / 2}px,${-s.h / 2}px) ` : "";
    const anims = [f.animate(steps.map(s => ({ transform: `translate(${s.x - base.left}px,${s.y - base.top}px) ${tilt(s)}scale(${s.w / W},${s.h / H})` })), { duration: dur, fill: "both" })];
    const pics = [];
    imgs.filter(Boolean).forEach((src, n) => {
      const nw = src.naturalWidth || W, nh = src.naturalHeight || H, s1 = Math.max(W / nw, H / nh);
      const im = document.createElement("img");
      im.decoding = "sync"; im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = src.currentSrc || src.src;
      Object.assign(im.style, { position: "absolute", width: nw * s1 + "px", height: nh * s1 + "px", left: (W - nw * s1) / 2 + "px", top: (H - nh * s1) / 2 + "px", objectFit: "fill", transformOrigin: "50% 50%", willChange: "transform" });
      f.appendChild(im); pics.push(im);
      anims.push(im.animate(steps.map(s => { const c = Math.max(s.w / nw, s.h / nh) * s.z / s1; return { transform: `scale(${c * W / s.w},${c * H / s.h})` }; }), { duration: dur, fill: "both" }));
      if (n) anims.push(im.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * .35, easing: "ease-out", fill: "forwards" }));
    });
    anims.forEach(a => a.pause());
    f.style.visibility = "hidden";
    document.body.appendChild(f);
    let done;
    const go = () => { if (!done) { f.style.visibility = ""; anims.forEach(a => a.play()); done = Promise.all(anims.map(a => capped(a, dur + 500))); } return done; };
    // decode at flight size before the first frame (capped: a slow phone still flies, just maybe a beat late)
    const ready = Promise.race([Promise.all(pics.map(im => im.decode().catch(() => {}))), new Promise(r => setTimeout(r, 160))]);
    return { el: f, ready, go };
  }
  // the photo's on-screen box inside a card (508 cards inset the photo inside a paper border) and its hover zoom
  function cardPhotoBox(ci) {
    const img = ci.querySelector("img:not(.alt)"), b = ci.getBoundingClientRect(), r = img ? img.getBoundingClientRect() : b;
    return r.width < b.width - 1 ? { rect: r, zoom: 1 } : { rect: b, zoom: r.width / b.width || 1 };
  }
  async function flyIn(card) {
    const ci = card.querySelector(".card-img") || card, srcImg = ci?.querySelector("img:not(.alt)"), target = $("#galTrack img"), mcard = $(".modal-card");
    if (!srcImg || !target) return;
    // the card may be leaning toward the cursor (732 tilt) or pinned at an angle (508 paper prints):
    // read that pose, lay the card flat to measure it, and let the flyer ease out of the same pose
    const tf = ci.style.transform || "", num = re => +((tf.match(re) || [])[1] || 0);
    const rot = { rx: num(/rotateX\((-?[\d.]+)deg/), ry: num(/rotateY\((-?[\d.]+)deg/), rz: parseFloat(ci.style.getPropertyValue("--tilt")) || 0, s: num(/scale\(([\d.]+)\)/) || 1 };
    // measure where the popup really ends up: its CSS entrance (slide up 50px) must be off first
    mcard.style.animation = "none"; mcard.style.opacity = "0";
    const keep = [ci.style.transition, ci.style.transform];
    ci.style.transition = "none"; ci.style.transform = "none";
    const { rect: from, zoom } = cardPhotoBox(ci), to = target.getBoundingClientRect();
    [ci.style.transition, ci.style.transform] = keep;   // measured flat; nothing painted in between
    if (!from.width || !to.width || from.bottom < 0 || from.top > innerHeight) { mcard.style.opacity = ""; mcard.style.animation = ""; return; }
    flyFrom = card;
    const alt = ci.querySelector("img.alt"), altOn = alt && alt.complete && +getComputedStyle(alt).opacity > .5;
    const f = flight([srcImg, altOn && alt], from, to, to, zoom, 1, 560, EASE_OUT, rot);
    target.decode().catch(() => {});   // the gallery photo decodes alongside the flight
    await f.ready;
    untilt();
    ci.style.transition = "none"; ci.style.transform = "none"; ci.style.visibility = "hidden";   // flat again for the trip back
    target.style.visibility = "hidden";   // one photo on screen at a time: the popup's own copy waits for the flyer to land
    f.go();
    // the popup fades in underneath while the photo is still landing: no hard swap at the end
    mcard.style.opacity = "";
    capped(mcard.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: 200, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }), 1000);
    await f.go();
    try { await Promise.race([target.decode(), new Promise(r => setTimeout(r, 300))]); } catch (e) {}   // never reveal a not-yet-painted photo
    // if the popup's layout moved while flying (window resized, late font), glide the last few px instead of snapping
    const now = target.getBoundingClientRect();
    if (Math.abs(now.left - to.left) + Math.abs(now.top - to.top) + Math.abs(now.width - to.width) + Math.abs(now.height - to.height) > 2)
      await capped(f.el.animate([{ transform: "none" }, { transform: `translate(${now.left - to.left}px,${now.top - to.top}px) scale(${now.width / to.width},${now.height / to.height})` }],
        { duration: 160, easing: "ease-out", fill: "forwards" }), 400);
    target.style.visibility = "";
    f.el.remove();
  }
  async function flyOut() {
    const card = flyFrom; flyFrom = null;
    if (!card || !card.isConnected) return false;
    const ci = card.querySelector(".card-img") || card, photo = [...$("#galTrack").querySelectorAll("img")]
      .find(im => { const r = im.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.width; });
    const done = () => { ci.style.visibility = ""; ci.style.transition = ""; ci.style.transform = ""; };   // 508 prints swing back to their angle
    if (!photo || REDUCE) { done(); return false; }
    const from = photo.getBoundingClientRect(), { rect: to } = cardPhotoBox(ci);
    if (!to.width || to.bottom < 0 || to.top > innerHeight) { done(); return false; }
    const f = flight([photo], from, to, from, 1, 1, 440, EASE_BACK);
    await f.ready;
    f.go();
    $(".modal-card").style.visibility = "hidden";
    $(".modal-back").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: "forwards" });
    await f.go();
    f.el.remove(); done();
    $(".modal-card").style.visibility = ""; $(".modal-back").getAnimations().forEach(a => a.cancel());
    return true;
  }
  // locking page scroll hides the scrollbar on desktop; pad for it so the page behind doesn't jump sideways
  function lockScroll(on) {
    const b = document.body, sb = innerWidth - document.documentElement.clientWidth;
    b.style.overflow = on ? "hidden" : "";
    b.style.paddingRight = on && sb > 0 ? sb + "px" : "";
  }

  function openItem(id, fromCard) {
    const i = ITEMS.find(x => String(x.id) === String(id));
    if (!i) { closeModal(); return; }
    const s = SIDES[i.side];
    const photos = (i.photos || []).filter(Boolean);
    $("#galTrack").innerHTML = photos.map((p, n) => `<img src="${esc(p)}" alt="${esc(i.title)}, photo ${n + 1}" referrerpolicy="no-referrer"${n ? ' loading="lazy"' : ""}>`).join("");
    $("#galThumbs").innerHTML = photos.length > 1 ? photos.map((p, n) => `<button data-n="${n}" class="${n ? "" : "on"}" aria-label="Photo ${n + 1}"><img src="${esc(p)}" alt="" referrerpolicy="no-referrer"></button>`).join("") : "";
    $("#galTrack").scrollLeft = 0;
    $("#mSide").innerHTML = `${esc(i.brand || "")}${i.brand ? " · " : ""}from <b>${esc(s?.owner || "")}</b>'s side (${esc(i.side)})`;
    $("#mTitle").textContent = i.title || "";
    $("#mPrice").textContent = i.status === "sold" ? "Sold" : money(i.price);
    $("#mOffer").hidden = i.status === "sold";
    const specs = [["Size", i.size], ["Condition", i.condition], ["Measurements", i.measurements], ["Status", i.status === "hold" ? "On hold" : ""]];
    $("#mSpecs").innerHTML = specs.filter(x => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    $("#mDesc").textContent = i.description || "";
    const acts = [];
    if (i.status === "sold") acts.push(`<p class="m-soldnote">This one sold. DM us, we might have something close.</p>`);
    else if (i.depop_url) acts.push(`<a class="btn primary" href="${esc(i.depop_url)}" target="_blank" rel="noopener">Buy on Depop<span class="btn-sub">Protected checkout · Depop buyer protection</span></a>`);
    acts.push(`<a class="btn${i.status !== "sold" && !i.depop_url ? " primary" : ""}" href="${DM_URL}" target="_blank" rel="noopener">${i.status === "sold" || i.depop_url ? "Ask about it on Instagram" : "DM us on Instagram to buy"}</a>`);
    // proof where the decision happens: the shop's Depop record + this side's promise
    if (i.status !== "sold" && STATS) {
      const r = Number(STATS.rating);
      acts.push(`<p class="m-trust"><span><span class="m-stars" aria-hidden="true">★★★★★</span> <b>${r.toFixed(1)}</b> · ${esc(STATS.reviews)} reviews</span><span><b>${esc(STATS.sold)}</b> sold</span>${C.PROMISE[i.side] ? `<span>✓ ${esc(C.PROMISE[i.side])}</span>` : ""}</p>`);
    }
    $("#mActions").innerHTML = acts.join("");
    if (st.side === "all" || view === "map") theme(i.side);
    const m = $("#modal");
    m.hidden = false;
    m.querySelectorAll(".modal-back, .modal-card, .m-info > *").forEach(el => { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; });
    lockScroll(true);
    modalOpen = true;
    document.title = `${i.title} | dualcoded.supply`;
    if (fromCard && !REDUCE) flyIn(fromCard);
  }

  $("#galThumbs").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const t = $("#galTrack"); t.scrollTo({ left: t.clientWidth * +b.dataset.n, behavior: REDUCE ? "auto" : "smooth" });
  });
  $("#galTrack").addEventListener("scroll", () => {
    const t = $("#galTrack"), n = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
    document.querySelectorAll("#galThumbs button").forEach((b, k) => b.classList.toggle("on", k === n));
  }, { passive: true });

  async function closeModal() {
    if (!modalOpen) return;
    modalOpen = false;
    lockScroll(false);
    document.title = "dualcoded.supply";
    theme(view === "store" ? st.side : "map");
    await flyOut();   // the photo shrinks back into its card or polaroid (when it's on screen)
    $("#modal").hidden = true;
    $(".modal-card").style.animation = "";
  }
  function closeModalNav() {
    if (modalPushed) { modalPushed = false; history.back(); }
    else { history.replaceState(null, "", "#/" + st.side); closeModal(); }
  }
  $("#modal").addEventListener("click", e => { if (e.target.closest("[data-close]")) closeModalNav(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && modalOpen) closeModalNav(); });
  $("#mShare").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); $("#mShare").textContent = "Link copied"; }
    catch (e) { $("#mShare").textContent = location.href; }
    setTimeout(() => $("#mShare").textContent = "Copy link to this piece", 1800);
  });

  // ======================= ROUTER =======================
  function route() {
    const [a, b] = location.hash.replace(/^#\/?/, "").split("/");
    if (a === "item" && b) { if (view !== "store") showStore(st.side || "all"); openItem(decodeURIComponent(b)); return; }
    closeModal(); modalPushed = false;
    if (a === "508" || a === "732" || a === "all") {
      if (view !== "store") DCFX.run(a === "all" ? "wipe" : a, () => showStore(a), fxLabel(a));
      else switchSide(a);
    } else if (view === "store") backToMap();
  }
  addEventListener("popstate", route);

  // ======================= BOOT =======================
  map = buildMap();
  DC.list().then(items => { ITEMS = items || []; computeJustSold(); }).catch(err => { console.error("Inventory failed to load", err); ITEMS = []; })
    .then(() => {
      const [a, b] = location.hash.replace(/^#\/?/, "").split("/");
      if (a === "item" && b) { const it = ITEMS.find(x => String(x.id) === decodeURIComponent(b)); showStore(it?.side || "all"); openItem(decodeURIComponent(b)); }
      else if (SIDES[a] || a === "all") showStore(a);
      map.justIn(1300);
    });
})();
