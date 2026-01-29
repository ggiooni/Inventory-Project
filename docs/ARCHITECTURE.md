# System Architecture

## Smart Inventory Management System

**Author:** Nicolas Boggioni Troncoso
**Course:** BSc Computer Science - Final Year Project
**Institution:** Dorset College Dublin
**Date:** 2025

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture Diagram](#system-architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Design Patterns](#design-patterns)
5. [Module Structure](#module-structure)
6. [Data Flow](#data-flow)
7. [Security Architecture](#security-architecture)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Deployment Architecture](#deployment-architecture)

---

## Overview

Smart Inventory is an AI-powered inventory management system designed for the hospitality industry. The system provides real-time stock tracking, intelligent alerts, POS integration, and AI-assisted decision making.

### Key Features

- **Real-time Inventory Tracking**: Live synchronization with Firebase Firestore
- **AI-Powered Insights**: Natural language queries using Groq/Llama 3.3
- **POS Integration**: Support for Toast, Square, Clover, and Lightspeed
- **Role-Based Access Control**: Admin, Manager, and Staff permission levels
- **Responsive Design**: Mobile-first approach with dark mode support

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│                         (Web Browser)                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        index.html                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│  │  │  CSS Layer  │  │  UI Layer   │  │    JavaScript Layer     │ │   │
│  │  │ styles.css  │  │   HTML DOM  │  │  ┌─────────────────────┐│ │   │
│  │  └─────────────┘  └─────────────┘  │  │     src/app.js      ││ │   │
│  │                                     │  │   (Main Entry)      ││ │   │
│  │                                     │  └──────────┬──────────┘│ │   │
│  │                                     │             │           │ │   │
│  │                                     │  ┌──────────┴──────────┐│ │   │
│  │                                     │  │      MODULES        ││ │   │
│  │                                     │  │ ┌────────────────┐  ││ │   │
│  │                                     │  │ │    auth.js     │  ││ │   │
│  │                                     │  │ │  inventory.js  │  ││ │   │
│  │                                     │  │ │   alerts.js    │  ││ │   │
│  │                                     │  │ │pos-integration │  ││ │   │
│  │                                     │  │ └────────────────┘  ││ │   │
│  │                                     │  │ ┌────────────────┐  ││ │   │
│  │                                     │  │ │   SERVICES     │  ││ │   │
│  │                                     │  │ │ ai-assistant   │  ││ │   │
│  │                                     │  │ └────────────────┘  ││ │   │
│  │                                     │  └─────────────────────┘│ │   │
│  │                                     └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    HTTPS / WebSocket │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER                                    │
│                     (Firebase Platform)                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │    Firebase     │  │    Firestore    │  │   Cloud Functions       │ │
│  │ Authentication  │  │    Database     │  │     (Node.js)           │ │
│  │                 │  │                 │  │                         │ │
│  │ - Email/Pass    │  │ - inventory     │  │ - aiChat                │ │
│  │ - Session Mgmt  │  │ - posConfig     │  │ - getAIPredictions      │ │
│  │ - Role Mapping  │  │ - mappings      │  │ - generateShoppingList  │ │
│  └─────────────────┘  └─────────────────┘  └────────────┬────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                                          │
                                              HTTPS/REST  │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Groq API                                  │   │
│  │                   (AI/LLM Inference)                             │   │
│  │                                                                  │   │
│  │              Model: Llama 3.3 70B Versatile                      │   │
│  │              Latency: ~100-500ms per request                     │   │
│  │              Rate Limit: 14,400 requests/day (free tier)         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      POS Systems                                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │   │
│  │  │  Toast   │  │  Square  │  │  Clover  │  │  Lightspeed  │    │   │
│  │  │   API    │  │   API    │  │   API    │  │     API      │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | - | Semantic markup with ARIA accessibility |
| CSS3 | - | Custom properties, Grid, Flexbox, Dark mode |
| JavaScript | ES6+ | Modules, async/await, Classes |
| Firebase SDK | 10.7.1 | Client-side Firebase integration |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Firebase Auth | - | User authentication and session management |
| Firestore | - | Real-time NoSQL document database |
| Cloud Functions | v4.5.0 | Serverless API endpoints |
| Node.js | 18 | Cloud Functions runtime |

### AI/ML

| Technology | Model | Purpose |
|------------|-------|---------|
| Groq API | Llama 3.3 70B | Natural language processing |

### Development Tools

| Tool | Purpose |
|------|---------|
| Firebase Emulator | Local development and testing |
| Git | Version control |
| VS Code | IDE with Live Server extension |

---

## Design Patterns

### 1. Module Pattern

The application uses ES6 modules to encapsulate functionality:

```javascript
// Each module exports specific functions
export function publicFunction() { ... }

// Internal state is kept private
const privateState = { ... };
```

### 2. Observer Pattern

Used for reactive state management:

```javascript
// Inventory module notifies listeners on change
const listeners = [];
export function onInventoryChange(callback) {
    listeners.push(callback);
    return () => listeners.splice(listeners.indexOf(callback), 1);
}
```

### 3. Adapter Pattern

POS integration uses adapters for different systems:

```javascript
// Each POS system is abstracted behind a common interface
const posAdapters = {
    toast: ToastAdapter,
    square: SquareAdapter,
    // ...
};
```

### 4. Proxy Pattern

AI requests are proxied through Cloud Functions for security:

```
Client → Cloud Function → Groq API
         (API key here)
```

---

## Module Structure

```
src/
├── config/
│   ├── firebase.js        # Firebase initialization
│   └── constants.js       # Application constants
├── modules/
│   ├── auth.js            # Authentication & authorization
│   ├── inventory.js       # Inventory CRUD operations
│   ├── alerts.js          # Alert generation & management
│   └── pos-integration.js # POS system connectivity
├── services/
│   └── ai-assistant.js    # AI/LLM integration
└── app.js                 # Main application entry point
```

### Module Dependencies

```
app.js
  ├── config/firebase.js
  ├── config/constants.js
  ├── modules/auth.js
  │     └── config/constants.js
  ├── modules/inventory.js
  │     ├── config/firebase.js
  │     ├── config/constants.js
  │     └── modules/auth.js
  ├── modules/alerts.js
  │     ├── config/constants.js
  │     └── modules/inventory.js
  ├── modules/pos-integration.js
  │     ├── config/firebase.js
  │     ├── config/constants.js
  │     └── modules/inventory.js
  └── services/ai-assistant.js
        └── config/constants.js
```

---

## Data Flow

### Authentication Flow

```
User Input → attemptLogin() → Firebase Auth
                                   │
                                   ▼
                            onAuthStateChanged()
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
              User Valid                     User Invalid
                    │                              │
                    ▼                              ▼
            handleAuthSuccess()           handleAuthFailure()
                    │                              │
                    ▼                              ▼
            Load Inventory              Show Login Screen
            Update UI
```

### Inventory Update Flow

```
User Action → updateStock() → Firestore Update
                                    │
                                    ▼
                           onSnapshot() trigger
                                    │
                                    ▼
                          inventoryState updated
                                    │
                                    ▼
                         notifyListeners()
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            generateAlerts()              renderInventoryTable()
                    │                               │
                    ▼                               ▼
            updateAlertsDisplay()            UI Updated
```

### AI Request Flow

```
User Message → sendToGroq() → Cloud Function
                                    │
                                    ▼
                            Build Context
                                    │
                                    ▼
                             Groq API Call
                                    │
                                    ▼
                            Parse Response
                                    │
                                    ▼
                          Update Chat History
                                    │
                                    ▼
                           Display Response
```

---

## Security Architecture

### Client-Side Security

1. **No sensitive data in client code**
   - Firebase API keys are safe to expose (security via rules)
   - Groq API key stored only in Cloud Functions

2. **Input validation**
   - All user inputs sanitized before display (XSS prevention)
   - Form validation before submission

3. **Authentication**
   - Firebase handles password hashing (bcrypt)
   - Secure session tokens (JWT)

### Server-Side Security

1. **Cloud Functions**
   - CORS configured for authorized origins
   - Request validation before processing
   - Rate limiting by Firebase

2. **Firestore Security Rules**
   - Role-based access control
   - Document-level permissions
   - Authenticated users only

3. **API Key Protection**
   - Groq API key in Firebase Config
   - Never transmitted to client
   - Environment variables for secrets

---

## Database Schema

### Firestore Collections

#### `inventory`
```javascript
{
  "id": "auto-generated",
  "name": "Absolut Vodka",
  "category": "Spirits",
  "stock": 15,
  "priority": "high",
  "alertThreshold": 2,
  "posItemId": "toast-item-123",  // Optional
  "lastUpdated": Timestamp,
  "updatedBy": "admin@inventory.com"
}
```

#### `posConfig`
```javascript
{
  "id": "main",
  "system": "toast",
  "apiKey": "encrypted-key",
  "restaurantId": "location-123",
  "syncFrequency": "realtime",
  "connected": true,
  "lastSync": Timestamp,
  "mappedItems": 5,
  "autoUpdates": 42
}
```

---

## API Endpoints

### Cloud Functions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/aiChat` | POST | AI chat proxy |
| `/getAIPredictions` | POST | Inventory predictions |
| `/generateShoppingList` | POST | AI shopping list |

### Request/Response Examples

#### AI Chat
```javascript
// Request
POST /aiChat
{
  "message": "What items need restocking?",
  "inventoryContext": "...",
  "conversationHistory": [...]
}

// Response
{
  "success": true,
  "message": "Based on your inventory...",
  "usage": { "total_tokens": 150 }
}
```

---

## Deployment Architecture

### Production Environment

```
┌──────────────────────────────────────────────────────────┐
│                    Firebase Hosting                       │
│              (CDN - Global Distribution)                  │
│                                                          │
│    Static Assets: index.html, CSS, JS                    │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                 Firebase Cloud Functions                  │
│                  (us-central1 region)                     │
│                                                          │
│    - aiChat                                              │
│    - getAIPredictions                                    │
│    - generateShoppingList                                │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   Firebase Services                       │
│                                                          │
│    ┌─────────────┐    ┌─────────────────────────┐       │
│    │    Auth     │    │       Firestore         │       │
│    │  Service    │    │  (Multi-region auto)    │       │
│    └─────────────┘    └─────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

### Development Environment

```bash
# Local development with emulators
firebase emulators:start

# Ports:
# - Hosting: localhost:5000
# - Functions: localhost:5001
# - Firestore: localhost:8080
# - Auth: localhost:9099
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Modules loaded on demand
2. **Debouncing**: Search input debounced (300ms)
3. **Pagination**: Alert display limited to 6 items
4. **Caching**: AI conversation history limited to 10 messages

### Metrics Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3.5s |
| Lighthouse Score | > 90 |

---

## Future Enhancements

1. **Offline Support**: Service Worker for offline functionality
2. **Push Notifications**: Firebase Cloud Messaging for alerts
3. **Analytics Dashboard**: Charts and historical data
4. **Barcode Scanning**: Camera-based inventory updates
5. **Multi-location**: Support for multiple venues

---

*This document is part of the BSc Computer Science Final Year Project at Dorset College Dublin.*
