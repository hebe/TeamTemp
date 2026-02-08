# TX Temp

A quick, anonymous temperature check for your team. No tracking, no judgments — just honest signals.

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Once the project is ready, go to **Settings → API** and note your:
   - **Project URL** (looks like `https://abc123.supabase.co`)
   - **anon public key** (a long `eyJ...` string)

### 2. Set up the database

1. In your Supabase dashboard, go to **SQL Editor**.
2. Paste the contents of `supabase/schema.sql` and run it. This creates all the tables.
3. Then paste the contents of `supabase/seed.sql` and run it. This creates a demo team called "Texty Beasts" with sample data.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo walkthrough

After running the seed script, you have a team "Texty Beasts" with:

- **Admin page:** [/admin/demo-admin-token-abc123](http://localhost:3000/admin/demo-admin-token-abc123)
- **Dashboard:** [/t/tx](http://localhost:3000/t/tx)
- **Open round (respond):** [/r/demo-round-4](http://localhost:3000/r/demo-round-4)

### How to verify each feature

#### Schema + seed
- [ ] Tables appear in Supabase Table Editor
- [ ] `teams` has one row ("Texty Beasts")
- [ ] `question_bank` has 10 questions (4 fixed + 6 rotating)
- [ ] `rounds` has 4 rows (3 closed, 1 open)

#### Admin — create round
- [ ] Go to `/admin/demo-admin-token-abc123`
- [ ] See existing rounds listed with status badges
- [ ] Click "Create new round" — a new round appears with a respond link
- [ ] "Copy link" copies the `/r/[token]` URL

#### Response page — submit
- [ ] Open a respond link (e.g., `/r/demo-round-4`)
- [ ] See one question at a time with progress bar
- [ ] Select an answer — auto-advances to next question
- [ ] After last question, see optional free-text field
- [ ] Submit and see "Thanks — temperature recorded"
- [ ] Going back to the same link still works (no duplicate prevention yet)

#### Dashboard — aggregates
- [ ] Go to `/t/tx`
- [ ] See cards for each fixed question with sparklines
- [ ] See "What seems different since last time?" section
- [ ] "Mixed signals" badge appears where spread is high
- [ ] If fewer than 4 responses exist for a round, it shows "Not enough responses yet"

#### Retro view
- [ ] Click "Open retro view for latest round" from dashboard
- [ ] See "Signals worth discussing" with lowest avg and highest spread
- [ ] See "Questions to ask" and "Small experiments to try"

#### Settings editor
- [ ] On admin page, scroll to Settings section
- [ ] Change cadence, scale, min responses, free text toggle
- [ ] Changes persist after page refresh

## Project structure

```
src/
  app/
    page.tsx                     Landing page
    layout.tsx                   Root layout
    globals.css                  Tailwind + theme colors
    r/[token]/page.tsx           Response flow
    t/[teamSlug]/page.tsx        Dashboard (server component)
    t/[teamSlug]/DashboardClient.tsx  Dashboard UI (client)
    t/[teamSlug]/retro/[roundId]/page.tsx  Retro view
    admin/[token]/page.tsx       Admin area
    api/
      respond/route.ts           POST submit responses
      admin/
        create-round/route.ts    POST create round
        close-round/route.ts     POST close round
        settings/route.ts        GET/PUT team settings
        questions/route.ts       POST/DELETE questions
  lib/
    supabase.ts                  Supabase client
    queries.ts                   All database queries
  components/
    Sparkline.tsx                SVG sparkline chart
    MixedSignals.tsx             "Mixed signals" badge
supabase/
  schema.sql                     Database schema
  seed.sql                       Demo data
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repo.
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. That's it.

## Supabase Row Level Security (RLS)

The seed data and current setup use the Supabase **anon key** without RLS policies. For a production deployment, you should add RLS policies. For this internal-tool prototype, the anon key + obscure tokens provide basic access control.
