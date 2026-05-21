<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- **Single-service app**: This is a standalone Next.js 16 app. The only service is the dev server (`npm run dev` on port 3000).
- **No env vars, no database, no external services required.** All data is static TypeScript in `src/data/`.
- **Package manager**: npm (lockfile is `package-lock.json`).
- **Available npm scripts**: `dev`, `build`, `start`, `lint` — see `package.json`.
- **No test framework** is configured; there is no `test` script.
- **Simulator state** persists in browser `localStorage` only.
- **Next.js 16 docs**: Before modifying Next.js code, read guides in `node_modules/next/dist/docs/` as APIs differ from earlier versions.
