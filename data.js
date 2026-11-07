// Inventory data layer shared by the store (index.html) and admin.html.
// LIVE mode = Supabase (when config.js has keys). DEMO mode = items.json,
// with admin edits kept in this browser's localStorage only.
(function () {
  const C = window.DC_CONFIG;
  const LIVE = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  const DEMO_KEY = "dc_demo_items_v1";
  let sb = null;

  function client() {
    if (!LIVE) return null;
    if (!sb) sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    return sb;
  }

  function demoRead() {
    try { const raw = localStorage.getItem(DEMO_KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function demoWrite(items) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(items)); }
    catch (e) { throw new Error("Browser storage is full (demo mode keeps photos in the browser). Remove a photo or connect Supabase."); }
  }
  async function demoItems() {
    const saved = demoRead();
    if (saved) return saved;
    const res = await fetch("items.json", { cache: "no-cache" });
    return res.json();
  }

  function slug(s) {
    return (s || "item").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "")
      .trim().replace(/[\s_]+/g, "-").slice(0, 48) + "-" + Math.random().toString(36).slice(2, 6);
  }

  const byNewest = (a, b) => (b.created_at || "").localeCompare(a.created_at || "");

  async function list() {
    if (LIVE) {
      const { data, error } = await client().from("items").select("*").neq("status", "hidden")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
    return (await demoItems()).filter(i => i.status !== "hidden").sort(byNewest);
  }

  async function listAll() {
    if (LIVE) {
      const { data, error } = await client().from("items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
    return (await demoItems()).sort(byNewest);
  }

  async function save(item) {
    const row = { ...item };
    if (row.status === "sold" && !row.sold_at) row.sold_at = new Date().toISOString();
    if (row.status !== "sold") row.sold_at = null;
    if (LIVE) {
      if (!row.id) delete row.id;
      const { data, error } = await client().from("items").upsert(row).select().single();
      if (error) throw error;
      return data;
    }
    const items = await demoItems();
    if (!row.id) { row.id = slug(row.title); row.created_at = new Date().toISOString(); items.push(row); }
    else {
      const i = items.findIndex(x => x.id === row.id);
      if (i >= 0) items[i] = row; else items.push(row);
    }
    demoWrite(items);
    return row;
  }

  async function remove(id) {
    if (LIVE) {
      const { error } = await client().from("items").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    demoWrite((await demoItems()).filter(i => i.id !== id));
  }

  // Shrink a photo in the browser before upload (phones take 4-12 MB shots).
  function shrink(file, maxSide = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, maxSide / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(b => b ? resolve(b) : reject(new Error("Could not read that photo")), "image/jpeg", quality);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("Could not read that photo (try JPG or PNG)"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function upload(file) {
    if (LIVE) {
      const blob = await shrink(file);
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
      const { error } = await client().storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      return client().storage.from("photos").getPublicUrl(path).data.publicUrl;
    }
    const blob = await shrink(file, 900, 0.7);
    return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  }

  const auth = {
    async user() {
      if (!LIVE) return { email: "demo mode" };
      const { data } = await client().auth.getUser();
      return data.user;
    },
    async signIn(email, password) {
      const { error } = await client().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() { if (LIVE) await client().auth.signOut(); },
  };

  function resetDemo() { localStorage.removeItem(DEMO_KEY); }

  // Depop shop rating / reviews / sold count (kept fresh by the Depop sync); config.js has a fallback
  async function stats() {
    if (LIVE) {
      const { data, error } = await client().from("shop_stats").select("rating,reviews,sold").eq("id", 1).maybeSingle();
      if (!error && data) return data;
    }
    return C.DEPOP_STATS || null;
  }

  window.DC = { LIVE, list, listAll, save, remove, upload, auth, resetDemo, stats };
})();
