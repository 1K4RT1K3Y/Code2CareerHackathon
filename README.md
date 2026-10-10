# RolePath AI

A self-paced, role-specific learning workspace built with **Next.js + TypeScript**, **Vercel AI Gateway / AI SDK**, and **Supabase**. The project is designed as an MVP you can run locally, customise, push to GitHub, and deploy on Vercel.

## What’s included

- **Dynamic 4-module curriculum generator** that adapts to the learner’s background, desired role, current level, weekly study time, and focus skills.
- **AI micro-tutor** with streaming text responses, role-aware explanations, code help, and a short check-for-understanding question.
- **Structured mock-interview evaluator** with a score out of 10, strengths, blind spots, and a targeted follow-up question.
- **Generated knowledge checks** with five multiple-choice questions, answer validation, explanations, and a result summary.
- **Learning progress UI** with module completion, estimated hours, progress rings, toast feedback, and a celebratory completion badge.
- **Supabase authentication and persistence** for generated paths, completed modules, and interview sessions. If Supabase variables are omitted, the UI can still be explored in local demo mode using browser local storage.
- **Supabase row-level security (RLS)** policies so signed-in users can only read and write their own records.

## Stack

- Next.js App Router and React
- TypeScript
- Vercel AI SDK using Vercel AI Gateway model IDs
- Zod-based structured output schemas
- Supabase Auth, Postgres, and `@supabase/ssr`
- Lucide icons and custom responsive CSS

## 1. Run it locally

Use Node.js 20.9 or later. In a terminal, open the extracted `rolepath-ai` folder:

Install dependencies with `npm install`, then create a local `.env.local` file in the project root.

Open `.env.local` and fill in at least the Vercel AI Gateway key and model:

```dotenv
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
AI_GATEWAY_MODEL=openai/gpt-4o-mini
```

Use a model ID that is available in your Vercel AI Gateway account and supports structured output for the curriculum, quiz, and interview endpoints. You can change the model later without changing application code.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Demo mode:** Without Supabase variables, the dashboard and sample curriculum are still available. AI actions need a valid AI Gateway key. To use account sign-in and database persistence, complete the Supabase setup below.

## 2. Configure Supabase

1. Create a project in Supabase.
2. In **Project Settings → API** (or **Connect**), copy the Project URL and publishable key. Older projects may show an `anon` key; the app supports either.
3. Add them to `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   # Or use NEXT_PUBLIC_SUPABASE_ANON_KEY=your_legacy_anon_key
   ```

4. In the Supabase Dashboard, open **SQL Editor → New query**. Paste and run [`supabase/schema.sql`](./supabase/schema.sql).
5. In **Authentication → URL Configuration**, set your local Site URL to `http://localhost:3000`. Add your deployed Vercel URL to the allowed redirect URLs after deployment.
6. Restart the local dev server so the environment variables are loaded.
7. Visit `/login` to create an account or sign in. Depending on your Supabase email-confirmation settings, you may need to confirm the address before signing in.

The database stores learning path JSON, module completion records, and interview question/answer evaluation JSON. Supabase RLS policies restrict those tables to the authenticated owner.

## 3. Configure Vercel AI Gateway

1. Open your Vercel dashboard and enable/create an AI Gateway key.
2. Add `AI_GATEWAY_API_KEY` as a **server-side** environment variable. Do not give it the `NEXT_PUBLIC_` prefix.
3. Set `AI_GATEWAY_MODEL` to a model ID available in your account, for example `openai/gpt-4o-mini` if available to you.
4. Keep the key out of Git. Environment files are ignored by `.gitignore`.

The AI routes use model strings through the AI SDK and server-side schema validation through Zod. The structured endpoints return real JSON objects rather than requiring the frontend to strip markdown from text. The tutor endpoint returns a streamed text response.

## 4. Deploy to Vercel

1. Create a GitHub repository and push this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial RolePath AI MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/rolepath-ai.git
   git push -u origin main
   ```

   Replace the repository URL with your own GitHub repository. If you already have a repository, use its existing remote instead of adding another one.

2. In Vercel, select **Add New → Project**, import the GitHub repository, and deploy with the default Next.js settings.
3. Under **Project → Settings → Environment Variables**, add:
   - `AI_GATEWAY_API_KEY`
   - `AI_GATEWAY_MODEL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Redeploy after setting environment variables.
5. Add the deployed `https://your-app.vercel.app` URL to Supabase Auth’s Site URL / allowed redirect URLs.

## API routes

| Route | Purpose | Response style |
| --- | --- | --- |
| `POST /api/learning-path` | Generate exactly four curriculum modules | Zod-validated JSON object |
| `POST /api/tutor` | Explain concepts or review code in context | Streaming text response |
| `POST /api/interview` | Score a candidate response | Zod-validated scorecard JSON |
| `POST /api/quiz` | Generate a five-question module quiz | Zod-validated quiz JSON |

## Project structure

```text
rolepath-ai/
├── app/
│   ├── api/
│   │   ├── interview/route.ts
│   │   ├── learning-path/route.ts
│   │   ├── quiz/route.ts
│   │   └── tutor/route.ts
│   ├── login/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard-app.tsx
│   ├── login-form.tsx
│   └── quiz-modal.tsx
├── lib/
│   ├── prompts/index.ts
│   ├── schemas.ts
│   ├── ai.ts
│   └── supabase/
├── supabase/schema.sql
├── proxy.ts
├── .env.example
└── package.json
```

## Important production notes

- This is a functional MVP scaffold, not a fully hardened multi-tenant SaaS launch. Before a public launch, add per-user request quotas/rate limiting, abuse monitoring, and a spending limit in AI Gateway.
- Never expose an AI Gateway key or Supabase service-role key to the browser. This app only needs the Supabase publishable/anon key on the client and relies on RLS for table access.
- The tutor’s streaming output is plain text, while curriculum/quiz/interview data use structured output with Zod validation.
- The sample path is illustrative starter content. Generating a new path replaces the active local path and, when signed in, saves a new path row.
- The app does not promise that generated career advice is exhaustive or always current. Verify fast-changing tools and hiring requirements against current primary sources.

## Troubleshooting

**“AI Gateway is not configured yet”** — add `AI_GATEWAY_API_KEY` to `.env.local`, then stop and restart `npm run dev`.

**A selected model fails on structured output** — choose a model in AI Gateway that supports structured JSON/schema output and update `AI_GATEWAY_MODEL`.

**Sign in works but progress is not saved** — make sure `supabase/schema.sql` ran successfully, the Supabase URL/key match the same project, and the user is signed in. Check the browser console and Supabase logs for RLS or network errors.

**Changes to environment variables don’t take effect** — restart the local dev server; for Vercel, trigger a new deployment after changing variables.
