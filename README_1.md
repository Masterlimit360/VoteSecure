# VoteSecure — Build Guide

Online voting platform with facial recognition + liveness detection for voter authentication.

Supervisor: Dr. Benjamin Tei-Partey
Team: Stanley Sam, Sackey Isaac Nii, Sarfo Kelvin Junior

---

## 1. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend API | Node.js + Express |
| Database | PostgreSQL |
| Face Recognition Service | Python + FastAPI + DeepFace |
| Liveness Detection | MediaPipe Face Mesh (blink/head-turn) |
| Auth | JWT |
| File/Image storage | Local disk (dev) → S3/Cloudinary (prod) |

**Why a separate Python service:** Node has no mature face-recognition libraries. DeepFace (Python) wraps FaceNet/ArcFace/VGG-Face models and is far more accurate than JS alternatives. Express talks to it over a simple REST API.

---

## 2. Architecture

```
React (Vite) ──HTTP──> Express API ──HTTP──> FastAPI (DeepFace + MediaPipe)
                            │
                            └──> PostgreSQL
```

- Frontend never talks to the face service directly — always through Express, so you keep one auth boundary and one place to log/audit.
- Face embeddings (not raw photos) get stored in Postgres as vectors/JSON — this is what "secure biometric storage" in your scope means in practice.

---

## 3. Repo Structure

```
votesecure/
├── frontend/              # React + Vite
├── backend/                # Node + Express
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/     # JWT auth, audit logging
│   │   ├── models/         # Postgres queries (pg or Prisma)
│   │   └── services/       # calls to face-service
│   └── package.json
├── face-service/            # FastAPI + DeepFace + MediaPipe
│   ├── main.py
│   ├── recognition.py       # embedding + matching
│   ├── liveness.py          # blink/head-turn checks
│   └── requirements.txt
└── README.md
```

---

## 4. Build Order (maps to your Agile sprints)

### Sprint 1 — Foundations (2 weeks)
- [ ] Set up repo structure above, init git
- [ ] Scaffold React app (Vite) with routing (React Router)
- [ ] Scaffold Express app, connect to PostgreSQL
- [ ] Design DB schema (see §5 below)
- [ ] Build JWT auth: register/login for voters + admins
- [ ] Basic UI: login, register pages

### Sprint 2 — Voter & Election Core (3 weeks)
- [ ] Voter registration (name, index number/ID, email)
- [ ] Voter profile management
- [ ] Admin: create election, set start/end time
- [ ] Admin: candidate management (add/edit/remove candidates per election)
- [ ] Election dashboard (list elections, status)

### Sprint 3 — Facial Recognition (3 weeks) — the hard part, start early
- [ ] Stand up FastAPI face-service independently, test with Postman first
- [ ] `/enroll` endpoint: takes a face image, generates embedding via DeepFace, returns embedding
- [ ] `/verify` endpoint: takes a live capture + stored embedding, returns match score
- [ ] `/liveness` endpoint: MediaPipe-based blink/head-turn check
- [ ] Frontend: webcam capture component (use `react-webcam`)
- [ ] Wire enrollment into voter registration flow
- [ ] Wire verification into voting flow (before ballot access)

### Sprint 4 — Voting & Results (3 weeks)
- [ ] Vote casting endpoint (one vote per voter — enforce at DB level with unique constraint)
- [ ] Vote encryption at rest
- [ ] Real-time vote counting (websocket or polling)
- [ ] Results dashboard for admins (and public results view if in scope)

### Sprint 5 — Hardening (3 weeks)
- [ ] Security testing (JWT expiry, SQL injection checks, rate limiting on login/verify)
- [ ] Performance testing (face matching latency under load)
- [ ] Bug fixing
- [ ] Audit logs (who did what, when)
- [ ] Deployment
- [ ] Final documentation

---

## 5. Core DB Schema (starting point)

```sql
CREATE TABLE voters (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  index_number VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  face_embedding JSONB,          -- stored vector from DeepFace
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE elections (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, closed
  created_by INT REFERENCES admins(id)
);

CREATE TABLE candidates (
  id SERIAL PRIMARY KEY,
  election_id INT REFERENCES elections(id),
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  photo_url VARCHAR(255)
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  election_id INT REFERENCES elections(id),
  voter_id INT REFERENCES voters(id),
  candidate_id INT REFERENCES candidates(id),
  cast_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(election_id, voter_id)   -- enforces one vote per voter per election
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_type VARCHAR(20),         -- 'voter' or 'admin'
  actor_id INT,
  action VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Face Service — Minimal Setup

```bash
cd face-service
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn deepface mediapipe opencv-python python-multipart
```

`main.py` skeleton:
```python
from fastapi import FastAPI, UploadFile
from deepface import DeepFace

app = FastAPI()

@app.post("/enroll")
async def enroll(file: UploadFile):
    # save temp image, get embedding
    embedding = DeepFace.represent(img_path=temp_path, model_name="Facenet")[0]["embedding"]
    return {"embedding": embedding}

@app.post("/verify")
async def verify(file: UploadFile, stored_embedding: list):
    result = DeepFace.verify(img1_path=temp_path, img2_path=stored_image_or_embedding, model_name="Facenet")
    return {"verified": result["verified"], "distance": result["distance"]}
```

For liveness (blink detection via MediaPipe): track eye-aspect-ratio across frames from a short video/burst of captures during enrollment and verification — reject if no blink detected, or if a prompted head-turn didn't happen.

---

## 7. Using Antigravity IDE + AI Effectively

- **Work sprint by sprint** — don't ask the AI to "build the whole app," ask it to build one ticket at a time (e.g. "implement the `/api/voters/register` endpoint given this schema").
- **Feed it context**: paste the relevant schema/file, not the whole repo, when asking for a specific feature — keeps output focused.
- **Build face-service in isolation first** — test `/enroll` and `/verify` with Postman/curl before wiring it into the full app. This is the highest-risk, most unfamiliar piece; de-risk it early instead of in Sprint 3 under deadline pressure.
- **Ask for tests alongside code** — for auth and voting logic especially, since bugs there compromise "one vote per voter."
- **Have it generate the audit log calls automatically** as you build each admin/voter action — easy to forget if bolted on later.

---

## 8. Order to Actually Start Coding Tomorrow

1. `git init`, scaffold all three folders
2. Postgres schema (§5) — run it, confirm tables exist
3. Express: `/auth/register`, `/auth/login` for voters, JWT middleware
4. React: register/login pages hitting those endpoints
5. FastAPI face-service: get `/enroll` working standalone with a test image via curl
6. Only once 1–5 work, move to election/candidate CRUD (Sprint 2 territory)

This order gets you a working (if minimal) auth flow with real face enrollment in the first week, which de-risks the scariest part of the whole project early.
