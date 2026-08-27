# VoteSecure — Next-Generation Biometric E-Voting Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-336791.svg)](https://www.postgresql.org/)
[![DeepFace](https://img.shields.io/badge/DeepFace-Facenet-orange.svg)](https://github.com/serengil/deepface)

**VoteSecure** is a secure, cloud-native electronic voting platform engineered to eliminate voter fraud, prevent impersonation, and guarantee ballot integrity through **real-time AI facial biometrics**, **client-side face mesh pose tracking**, and **cryptographic vector verification**.

---

## 👥 Project Team & Supervision

- **Academic Supervisor:** Dr. Benjamin Tei-Partey
- **Core Engineering Team:**
  - **Kelvin Sarfo Junior**
  - **Isaac Nii Sackey**
  - **Stanley Sam**

---

## 🌟 Key & Unique Features

### 1. 🤖 1:N AI Biometric Face Recognition Login
- **Passwordless Identification:** Voters can log in simply by presenting their face to the camera.
- **Deep Biometric Extraction:** The system transforms live facial features into a normalized vector embedding using **DeepFace (Facenet)** in high-dimensional vector space.
- **Fast Vector Similarity Search:** Utilizes **Cosine Distance similarity scoring** against enrolled voter matrices with rigorous matching thresholds (`threshold <= 0.45`) to achieve high-confidence recognition without false positives.

### 2. 🎯 Client-Side MediaPipe Face Mesh & Live Pose Guidance
- **Zero Cloud Latency Framing:** Powered by Google's `@mediapipe/tasks-vision` running on the browser's GPU.
- **Intelligent Pose & Centering Validation:** Evaluates real-time face area coverage (distance), horizontal/vertical centering, and head yaw/pitch angles with visual feedback and mesh overlays.
- **Anti-Mistake Capture Controls:** The camera is not turned on unexpectedly; users have full control with explicit activation, live rescan, and stop toggles.

### 3. 🛡️ Two-Tier Biometric Gate for Ballot Access
- **1:1 Pre-Vote Identity Challenge:** Before a voter can view or submit a ballot in any active election, they must re-verify their live biometric face against their registered baseline embedding.
- **Anti-Impersonation:** Ensures that the physical person casting the ballot is the verified credential owner.

### 4. 🔒 Strict Double-Voting Prevention & Audit Logging
- **Database-Level Integrity Constraints:** Enforces a composite unique index `@@unique([electionId, voterId])` at the PostgreSQL engine level, mathematically preventing double voting regardless of concurrency or browser re-submissions.
- **Immutable Audit Trail:** Every sensitive action (`face_login`, `face_verified`, `vote_cast`, candidate creation, admin promotions) is permanently timestamped and logged with actor metadata.

### 5. 👑 Multi-Tier Role-Based Access Control (RBAC)
- **SuperAdmin Hierarchy:** The initial system deployment automatically initializes the first registered administrator as **SuperAdmin**.
- **Admin Approval Workflow:** Subsequent administrative accounts are placed in a pending state until reviewed and approved by a SuperAdmin.
- **Comprehensive Election Administration:** Real-time election creation, status management (`draft`, `active`, `closed`), candidate nomination, and live vote counting.

### 6. ⚡ Resilient Cloud Microservice Architecture
- **Fault-Tolerant Retries:** Express API incorporates automatic retry with exponential backoff for cloud-hosted microservices (handling cold starts and rate limits seamlessly).
- **Decoupled Security Boundary:** Client browsers never communicate directly with the biometric processing engine or database; all traffic passes through the Node.js API gateway.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[Client Web App <br/> React + Vite + MediaPipe] -->|HTTPS / JSON / Multipart| B[API Gateway <br/> Node.js + Express + TypeScript]
    B -->|Prisma ORM / SQL| C[(PostgreSQL Database <br/> Neon / Cloud)]
    B -->|Internal REST API / Vector Proxy| D[Biometrics Microservice <br/> Python + FastAPI + DeepFace]
    
    subgraph "Frontend Layer"
        A
    end
    
    subgraph "Application Layer"
        B
    end
    
    subgraph "Biometrics & ML Engine"
        D
    end
    
    subgraph "Data Persistence"
        C
    end
```

---

## 🛠️ Complete Technology Stack

### **Frontend (Client Application)**
| Technology | Purpose |
|---|---|
| **React 18** | Declarative Component-driven UI framework |
| **TypeScript** | Strict compile-time type safety across all interfaces |
| **Vite** | Next-generation frontend tooling and rapid HMR build engine |
| **Tailwind CSS** | Modern utility-first design system with responsive dark/light modes |
| **@mediapipe/tasks-vision** | In-browser GPU-accelerated Face Landmark & Mesh detection |
| **react-webcam** | Hardware camera stream integration and real-time frame capturing |
| **Lucide React** | Consistent, lightweight iconography |
| **React Router v6** | Client-side routing and protected route guards |
| **Axios** | Promised-based HTTP client with interceptors for JWT injection |

### **Backend (API Gateway & Core Business Logic)**
| Technology | Purpose |
|---|---|
| **Node.js** | High-performance asynchronous JavaScript runtime |
| **Express 5** | REST API gateway, routing, and middleware framework |
| **TypeScript / tsx** | Native TypeScript execution and type validation |
| **Prisma ORM (v7)** | Type-safe database client and schema migration management |
| **PostgreSQL** | Relational database with composite constraints and JSON vector storage |
| **JSON Web Tokens (JWT)** | Stateless, cryptographic session token generation and verification |
| **BcryptJS** | Salted password hashing (10 rounds) |
| **Multer & FormData** | In-memory multipart file handling for biometric snapshots |

### **AI & Face Recognition Microservice**
| Technology | Purpose |
|---|---|
| **Python 3.10** | High-efficiency scientific runtime |
| **FastAPI** | High-throughput asynchronous ASGI microservice framework |
| **Uvicorn** | Lightning-fast ASGI web server |
| **DeepFace** | State-of-the-art Deep Learning facial recognition framework |
| **Facenet Architecture** | 128/512-dimension Euclidean and Cosine biometric vector embeddings |
| **NumPy & SciPy** | Vector math, matrix transformations, and Cosine distance metrics |
| **Pillow (PIL)** | Fast in-memory image buffer decoding |

### **DevOps, Tooling & Deployment**
| Platform / Tool | Usage |
|---|---|
| **Docker** | Containerized container image for Python Face Service with OpenCV dependencies |
| **Render** | Cloud hosting for Node.js API, Python Microservice, and PostgreSQL database |
| **Vercel** | Edge hosting and global CDN distribution for the React Single Page App |
| **Git / GitHub** | Source code management, branching, and automated CI/CD deployment pipelines |

---

## 📂 Project Directory Structure

```
VoteSecure/
├── frontend/                     # React + Vite Client Application
│   ├── src/
│   │   ├── assets/               # Static assets & illustrations
│   │   ├── hooks/
│   │   │   └── useFaceScanner.ts # MediaPipe vision hook & pose validation loop
│   │   ├── pages/
│   │   │   ├── Login.tsx         # Multi-mode login (Voter, Face Recognition, Admin)
│   │   │   ├── Register.tsx      # Voter registration with face enrollment
│   │   │   ├── VoterDashboard.tsx# Active elections, voter ballot portal & profile
│   │   │   ├── VotingFlow.tsx    # Biometric 1:1 verify gate + official ballot
│   │   │   ├── AdminDashboard.tsx# Election creator, candidate manager & tallies
│   │   │   └── AdminRegister.tsx # Admin sign-up with SuperAdmin approval queue
│   │   ├── api.ts                # Axios instance with auth interceptor
│   │   ├── App.tsx               # Route configurations & layout
│   │   └── main.tsx              # App entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                      # Node.js + Express API Gateway
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (Voters, Admins, Elections, Votes, AuditLogs)
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT token verification and role guards
│   │   ├── routes/
│   │   │   ├── auth.ts           # Registration, credential login, 1:N face login
│   │   │   ├── voter.ts          # Voter profile, election views, ballot casting
│   │   │   ├── admin.ts          # Admin approvals, election CRUD, live analytics
│   │   │   └── face.ts           # Proxy endpoints for face detect, enroll, and 1:1 verify
│   │   ├── db.ts                 # Prisma Client singleton
│   │   └── index.ts              # Express application configuration
│   └── package.json
│
├── face-service/                 # Python FastAPI Biometrics Microservice
│   ├── main.py                   # FastAPI routes (/detect, /enroll, /verify, /health)
│   ├── Dockerfile                # Container definition with OpenCV and DeepFace
│   └── requirements.txt          # Python dependencies
│
├── render.yaml                   # Infrastructure-as-Code deployment blueprint
└── README.md                     # Project documentation
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10.x
- **PostgreSQL**: Local instance or remote connection URI (e.g. Neon, Supabase)
- **Webcam**: Functional camera for biometric capture

---

### 1. Clone the Repository
```bash
git clone https://github.com/Masterlimit360/VoteSecure.git
cd VoteSecure
```

---

### 2. Configure the Python Face Microservice
```bash
cd face-service

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the microservice (runs on port 8000)
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

### 3. Configure and Start the Backend API
```bash
cd ../backend

# Install dependencies
npm install

# Configure environment variables (.env)
```
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/votesecure?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
FACE_SERVICE_URL="http://127.0.0.1:8000"
```

```bash
# Push Prisma database schema
npx prisma db push

# Start backend development server (runs on port 5000)
npm run dev
```

---

### 4. Configure and Start the Frontend Application
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser to access the VoteSecure platform.

---

## 🔐 Security & Privacy Implementation

1. **Biometric Vector Storage (Privacy by Design):** Raw photographs are not used for authentication matching; only irreversible mathematical feature matrices (embeddings) are evaluated.
2. **Cryptographic One-Vote Invariant:** Ballots are secured through database-level composite uniqueness (`electionId` + `voterId`), making double voting mathematically impossible.
3. **Stateless JWT with Expiration:** All sessions expire automatically within 24 hours. Sensitive admin operations require role verification headers.
4. **Audit Traceability:** Comprehensive logging for all identity authentications and election actions for complete compliance and forensic auditing.

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
