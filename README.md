# ReachInbox Email Scheduler

> A production-grade, distributed email scheduling service and real-time dashboard engineered to schedule, throttle, persist, and reliably deliver high-volume email campaigns with zero cron dependencies.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Deep Dive: Core Mechanisms & Technical Explanations](#deep-dive-core-mechanisms--technical-explanations)
   - [1. BullMQ Delayed Scheduling (No Cron)](#1-bullmq-delayed-scheduling-no-cron)
   - [2. Restart Safety & Startup Reconciliation Engine](#2-restart-safety--startup-reconciliation-engine)
   - [3. Multi-Worker Rate Limiting Without Double Counting](#3-multi-worker-rate-limiting-without-double-counting)
   - [4. Idempotency Safeguards](#4-idempotency-safeguards)
   - [5. Worker Concurrency & Provider Throttling](#5-worker-concurrency--provider-throttling)
4. [What Was Built vs. What Was Scoped Down (Trade-offs)](#what-was-built-vs-what-was-scoped-down-trade-offs)
5. [Getting Started & Local Setup](#getting-started--local-setup)
6. [Demo Video Walkthrough Script](#demo-video-walkthrough-script)
7. [API Reference](#api-reference)
8. [Submission Checklist & Reviewer Access](#submission-checklist--reviewer-access)

---

## Architecture Overview

```
                      +---------------------------------------+
                      |   React + TypeScript + Tailwind UI    |
                      |   (Vite Dashboard & CSV Lead Parser)  |
                      +-------------------+-------------------+
                                          |
                                          | HTTP POST /api/emails/schedule
                                          v
                      +---------------------------------------+
                      |       Express.js API Server           |
                      +-------------------+-------------------+
                                          |
              +---------------------------+---------------------------+
              |                                                       |
              v (1. Write 'pending' record)                           v (2. Enqueue delayed job)
  +-----------------------+                               +-----------------------+
  |  PostgreSQL (Prisma)  |                               |     Redis (BullMQ)    |
  |  [Source of Truth]    |                               |  [Delayed Job Queue]  |
  +-----------+-----------+                               +-----------+-----------+
              ^                                                       |
              |                                                       v (Timer expires)
              |                                           +-----------------------+
              | (3. Idempotency Check: status == pending) |     BullMQ Worker     |
              +-------------------------------------------+ (Concurrency/Limiter) |
                                                          +-----------+-----------+
                                                                      |
                                                                      | (4. Atomic Rate Limit Check)
                                                                      v
                                                          +-----------------------+
                                                          |  Redis Rate Limiter   |
                                                          |  (Sender Hour Window) |
                                                          +-----------+-----------+
                                                                      |
                                                    +-----------------+-----------------+
                                                    | (Within Limit)                    | (Limit Exceeded)
                                                    v                                   v
                                        +-----------------------+           +-----------------------+
                                        |   Nodemailer Service  |           | Defer to Next Window  |
                                        |    (Ethereal Email)   |           | (Re-schedule BullMQ)  |
                                        +-----------+-----------+           +-----------------------+
                                                    |
                                                    v
                                        +-----------------------+
                                        | Log Preview URL and   |
                                        | update status='sent'  |
                                        +-----------------------+
```

---

## Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Job Queue**: BullMQ backed by Redis 7 (Sorted Sets `ZSET` for delayed scheduling)
- **Database & ORM**: PostgreSQL 16 via Prisma ORM
- **Email Delivery (Fake SMTP)**: Nodemailer configured against Ethereal Email (`createTestAccount`)
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, `@react-oauth/google`
- **Infrastructure**: Docker & Docker Compose

---

## Deep Dive: Core Mechanisms & Technical Explanations

### 1. BullMQ Delayed Scheduling (No Cron)
- **Why No Cron?** Cron jobs tick periodically (e.g. every minute) and query the database with `SELECT ... WHERE scheduled_time <= NOW()`. This causes database CPU spikes under load, polling latency jitter, and race conditions across multiple application replicas.
- **BullMQ Delayed Mechanics**:
  - When an email is scheduled, the remaining delay in milliseconds is calculated:
    $$\text{delayMs} = \max(0, \text{scheduled\_time} - \text{now})$$
  - BullMQ places the job payload into a Redis Sorted Set (`ZSET`) where the **score** is the exact Unix millisecond timestamp when the job should run.
  - Redis maintains this timer natively. When the score is reached, BullMQ atomically promotes the job from `delayed` to `waiting` using Redis Lua scripts, and an available worker immediately processes it.
  - Jobs use deterministic IDs (`email-${email.id}`) ensuring queue-level deduplication.

---

### 2. Restart Safety & Startup Reconciliation Engine
- **The Problem**: In real-world deployments, a Node.js process might crash, container instances restart, or Redis could experience unpersisted job eviction. PostgreSQL retains the records with `status = 'pending'`, but the BullMQ in-memory delayed queue could lose the trigger.
- **The Reconciliation Algorithm (`reconcileScheduledEmails`)**:
  - Runs automatically **once at server startup** before the Express HTTP server accepts incoming traffic.
  - **Step 1**: Queries BullMQ for all jobs across active states (`active`, `delayed`, `waiting`, `prioritized`) and extracts all existing `emailId`s into an in-memory `Set<string>`.
  - **Step 2**: Queries PostgreSQL for all records where `status = 'pending'`.
  - **Step 3**: For any pending email whose ID is missing from the BullMQ Set:
    - Calculates the remaining delay: $\max(0, \text{scheduled\_time} - \text{now})$.
    - If `scheduled_time` is in the future, it is re-enqueued with its accurate remaining delay.
    - If `scheduled_time` has already passed while the server was down, the delay is set to `0` (processed immediately upon worker readiness).
  - **Step 4**: Any record already marked `'sent'` or `'failed'` is strictly ignored, ensuring delivered emails are **never re-sent**.

```typescript
// Conceptual Flow in src/services/reconciler.ts
const existingJobs = await emailQueue.getJobs(["active", "delayed", "waiting", "prioritized"]);
const queuedEmailIds = new Set(existingJobs.map(j => j.data.emailId));

const pendingEmails = await prisma.email.findMany({ where: { status: "pending" } });

for (const email of pendingEmails) {
  if (!queuedEmailIds.has(email.id)) {
    const remainingDelay = Math.max(0, new Date(email.scheduled_time).getTime() - Date.now());
    await emailQueue.add("send-email", { emailId: email.id }, {
      delay: remainingDelay,
      jobId: `email-${email.id}`,
    });
  }
}
```

---

### 3. Multi-Worker Rate Limiting Without Double Counting
- **The Problem**: When multiple worker processes run concurrently in parallel, local in-memory counters or non-atomic DB queries cause race conditions, leading to rate limit overshoots.
- **The Multi-Worker Safe Solution (`checkAndIncrementSenderRateLimit`)**:
  1. **Time-Bucketed Redis Keys**: Keys are partitioned by sender and UTC hour boundary:
     $$\text{hourWindowTimestamp} = \left\lfloor \frac{\text{now}}{3600000} \right\rfloor \times 3600000$$
     $$\text{redisKey} = \text{ratelimit:}\{\text{sender.toLowerCase()}\}\text{:}\{\text{hourWindowTimestamp}\}$$
  2. **Atomic `INCR`**: The worker issues an atomic Redis `INCR` command. Because Redis single-threads operations per key, concurrent increments across any number of distributed worker instances are serialized without race conditions.
  3. **Auto-Expiring TTL**: On the first increment (`count === 1`), a 7200-second (2-hour) TTL is set, ensuring expired hour windows are automatically garbage collected.
  4. **Zero-Fail Automatic Deferral**:
     - If `currentCount > MAX_EMAILS_PER_HOUR_PER_SENDER`, the counter is decremented back (`DECR`).
     - The start of the next hour window is calculated:
       $$\text{nextHourStart} = \text{hourWindowTimestamp} + 3600000$$
     - The email is **not failed**. Its database `scheduled_time` is updated to `nextHourStart`, and a new BullMQ delayed job is scheduled for that exact time.

---

### 4. Idempotency Safeguards
- Before any worker dispatches an email through Nodemailer, it checks the database record. If the email's status is not `'pending'` (e.g. already `'sent'` or `'processing'`), the worker logs the idempotency trigger and skips the job immediately, guaranteeing zero double-sends.

---

### 5. Worker Concurrency & Provider Throttling
- **Worker Concurrency**: Configurable via `WORKER_CONCURRENCY` env var (e.g. `5` concurrent jobs per worker).
- **Minimum Send Delay**: Configurable via `MIN_SEND_DELAY_MS` env var (e.g. `1000ms`). Enforced across all workers on the queue via BullMQ's queue limiter `{ max: 1, duration: MIN_SEND_DELAY_MS }` to simulate provider rate limits.

---

## What Was Built vs. What Was Scoped Down (Trade-offs)

| Feature | Built Implementation | Scoped Down / Alternative | Rationale |
| :--- | :--- | :--- | :--- |
| **Authentication** | Google OAuth2 via `@react-oauth/google` + Local Session fallback | Complex backend JWT session store | Provides real Google Sign-In with user avatar, name, and email while keeping the setup lightweight for evaluators without required Google Cloud credentials. |
| **Email Provider** | Nodemailer with auto-provisioned Ethereal Email accounts | Production AWS SES / SendGrid | Ethereal generates instant, publicly inspectable preview URLs for every email without requiring domain DNS/SPF/DKIM verification. |
| **CSV Lead Upload** | Client-side RFC-5322 regex parser + deduplicator | Server-side multipart streaming upload | Gives immediate real-time feedback (e.g. "✓ 10 valid recipients detected", "1 invalid skipped") in the UI before submitting the schedule request. |
| **Scheduling Engine** | BullMQ Delayed Jobs backed by Redis | Node-cron / Agenda | Cron polling introduces database load spikes and latency jitter; BullMQ provides exact millisecond timer triggers and native worker concurrency. |

---

## Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node v20, v22, v25)
- **Docker & Docker Compose** (for PostgreSQL and Redis)

---

### 1. Start Infrastructure (PostgreSQL & Redis)
From the root directory of the project:
```bash
docker compose up -d
```
*Spins up:*
- **PostgreSQL 16**: Port `5432` (`postgres:16-alpine`)
- **Redis 7**: Port `6379` (`redis:7-alpine`)

---

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
The backend starts on `http://localhost:4000`.

**Environment Variables (`backend/.env`):**
```env
PORT=4000
DATABASE_URL="postgresql://scheduler:scheduler@localhost:5432/scheduler?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
WORKER_CONCURRENCY=5
MIN_SEND_DELAY_MS=1000
MAX_EMAILS_PER_HOUR_PER_SENDER=10
```

---

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

**Environment Variables (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

---

### 4. Run Automated Verification Tests
```bash
cd backend
npm run test:verify
```
*Validates:*
- Nodemailer Ethereal account generation and preview URL extraction.
- Millisecond delay calculation logic.
- Rate limiter hourly bucket and window math.
- Idempotency guards against duplicate sends.
- Reconciliation logic identifying un-queued pending emails.

---

### 5. Run Live End-to-End Scenarios (Real DB & Redis)
```bash
cd backend
npx tsx test/live-verification.ts
```
*Executes all 3 live scenarios:*
1. Schedules emails and verifies real Ethereal SMTP delivery and preview URLs.
2. Schedules an email, purges Redis BullMQ queue, executes `reconcileScheduledEmails()`, and confirms on-time delivery with zero duplicates.
3. Schedules excess emails exceeding `MAX_EMAILS_PER_HOUR_PER_SENDER` and confirms automatic deferral to the next hour window without failing.

---

## Demo Video Walkthrough Script

Follow this step-by-step flow when recording the demonstration video:

### 1. Introduction (0:00 – 0:30)
- Introduce the project: ReachInbox Email Scheduler built with TypeScript, Express, BullMQ, Redis, PostgreSQL (Prisma), Nodemailer (Ethereal), and React + Tailwind.
- Show the two running Docker containers with `docker ps`.

### 2. Dashboard & Single Email Scheduling (0:30 – 1:30)
- Sign in via Google OAuth (or quick demo login).
- Open **Compose New Email**.
- Schedule an email to `lead@example.com` with a 5-second delay.
- Show the email appear in the **"Scheduled Emails"** tab with its countdown badge.
- Wait 5 seconds: watch it automatically move to **"Sent Emails"**.
- Click **"Ethereal Preview"** to open the rendered email message in your browser.

### 3. CSV Bulk Upload & Staggered Scheduling (1:30 – 2:30)
- Open **Compose New Email**.
- Upload [`sample-leads.csv`](./sample-leads.csv) (10 prospect leads).
- Highlight the live recipient counter badge (`✓ 10 valid recipients detected`).
- Set start time and a 2-second delay between emails.
- Click Schedule: observe how BullMQ staggers each send by 2 seconds.

### 4. CRITICAL: Restart Safety & Reconciliation Demo (2:30 – 4:00)
1. Open Compose and schedule an email to `restart-test@example.com` with a **15-second delay**.
2. Show the pending record in the Scheduled table and backend terminal.
3. **Kill the backend process** (`Ctrl+C` in the backend terminal) while the email is still pending.
4. Wait 5 seconds while the backend is completely offline.
5. **Restart the backend** (`npm run dev`).
6. Point to the terminal logs showing:
   ```
   [RECONCILER] Found 1 'pending' email record(s) in PostgreSQL.
   [RECONCILER] Re-enqueued missing job for email ... (remaining delay: ~8000ms)
   ```
7. Watch the remaining timer elapse and confirm the email **delivers on time** and is **sent exactly once**.

### 5. Rate Limiting Deferral Demo (4:00 – 5:00)
- Explain that `MAX_EMAILS_PER_HOUR_PER_SENDER` is set in `.env`.
- Schedule more emails than the limit for a single sender.
- Show terminal logs where excess emails are **not failed**, but safely deferred to the start of the next hour window (`scheduled_time` updated).

---

## API Reference

### 1. `POST /api/emails/schedule`
- **Description**: Accepts an array of email objects, persists them to PostgreSQL as `'pending'`, and enqueues BullMQ delayed jobs.
- **Request Body**:
```json
[
  {
    "recipient": "sarah.connor@cyberdyne.io",
    "subject": "System Upgrade Notice",
    "body": "Hi Sarah, your scheduled update is ready.",
    "sender": "campaign@reachinbox.test",
    "scheduledTime": "2026-08-26T21:30:00.000Z"
  }
]
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "e58f0143-9c22-4e11-9bde-38462300bf1f",
      "recipient": "sarah.connor@cyberdyne.io",
      "subject": "System Upgrade Notice",
      "body": "Hi Sarah, your scheduled update is ready.",
      "sender": "campaign@reachinbox.test",
      "scheduled_time": "2026-08-26T21:30:00.000Z",
      "status": "pending",
      "delayMs": 240000,
      "jobId": "email-e58f0143-9c22-4e11-9bde-38462300bf1f"
    }
  ]
}
```

### 2. `GET /api/emails/scheduled`
- **Description**: Returns all emails in `'pending'` status, ordered by `scheduled_time ASC`.

### 3. `GET /api/emails/sent`
- **Description**: Returns all emails in `'sent'` and `'failed'` status, ordered by `sent_at DESC`.

---

## Production Deployment Guide

This project includes ready-to-use production deployment configurations for multiple cloud providers:

### Option 1: 1-Click Deployment on Render (Recommended)
This repository includes a [`render.yaml`](./render.yaml) Blueprint that provisions PostgreSQL, Redis, the Node backend, and the React frontend in a single step:
1. Push your repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect this GitHub repository.
5. Render will automatically detect `render.yaml` and provision:
   - **PostgreSQL Database** (`reachinbox-postgres`)
   - **Redis Instance** (`reachinbox-redis`)
   - **Express + BullMQ Backend** (`reachinbox-backend`)
   - **React Static Dashboard** (`reachinbox-frontend`)
6. Click **Apply** to deploy the full stack!

---

### Option 2: Frontend on Vercel + Backend on Render / Railway
- **Frontend (Vercel)**:
  1. Import the `frontend` folder into [Vercel](https://vercel.com).
  2. Set Root Directory to `frontend`.
  3. Set Environment Variable `VITE_API_URL` to your deployed backend URL.
  4. Deploy! The included [`vercel.json`](./frontend/vercel.json) handles client-side SPA routing.
- **Backend (Render / Railway / Fly.io)**:
  1. Deploy using the included [`backend/Dockerfile`](./backend/Dockerfile).
  2. Connect your managed PostgreSQL and Redis instances via `DATABASE_URL`, `REDIS_HOST`, and `REDIS_PORT`.

---

### Option 3: Self-Hosted Docker Container (VPS / EC2)
Build and run the production Docker containers:
```bash
# Build backend container
docker build -t reachinbox-backend ./backend

# Build frontend container
docker build -t reachinbox-frontend ./frontend

# Run production stack with Docker Compose
docker compose up -d
```

---

## Submission Checklist & Reviewer Access

### Repository Permissions
When creating your private GitHub repository for this project, grant collaborator access to:
- **`Mitrajit`**
- **`Yadav036`**

### Feature Map
- [x] **Backend Core Scheduler**: Express.js + TypeScript + PostgreSQL (Prisma) + BullMQ + Redis (No cron).
- [x] **Restart Safety & Boot Reconciliation**: On boot, pending DB rows missing from Redis are re-enqueued with accurate remaining delay.
- [x] **Idempotency**: Prevents double sends if jobs are redelivered.
- [x] **Multi-Worker Rate Limiting**: Atomic Redis UTC hour buckets (`ratelimit:{sender}:{hour_timestamp}`) with auto-deferrals (zero dropped jobs).
- [x] **Worker Concurrency & Min Delay**: Configurable `WORKER_CONCURRENCY` and `MIN_SEND_DELAY_MS` via BullMQ limiter.
- [x] **Fake SMTP Delivery**: Nodemailer + Ethereal Email with logged & stored preview URLs.
- [x] **Frontend Dashboard**: React + TypeScript + Tailwind CSS with Google OAuth2 login, live polling (5s), Scheduled & Sent tabs.
- [x] **Compose Flow & CSV Parser**: Client-side RFC-5322 regex validation, deduplication, live counter, and staggered delay scheduling.
- [x] **Sample Dataset**: [`sample-leads.csv`](./sample-leads.csv) provided for quick testing.
