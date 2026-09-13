# 🚀 The AI Interview Prep Kit

> Turn a job description into a focused interview preparation plan — in minutes.

Preparing for a technical interview usually means jumping between multiple places: the job description, company website, interview experiences, LeetCode, system-design resources, notes, and your own study plan.

The problem isn't a lack of information.

**The problem is knowing what to prepare, what to prioritize, and where to spend your limited time.**

That's what I wanted to solve with **The AI Interview Prep Kit**.

You provide:

* 📄 A job description
* 🌐 The company's website
* 📅 The number of days you have before the interview

The application researches the role and company, identifies the important requirements, and builds a structured preparation kit containing:

* 🏢 Company overview
* 🎯 Role and requirement breakdown
* 💻 Technical interview questions
* 🧠 Behavioural questions
* 🏗️ System-design questions when relevant
* 🃏 Flashcards for revision
* 📅 A day-by-day preparation schedule
* ✏️ Editable questions and flashcards
* 🎮 Practice mode with confidence tracking

The goal is simple:

> **Instead of spending hours figuring out what to study, spend that time actually preparing.**

---

## 🌐 Live Demo

**Full Website / Frontend**

[Open the live application](https://the-ai-interview-prep-kit-weld.vercel.app/?utm_source=chatgpt.com)

**Backend API**

[Open the backend API](https://the-ai-interview-prep-kit.onrender.com/api?utm_source=chatgpt.com)

The frontend is deployed on **Vercel** and the backend is deployed on **Render**.

---

# 🧩 How the Product Works

The application follows a simple pipeline:

```text
Job Description
       +
Company Website
       +
Days Available
       ↓
Requirement Extraction
       ↓
Company Research
       ↓
Interview Signal Research
       ↓
Question Generation
       ↓
Coverage Check
       ↓
Flashcards
       ↓
Study Schedule
       ↓
Interview Prep Kit
```

The important part is that the application doesn't simply ask an LLM:

> "Generate some interview questions."

Instead, the generation process is broken into smaller steps.

For example, if a job description contains:

```text
React
Node.js
MongoDB
AWS
System Design
Communication
```

the system first converts those into structured requirements.

It can then generate questions specifically around those requirements rather than generating a generic list of interview questions.

---

# 🏗️ Architecture / HLD

The application is built as a simple full-stack system with a clear separation between the frontend, backend, database and external services.

```text
                        ┌─────────────────────┐
                        │      User           │
                        │  Job Description     │
                        │  Company URL         │
                        │  Preparation Days    │
                        └──────────┬──────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │      React Frontend      │
                    │       Vite + TS          │
                    │                          │
                    │  Dashboard               │
                    │  Kit Builder             │
                    │  Practice Mode           │
                    └────────────┬─────────────┘
                                 │
                           HTTP + JWT
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │     Express Backend      │
                    │       Node + TS          │
                    │                          │
                    │  Routes                   │
                    │      ↓                    │
                    │  Controllers              │
                    │      ↓                    │
                    │  Services                 │
                    └───────┬───────────┬──────┘
                            │           │
                ┌───────────┘           └────────────┐
                ▼                                    ▼
       ┌─────────────────┐                  ┌─────────────────┐
       │    MongoDB      │                  │  Gemini API     │
       │                 │                  │                 │
       │ Users           │                  │ Extraction      │
       │ Interview Kits  │                  │ Generation      │
       │ Progress        │                  │ Summarization   │
       └─────────────────┘                  └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │ Company Research│
                    │                 │
                    │ Website Crawl   │
                    │ Public Search   │
                    └─────────────────┘
```

### Deployment

```text
                    Internet
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        Vercel             Render
       Frontend            Backend
          │                   │
          │                   ├──── MongoDB
          │                   │
          │                   └──── Gemini API
          │
          └──── HTTP API ────────►
```

---

# 🧱 Backend Architecture / LLD

I intentionally kept the backend layered instead of putting all the logic inside controllers.

```text
server/
│
├── routes/
│
├── controllers/
│
├── services/
│   ├── llm.service.ts
│   ├── scraper.service.ts
│   ├── research.service.ts
│   ├── discussion.service.ts
│   ├── extraction.service.ts
│   ├── generation.service.ts
│   ├── coverage.service.ts
│   ├── schedule.service.ts
│   ├── validation.service.ts
│   └── kitPipeline.service.ts
│
├── models/
│
├── middleware/
│
├── scripts/
│
└── tests/
```

### Why this structure?

The main idea was to keep each piece of the system responsible for one thing.

For example:

**Controller**

Handles the HTTP request/response.

```text
Request
  ↓
Controller
  ↓
Service
  ↓
Database / External API
  ↓
Response
```

**Services**

Contain the actual business logic.

For example:

* `extraction.service.ts` → extracts requirements from the JD
* `research.service.ts` → researches the company
* `generation.service.ts` → generates questions and flashcards
* `coverage.service.ts` → checks whether important requirements are covered
* `schedule.service.ts` → creates the preparation schedule
* `validation.service.ts` → validates the final kit
* `kitPipeline.service.ts` → orchestrates the complete process

This keeps the API layer thin and makes the core logic easier to test and reuse.

---

# 🧠 The Core Pipeline

The most important part of the application is the **kit generation pipeline**.

```text
                 Job Description
                        │
                        ▼
              Extract Requirements
                        │
                        ▼
               Research Company
                        │
                        ▼
            Find Hiring / Interview
                    Signals
                        │
                        ▼
             Generate Questions
                        │
                        ▼
              Generate Flashcards
                        │
                        ▼
               Coverage Check
                        │
                 ┌──────┴──────┐
                 │             │
              Missing       Complete
              coverage          │
                 │              │
                 └──► Generate  │
                       more     │
                         │      │
                         └──────┘
                            │
                            ▼
                    Build Schedule
                            │
                            ▼
                     Validate Kit
                            │
                            ▼
                      Save to DB
```

One design decision I specifically wanted was **not blindly trusting the LLM to decide whether the generated kit was complete**.

After generating questions, the backend performs a deterministic coverage check.

It looks at:

```text
Requirements
      ↓
Question requirement_ids
      ↓
Set of covered requirements
      ↓
Find uncovered must-have requirements
```

If an important requirement has no question associated with it, the system generates additional questions for that requirement.

That process is limited to a few passes so the system doesn't get stuck generating indefinitely.

---

# 🔍 Company Research

The company research flow starts with the company URL provided by the user.

Instead of assuming that every company has:

```text
/company/careers
/company/jobs
/company/about
```

the crawler looks at links available on the site and ranks them based on useful signals such as:

```text
career
jobs
hiring
handbook
about
interview
```

The highest-value pages are then used as research material.

The system also looks for publicly available discussion around the interview process.

This helps answer questions like:

* What does the interview process look like?
* Are there coding rounds?
* Is system design mentioned?
* Are there behavioural rounds?
* What technologies are commonly discussed?

If information isn't available, the system doesn't try to invent it.

---

# 🤖 LLM Usage

The LLM is used where language understanding or generation is actually useful.

For example:

### LLM tasks

* Extracting requirements from a job description
* Summarizing company information
* Understanding hiring/interview signals
* Generating technical questions
* Generating behavioural questions
* Generating system-design questions
* Generating flashcards

### Deterministic application logic

Some things don't need an LLM.

For example:

* Requirement/question IDs
* Requirement coverage
* Schedule calculation
* Referential integrity
* Input validation
* Authentication
* Persistence

This separation was intentional.

> **Use AI for reasoning and generation. Use application code for things that should be deterministic.**

---

# 📅 How the Study Schedule Works

The schedule isn't generated by the LLM.

Each question gets a weight based on:

```text
Priority + Difficulty
```

Must-have requirements receive higher priority, while harder questions receive higher weight.

The questions are then distributed across the number of days provided by the user.

For example:

```text
3 Days

Day 1
├── High priority
├── Hard technical
└── Must-have topics

Day 2
├── Medium difficulty
├── Technical
└── Behavioural

Day 3
├── Remaining topics
├── Flashcards
└── Revision
```

This keeps scheduling predictable and makes the behaviour easy to reason about.

---

# ✏️ Editing & Regeneration

The generated content isn't meant to be treated as final.

Users can edit:

* Questions
* Difficulty
* Categories
* Flashcards

Edited items are marked as **pinned**.

When a section is regenerated, pinned items are preserved.

```text
Existing Questions
       │
       ├── Pinned ───────────► Keep
       │
       └── Not Pinned ───────► Regenerate
                                  │
                                  ▼
                            New Questions
                                  │
                                  ▼
                              Merge
```

This was important because regeneration shouldn't destroy work the user has already customized.

---

# 🎮 Practice Mode

Practice mode turns the generated flashcards into an actual revision workflow.

Each flashcard can be rated based on confidence:

```text
Blanked
   ↓
Struggled
   ↓
Almost
   ↓
Good
   ↓
Nailed it
```

The confidence and timestamp are stored so the next practice session can prioritize cards that need more attention.

I kept this intentionally simpler than implementing a full spaced-repetition algorithm because the main goal of this product is **short-term interview preparation**, not long-term language-learning style retention.

---

# 🔐 Authentication & Security

The application uses JWT-based authentication.

Important security decisions include:

* Password hashing with bcrypt
* Expiring JWTs
* Protected kit routes
* User-scoped database queries
* URL validation before server-side fetching
* Protection against private/loopback URL fetching
* Response-size limits for fetched pages
* Validation of generated kit data before persistence

For example, every kit query is scoped to the authenticated user.

```text
JWT
 │
 ▼
Authenticate User
 │
 ▼
req.userId
 │
 ▼
Kit.find({ owner: req.userId })
```

So a user cannot simply change a kit ID and access another user's data.

---

# 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router

### Backend

* Node.js
* Express
* TypeScript

### Database

* MongoDB
* Mongoose

### AI

* Google Gemini API

### Web Research

* Playwright / Browser automation
* Cheerio
* Axios
* DuckDuckGo public search

### Authentication

* JWT
* bcrypt

### Testing

* Vitest

---

# 📁 Project Structure

```text
the-ai-interview-prep-kit/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── ...
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── scripts/
│   │   └── tests/
│   │
│   └── package.json
│
└── README.md
```

---

# 💻 Run Locally

## 1. Clone the repository

```bash
git clone <your-repository-url>

cd the-ai-interview-prep-kit
```

## 2. Start the backend

```bash
cd server

npm install
```

Create:

```text
server/.env
```

Add the required environment variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_gemini_model
CLIENT_ORIGIN=http://localhost:3000
```

Then start the server:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:4000
```

---

## 3. Start the frontend

Open another terminal:

```bash
cd client

npm install
```

Create:

```text
client/.env.local
```

Add:

```env
VITE_API_URL=http://localhost:4000/api
```

Then:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

---

# 🧪 Running Tests

Backend tests can be run with:

```bash
cd server

npm test
```

The tests focus on the deterministic parts of the application such as:

* Schedule generation
* Requirement coverage
* Kit validation
* Referential integrity

---

# 💡 Why I Built It This Way

I built this project as a **production-style application without trying to over-engineer it**.

There are a few decisions behind that:

### 1. Keep the architecture understandable

I didn't want dozens of services just for the sake of calling something "microservices".

A modular monolithic backend is enough for the current scale.

### 2. Keep AI and business logic separate

The LLM generates and understands content.

The application decides things like:

```text
Who owns the kit?
Is the data valid?
Are requirements covered?
How should questions be scheduled?
```

### 3. Don't let regeneration destroy user work

Anything the user edits can be pinned and protected from regeneration.

### 4. Prefer deterministic logic where possible

Coverage and scheduling are implemented in code instead of asking the LLM to make those decisions.

### 5. Build around the actual user problem

The goal isn't to create another AI wrapper.

The goal is to reduce the time between:

```text
"I have an interview coming up"
```

and

```text
"I know exactly what I need to prepare today."
```

---

# 🚀 Future Improvements

If I continued developing the project, the next improvements I'd consider would be:

* 🔄 Background job queue for long-running kit generation
* 📊 Better analytics around preparation progress
* 🎯 Weak-topic detection based on practice performance
* 🧠 More advanced spaced repetition
* 📄 Resume + JD matching
* 🎤 AI-powered mock interviews
* 📈 Interview preparation progress dashboard
* 🔔 Interview reminders and preparation notifications

---

## ❤️ Final Thought

Interview preparation usually becomes overwhelming because the information is scattered.

**The AI Interview Prep Kit tries to turn that scattered information into one focused preparation workflow.**

Give it a role.

Give it a company.

Give it a few days.

**And start preparing. 🚀**
