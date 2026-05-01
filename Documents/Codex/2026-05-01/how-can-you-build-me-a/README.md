# PocketPilot

PocketPilot is a static PWA with optional Supabase authentication and cloud saving.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase-schema.sql`.
3. In Supabase Auth settings, add your deployed Vercel URL to allowed redirect URLs.
4. Copy your project URL and public anon key into `supabase-config.js`:

```js
window.POCKETPILOT_SUPABASE = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_PUBLIC_ANON_KEY"
};
```

The anon key is safe to ship in a browser app when Row Level Security is enabled. Do not put a Supabase service role key in this app.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, import the repo.
3. Use the default static settings. There is no build command and no output directory needed.
4. Deploy.

Because this is a static app, Vercel can serve `index.html` directly. Supabase handles auth and database access from the browser.

## PWA

The app includes:

- `manifest.webmanifest`
- `sw.js`
- `icon.svg`
- install-to-home-screen support on supported browsers

Service workers require HTTPS or localhost, so PWA install behavior works after deploying to Vercel or serving locally with a web server.
