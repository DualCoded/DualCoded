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
  const st = { side: "all", cat: "All", size: "", q: "", sort: "new" };
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
        out.push(`<img src="${DCFX.cemURI(color)}" alt="" style="left:${x}px;top:${y}px;z-index:${(k * 7) % 9};animation-delay:${.08 + (Math.abs(r - 2) + Math.abs(c - (n - 1) / 2)) * .09}s">`);
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
      const pv = $("#preview");
      if (!side || mobile) { pv.classList.remove("show"); return; }
      const items = avail(side).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 4);
      pv.innerHTML = items.map(i => `<img src="${esc(i.photos?.[0])}" alt="" referrerpolicy="no-referrer">`).join("");
      const [x, y] = proj([SIDES[side].lon, SIDES[side].lat]);
      let left = side === "508" ? x + 30 : x - 30 - 324, top = y + 112;
      pv.style.left = Math.max(12, Math.min(W - 336, left)) + "px";
      pv.style.top = Math.max(12, Math.min(H - 112, top)) + "px";
      pv.classList.add("show");
    }

    async function zoomIn(side) {
      hover(null);
      const [x, y] = proj([SIDES[side].lon, SIDES[side].lat]);
      [gMarkers.selectAll(".lbl"), gCities, gRoute, gNames].forEach(s => s.transition().duration(280).style("opacity", 0));
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
      [gMarkers.selectAll(".lbl"), gCities, gRoute, gNames].forEach(s => s.transition().duration(400).style("opacity", 1));
    }

    layout();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (view === "map") layout(); }, 150); });
    fetch("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json").then(r => r.json())
      .then(us => { states = topojson.feature(us, us.objects.states).features; render(); }).catch(() => {});
    return { zoomIn, zoomOut, refreshPreview: () => hovered && hover(hovered) };
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
  function heroHTML(side) {
    const n = avail(side).length, count = `${n} piece${n === 1 ? "" : "s"} available`;
    if (side === "732") return `<div class="hero-732">
        ${clusterHTML()}
        <p class="hero-who"><b>${esc(SIDES["732"].owner)}</b> · ${esc(SIDES["732"].place)} · 732</p>
        <h1 class="hero-title">Streetwear</h1>
        <p class="hero-tag">${esc(SIDES["732"].tagline)}</p>
        <p class="hero-count">${count}</p></div>`;
    if (side === "508") return `<div class="hero-508">
        <span class="hero-tape">508</span>
        <p class="hero-who"><b>${esc(SIDES["508"].owner)}</b> · ${esc(SIDES["508"].place)}</p>
        <h1 class="hero-title">Vintage / Y2K</h1>
        <p class="hero-tag">${esc(SIDES["508"].tagline)}</p>
        <p class="hero-count">${count}</p></div>`;
    return `<div class="hero-all">
        <p class="hero-who">Both racks · <b>${esc(SIDES["732"].owner)}</b> (732) and <b>${esc(SIDES["508"].owner)}</b> (508)</p>
        <h1 class="hero-title">732 <span>×</span> 508</h1>
        <p class="hero-tag">Streetwear, artist merch, vintage, Y2K and workwear. Everything up for sale right now.</p>
        <p class="hero-count">${count}</p></div>`;
  }

  function setSide(side, force) {
    if (!force && side === st.side) return;
    st.side = side; st.cat = "All"; st.size = ""; st.q = ""; $("#search").value = "";
    theme(side);
    document.querySelectorAll("#switch button").forEach(b => b.classList.toggle("on", b.dataset.side === side));
    moveBar();
    const hero = $("#hero");
    hero.innerHTML = heroHTML(side);
    hero.classList.remove("anim"); void hero.offsetWidth; hero.classList.add("anim");
    buildFilters(); renderGrid(); renderSold();
  }

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
    renderGrid();
  });
  $("#size").addEventListener("change", e => { st.size = e.target.value; renderGrid(); });
  $("#sort").addEventListener("change", e => { st.sort = e.target.value; renderGrid(); });
  let qt; $("#search").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value.trim().toLowerCase(); renderGrid(); }, 120); });

  function filtered() {
    let list = avail(st.side);
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
      en.target.style.transitionDelay = (n++ * 70) + "ms";
      en.target.classList.add("seen"); io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -30px 0px" });

  function cardHTML(i) {
    const vintage = st.side === "508";
    const tilt = vintage ? ((hash(i.id) % 5) - 2) * 0.45 : 0;
    const badge = i.status === "hold" ? `<span class="badge hold">On hold</span>` : isNew(i) ? `<span class="badge">New</span>` : "";
    const mark = st.side === "all" ? (i.side === "732" ? `<span class="side-mark t732">732</span>` : `<span class="side-mark t508">508</span>`) : "";
    const alt = i.photos?.[1] ? `<img class="alt" src="${esc(i.photos[1])}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
    const tape = vintage ? `<span class="tape">${money(i.price)}${i.size ? `<small>size ${esc(i.size)}</small>` : ""}</span>` : "";
    return `<article class="card" data-id="${esc(i.id)}" tabindex="0">
      <div class="card-img" style="--tilt:${tilt}deg">${badge}${mark}
        <img src="${esc(i.photos?.[0] || "")}" alt="${esc(i.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">${alt}${tape}</div>
      <div class="card-info">
        <p class="card-brand">${esc(i.brand)}</p>
        <h3 class="card-title">${esc(i.title)}</h3>
        ${vintage ? "" : `<div class="card-meta"><span>${esc(i.size)}</span><b>${money(i.price)}</b></div>`}
      </div></article>`;
  }

  function renderGrid() {
    const list = filtered(), grid = $("#grid");
    $("#empty").hidden = list.length > 0;
    grid.innerHTML = list.map(cardHTML).join("");
    grid.querySelectorAll(".card").forEach(c => REDUCE ? c.classList.add("seen") : io.observe(c));
  }
  $("#grid").addEventListener("click", e => { const c = e.target.closest(".card"); if (c) openItemNav(c.dataset.id); });
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
  }
  renderStats(C.DEPOP_STATS);
  DC.stats().then(s => { if (s) { renderStats(s); if (view === "store") renderSold(); } }).catch(() => {});

  // ======================= ITEM =======================
  function openItemNav(id) {
    history.pushState(null, "", "#/item/" + encodeURIComponent(id));
    modalPushed = true; openItem(id);
  }

  function openItem(id) {
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
    const specs = [["Size", i.size], ["Condition", i.condition], ["Measurements", i.measurements], ["Status", i.status === "hold" ? "On hold" : ""]];
    $("#mSpecs").innerHTML = specs.filter(x => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    $("#mDesc").textContent = i.description || "";
    const acts = [];
    if (i.status === "sold") acts.push(`<p class="m-soldnote">This one sold. DM us, we might have something close.</p>`);
    else if (i.depop_url) acts.push(`<a class="btn primary" href="${esc(i.depop_url)}" target="_blank" rel="noopener">Buy on Depop ↗</a>`);
    acts.push(`<a class="btn${i.status !== "sold" && !i.depop_url ? " primary" : ""}" href="${DM_URL}" target="_blank" rel="noopener">${i.status === "sold" || i.depop_url ? "Ask about it on Instagram" : "DM us on Instagram to buy"}</a>`);
    $("#mActions").innerHTML = acts.join("");
    if (st.side === "all") theme(i.side);
    const m = $("#modal");
    m.hidden = false;
    m.querySelectorAll(".modal-back, .modal-card, .m-info > *").forEach(el => { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; });
    document.body.style.overflow = "hidden";
    modalOpen = true;
    document.title = `${i.title} | dualcoded.supply`;
  }

  $("#galThumbs").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const t = $("#galTrack"); t.scrollTo({ left: t.clientWidth * +b.dataset.n, behavior: REDUCE ? "auto" : "smooth" });
  });
  $("#galTrack").addEventListener("scroll", () => {
    const t = $("#galTrack"), n = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
    document.querySelectorAll("#galThumbs button").forEach((b, k) => b.classList.toggle("on", k === n));
  }, { passive: true });

  function closeModal() {
    if (!modalOpen) return;
    modalOpen = false;
    $("#modal").hidden = true;
    document.body.style.overflow = "";
    document.title = "dualcoded.supply";
    if (view === "store") theme(st.side);
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
  DC.list().then(items => { ITEMS = items || []; }).catch(err => { console.error("Inventory failed to load", err); ITEMS = []; })
    .then(() => {
      const [a, b] = location.hash.replace(/^#\/?/, "").split("/");
      if (a === "item" && b) { const it = ITEMS.find(x => String(x.id) === decodeURIComponent(b)); showStore(it?.side || "all"); openItem(decodeURIComponent(b)); }
      else if (SIDES[a] || a === "all") showStore(a);
      map.refreshPreview();
    });
})();
