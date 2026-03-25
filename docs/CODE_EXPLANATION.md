# Code Explanation Guide

## Smart Inventory Management System

**Purpose:** This document explains the codebase structure, technologies used, and implementation details to help understand and explain the project.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Choices & Justification](#technology-choices--justification)
3. [File Structure Explained](#file-structure-explained)
4. [Module-by-Module Breakdown](#module-by-module-breakdown)
5. [Key Concepts & Design Patterns](#key-concepts--design-patterns)
6. [Data Flow](#data-flow)
7. [Security Implementation](#security-implementation)
8. [Common Interview Questions](#common-interview-questions)

---

## Project Overview

### What is this project?

Smart Inventory is a **web-based inventory management system** designed for bars and restaurants. It helps track stock levels, generates alerts when items are low, and uses **AI to provide intelligent recommendations**.

### Main Features

| Feature | What it does | Technology used |
|---------|--------------|-----------------|
| User Authentication | Login/logout with different permission levels | Firebase Authentication |
| Real-time Inventory | Stock updates appear instantly for all users | Firebase Firestore (real-time database) |
| Smart Alerts | Automatic warnings when stock is low | Custom algorithm based on priority levels |
| AI Assistant | Natural language questions about inventory | Groq API + Llama 3.3 LLM |
| POS Integration | Connect with point-of-sale systems | REST API integration |
| Recipe Management | Create/edit/delete recipes, CSV import, ingredient autocomplete | Firebase Firestore + Vanilla JS |
| Product Creation | Add new inventory items directly from UI | Firebase Firestore |
| View-Based Routing | Sidebar nav shows/hides content sections (SPA-style) | Vanilla JS + CSS |
| Dark Mode | Toggle between light/dark themes | CSS Variables + localStorage |

---

## Technology Choices & Justification

### Why Firebase?

```
Firebase was chosen because:
├── Authentication: Built-in secure login system (no need to build from scratch)
├── Firestore: Real-time database (changes sync automatically to all users)
├── Cloud Functions: Serverless backend (no need to manage servers)
├── Hosting: Free SSL and CDN (fast loading worldwide)
└── Free Tier: Generous limits for a university project
```

**Interview Answer:** *"We chose Firebase because it provides a complete backend solution without needing to set up and manage our own servers. The real-time database was essential for our use case where multiple staff members need to see inventory updates instantly."*

### Why Groq API for AI?

```
Groq was chosen because:
├── Speed: Fastest LLM inference available (100-500ms responses)
├── Free Tier: 14,400 requests/day (enough for demo and testing)
├── Model: Access to Llama 3.3 70B (powerful open-source model)
└── Simple API: OpenAI-compatible format (easy to implement)
```

**Interview Answer:** *"We used Groq because it offers the fastest inference speeds for large language models, which is crucial for a good user experience. The free tier was sufficient for our project, and the API is compatible with OpenAI's format, making it easy to implement."*

### Why Vanilla JavaScript (No React/Vue)?

```
Vanilla JS was chosen because:
├── Simplicity: No build tools or compilation needed
├── Performance: No framework overhead
├── Learning: Demonstrates understanding of core JavaScript
├── ES6 Modules: Modern module system provides good organization
└── Portability: Works in any browser without dependencies
```

**Interview Answer:** *"We chose vanilla JavaScript with ES6 modules to demonstrate our understanding of core web technologies. While frameworks like React offer benefits, they also add complexity. For this project's scope, vanilla JS with proper module organization was sufficient and keeps the codebase simple to understand."*

---

## File Structure Explained

```
smart-inventory/
│
├── index.html                 # The single HTML page (Single Page Application)
│
├── css/
│   └── styles.css            # All styling (2000+ lines)
│                              # Uses CSS Variables for theming
│
├── src/                       # Source code (modular structure)
│   │
│   ├── config/               # Configuration files
│   │   ├── firebase.js       # Firebase connection setup
│   │   └── constants.js      # All magic numbers and settings
│   │
│   ├── modules/              # Feature modules (business logic)
│   │   ├── auth.js           # Login, logout, permissions
│   │   ├── inventory.js      # CRUD operations for products
│   │   ├── alerts.js         # Alert generation algorithm
│   │   ├── pos-integration.js # POS system connectivity
│   │   └── recipes.js          # Recipe CRUD operations
│   │
│   ├── services/             # External service integrations
│   │   └── ai-assistant.js   # AI/LLM communication
│   │
│   └── app.js                # Main entry point (coordinates everything)
│
├── functions/                 # Firebase Cloud Functions (backend)
│   ├── index.js              # API endpoints for AI
│   └── package.json          # Node.js dependencies
│
└── docs/                      # Documentation
    ├── ARCHITECTURE.md       # System design diagrams
    ├── API_DOCUMENTATION.md  # API reference
    └── CODE_EXPLANATION.md   # This file
```

### Why this structure?

**Separation of Concerns:** Each file has ONE responsibility.

```javascript
// BAD: Everything in one file
// app.js with 3000 lines handling auth, inventory, alerts, AI...

// GOOD: Separated modules
// auth.js       → Only authentication logic
// inventory.js  → Only inventory operations
// alerts.js     → Only alert generation
```

---

## Module-by-Module Breakdown

### 1. `src/config/constants.js`

**Purpose:** Centralize all configuration values (avoid "magic numbers")

```javascript
// WITHOUT constants (bad practice):
if (stock <= 2) { // What does 2 mean?
    alert = 'urgent';
}

// WITH constants (good practice):
import { DEFAULT_PRIORITIES } from './constants.js';
// DEFAULT_PRIORITIES.Spirits.threshold = 2
// Now it's clear: 2 is the threshold for Spirits
```

**Key exports:**
- `USER_ROLES` - Maps emails to permission levels
- `DEFAULT_PRIORITIES` - Stock thresholds per category
- `STOCK_STATUS` - Status codes (urgent, normal, good, etc.)
- `ERROR_MESSAGES` - Standardized error messages

---

### 2. `src/config/firebase.js`

**Purpose:** Initialize Firebase connection

```javascript
// This file creates the connection to Firebase services
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "...",        // Public key (safe to expose)
    projectId: "...",     // Project identifier
    // ... other config
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);   // Database connection
export const auth = getAuth(app);       // Auth connection
```

**Interview Answer:** *"Firebase API keys are safe to expose in client code because security is enforced through Firestore Security Rules on the server side, not through the API key."*

---

### 3. `src/modules/auth.js`

**Purpose:** Handle user authentication and permissions

**Key Functions:**

| Function | What it does |
|----------|--------------|
| `attemptLogin(email, password)` | Authenticates user with Firebase |
| `logout()` | Signs out current user |
| `getCurrentUser()` | Returns logged-in user object |
| `getUserRole()` | Returns 'admin', 'manager', or 'staff' |
| `canModifyStock()` | Check if user can update inventory |
| `canManagePriorities()` | Check if user is admin |
| `canManageProducts()` | Check if user is manager or admin |

**Permission System:**

```javascript
// Role-based access control (RBAC)
const USER_ROLES = {
    'admin@inventory.com': 'admin',      // Full access
    'manager@inventory.com': 'manager',  // Most features
    'staff@inventory.com': 'staff'       // Limited access
};

// Permission check functions
function canModifyStock() {
    return currentUser !== null;  // Any logged-in user
}

function canManagePriorities() {
    return userRole === 'admin';  // Only admins
}

function canManageProducts() {
    return userRole === 'admin' || userRole === 'manager';  // Admin or Manager
}
```

---

### 4. `src/modules/inventory.js`

**Purpose:** All inventory CRUD operations

**Key Functions:**

| Function | What it does |
|----------|--------------|
| `loadInventoryData()` | Fetch all items from database |
| `setupRealtimeListener()` | Subscribe to live updates |
| `updateStock(id, newStock)` | Change item's stock level |
| `updatePriority(id, priority, threshold)` | Change alert settings |
| `applyFilters({search, category, status})` | Filter displayed items |
| `calculateStockStatus(product)` | Determine if item needs alert |
| `addInventoryItem(data, email)` | Create new inventory item in Firestore |

**Real-time Updates Explained:**

```javascript
// Traditional approach (polling):
setInterval(() => {
    fetchInventory();  // Ask server every 5 seconds
}, 5000);

// Firebase approach (real-time):
onSnapshot(collection(db, 'inventory'), (snapshot) => {
    // This function runs automatically when ANY change happens
    // No need to poll - Firebase pushes updates to us
    updateLocalState(snapshot);
});
```

**Interview Answer:** *"We use Firebase's onSnapshot listener for real-time updates. Unlike polling where the client repeatedly asks the server for changes, Firebase uses WebSockets to push changes to the client immediately when they occur. This is more efficient and provides a better user experience."*

---

### 5. `src/modules/alerts.js`

**Purpose:** Generate stock alerts based on priority algorithm

**The Algorithm:**

```javascript
function calculateStockStatus(product) {
    const threshold = product.alertThreshold || 3;
    const priority = product.priority || 'medium';

    if (stock <= threshold) {
        // Below threshold - check priority to determine urgency
        switch (priority) {
            case 'high':   return 'urgent';   // Red alert
            case 'medium': return 'normal';   // Yellow alert
            case 'low':    return 'info';     // Blue alert
        }
    }
    return 'good';  // Green - no alert needed
}
```

**Visual Representation:**

```
Stock Level vs Threshold:

  HIGH      ████████████  URGENT (Red)
  PRIORITY  ████████████  Need immediate restock!

  MEDIUM    ████████████  NORMAL (Yellow)
  PRIORITY  ████████████  Restock soon

  LOW       ████████████  INFO (Blue)
  PRIORITY  ████████████  Low stock noted

  ANY       ████████████  GOOD (Green)
  PRIORITY  ████████████  Stock is adequate
            ▲
            │
            Threshold line
```

---

### 6. `src/modules/pos-integration.js`

**Purpose:** Connect with Point-of-Sale systems

**How POS Integration Works:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  POS System │     │   Our App   │     │  Inventory  │
│  (Toast,    │────>│   Webhook   │────>│  Database   │
│   Square)   │     │   Handler   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                        │
      │  "Margarita sold"                      │
      │                                        ▼
      │                              ┌─────────────────┐
      │                              │ Deduct:         │
      │                              │ - Tequila: 2oz  │
      │                              │ - Lime: 1oz     │
      │                              │ - Triple Sec:1oz│
      │                              └─────────────────┘
```

**Note:** In the current version, POS integration is simulated for demo purposes. Real integration would require API credentials from each POS provider.

---

### 9. `src/modules/recipes.js`

**Purpose:** Manage recipes with ingredients linked to inventory items

**Key Functions:**

| Function | What it does |
|----------|--------------|
| `loadRecipes()` | Fetch all recipes from Firestore |
| `createRecipe(data, email)` | Create a new recipe |
| `updateRecipe(id, data, email)` | Update existing recipe |
| `deleteRecipe(id)` | Delete a recipe |
| `getRecipes()` | Get all recipes (cached) |
| `getRecipeById(id)` | Get single recipe by ID |
| `onRecipesChange(callback)` | Listen for recipe changes |

**Recipe-Inventory Link:**

Each recipe ingredient references an inventory item by ID:

```javascript
{
    name: 'Margarita',
    category: 'Cocktails',
    ingredients: [
        { inventoryItemId: 'abc123', name: 'Tequila', quantity: 50, unit: 'ml' },
        { inventoryItemId: 'def456', name: 'Lime Juice', quantity: 25, unit: 'ml' }
    ]
}
```

This link enables automatic stock deduction when orders are placed.

---

### 7. `src/services/ai-assistant.js`

**Purpose:** Communicate with AI for intelligent features

**Why Cloud Functions for AI?**

```
INSECURE (API key exposed):
┌──────────┐                    ┌──────────┐
│ Browser  │───── API Key ─────>│ Groq API │
│          │     (EXPOSED!)     │          │
└──────────┘                    └──────────┘

SECURE (API key hidden):
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Browser  │────>│ Cloud        │────>│ Groq API │
│          │     │ Functions    │     │          │
│ No key   │     │ (has key)    │     │          │
└──────────┘     └──────────────┘     └──────────┘
```

**Key Functions:**

```javascript
// Send message to AI with inventory context
async function sendToGroq(userMessage, inventoryData) {
    const context = buildInventoryContext(inventoryData);

    const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        body: JSON.stringify({
            message: userMessage,
            inventoryContext: context,
            conversationHistory: history
        })
    });

    return response.json();
}

// Build context string so AI understands our inventory
function buildInventoryContext(inventoryData) {
    return `
        CURRENT INVENTORY STATUS:
        Total Items: ${inventoryData.length}
        Urgent Alerts: ${urgentCount}
        ...
        FULL INVENTORY LIST:
        - Vodka (Spirits): 5 units, Priority: high
        - Beer (Beers): 24 units, Priority: medium
        ...
    `;
}
```

---

### 8. `src/app.js`

**Purpose:** Main entry point - coordinates all modules

**What it does:**

1. **Initializes the app** when page loads
2. **Sets up authentication** listener
3. **Connects modules** together
4. **Handles UI events** (button clicks, form submissions)
5. **Exports functions to window** for HTML onclick handlers

```javascript
// Initialization flow
function initializeApp() {
    // 1. Set up auth listener
    initAuth({
        onAuthSuccess: handleAuthSuccess,
        onAuthFailure: handleAuthFailure
    });

    // 2. Connect module listeners
    onInventoryChange(() => {
        generateAlerts();      // Recalculate alerts
        updateStatsDisplay();  // Update dashboard numbers
        renderInventoryTable(); // Refresh table
    });

    // 3. Set up UI event listeners
    setupUIEventListeners();
}

// When user successfully logs in
async function handleAuthSuccess(authData) {
    // Show main app, hide login
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'flex';

    // Load data
    await loadInventoryData();
    setupRealtimeListener();
    await loadPOSConfig();
}
```

---

## Key Concepts & Design Patterns

### 1. ES6 Modules

```javascript
// Exporting (in auth.js)
export function login() { ... }
export function logout() { ... }

// Importing (in app.js)
import { login, logout } from './modules/auth.js';
```

**Why?** Keeps code organized, prevents global namespace pollution, enables code reuse.

---

### 2. Observer Pattern

```javascript
// Module maintains list of listeners
const listeners = [];

// Other modules can subscribe
export function onInventoryChange(callback) {
    listeners.push(callback);
}

// When data changes, notify all listeners
function notifyListeners() {
    listeners.forEach(callback => callback(data));
}
```

**Why?** Decouples modules - inventory module doesn't need to know about alerts module, it just notifies "something changed" and listeners react.

---

### 3. Async/Await

```javascript
// Old way (callback hell)
firebase.auth().signIn(email, password, function(user) {
    firebase.firestore().get('inventory', function(data) {
        processData(data, function(result) {
            // Nested callbacks = hard to read
        });
    });
});

// Modern way (async/await)
async function login() {
    const user = await signIn(email, password);
    const data = await getInventory();
    const result = await processData(data);
    // Clean, readable, linear flow
}
```

---

### 4. Defensive Programming

```javascript
// Always validate inputs
if (!email || !password) {
    return { success: false, error: 'Please enter both fields' };
}

// Always handle errors
try {
    await riskyOperation();
} catch (error) {
    console.error('Operation failed:', error);
    showNotification('Something went wrong', 'error');
}

// Always provide defaults
const threshold = product.alertThreshold || 3;  // Default to 3
const priority = product.priority || 'medium';   // Default to medium
```

---

## Data Flow

### Login Flow

```
User enters credentials
        │
        ▼
┌─────────────────────────────────────────┐
│  attemptLogin(email, password)          │
│  └── signInWithEmailAndPassword(auth)   │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Firebase Authentication                 │
│  └── Validates credentials              │
│  └── Creates session token              │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  onAuthStateChanged() triggers          │
│  └── User object received               │
│  └── Role determined from email         │
│  └── handleAuthSuccess() called         │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  App initializes                        │
│  └── Load inventory data                │
│  └── Set up real-time listener          │
│  └── Generate initial alerts            │
│  └── Render UI                          │
└─────────────────────────────────────────┘
```

### Stock Update Flow

```
User clicks "+1" on Vodka
        │
        ▼
┌─────────────────────────────────────────┐
│  quickUpdate('vodka-id', 'add')         │
│  └── Prompt for quantity                │
│  └── Calculate new stock                │
│  └── Call updateStock()                 │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Firestore updateDoc()                  │
│  └── Update stock field                 │
│  └── Update lastUpdated timestamp       │
│  └── Update updatedBy field             │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  onSnapshot() triggers (real-time)      │
│  └── All connected clients notified     │
│  └── Local state updated                │
│  └── Alerts regenerated                 │
│  └── UI re-rendered                     │
└─────────────────────────────────────────┘
```

---

## Security Implementation

### 1. Authentication Security

| Measure | Implementation |
|---------|----------------|
| Password hashing | Firebase handles this (bcrypt) |
| Session management | Firebase Auth tokens (JWT) |
| Secure transmission | HTTPS only |

### 2. API Key Security

| Key | Where stored | Exposed to browser? |
|-----|--------------|---------------------|
| Firebase API Key | firebase-config.js | Yes (safe - security via rules) |
| Groq API Key | Firebase Config | No (only Cloud Functions access) |

### 3. Firestore Security Rules

```javascript
// Only authenticated users can read/write
match /inventory/{itemId} {
    allow read: if request.auth != null;
    allow write: if request.auth != null;
}
```

### 4. XSS Prevention

```javascript
// Always escape user input before displaying
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;  // textContent escapes HTML
    return div.innerHTML;
}

// Usage
chatMessage.innerHTML = escapeHtml(userInput);
```

---

## Common Interview Questions

### Q: "Explain your project architecture"

**Answer:** *"The project follows a modular architecture with separation of concerns. The frontend is a Single Page Application using vanilla JavaScript with ES6 modules. We have separate modules for authentication, inventory management, alerts, and POS integration. The backend uses Firebase - Firestore for the real-time database, Authentication for user management, and Cloud Functions for secure AI API calls. This architecture allows each component to be developed and tested independently."*

---

### Q: "Why did you use Firebase instead of building your own backend?"

**Answer:** *"Firebase was ideal for this project because it provides real-time database synchronization out of the box, which is crucial for an inventory system where multiple users need to see updates instantly. It also handles authentication securely without us needing to implement password hashing and session management. The serverless Cloud Functions allowed us to add backend logic without managing servers. For a university project with limited time, this let us focus on the application logic rather than infrastructure."*

---

### Q: "How does the AI integration work?"

**Answer:** *"The AI integration uses a secure proxy pattern. The browser sends questions to our Firebase Cloud Function, which then forwards the request to the Groq API along with the API key stored securely in Firebase Config. This keeps the API key hidden from the browser. We also build a context string containing the current inventory state, so the AI can give relevant answers about stock levels and recommendations. The AI model we use is Llama 3.3 70B, accessed through Groq's inference API."*

---

### Q: "How do you handle real-time updates?"

**Answer:** *"We use Firebase Firestore's onSnapshot listener. Unlike traditional polling where the client repeatedly asks the server for changes, Firestore maintains a WebSocket connection and pushes changes to the client immediately when they occur in the database. When any user updates inventory, all connected clients receive the update within milliseconds. This is handled through our setupRealtimeListener function which updates the local state and triggers UI re-renders through the Observer pattern."*

---

### Q: "How did you implement the alert priority system?"

**Answer:** *"The alert system uses a two-factor algorithm: stock level relative to threshold, and priority level. Each product has a threshold (minimum acceptable stock) and priority (high, medium, low). When stock falls below the threshold, the priority determines the alert urgency - high priority items become urgent alerts, medium become normal alerts, and low become informational. This allows the system to be customized per product - spirits might have high priority with low threshold, while soft drinks have low priority with higher threshold."*

---

### Q: "What security measures did you implement?"

**Answer:** *"We implemented several security layers: First, Firebase Authentication handles user credentials securely with automatic password hashing. Second, Firestore Security Rules ensure only authenticated users can access data. Third, we use Firebase Cloud Functions as a proxy for AI calls, keeping the Groq API key on the server and never exposing it to the browser. Fourth, all user-generated content is escaped before rendering to prevent XSS attacks. Finally, we implement role-based access control where different user types have different permissions."*

---

## Quick Reference

### Running the Project

```bash
# Option 1: Python server
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Then open: http://localhost:8000
```

### Demo Credentials

Contact project team for access.

### Key Files to Review

1. `src/app.js` - Main application logic
2. `src/modules/inventory.js` - Core CRUD operations
3. `src/modules/alerts.js` - Alert algorithm
4. `src/services/ai-assistant.js` - AI integration
5. `functions/index.js` - Cloud Functions backend

---

**Project:** BSc Computer Science - Final Year Project
**Authors:** Nicolas Boggioni Troncoso & Fernando Moraes
**Institution:** Dorset College Dublin
