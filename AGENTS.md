<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

## Tailwind v4 only — do NOT use v3 syntax

This project uses Tailwind CSS v4. Never use v3 class names.

- Gradients: `bg-linear-to-br` NOT `bg-gradient-to-br` (also -to-r, -to-t, -to-l, etc.)
- Arbitrary spacing: prefer scale values like `max-w-50` over `max-w-[200px]` when a numeric scale value fits (v4's spacing scale is generated from a `--spacing` variable, so numeric utilities aren't capped at the old fixed steps)
- Config: no `tailwind.config.js` — use `@theme` in CSS, imported via `@import "tailwindcss";`
- No `@tailwind base/components/utilities` directives — that's v3
- `shadow-sm` → `shadow-xs`, `rounded-sm` → `rounded-xs` (size scale shifted)
- Ring default width is 1px now, not 3px — don't assume old ring sizing
- Renamed: `flex-shrink-0` → `shrink-0`, `flex-grow` → `grow`

If unsure whether a utility is v3 or v4, check https://tailwindcss.com/docs for the current name before writing it.

<!-- END:nextjs-agent-rules -->
