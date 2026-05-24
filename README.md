# MedSchedule

A scheduling and communication tool for doctors working across multiple clinics. Each clinic has its own reception desk and calendar — MedSchedule gives every party a shared, real-time view of the schedule.

![Status](https://img.shields.io/badge/status-in%20development-amber) ![Stack](https://img.shields.io/badge/stack-Next.js%2015%20%2B%20Hono-teal) 

---

## The problem

Doctors who work at several clinics simultaneously deal with fragmented scheduling: each location has its own reception team, its own calendar, and its own way of communicating changes. Appointment management happens over the phone or through text messages.

## Impact

MedSchedule reduces scheduling fragmentation across clinics by providing a single real-time system for doctors and reception staff. It eliminates phone-based coordination, reduces double-bookings, and improves visibility of doctor availability across multiple locations.

## Features

**Doctor**

- Creates an account and adds the clinics they work at
- Defines time slots per clinic — recurring (e.g. every Tuesday 9:00–13:00) or one-off
- Invites reception staff to a clinic via a tokenised e-mail link
- Revokes reception access at any time
- Submits a cancellation request for a single appointment or an entire day
- Taps an "I'm running late" button — reception sees the alert instantly, no page refresh required
- Views a weekly time-grid (Google Calendar-style) aggregating all clinics — each clinic colour-coded, no overlapping slots

**Reception**

- Accepts an invitation and gains access to the schedule for their clinic
- Creates, edits, and cancels appointments exclusively within slots defined by the doctor
- Receives delay alerts and cancellation requests in real time (SSE)
- Views a weekly time-grid for their clinic — slots defined by the doctor with booked appointments filled in

## Stack

| Layer        | Technology               | Why                                                     |
| ------------ | ------------------------ | ------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router)  | Server Components, built-in routing                     |
| Server state | TanStack Query           | Cache, refetch, optimistic updates                      |
| Client state | Zustand                  | Lightweight, no boilerplate (SSE alerts)                |
| Styling      | Tailwind CSS + shadcn/ui | Rapid prototyping, accessibility out of the box         |
| Backend      | Hono + Node.js           | Type-safe, minimal, supports long-lived SSE connections |
| ORM          | Drizzle ORM              | Type-safe SQL, fast migrations                          |
| Database     | PostgreSQL (Neon)        | Relational, serverless-friendly                         |
| Auth         | JWT in httpOnly cookie   | Secure, no third-party auth dependency                  |
| Validation   | Zod                      | Shared schemas between frontend and backend             |
| Real-time    | Server-Sent Events (SSE) | One-way push — exactly right for alert delivery         |
| Hosting      | Railway                  | Supports long-lived Node.js processes                   |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Railway                    │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Next.js (FE)    │  │   Hono API      │  │
│  │  :3000           │◄─►   :4000         │  │
│  └──────────────────┘  └────────┬────────┘  │
│                                 │           │
│                    ┌────────────▼─────────┐ │
│                    │  PostgreSQL (Neon)   │ │
│                    └──────────────────────┘ │
└─────────────────────────────────────────────┘
```

The frontend communicates with the API over REST. Delay alerts and cancellations are pushed to clients via an SSE stream (`GET /clinics/:id/events`) — reception staff do not need to refresh the page.

## Data model (simplified)

```
User ──────────────────── owns ──────────► Clinic
 │                                           │
 │                              ┌────────────┤
 │                              │            │
 ▼                              ▼            ▼
ClinicAccess           ScheduleRule     Invitation
(receptionist ↔ clinic) (time slots)   (e-mail token)
                              │
                              ▼
                         Appointment
                         (patient name, note, status)

status enum:
  scheduled          — active appointment
  awaiting_approval  — doctor requested cancellation, pending reception confirm
  cancelled          — confirmed cancelled

Clinic ──► DelayAlert          (is_active, auto-expires after 2h)
Clinic ──► CancellationRequest (full day or single appointment)
```

Full ERD available in [`/docs/erd.md`](./docs/erd.md).

## REST API — overview

Full specification in [`/docs/api.md`](./docs/api.md).

```
Auth
  POST   /auth/register
  POST   /auth/login
  POST   /auth/logout
  GET    /auth/me

Clinics
  POST   /clinics
  GET    /clinics
  GET    /clinics/:id
  PATCH  /clinics/:id
  DELETE /clinics/:id

Reception access
  POST   /clinics/:id/invitations
  POST   /invitations/:token/accept
  GET    /clinics/:id/staff
  DELETE /clinics/:id/staff/:userId

Schedule
  POST   /clinics/:id/schedule-rules
  GET    /clinics/:id/schedule-rules
  PATCH  /schedule-rules/:id
  DELETE /schedule-rules/:id
  GET    /clinics/:id/slots?date=YYYY-MM-DD
  GET    /doctor/schedule?week=YYYY-[W]WW     (doctor only — all clinics aggregated)

Appointments
  POST   /clinics/:id/appointments
  GET    /clinics/:id/appointments?date=YYYY-MM-DD
  PATCH  /appointments/:id
  DELETE /appointments/:id

Cancellation requests
  POST   /clinics/:id/cancellation-requests
  GET    /clinics/:id/cancellation-requests
  PATCH  /cancellation-requests/:id

Delay alerts
  POST   /clinics/:id/delay-alerts
  GET    /clinics/:id/delay-alerts?active=true
  PATCH  /delay-alerts/:id

Real-time
  GET    /clinics/:id/events   (SSE)
```

Authorization: JWT passed as `Authorization: Bearer <token>` or via httpOnly cookie. Role (`doctor` / `receptionist`) is enforced by middleware on every protected endpoint.

## Local development

### Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL (local instance or a connection string from [neon.tech](https://neon.tech))

### Setup

```bash
git clone https://github.com/<username>/medschedule
cd medschedule
pnpm install
```

### Environment variables

Create `.env` in project root:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=generate-a-secure-random-secret
PORT=3001

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Migrations and seed

```bash
pnpm --filter db db:migrate   # run Drizzle migrations
pnpm --filter db db:seed      # optional test data
```

### Start

```bash
pnpm dev   # starts frontend (:3000) and API (:3001) in parallel
```

## Project structure

```
medschedule/
├── apps/
│   ├── web/                         # Next.js 15
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── clinic/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── week/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── components/
│   │   ├── features/                # domain UI/features
│   │   ├── hooks/
│   │   ├── lib/                     # api client, utils
│   │   ├── providers/
│   │   ├── stores/                  # zustand
│   │   └── types/
│   │
│   └── api/                         # Hono backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth/
│       │   │   ├── clinics/
│       │   │   ├── schedules/
│       │   │   └── alerts/
│       │   │
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   └── role-guard.ts
│       │   │
│       │   ├── services/            # business logic
│       │   ├── repositories/        # db access layer
│       │   ├── sse/
│       │   ├── lib/
│       │   └── index.ts
│
├── packages/
│   ├── db/                          
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   ├── client.ts
│   │   │   ├── relations.ts
│   │   │   └── seed.ts
│   │   │
│   │   ├── drizzle/
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/
│      ├── src/
│      │   ├── schemas/
│      │   ├── constants/
│      │   ├── types/
│      │   └── utils/
│      │
│      ├── package.json
│      └── tsconfig.json
│
│                          
│
├── .env
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Key design decisions

The system prioritizes simplicity, predictability, and real-time coordination over feature richness.

**Monorepo with pnpm workspaces** — frontend and backend as separate apps in one repository. The `shared` package contains Zod schemas used on both sides, eliminating type duplication.

**SSE over WebSocket** — delay alerts and cancellations are one-way communication (server → client). SSE is simpler to implement, works over standard HTTP/2, and requires no separate server. A per-clinic room (`clinic:{id}`) ensures reception staff only receive events relevant to their location.

**`ScheduleRule` with `recurring | one_time` type** — a single model handles both standing schedules (every Tuesday 9–13) and one-off shifts. The pattern mirrors iCal RRULE.

**Appointment status as a state machine** — `status` has three states: `scheduled → awaiting_approval → cancelled`. When a doctor submits a cancellation request for a specific appointment, the appointment moves to `awaiting_approval` and becomes read-only for reception until they confirm. This prevents reception from editing or booking over a slot that is under review. Cancellation requests targeting a full day flip all `scheduled` appointments for that date to `awaiting_approval` in a single transaction.

**Soft delete on clinics** — deleting a clinic does not erase appointment history. A `deleted_at` field preserves the data for potential audits.

**Weekly time-grid** — the doctor's weekly view aggregates all clinics into a single CSS grid (days on the X axis, hours on the Y axis). Each clinic is assigned a colour at creation time; slots are guaranteed non-overlapping so every block occupies the full column width. Reception uses the same grid component in single-clinic mode, showing the doctor's slots with appointments filled in.

**Auto-expire on delay alerts** — an alert automatically deactivates after 2 hours if the doctor does not dismiss it manually. This prevents a stale alert from showing up for the next day's reception team.

## Non-goals (MVP scope)

- No payment system
- No patient self-registration
- No mobile native apps (PWA planned instead)
- No external auth providers (JWT only)
## Roadmap

- [ ] E-mail notifications on new cancellation requests
- [ ] PWA
