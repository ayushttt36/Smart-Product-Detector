<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Base44 dev environment

This is a **TanStack Start SSR** app (Vite + React 19) built with Lovable. It runs
entirely as a frontend/SSR process — there is **no local database**. All data and
auth go to a **remote Supabase** project (`lqnbaepxjtetjtdxtglh.supabase.co`) using
the public publishable key already committed in `.env` / `.env.base44-defaults`.

### Running here
- `docker compose -f docker-compose.base44.yml up -d` starts a single `web` service
  (`node:22`) that runs `npm install` then `vite dev --host 0.0.0.0 --port 3000`.
- Source is bind-mounted, so edits hot-reload (polling enabled via `CHOKIDAR_USEPOLLING`
  because bind mounts don't always emit inotify events).
- Health: `curl -sf http://127.0.0.1:3000/` → 200 with SSR HTML.

### Environment
- Supabase publishable keys (anon, safe to ship) live in `.env.base44-defaults`,
  loaded first. Real external secrets come from `/run/base44/app.env` (loaded last,
  always wins).
- `LOVABLE_API_KEY` (optional) powers the in-app chatbot via the Lovable AI Gateway.
  The app boots fine without it; only the chat assistant returns an error.
- `SUPABASE_SERVICE_ROLE_KEY` is referenced by `client.server.ts` but only created
  lazily on first admin access, so it is not needed to boot.

### Notes
- The Vite config is provided by `@lovable.dev/vite-tanstack-config` (do not add
  plugins like `viteReact`, `tailwindcss`, `tsConfigPaths` manually — it already
  includes them). It bundles its own sandbox host/port detection.
- SSR entry is redirected to `src/server.ts` via `vite.config.ts` →
  `tanstackStart.server.entry`.
