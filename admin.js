// Admin page: add / edit / mark sold. LIVE = Supabase login, DEMO = this browser only.
(function () {
  const C = window.DC_CONFIG;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let ITEMS = [], filter = "active", cur = null, photos = [], side = "732", uploading = 0;

  $("#mode").textContent = DC.LIVE ? "LIVE" : "DEMO";
  $("#mode").classList.toggle("live", DC.LIVE);
  $("#fCat").innerHTML = C.CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("");

  function toast(t) {
    const d = document.createElement("div"); d.className = "toast"; d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2000);
  }

  // ---------- auth ----------
  async function start() {
    const u = await DC.auth.user().catch(() => null);
    if (!u) { $("#login").hidden = false; $("#app").hidden = true; return; }
    $("#login").hidden = true; $("#app").hidden = false;
    $("#signOut").hidden = !DC.LIVE;
    $("#demoBanner").hidden = DC.LIVE;
    await load();
  }
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault(); $("#loginMsg").textContent = "";
    try { await DC.auth.signIn($("#em").value.trim(), $("#pw").value); await start(); }
    catch (err) { $("#loginMsg").textContent = err.message || "Sign in failed"; }
  });
  $("#signOut").addEventListener("click", async () => { await DC.auth.signOut(); location.reload(); });
  $("#resetDemo").addEventListener("click", async () => {
    if (!confirm("Throw away demo edits and go back to the starting inventory?")) return;
    DC.resetDemo(); await load(); toast("Demo reset");
  });

  // ---------- list ----------
  async function load() {
    try { ITEMS = await DC.listAll(); }
    catch (e) { $("#list").innerHTML = `<p class="msg">Could not load inventory: ${esc(e.message)}</p>`; return; }
    if (DC.LIVE && !ITEMS.length) {
      $("#list").innerHTML = `<p class="stats">The live database is empty.</p><button class="add" id="importBtn" style="margin:0">Import starting inventory (the Depop items)</button>`;
      $("#importBtn").onclick = async () => {
        $("#importBtn").disabled = true;
        const seed = await (await fetch("items.json", { cache: "no-cache" })).json();
        for (const s of seed) { const { id, ...row } = s; await DC.save(row); }
        toast(`Imported ${seed.length} items`); await load();
      };
      return;
    }
    $("#brandList").innerHTML = [...new Set(ITEMS.map(i => i.brand).filter(Boolean))].sort().map(b => `<option value="${esc(b)}">`).join("");
    render();
  }

  function render() {
    const list = ITEMS.filter(i =>
      filter === "active" ? i.status !== "sold" :
      filter === "sold" ? i.status === "sold" : (i.side === filter && i.status !== "sold"));
    const live = ITEMS.filter(i => i.status === "available" || i.status === "hold");
    const val = live.reduce((s, i) => s + (+i.price || 0), 0);
    $("#stats").textContent = `${live.length} up for sale ($${val.toLocaleString()} listed) · 508: ${live.filter(i => i.side === "508").length} · 732: ${live.filter(i => i.side === "732").length} · ${ITEMS.filter(i => i.status === "sold").length} sold`;
    $("#list").innerHTML = list.map(i => {
      const color = i.side === "508" ? "var(--c508)" : "var(--c732)";
      const pill = i.status === "hold" ? `<span class="pill">ON HOLD</span>` : i.status === "hidden" ? `<span class="pill">HIDDEN</span>` : i.featured ? `<span class="pill">FEATURED</span>` : "";
      return `<div class="row${i.status === "sold" ? " sold" : ""}" data-id="${esc(i.id)}">
        ${i.photos?.[0] ? `<img src="${esc(i.photos[0])}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<div class="noimg"></div>`}
        <div><h3>${esc(i.title)}${pill}</h3>
          <p><span class="side" style="color:${color}">${esc(i.side)}</span> · ${esc(i.brand || "")} · ${esc(i.size || "-")} · $${esc(i.price ?? "")}</p></div>
        <div class="acts">
          ${i.status === "sold" ? `<button class="back-btn" data-act="avail">Back up</button>` : `<button class="sold-btn" data-act="sold">Sold</button>`}
          <button data-act="edit">Edit</button>
        </div></div>`;
    }).join("") || `<p class="stats">Nothing here.</p>`;
  }

  $("#tabs").addEventListener("click", e => {
    const t = e.target.closest(".tab"); if (!t) return;
    filter = t.dataset.f;
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b === t));
    render();
  });

  $("#list").addEventListener("click", async e => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const item = ITEMS.find(i => String(i.id) === b.closest(".row").dataset.id);
    if (b.dataset.act === "edit") return openEditor(item);
    b.disabled = true;
    try {
      await DC.save({ ...item, status: b.dataset.act === "sold" ? "sold" : "available" });
      toast(b.dataset.act === "sold" ? "Marked sold" : "Back on the site");
      await load();
    } catch (err) { alert(err.message); b.disabled = false; }
  });

  // ---------- editor ----------
  $("#addBtn").addEventListener("click", () => openEditor(null));

  function setSide(v) {
    side = v;
    document.querySelectorAll("#sideSeg button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  }
  $("#sideSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setSide(b.dataset.v); });

  function openEditor(item) {
    cur = item;
    $("#edTitle").textContent = item ? "EDIT ITEM" : "ADD ITEM";
    setSide(item?.side || (filter === "508" ? "508" : "732"));
    photos = [...(item?.photos || [])];
    $("#fTitle").value = item?.title || "";
    $("#fBrand").value = item?.brand || "";
    $("#fCat").value = item?.category || C.CATEGORIES[0];
    $("#fSize").value = item?.size || "";
    $("#fPrice").value = item?.price ?? "";
    $("#fCond").value = item?.condition || "";
    $("#fMeas").value = item?.measurements || "";
    $("#fDesc").value = item?.description || "";
    $("#fDepop").value = item?.depop_url || "";
    $("#fStatus").value = item?.status || "available";
    $("#fFeat").checked = !!item?.featured;
    $("#delBtn").hidden = !item;
    $("#edMsg").textContent = "";
    renderPhotos();
    $("#editor").hidden = false;
    document.body.style.overflow = "hidden";
    $(".ed").scrollTop = 0;
  }
  function closeEditor() { $("#editor").hidden = true; document.body.style.overflow = ""; }
  $("#editor").addEventListener("click", e => { if (e.target.closest("[data-close]")) closeEditor(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !$("#editor").hidden) closeEditor(); });

  function renderPhotos() {
    $("#photos").innerHTML = photos.map((p, n) => `<div class="ph">
        <img src="${esc(p)}" alt="" referrerpolicy="no-referrer">${n === 0 ? `<span class="cover">COVER</span>` : ""}
        <div class="tools">
          <button type="button" data-ph="left" data-n="${n}" aria-label="Move left">←</button>
          <button type="button" data-ph="del" data-n="${n}" aria-label="Remove">✕</button>
          <button type="button" data-ph="right" data-n="${n}" aria-label="Move right">→</button>
        </div></div>`).join("") +
      `<label class="upl" for="fileIn" style="margin:0;text-transform:none;letter-spacing:0;font-family:inherit">${uploading ? `Uploading ${uploading}…` : `<b>+</b>Add photos`}</label>`;
  }
  $("#photos").addEventListener("click", e => {
    const b = e.target.closest("button[data-ph]"); if (!b) return;
    const n = +b.dataset.n;
    if (b.dataset.ph === "del") photos.splice(n, 1);
    else {
      const m = b.dataset.ph === "left" ? n - 1 : n + 1;
      if (m < 0 || m >= photos.length) return;
      [photos[n], photos[m]] = [photos[m], photos[n]];
    }
    renderPhotos();
  });
  $("#fileIn").addEventListener("change", async e => {
    const files = [...e.target.files]; e.target.value = "";
    uploading += files.length; renderPhotos(); $("#saveBtn").disabled = true;
    for (const f of files) {
      try { photos.push(await DC.upload(f)); }
      catch (err) { $("#edMsg").textContent = err.message || "Upload failed"; }
      uploading--; renderPhotos();
    }
    $("#saveBtn").disabled = uploading > 0;
  });

  $("#edForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!photos.length) { $("#edMsg").textContent = "Add at least one photo."; return; }
    const row = {
      ...(cur || {}),
      side, photos,
      title: $("#fTitle").value.trim(),
      brand: $("#fBrand").value.trim(),
      category: $("#fCat").value,
      size: $("#fSize").value.trim(),
      price: Number($("#fPrice").value) || 0,
      condition: $("#fCond").value.trim(),
      measurements: $("#fMeas").value.trim(),
      description: $("#fDesc").value.trim(),
      depop_url: $("#fDepop").value.trim(),
      status: $("#fStatus").value,
      featured: $("#fFeat").checked,
    };
    $("#saveBtn").disabled = true;
    try { await DC.save(row); closeEditor(); toast("Saved"); await load(); }
    catch (err) { $("#edMsg").textContent = err.message || "Save failed"; }
    finally { $("#saveBtn").disabled = false; }
  });

  $("#delBtn").addEventListener("click", async () => {
    if (!cur || !confirm(`Delete "${cur.title}" for good? (Use "Sold" instead to keep it in Recently Sold.)`)) return;
    try { await DC.remove(cur.id); closeEditor(); toast("Deleted"); await load(); }
    catch (err) { $("#edMsg").textContent = err.message; }
  });

  start();
})();
