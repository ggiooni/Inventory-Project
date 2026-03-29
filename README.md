# Smart Inventory Management System

> **BSc Computer Science - Final Year Project**
> Dorset College Dublin, Ireland | 2025–2026

An AI-powered inventory management system for the hospitality industry with real-time tracking, smart alerts, POS integration, and a mobile waiter app that connects via REST API.

---

## Project Structure

```
inventory-project/
├── frontend/          # Web Dashboard (HTML, CSS, JavaScript)
├── backend/           # REST API (Node.js + Express)
├── mobile-waiter-app/ # WaiterApp — Android POS (Kotlin)
└── docs/              # Architecture, API docs, deployment guide
```

---

## Authors

| Name | Role | GitHub |
|------|------|--------|
| Nicolas Boggioni Troncoso | Full Stack Developer | [@GGiooni](https://github.com/GGiooni) |
| Fernando Moraes | Mobile Developer | [@nando-moraes](https://github.com/nando-moraes) |

---

## Prerequisites

- Node.js 22+ (LTS)
- npm 10+
- Firebase project configured
- Android Studio (for WaiterApp)

## Quick Start

### Backend (API) — start first

```bash
cd backend
npm install
cp .env.example .env    # Edit with your Firebase credentials
npm run dev             # API at http://localhost:5000
```

### Frontend (Web Dashboard)

```bash
cd frontend
npm install
npx serve . -p 3001    # Dashboard at http://localhost:3001
```

### WaiterApp (Android POS)

1. Open `mobile-waiter-app/WaiterApp` in Android Studio
2. Ensure `google-services.json` is in `app/` (download from Firebase Console)
3. Run on emulator (uses `10.0.2.2:5000` to reach the backend)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@inventory.com` | `admin123.` |
| Manager | `manager@inventory.com` | `manager123.` |
| Staff | `staff@inventory.com` | `staff123.` |

### Seed Data

```bash
cd backend
node scripts/seed-fresh.js   # Fresh bar dataset (inventory, menu, tables, recipes)
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6+), Firebase SDK |
| Backend | Node.js, Express, Firebase Admin SDK, JWT |
| Database | Firebase Firestore |
| AI | Groq API (Llama 3.3) |
| Mobile | Native Android (Kotlin), OkHttp, Gson |
| Testing | Vitest (frontend), Jest (backend) |
| CI/CD | GitHub Actions |

---

## Features

- **Real-time Inventory Tracking** — Live updates via Firestore, 5-second polling fallback
- **Smart Alerts** — Priority-based stock warnings with notifications
- **AI Assistant** — Natural language queries powered by Groq/Llama 3.3
- **WaiterApp POS** — Mobile ordering app connected via REST API
- **Order Finalization** — Automatic inventory deduction with bottle-level tracking (openMl/stock)
- **Stock Indicators** — Menu items show servingsLeft on the POS
- **Recipe Management** — Cocktail recipes linked to inventory items
- **Role-based Access** — Admin, Manager, Staff permissions
- **POS Dashboard** — Live view of tables, open orders, and recent sales
- **Dark Mode** — User preference saved locally

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/register` | Register new user |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all items |
| POST | `/api/inventory` | Create item |
| PATCH | `/api/inventory/:id/stock` | Update stock |
| GET | `/api/alerts` | Low stock alerts |

### POS Integration (WaiterApp)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tables` | List tables |
| GET | `/api/menu-items` | Menu with stock indicators |
| POST | `/api/orders` | Create order |
| POST | `/api/orders/:id/items` | Add item (auto-increment) |
| POST | `/api/orders/:id/finalize` | **Close order + deduct inventory** |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/recipes` | Recipe management |
| POST | `/api/ai/chat` | AI assistant |

Full API documentation: [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENTS                            │
│  ┌─────────────┐  ┌──────────────┐                       │
│  │  Web App    │  │  WaiterApp   │                       │
│  │  (Frontend) │  │  (Android)   │                       │
│  └──────┬──────┘  └──────┬───────┘                       │
└─────────┼────────────────┼────────────────────────────────┘
          │                │
          │          REST API (HTTP)
          │                │
┌─────────┼────────────────┼────────────────────────────────┐
│         ▼                ▼                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           BACKEND (Node.js + Express)                │  │
│  │                                                      │  │
│  │  Auth · Inventory · Alerts · AI · Recipes            │  │
│  │  Tables · MenuItems · Orders (+ Finalize)            │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                          │                                 │
│  ┌───────────────┐ ┌────┴──────┐ ┌─────────────────────┐ │
│  │ Firebase Auth │ │ Firestore │ │  Groq API (AI/LLM)  │ │
│  └───────────────┘ └───────────┘ └─────────────────────┘ │
│                       SERVER                               │
└────────────────────────────────────────────────────────────┘
```

### Order Finalization Flow
When a waiter finalizes an order in the WaiterApp:
1. Backend reads all order items and their recipes
2. Aggregates total ml/units needed per inventory item
3. Consumes from open bottle (openMl) first, opens new bottles if needed
4. All writes are atomic via Firestore transaction
5. Returns stock warnings to the waiter if inventory is low
6. Web dashboard updates automatically within 5 seconds

---

## CI/CD

GitHub Actions pipelines with change detection — only runs jobs for modified services.

```bash
# Run tests locally
cd backend && npm test
cd frontend && npm test
```

---

## License

This project is developed as part of academic coursework at Dorset College Dublin.
For academic use only.

---

<div align="center">

**Smart Inventory**
*AI-Powered Management for Smarter Operations*

BSc Computer Science - Final Year Project | 2025–2026

</div>
