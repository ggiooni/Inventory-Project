# Smart Inventory Management System

> **BSc Computer Science - Final Year Project**
> Dorset College Dublin, Ireland | 2025

An AI-powered inventory management system for the hospitality industry with real-time tracking, smart alerts, and POS integration.

---

## Project Structure

```
inventory-project/
├── frontend/          # Web Application (HTML, CSS, JavaScript)
├── backend/           # REST API (Node.js + Express)
├── mobile-waiter-app/ # Mobile App (Native Android / Kotlin)
└── docs/              # Documentation
```

---

## Authors

| Name | Role | GitHub |
|------|------|--------|
| Nicolas Boggioni Troncoso | Full Stack Developer | [@GGiooni](https://github.com/GGiooni) |
| Fernando Moraes | Mobile Developer | [@nando-moraes](https://github.com/nando-moraes) |
| Geison Herrar | Collaborator | |

---

## Prerequisites

- Node.js 22+ (LTS)
- npm 10+
- Firebase project configured

## Quick Start

### Frontend (Web App)

```bash
cd frontend
npm install
npx serve .
# Open http://localhost:3000
```

### Backend (API)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
# API running at http://localhost:5000
```

---

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Firebase SDK (Authentication, Firestore)
- Vitest (Testing)

### Backend
- Node.js + Express
- Firebase Admin SDK
- JWT Authentication
- Groq API (AI/LLM)
- Jest (Testing)

### Mobile (Waiter App)
- Native Android (Kotlin)
- Firebase Authentication + Firestore
- Android JUnit (Testing)

---

## Features

- **Real-time Inventory Tracking** - Live updates via Firebase
- **Smart Alerts** - Priority-based stock warnings
- **AI Assistant** - Natural language queries (Groq/Llama 3.3)
- **POS Integration** - Toast, Square, Clover, Lightspeed
- **Role-based Access** - Admin, Manager, Staff permissions
- **Dark Mode** - User preference saved locally
- **Mobile Responsive** - Works on all devices

---

## API Documentation

See [backend/README.md](./backend/README.md) for full API documentation.

### Quick Reference

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | User authentication |
| `GET /api/inventory` | Get all inventory items |
| `PATCH /api/inventory/:id/stock` | Update stock level |
| `GET /api/alerts` | Get stock alerts |
| `POST /api/ai/chat` | Chat with AI assistant |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Web App    │  │ Mobile App  │  │   Third-party Apps      │ │
│  │  (Frontend) │  │  (Mobile)   │  │   (Future)              │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          └────────────────┼──────────────────────┘
                           │
                    REST API / HTTPS
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 BACKEND (Node.js + Express)                  ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐││
│  │  │   Auth   │ │Inventory │ │  Alerts  │ │   AI Service     │││
│  │  │Controller│ │Controller│ │Controller│ │   Controller     │││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                           ▼                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │  Firebase   │  │  Firebase   │  │    Groq API     │   │  │
│  │  │   Auth      │  │  Firestore  │  │    (AI/LLM)     │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  │                    DATABASE LAYER                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                         SERVER                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## CI/CD

This project uses GitHub Actions for continuous integration and deployment.

### CI Pipeline (`ci.yml`)
- **Change detection** - Only runs jobs for modified services (backend/frontend)
- **Lint + Test in parallel** - ESLint and test suites run concurrently per service
- **Coverage reports** - Uploaded as artifacts on every run
- **Security audit** - Dependency vulnerability scanning
- **Gate job** - All checks must pass before merge

### CD Pipeline (`deploy.yml`)
- **Staging** - Auto-deploys to Firebase after CI passes on `main`
- **Production** - Requires manual approval via GitHub environment protection rules
- Deploys Firestore rules + Firebase Hosting

### Running Tests Locally

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test

# With coverage
npm run test:coverage
```

---

## License

This project is developed as part of academic coursework at Dorset College Dublin.
For academic use only.

---

<div align="center">

**Smart Inventory**
*AI-Powered Management for Smarter Operations*

BSc Computer Science - Final Year Project | 2025

</div>
