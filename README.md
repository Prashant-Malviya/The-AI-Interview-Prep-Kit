# The AI Interview Prep Kit

Turns a pasted job description + a company URL into a structured, editable interview prep kit: a company brief, role breakdown, categorised question bank, flashcards, and a day-by-day study schedule.

## Live links

> **Fill these in once deployed — see "Deploying to Vercel + Render" (Section 2b) for the exact steps.** I can't populate these myself: I don't have Vercel/Render accounts and haven't deployed anything, so there's nothing live to link to yet. These three rows are what your submission form / README reviewer will expect to see filled in.

| | URL |
|---|---|
| **Full website** (what a user opens) | `https://<your-app>.vercel.app` |
| **Frontend** (same as above — it's a single-page app) | `https://<your-app>.vercel.app` |
| **Backend API** (health check) | `https://<your-app>.onrender.com/health` |


## 1. Project overview and tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS, routed with `react-router-dom` | Plain React (no meta-framework) per request. Vite gives fast dev-server reloads and a static `dist/` output that deploys straightforwardly to Vercel as an SPA (see `vercel.json`'s rewrite rule for client-side routes). |
| Backend | Node.js + Express + TypeScript | Matches the brief. Plain Express (no framework-on-framework) keeps the request lifecycle easy to reason about and explain. |
| Database | MongoDB (Mongoose) | Matches the brief. The kit's nested, semi-structured shape (Appendix A) maps naturally onto a single flexible document rather than a dozen relational tables. |
| LLM | Google Gemini API, model `gemini-3.6-flash` | Genuine free tier via Google AI Studio, and native JSON-mode support (`responseMimeType: "application/json"`) means we don't have to rely on prompt-only "please return JSON" instructions. **Note:** this is the Gemini *developer* API (an AI Studio/Cloud key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) - a consumer Gemini Pro subscription on gemini.google.com is a separate product and does not grant API access. Google deprecates flash models fairly often - if `GEMINI_MODEL` ever 404s with a message pointing at a newer model (as `gemini-2.0-flash` did during development of this project, in favour of `gemini-3.6-flash`), just update `GEMINI_MODEL` in `.env` to whatever it recommends. |
| Scraping | Browserbase (via `@browserbasehq/sdk` + `playwright-core`), falling back to plain `axios` + `cheerio` | Browserbase handles JS-heavy sites and reduces bot-blocking on real company sites in production. The fallback is what actually runs against the local fixture site used by the batch command, since a cloud browser service cannot reach `localhost`. |
| Public discussion search | DuckDuckGo's keyless HTML endpoint (`html.duckduckgo.com/html/`) | We weren't given a search API key, and DuckDuckGo's HTML endpoint needs none. It's used for exactly one thing: "public discussion of the interview process." |

The repo is two folders under one root, as requested: `client/` (React + Vite) and `server/` (Express).

## 2. Setup

### Local

**Server:**
```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY at minimum
npm run dev             # http://localhost:4000
```

**Client:**
```bash
cd client
npm install
cp .env.local.example .env.local   # VITE_API_URL=http://localhost:4000/api
npm run dev              # http://localhost:3000 (Vite dev server)
```

You'll need a local or Atlas MongoDB instance for the web app (the batch command below does not need one).

### Batch entry point (Section 9) — exact commands

```bash
cd server
npm install
cp .env.example .env    # needs at least GEMINI_API_KEY

# optional: start the local fixture "company site" used by fixtures/cases.json
npm run fixture-server   # serves http://localhost:8099/acme/

npm run evaluate -- --input fixtures/cases.json --output /tmp/kits-out.json
```

This runs from a clean clone with no other setup. It reads an array of `{ id, jd, company_url, days }`, runs the exact same pipeline the web app uses (`kitPipeline.service.ts`), and writes the Appendix B shape. `fixtures/cases.json` includes a working case against the local fixture site and a deliberately-unreachable `company_url` to exercise the failure path.

> Verified in this environment: the pipeline reads the input, crawls the fixture site, retries the LLM call with backoff on failure, continues past failed cases, and writes a valid `kits.json` with structured per-case errors. I couldn't get a real Gemini response inside this sandbox (its network egress allowlist blocks `generativelanguage.googleapis.com`), so the happy path (an actual generated kit in the output) is untested end-to-end here — it will need a real `GEMINI_API_KEY` and normal internet access to confirm. I also confirmed separately that a bad/rejected API key fails fast rather than burning through all retries, and that a 429/5xx does retry with backoff - see `llm.service.ts`'s `isRetryableGeminiError`.

### 2b. Deploying to Vercel + Render

**Render (backend) — do this first, you'll need its URL for the frontend step:**
1. Push this repo to GitHub (see "A note on this repo's git history" below if you're starting from the provided zip).
2. On [render.com](https://render.com): **New → Web Service** → connect the repo.
3. Root directory: `server`. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Add environment variables (same keys as `server/.env.example`): `MONGODB_URI` (an Atlas connection string — Render's free tier has no built-in database), `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CLIENT_ORIGIN` (you won't know the final Vercel URL yet — set it to `http://localhost:3000` for now and come back to update it after step 5 below). Leave `PORT` unset; Render sets it automatically and `env.ts` already falls back to it via `process.env.PORT`.
5. Deploy. Once live, note the URL (`https://<something>.onrender.com`) — that's your **Backend API** row above. Confirm it's up by visiting `<that-url>/health`, which should return `{"ok":true}`.

**Vercel (frontend):**
1. On [vercel.com](https://vercel.com): **New Project** → import the same repo.
2. Root directory: `client`. Framework preset: Vite (should auto-detect from `package.json`'s `dev`/`build` scripts). Build command: `npm run build`. Output directory: `dist`.
3. Add environment variable `VITE_API_URL` = `https://<your-render-url>/api` (the trailing `/api` matters — it's not just the bare Render URL). **This must be set before the first build**, since Vite inlines env vars at build time, not at runtime — changing it later requires a redeploy, not just a restart.
4. Deploy. `client/vercel.json`'s rewrite rule is what makes client-side routes like `/kits/<id>` work on refresh instead of 404ing, since Vercel is serving a static SPA with no server-side router.
5. Note the resulting URL (`https://<something>.vercel.app`) — that's your **Full website** / **Frontend** row above.
6. Go back to Render and update `CLIENT_ORIGIN` to this Vercel URL, then redeploy the backend so CORS (`app.ts`) actually allows requests from it.

**Verify end-to-end:** open the Vercel URL, register an account, and create a kit. If it hangs on "Building your kit…" forever, check the Render service logs first — a missing/invalid `GEMINI_API_KEY` or an unreachable `MONGODB_URI` are the two most common causes.

### A note on this repo's git history

This zip includes a git repository with commit history grouped by logical unit of work (server scaffold → services → API → tests → client scaffold → pages → builder UI → practice mode), which is honest about how the code is organized but is *not* a real multi-day commit timeline — it was assembled with AI assistance and committed in one sitting, which the assessment's own "AI tools are permitted" note allows. Before pushing:
```bash
git config user.name "Your Name"
git config user.email "you@example.com"
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```
From here, your own commits (fixing the Gemini model name, debugging practice mode, etc. — the real changes you've already been making) are what will make the history reflect actual development, on top of this starting point.

## 3. High-level architecture

```
client/ (React + Vite)  →  HTTP + JWT  →  server/ (Express)
                                        ├─ routes/         (thin HTTP layer)
                                        ├─ controllers/    (request handling, no business logic)
                                        ├─ services/        (all business logic lives here)
                                        │   ├─ llm.service.ts          – the only file that calls Gemini
                                        │   ├─ scraper.service.ts      – the only file that fetches raw HTML
                                        │   ├─ research.service.ts     – crawl + rank links + hiring-page detection
                                        │   ├─ discussion.service.ts   – public discussion search
                                        │   ├─ extraction.service.ts   – JD → requirements (LLM)
                                        │   ├─ generation.service.ts   – brief/questions/flashcards (LLM)
                                        │   ├─ coverage.service.ts     – pure code, no LLM
                                        │   ├─ schedule.service.ts     – pure code, no LLM
                                        │   ├─ validation.service.ts   – zod schema for Appendix A
                                        │   └─ kitPipeline.service.ts  – orchestrates all of the above, in order
                                        ├─ models/          (Mongoose schemas)
                                        └─ scripts/evaluate.ts (batch entry point - calls kitPipeline.service.ts directly)
```

On the client side, routing is handled by `react-router-dom` (`src/App.tsx`): a `RequireAuth` wrapper component guards `/dashboard`, `/kits/new`, `/kits/:id` and `/kits/:id/practice`, redirecting to `/login` if there's no valid session - the closest plain-React equivalent to a Next.js middleware/layout guard.

Retrieval, extraction, generation, scheduling and persistence are separate files with one clear job each (Backend Requirements, Section 13). Both the interactive API (`kit.controller.ts`) and the batch command (`scripts/evaluate.ts`) call the same `runKitPipeline()` function - there is no parallel implementation to keep in sync (Section 9's explicit requirement).

## 4. Retrieval approach and sources used

1. **The job description** is pasted text - no retrieval needed at all.
2. **The company homepage** is fetched, then its same-host links are extracted and **ranked** by keyword score (`career`, `jobs`, `hiring`, `handbook`, `about`, etc.) rather than a fixed path list, per the brief ("Companies bury it in different places... a fixed list of paths is not sufficient"). The top-scoring ~6 links are fetched.
3. Fetched pages are split into "about the company" pages and "hiring/interview" pages based on whether hiring-related keywords appear in their URL.
4. `robots.txt` is read (best-effort, `User-agent: *` group only) and any disallowed paths are excluded before crawling.
5. **Public discussion** of the interview process is looked up via a single DuckDuckGo HTML search for `"<company> interview process experience"`, summarised by the LLM into 2-3 sentences, or reported as not found.
6. Any source that fails to fetch (404, timeout, blocked) is recorded in a `skipped` list and the run continues - it never aborts the whole kit.

## 5. How the research and generation steps are sequenced

`kitPipeline.service.ts` runs, in order:
1. Extract requirements from the JD (no retrieval dependency - can run immediately).
2. Crawl the company site (needs the JD's company URL, not its content).
3. Summarise the hiring signal from whatever hiring pages were found.
4. Search for public discussion.
5. Write the company brief from the crawled "about" pages.
6. Generate questions **in separate calls per requirement kind** (technical / behavioural / domain→company-fit), each with category-specific instructions - a "5+ years React" requirement and a "mentors junior engineers" requirement are never sent to the model in the same call with the same instructions.
7. If the hiring signal mentions a system-design round, a further targeted call adds system-design questions for the technical requirements - a concrete example of a hiring-process finding changing what gets generated.
8. Generate flashcards.
9. **Coverage check (deterministic, in code)**: find must-have requirements with zero referencing questions; if any exist, generate more for just those and re-check, up to 3 passes.
10. **Build the schedule (deterministic, in code)**: sort by priority+difficulty, greedily assign to days by running average, so harder/must-have material lands on earlier days.
11. Validate the assembled kit against the zod schema mirroring Appendix A, plus referential-integrity checks (every `question_ids` entry resolves to a real question, every `requirement_ids` entry resolves to a real requirement) before it's ever saved.

Requirement ids and question ids are assigned by application code immediately after each LLM call returns (`makeIdGenerator`), never by the model - this is what makes coverage checking an objective fact rather than the model's opinion of itself.

## 6. How generated / edited / pinned state is represented

Each `Kit` document stores, alongside the kit JSON itself, two arrays: `pinnedQuestionIds` and `pinnedFlashcardIds`. Any question or flashcard whose id appears there was **hand-written or hand-edited** by the user.

- Editing a question/flashcard's text, difficulty, or category, or adding a new one by hand, adds its id to the pinned set (`QuestionEditor.tsx` / `FlashcardEditor.tsx` call `onPin` on every edit).
- **Regenerating a question category** (`kit.controller.ts::regenerateSection`) keeps every pinned question in that category untouched, discards the rest, generates a fresh batch for the category's requirements, and merges the two. A pinned item can therefore sit alongside a freshly generated one covering the same requirement - that's an acceptable, honest outcome (extra prep material), not a bug.
- Regenerating the schedule or company brief doesn't touch pinned questions/flashcards at all, since they don't own that data.
- If a category regeneration removes a non-pinned question that was scheduled, the schedule is **not** silently rebuilt (that would discard the user's day-by-day edits) - instead, the now-dangling `question_ids` entries are stripped from the schedule and the rest is left alone.
- **Unsaved edits in other sections are never discarded by a regeneration**: the frontend always saves the current draft to the server before calling a regenerate endpoint, since regeneration operates on the server's persisted copy.

**Known limitation:** pinning is per-question/flashcard, not per-field - editing one field pins the whole item. Given the timebox, that's a reasonable trade-off; field-level pinning would need a heavier state shape for marginal benefit.

## 7. How the schedule is allocated (`schedule.service.ts`)

Pure arithmetic, no LLM call, as required:
1. Each question gets a weight = `(2 if it covers a must-have, else 1) * 10 + difficulty`.
2. Questions are sorted by weight, descending - hardest and highest-priority first.
3. Days are filled greedily: keep adding the next (hardest-remaining) question to the current day until it reaches its fair share of the total estimated minutes (`difficulty * 15`), then move to the next day.
4. The array always has exactly `days_available` entries, even if some end up empty (handles the 60-day-schedule-for-a-5-question-kit edge case honestly, rather than padding with invented content) and even if only 1 day was requested (everything lands on day 1).

## 8. Coverage checking (`coverage.service.ts`)

Also pure code: build a `Set` of every requirement id referenced by any question's `requirement_ids`, then return the must-have requirements not in that set. The pipeline runs this after the first draft and after each subsequent gap-filling pass, capped at **3 passes total** - enough to close most gaps without an unbounded loop against a rate-limited API. Any requirement still uncovered after 3 passes is reported honestly in `coverage.uncovered_requirement_ids`, both to the user (a warning banner in the schedule view) and in the batch output.

## 9. Edge cases and failure handling

| Case | Handling |
|---|---|
| Company URL invalid/404/timeout | `crawlCompanySite` catches the error, records it in `skipped`, and the pipeline continues with an honest "could not be retrieved" company brief. |
| No discoverable hiring page | `hiringSignal.found = false` with an honest summary; no interview-process details are invented. |
| Two-line JD stub | The extraction prompt is explicitly told to return fewer requirements rather than pad with guesses; a thin JD produces a thin, honest kit. |
| No public discussion found | Reported as "no public discussion found" rather than fabricated. |
| LLM returns invalid/incomplete JSON | One repair pass (show the model its own broken output, ask for corrected JSON); if that also fails, the kit generation fails cleanly with a structured error rather than saving garbage. |
| Rate limit / transient LLM failure | `withRetry` does exponential backoff (up to 5 retries) in `llm.service.ts`, and stops immediately (no wasted retries) on a non-retryable error like a bad API key via `isRetryableGeminiError`. |
| Same JD + company + days submitted twice | A hash of the three fields (`dedupeKey`) is checked before creating a new kit; a duplicate submission returns the existing kit instead of re-generating. |
| 1-day or 60-day schedule request | `buildSchedule` clamps to `[1, 90]` days and always emits exactly that many day entries (see Section 7). |
| Kit doesn't match Appendix A / has dangling ids | `validateKitOrThrow` runs before every save (initial generation, edits, and regeneration) and rejects the write with a structured error rather than persisting a malformed kit. |

## 10. Security

- `checkUrlIsSafeToFetch` rejects non-http(s) URLs and, in production, private/loopback addresses (localhost, 10.x, 192.168.x, 172.16-31.x, 169.254.x) before any fetch - this is what lets the batch command safely target `localhost` in development while refusing SSRF attempts in production.
- Fetches cap response size (3MB) and reject unexpected content types.
- Scraped page text and the pasted job description are only ever sent to the LLM inside a clearly-labelled "here is text to summarise/extract from" prompt - the system prompts explicitly instruct the model to treat that content as data, never as instructions, and the app never executes anything derived from fetched pages.
- Passwords are hashed with bcrypt; JWTs expire (`JWT_EXPIRES_IN`) and expired/invalid tokens get a clean 401 (frontend redirects to `/login` on any 401).
- Every kit route requires auth and every kit query is scoped to `owner: req.userId` - one user can never read or edit another's kits.

## 11. Practice mode

Flashcards are stepped through one at a time; revealing the answer surfaces a 5-point confidence rating (`Blanked` → `Nailed it`), stored per-card with a timestamp (`practiceProgress` on the Kit document). The next session's order is a **confidence-weighted sort**: never-reviewed cards first, then ascending by last confidence rating. I chose this over a full spaced-repetition interval (e.g. SM-2) because the assessment is a fixed number of prep days, not an open-ended long-term retention schedule - a proper spacing algorithm optimises for a different problem than "make the most of the next 3 days."

## 12. Testing

`server/src/tests/` covers the three areas explicitly called out in the brief:
- `schedule.test.ts` - exact day count, integer minutes, must-haves always scheduled, harder material lands earlier, 1-day and 60-day edge cases.
- `coverage.test.ts` - gap detection, multi-requirement questions, must-vs-nice distinction.
- `validation.test.ts` - the zod schema rejects malformed kits and the referential-integrity check catches dangling ids.

Run with `cd server && npm test`. All 18 tests pass as of this submission.

## 13. Requirements coverage checklist

A section-by-section check against the brief, for defense prep:

| Brief section | Status | Where |
|---|---|---|
| 1. Authentication | ✅ | `auth.controller.ts`, `auth.middleware.ts`, `RequireAuth.tsx` |
| 2. Input and research | ✅ | `NewKitPage.tsx` (paste + bulk upload), `research.service.ts` (crawl+rank, robots.txt now checked on the homepage fetch too, not just discovered links) |
| 3. Research and generation | ✅ | `kitPipeline.service.ts` sequences all 7 steps in order |
| 4. The second pass | ✅ | coverage loop in `kitPipeline.service.ts`, capped at 3 passes |
| 5. Kit structure (exact) | ✅ | `kit.types.ts` + `validation.service.ts` zod schema, matches Appendix A field-for-field |
| 6. The builder | ✅ | `QuestionEditor.tsx`, `FlashcardEditor.tsx`, pinned-state logic (Section 6 above) |
| 7. Practice mode | ✅ | `PracticePage.tsx`, confidence-weighted ordering |
| 8. The schedule | ✅ | `schedule.service.ts`, pure arithmetic |
| 9. Batch entry point (exact) | ✅ | `npm run evaluate`, matches Appendix B, calls the same `runKitPipeline()` as the API |
| 10. Edge cases | ✅ | table in Section 9 above |
| 11. Security | ✅ | Section 10 above |
| 12. Frontend requirements | ✅ | React + Vite + Tailwind; loading/generating/failed states in `KitDetailPage.tsx`; all interactive elements are native `<button>`/`<input>`/`<select>`/`<textarea>`, so keyboard nav is free |
| 13. Backend requirements | ✅ | separated services, `validateKitOrThrow` before every save, `KitModel` persists mid-generation state |
| 14. Code quality | ✅ | TS throughout, `npm test` (18 tests), git history grouped by unit of work (see note above) |
| Creativity feature (optional) | ❌ not built | Genuinely optional per the brief. If you want one before submitting, a "weak spots" report (aggregate low-confidence flashcards + their linked requirements into a single view) would reuse `practiceProgress` data that's already being tracked and wouldn't need new backend work — the cheapest high-value option given remaining time. |
| Deployment (mandatory) | ⏳ your turn | See Section 2b above — this is the one piece I can't do for you |
| Walkthrough video | ⏳ your turn | Same |

## 14. Known limitations and trade-offs

- **Generation progress is stage-based, not truly live.** The frontend polls kit status every few seconds and shows a time-based staged indicator rather than a websocket-pushed step name, to avoid adding a websocket layer for a single progress bar.
- **No production job queue.** Generation runs as a detached async function in the same Node process. Fine at this scale; a real production version would move this to a queue (BullMQ/SQS) so a server restart mid-generation doesn't strand a kit in `"generating"` forever.
- **Pinning is per-item, not per-field** (see Section 6).
- **Company name is derived heuristically** from the homepage `<title>` or the URL's hostname, not from a dedicated "company name" extraction call - kept simple since it's a low-stakes display value.
- **The Gemini happy path is untested in this sandbox** (network egress here blocks `generativelanguage.googleapis.com`) - the failure path, fast-fail-on-bad-key, retries, and batch robustness are verified; the actual generated content quality should be checked with a real key before relying on it for the interview.
- **A Gemini Pro (consumer) subscription does not grant Gemini API access.** They're separate Google products - the API key needs to come from [aistudio.google.com/apikey](https://aistudio.google.com/apikey), which has its own free tier independent of any consumer subscription.
- **Gemini's free tier has a requests-per-minute cap** (tighter on `gemini-3.6-flash` than on paid tiers) - this is the concrete reason `askLLM`'s retry/backoff exists, and the bulk-upload / batch-command flows are the most likely places to hit it in a real demo, since they can fire several generations close together.
- **`askLLMForJson`'s one-shot repair pass** (re-showing the model its own broken output and asking for corrected JSON) exists because even models with native JSON mode occasionally truncate or produce a structurally invalid object; if you see `LLM returned invalid JSON twice in a row`, it's worth lowering `temperature` further before assuming something else is wrong.
