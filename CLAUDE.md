# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Required skills

Always use the following skills for work in this project:

- **ui-ux-pro-max** — for any UI/UX design, styling, component, or design-system work.
- **design-taste-frontend** — for landing pages, portfolio pages, or frontend redesigns, to avoid generic/templated output.
- **ponytail** — for all coding tasks (write/add/refactor/fix/review). Keep solutions minimal, avoid over-engineering, prefer stdlib/native/existing dependencies over new code or new packages.
- **caveman** — for all responses. Keep communication terse and compressed; drop filler, keep technical accuracy.

Invoke these proactively when the task matches, without waiting for the user to name them explicitly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
