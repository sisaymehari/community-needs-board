# Community Needs Board

A free, open-source platform where local charities and community organisations post what they need — volunteers, food, equipment, skills — and anyone in the community can see it and offer to help directly.

No sign-up required to browse. No middlemen. Just a simple, public board.

**Live demo:** [community-needs-board.netlify.app](https://community-needs-board.netlify.app)

---

## How it works

1. A charity visits the site and posts a need — what they need, what category it falls into, and whether it's urgent.
2. Anyone can browse the board and see what's needed nearby.
3. If you can help, you click "Offer to Help" on a need and leave your name, email, and a message. The charity gets that directly.
4. Once a need is met, it's marked as fulfilled and disappears from the board.

---

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) — Postgres database + auth
- Deployed on [Netlify](https://netlify.com)

---

## Running locally

**1. Clone the repo**

```bash
git clone https://github.com/sisaymehari/community-needs-board.git
cd community-needs-board
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

Create a `.env.local` file in the root of the project:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these in your Supabase project under **Settings → API**.

**4. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Background

This project is part of a broader vision called **Community OS** — a set of simple, open tools built to help local communities and the organisations that serve them work better together.

The goal isn't to build another platform. It's to solve real, specific problems that charities and community groups face every day, starting with visibility: who needs what, and how can people help.

Contributions are welcome. If you have an idea, spot a bug, or want to adapt this for your own community, open an issue or a pull request.
