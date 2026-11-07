// dualcoded.supply site settings.
// Leave SUPABASE_URL / SUPABASE_ANON_KEY empty to run in DEMO mode
// (inventory comes from items.json, admin edits stay in this browser only).
// After you create the free Supabase project (see SETUP.md), paste its
// Project URL and "anon public" key here. The anon key is meant to be public;
// the database rules in schema.sql decide who may change anything.
window.DC_CONFIG = {
  SUPABASE_URL: "https://vmgogjfdmlchmpfarsjj.supabase.co",
  // public "anon" key: safe in the browser, writes are locked down by the rules in schema.sql
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZ29namZkbWxjaG1wZmFyc2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MDY5ODUsImV4cCI6MjEwOTQ4Mjk4NX0.-wA1kitDRthOPoOAWqyil-ymhhAbr53HtWeQEnuZKmI",

  SITE_NAME: "DUALCODED SUPPLY",
  INSTAGRAM: "dualcoded.supply",
  DEPOP_SHOP: "https://www.depop.com/harrisone20/",
  // shown until the live numbers load (the Depop sync keeps the live ones up to date)
  DEPOP_STATS: { rating: 5, reviews: 16, sold: 48 },

  SIDES: {
    "508": {
      code: "508",
      owner: "Bao",
      place: "Brockton, MA",
      name: "Vintage / Y2K",
      tagline: "Vintage, Y2K and workwear, thrifted by hand. Flaws are always shown in the photos.",
      lat: 42.0834, lon: -71.0184,
      color: "#c8742a",
    },
    "732": {
      code: "732",
      owner: "Harrison",
      place: "Holmdel, NJ",
      name: "Streetwear",
      tagline: "Bape · Stüssy · Supreme · Cactus Jack · Chrome Hearts · Gallery Dept · concert tees. Authenticity guaranteed.",
      lat: 40.3451, lon: -74.1840,
      color: "#d9d9d9",
    },
  },

  CATEGORIES: ["Tees", "Hoodies", "Jackets", "Bottoms", "Shoes", "Accessories", "Other"],
};
