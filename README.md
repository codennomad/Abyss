# Abyss

> Personal protocol tracking platform — build systems, not habits.

Abyss is a full-stack web app for defining, logging, and visualizing personal protocols — structured routines across mind, body, discipline, social, and creative dimensions. Track consistency, earn XP, and monitor your heat score over time.

---

## Stack

### Backend

| Technology | Role |
|---|---|
| Python 3.12 | Runtime |
| FastAPI | REST framework |
| SQLAlchemy 2 (async) | ORM |
| Alembic | Database migrations |
| PostgreSQL | Database |
| asyncpg | Async PostgreSQL driver |
| PyJWT + bcrypt | Auth (JWT tokens + password hashing) |
| SlowAPI | Rate limiting |
| Pydantic v2 | Request/response validation |

### Frontend

| Technology | Role |
|---|---|
| React 19 | UI framework |
| TypeScript | Language |
| Vite 6 | Bundler |
| React Router 7 | Client-side routing |
| vite-plugin-pwa | PWA support |

---

## Features

- **Protocol library** — create custom protocols in 5 categories: mind, body, discipline, social, creative
- **Daily logging** — mark protocols as done, failed, or skipped with optional notes
- **XP system** — each completed protocol awards XP; track total and per-protocol progress
- **Heat score** — composite consistency metric updated per log entry
- **Contribution grid** — GitHub-style activity heatmap for visual streaks
- **JWT auth** — secure registration and login with token-based sessions
- **Swagger docs** — auto-generated API docs at `/docs`
- **Rate limiting** — SlowAPI guards public endpoints

---

## API Routes

All routes prefixed with `/api`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Get JWT token |
| `GET` | `/api/auth/me` | Current user info |

### Protocols

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/protocols` | List user's protocols |
| `POST` | `/api/protocols` | Create a protocol |
| `PUT` | `/api/protocols/{id}` | Update protocol |
| `DELETE` | `/api/protocols/{id}` | Delete protocol |

### Metrics & Logs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/metrics` | Aggregated stats (XP, heat, streaks) |
| `GET` | `/api/metrics/logs` | Full log history |
| `POST` | `/api/metrics/log` | Log a protocol execution |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+

### Backend

```bash
cd api

# Create virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env and configure
cp .env.example .env
```

Edit `api/.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/abyss_db
JWT_SECRET=your-secret
ORIGINS=http://localhost:5173
```

```bash
# Run migrations
alembic upgrade head

# Start API (port 8000)
uvicorn app.main:app --reload
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Frontend

```bash
cd web

# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev
```

---

## Project Structure

```
abyss/
├── api/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py        # /api/auth/*
│   │   │   ├── protocols.py   # /api/protocols/*
│   │   │   ├── metrics.py     # /api/metrics/*
│   │   │   └── users.py       # /api/users/*
│   │   ├── auth.py            # JWT helpers, password hashing
│   │   ├── config.py          # Pydantic settings
│   │   ├── database.py        # SQLAlchemy async engine
│   │   ├── deps.py            # FastAPI dependency injection
│   │   ├── main.py            # App factory, middleware
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   └── schemas.py         # Pydantic request/response schemas
│   ├── alembic/               # Database migrations
│   ├── .env.example
│   └── requirements.txt
└── web/
    └── src/
        ├── components/        # Layout, ContributionGrid
        ├── hooks/             # useAuth
        ├── lib/               # API client
        ├── pages/             # Dashboard, Protocols, Logs, Settings
        └── App.tsx
```

---

## Data Model

```
User
 ├── id (UUID)
 ├── username
 ├── email
 ├── password_hash
 ├── heat (float — consistency score)
 └── protocols[]
      ├── name
      ├── category (mind | body | discipline | social | creative)
      ├── frequency_days
      ├── xp_reward
      └── logs[]
           ├── status (done | failed | skipped)
           ├── note
           ├── xp_earned
           └── logged_at
```

---

## License

MIT
