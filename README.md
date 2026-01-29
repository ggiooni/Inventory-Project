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
├── mobile/            # Mobile App (React Native) - In Development
└── docs/              # Documentation
```

---

## Authors

| Name | Role | GitHub |
|------|------|--------|
| Nicolas Boggioni Troncoso | Full Stack Developer | [@GGiooni](https://github.com/GGiooni) |
| Fernando Moraes | Mobile Developer | [@nando-moraes](https://github.com/nando-moraes) |

---

## Quick Start

### Frontend (Web App)

```bash
cd frontend
python -m http.server 8000
# Open http://localhost:8000
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

### Backend
- Node.js + Express
- Firebase Admin SDK
- JWT Authentication
- Groq API (AI/LLM)

### Mobile (In Development)
- React Native
- Expo

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

## License

This project is developed as part of academic coursework at Dorset College Dublin.
For academic use only.

---

<div align="center">

**Smart Inventory**
*AI-Powered Management for Smarter Operations*

BSc Computer Science - Final Year Project | 2025

</div>
