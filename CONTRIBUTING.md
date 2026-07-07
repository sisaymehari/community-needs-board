# Contributing to Community Needs Board

Thanks for being here. This is an open project and contributions of any kind are welcome — code, design ideas, bug reports, or just trying it out and telling us what's confusing.

## What this is part of

Community Needs Board is the first piece of something bigger called **Community OS** — an open-source suite of tools for local charities and community organisations. The idea is that small charities shouldn't need to spend money on software or rely on big platforms to do basic coordination. This board is the starting point: a simple, public space where organisations post what they need and people can respond directly.

If that vision interests you, there's a lot of ground to cover. Jump in wherever makes sense.

## Running it locally

See the [README](./README.md) for the full setup steps. The short version:

1. Clone the repo and run `npm install`
2. Create a `.env.local` file with your Supabase URL and anon key
3. Run `npm run dev` and open `http://localhost:3000`

You'll need a Supabase project with `organisations`, `needs`, and `offers` tables. The schema is straightforward — the column names in the code match the table structure directly.

## Tech stack

- **Next.js** (App Router) — server components for data fetching, client components for interactivity
- **TypeScript** — types live in `lib/types.ts`
- **Supabase** — Postgres database plus the JS client for reads and writes
- **Plain CSS** — no component library, styles live in `app/globals.css` and inline on components
- **Deployed on Netlify**

There's no build step beyond `npm run dev` for local work. No test suite yet either — that's another area where help would be appreciated.

## Where contributions are especially welcome

**Authentication** — the project has no login system at the moment. Organisations post needs and receive offers entirely without accounts. That keeps the barrier to entry low, but it also means anyone can mark any need as fulfilled or submit a bogus offer. Adding even a lightweight auth layer (email magic links via Supabase Auth would fit the stack well) would be a meaningful improvement.

Other areas:
- Email notifications when an offer is submitted
- Admin view for organisations to manage their own needs
- Better filtering and search on the board
- Accessibility improvements
- Tests

## Submitting a pull request

1. Fork the repo
2. Create a branch with a short descriptive name (`add-email-notifications`, `fix-mobile-filter-wrap`)
3. Make your changes — keep commits focused and the diff readable
4. Open a PR against `main` with a short description of what you changed and why

There's no formal review process or contribution checklist. If the change makes sense and doesn't break anything obvious, it'll get merged. If you're unsure whether something is worth building, open an issue or start a discussion first — that's always a good idea for bigger changes.

## Questions

Open an issue or reach out directly. This is a small project and there's no bureaucracy here.
