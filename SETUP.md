# dualcoded.supply website: going live

The site runs right now in **DEMO mode** (inventory from `items.json`, admin edits stay in one browser).
Going live is free and takes about 20 minutes. You make the accounts; nothing here needs a credit card.

## 1. Database + photo storage (Supabase, free)
1. Go to https://supabase.com, sign up, **New project** (name: `dualcoded`, pick any region near Boston/NY, save the DB password somewhere).
2. Left menu **SQL Editor** → New query → paste all of `schema.sql`.
   **Change the two example emails at the bottom to your real emails**, then **Run**.
3. **Authentication → Users → Add user** → create one user for each of you (same emails, choose passwords, tick "Auto confirm").
4. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up" (so strangers can't make accounts).
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `config.js`
   (`SUPABASE_URL` and `SUPABASE_ANON_KEY`). The anon key is safe to be public; the rules in `schema.sql` protect writes.
6. Open `admin.html`, sign in, click **Import starting inventory** once.

Note: free Supabase projects pause after 7 days with zero visits. If the site ever shows no items, log in to supabase.com and press **Restore**.

## 2. Hosting (GitHub Pages, free, fixed link)
1. Make a GitHub account → **New repository** named `dualcoded` (Public).
2. **Add file → Upload files** → drag in everything in this `dualcoded_site` folder → Commit.
3. **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main` / root → Save.
4. In a minute the site is live at `https://<your-github-name>.github.io/dualcoded/`.
   Admin page: same link + `admin.html` (bookmark it on both phones).

Optional: buy a domain like `dualcoded.shop` (~$10-30/yr) and add it under Settings → Pages → Custom domain.

## 3. QR code + Instagram
- Put the site link in the Instagram bio (replace or next to the Depop link).
- QR code: any free generator pointed at the site link. The link never changes, so print it once
  (stickers, dorm flyers, hang tags). Item links (`#/item/...`) also work for sharing single pieces.

## Day to day
- New piece: admin → **+ Add item** → pick 508 or 732 → photos → price → Save. It's live instantly.
- Sold: tap **Sold** on the row. It moves to the "Recently sold" strip on the site.
- Paste the Depop link when you also list it there, so buyers get a "Buy on Depop" button.
