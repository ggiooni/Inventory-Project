# API Documentation

## Smart Inventory Management System

**Author:** Nicolas Boggioni Troncoso
**Version:** 1.0.0
**Date:** 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Cloud Functions API](#cloud-functions-api)
4. [JavaScript Module APIs](#javascript-module-apis)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)

---

## Overview

This document describes the APIs available in the Smart Inventory Management System. The system exposes:

- **Cloud Functions**: RESTful endpoints for AI features
- **JavaScript Modules**: Client-side APIs for application functionality

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://us-central1-bar-inventory-15a15.cloudfunctions.net` |
| Development | `http://localhost:5001/bar-inventory-15a15/us-central1` |

---

## Authentication

### Firebase Authentication

The system uses Firebase Authentication with email/password provider.

#### Login

```javascript
import { attemptLogin } from './modules/auth.js';

const result = await attemptLogin('user@example.com', 'password123');

if (result.success) {
    console.log('Logged in:', result.user);
} else {
    console.error('Error:', result.error);
}
```

#### Response

```javascript
// Success
{
    success: true,
    user: FirebaseUser
}

// Error
{
    success: false,
    error: "Invalid email or password."
}
```

#### Permission Levels

| Role | canModifyStock | canManageProducts | canManagePriorities |
|------|----------------|-------------------|---------------------|
| staff | ✓ | ✗ | ✗ |
| manager | ✓ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ |

---

## Cloud Functions API

### 1. AI Chat

Send a message to the AI assistant.

#### Endpoint

```
POST /aiChat
```

#### Request

```javascript
{
    "message": "What items need restocking?",
    "inventoryContext": "CURRENT INVENTORY STATUS...",
    "conversationHistory": [
        { "role": "user", "content": "Hello" },
        { "role": "assistant", "content": "Hi there!" }
    ]
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | User's message to the AI |
| inventoryContext | string | No | Current inventory summary |
| conversationHistory | array | No | Previous messages (max 10) |

#### Response

```javascript
// Success (200)
{
    "success": true,
    "message": "Based on your inventory, you should restock...",
    "usage": {
        "prompt_tokens": 150,
        "completion_tokens": 200,
        "total_tokens": 350
    }
}

// Error (400)
{
    "error": "Message is required"
}

// Error (500)
{
    "error": "AI service not configured. Please contact administrator."
}
```

---

### 2. Get AI Predictions

Generate inventory predictions using AI.

#### Endpoint

```
POST /getAIPredictions
```

#### Request

```javascript
{
    "inventoryData": [
        {
            "id": "item1",
            "name": "Vodka",
            "category": "Spirits",
            "stock": 5,
            "alertThreshold": 2,
            "priority": "high"
        }
    ]
}
```

#### Response

```javascript
// Success (200)
{
    "success": true,
    "predictions": "Based on current stock levels...\n1. Vodka - likely to run out in 3 days...",
    "generatedAt": "2025-01-29T10:30:00.000Z"
}
```

---

### 3. Generate Shopping List

Create an AI-powered shopping list.

#### Endpoint

```
POST /generateShoppingList
```

#### Request

```javascript
{
    "inventoryData": [/* array of inventory items */]
}
```

#### Response

```javascript
// Success (200)
{
    "success": true,
    "shoppingList": "SHOPPING LIST - January 29, 2025\n\nURGENT ITEMS:\n- Vodka: Order 15 units...",
    "generatedAt": "2025-01-29T10:30:00.000Z"
}
```

---

## JavaScript Module APIs

### Auth Module (`modules/auth.js`)

#### Functions

##### `attemptLogin(email, password)`

Authenticate a user with email and password.

```javascript
const result = await attemptLogin('user@example.com', 'password');
// Returns: { success: boolean, user?: FirebaseUser, error?: string }
```

##### `logout()`

Sign out the current user.

```javascript
const result = await logout();
// Returns: { success: boolean, message?: string, error?: string }
```

##### `getCurrentUser()`

Get the currently authenticated user.

```javascript
const user = getCurrentUser();
// Returns: FirebaseUser | null
```

##### `getUserRole()`

Get the current user's role.

```javascript
const role = getUserRole();
// Returns: 'admin' | 'manager' | 'staff'
```

##### `canModifyStock()`, `canManageProducts()`, `canManagePriorities()`

Check user permissions.

```javascript
if (canManagePriorities()) {
    // Allow admin actions
}
```

---

### Inventory Module (`modules/inventory.js`)

#### Functions

##### `loadInventoryData()`

Load all inventory items from Firestore.

```javascript
const result = await loadInventoryData();
// Returns: { success: boolean, count?: number, items?: array, error?: string }
```

##### `getInventoryItems()`

Get all inventory items (cached).

```javascript
const items = getInventoryItems();
// Returns: Array<InventoryItem>
```

##### `getFilteredItems()`

Get filtered inventory items.

```javascript
const filtered = getFilteredItems();
// Returns: Array<InventoryItem>
```

##### `getItemById(itemId)`

Get a single item by ID.

```javascript
const item = getItemById('item123');
// Returns: InventoryItem | undefined
```

##### `updateStock(itemId, newStock, updatedBy)`

Update stock level for an item.

```javascript
const result = await updateStock('item123', 10, 'admin@example.com');
// Returns: { success: boolean, error?: string }
```

##### `updatePriority(itemId, priority, threshold, updatedBy)`

Update priority settings for an item.

```javascript
const result = await updatePriority('item123', 'high', 5, 'admin@example.com');
// Returns: { success: boolean, error?: string }
```

##### `applyFilters({ search, category, status })`

Apply filters to inventory data.

```javascript
const filtered = applyFilters({
    search: 'vodka',
    category: 'Spirits',
    status: 'urgent'
});
// Returns: Array<InventoryItem>
```

##### `setupRealtimeListener(onUpdate, onError)`

Set up real-time updates from Firestore.

```javascript
const unsubscribe = setupRealtimeListener(
    (items) => console.log('Updated:', items),
    (error) => console.error('Error:', error)
);

// Later: unsubscribe();
```

##### `calculateStockStatus(product)`

Calculate stock status for a product.

```javascript
const status = calculateStockStatus(product);
// Returns: { status: 'urgent'|'normal'|'info'|'good'|'optimal', message: string }
```

##### `onInventoryChange(listener)`

Register a listener for inventory changes.

```javascript
const unsubscribe = onInventoryChange((items, filtered) => {
    console.log('Inventory changed');
});
```

---

### Alerts Module (`modules/alerts.js`)

#### Functions

##### `generateAlerts()`

Generate alerts based on current inventory.

```javascript
const alerts = generateAlerts();
// Returns: Array<Alert>
```

##### `getAlerts()`

Get all generated alerts.

```javascript
const alerts = getAlerts();
// Returns: Array<Alert>
```

##### `getAlertCounts()`

Get alert counts by category.

```javascript
const counts = getAlertCounts();
// Returns: { urgent: number, normal: number, info: number, total: number }
```

##### `generateShoppingList()`

Generate a shopping list from alerts.

```javascript
const result = generateShoppingList();
// Returns: { text: string, filename: string, urgentCount: number, normalCount: number }
```

##### `exportAlertsAsCSV()`

Export alerts as CSV.

```javascript
const result = exportAlertsAsCSV();
// Returns: { content: string, filename: string, rowCount: number }
```

##### `getRestockSuggestion(productId)`

Get restock suggestion for a product.

```javascript
const suggestion = getRestockSuggestion('item123');
// Returns: { product, currentStock, suggestedQuantity, priority, status? } | null
```

---

### POS Integration Module (`modules/pos-integration.js`)

#### Functions

##### `loadPOSConfig()`

Load POS configuration from Firestore.

```javascript
const config = await loadPOSConfig();
// Returns: POSConfig object
```

##### `savePOSConfig(config, updatedBy)`

Save POS configuration.

```javascript
const result = await savePOSConfig({
    system: 'toast',
    apiKey: 'your-api-key',
    restaurantId: 'location-123',
    syncFrequency: 'realtime'
}, 'admin@example.com');
// Returns: { success: boolean, message?: string, error?: string }
```

##### `syncWithPOS()`

Perform manual sync with POS.

```javascript
const result = await syncWithPOS();
// Returns: { success: boolean, updatedItems?: number, lastSync?: string, error?: string }
```

##### `isPOSConnected()`

Check if POS is connected.

```javascript
const connected = isPOSConnected();
// Returns: boolean
```

##### `getMenuItems()`

Get menu items from POS.

```javascript
const items = await getMenuItems();
// Returns: Array<MenuItem>
```

##### `saveItemMappings(mappings, updatedBy)`

Save item mappings.

```javascript
const result = await saveItemMappings(mappings, 'admin@example.com');
// Returns: { success: boolean, mappedCount?: number, error?: string }
```

---

### AI Assistant Service (`services/ai-assistant.js`)

#### Functions

##### `sendToGroq(message, inventoryData)`

Send a message to the AI assistant.

```javascript
const response = await sendToGroq('What needs restocking?', inventoryItems);
// Returns: string (AI response)
// Throws: Error on failure
```

##### `getInventoryPredictions(inventoryData)`

Get AI predictions for inventory.

```javascript
const predictions = await getInventoryPredictions(inventoryItems);
// Returns: { success: boolean, predictions: string, generatedAt: string }
```

##### `generateAIShoppingList(inventoryData)`

Generate AI-powered shopping list.

```javascript
const list = await generateAIShoppingList(inventoryItems);
// Returns: string (formatted shopping list)
```

##### `getInventoryInsights(inventoryData)`

Get comprehensive AI insights.

```javascript
const insights = await getInventoryInsights(inventoryItems);
// Returns: string (detailed analysis)
```

##### `clearAIConversation()`

Clear conversation history.

```javascript
clearAIConversation();
```

##### `checkAIServiceStatus()`

Check if AI service is available.

```javascript
const available = await checkAIServiceStatus();
// Returns: boolean
```

##### `buildInventoryContext(inventoryData)`

Build inventory context string for AI.

```javascript
const context = buildInventoryContext(inventoryItems);
// Returns: string (formatted inventory summary)
```

---

## Error Handling

### Standard Error Response

All APIs return errors in this format:

```javascript
{
    success: false,
    error: "Human-readable error message"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 405 | Method Not Allowed - Wrong HTTP method |
| 500 | Internal Server Error - Server-side error |

### Common Error Messages

```javascript
// Authentication
"Invalid email or password."
"Please enter both email and password"
"Too many failed attempts. Try again later."

// Permissions
"Permission denied"
"Admin access required"
"Manager or Admin access required"

// Inventory
"Cannot have negative stock!"
"Error updating stock"
"Error loading data"

// AI
"AI service is not available. Please ensure Cloud Functions are deployed."
"AI service error. Please try again."
```

---

## Rate Limits

### Firebase

| Service | Limit (Free Tier) |
|---------|-------------------|
| Authentication | 100 sign-ups/hour |
| Firestore Reads | 50,000/day |
| Firestore Writes | 20,000/day |
| Cloud Functions | 2M invocations/month |

### Groq API

| Limit | Value |
|-------|-------|
| Requests | 14,400/day |
| Tokens | 6,000/minute |

---

## Data Types

### InventoryItem

```typescript
interface InventoryItem {
    id: string;
    name: string;
    category: 'Spirits' | 'Wines' | 'Beers' | 'Soft Drinks' | 'Syrups';
    stock: number;
    priority?: 'high' | 'medium' | 'low';
    alertThreshold?: number;
    posItemId?: string;
    lastUpdated?: Timestamp;
    updatedBy?: string;
}
```

### Alert

```typescript
interface Alert {
    product: InventoryItem;
    status: 'urgent' | 'normal' | 'info';
    message: string;
    priority: 'high' | 'medium' | 'low';
    threshold: number;
    daysUntilEmpty: number;
    suggestedQuantity: number;
}
```

### POSConfig

```typescript
interface POSConfig {
    connected: boolean;
    system: 'toast' | 'square' | 'clover' | 'lightspeed';
    apiKey?: string;
    restaurantId?: string;
    syncFrequency: 'realtime' | '5min' | '15min' | '30min' | '1hour';
    lastSync: string | null;
    mappedItems: number;
    autoUpdates: number;
}
```

---

*This documentation is part of the BSc Computer Science Final Year Project at Dorset College Dublin.*
