# Smart Inventory - Backend API

## Node.js + Express REST API

**Authors:** Nicolas Boggioni Troncoso & Fernando Moraes
**Course:** BSc Computer Science - Final Year Project
**Institution:** Dorset College Dublin

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Then start the server
npm run dev
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/register` | Register user | Public |
| GET | `/api/auth/me` | Get profile | Private |
| POST | `/api/auth/logout` | Logout | Private |

### Inventory

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/inventory` | Get all items | Private |
| GET | `/api/inventory/stats` | Get statistics | Private |
| GET | `/api/inventory/:id` | Get single item | Private |
| POST | `/api/inventory` | Create item | Manager/Admin |
| PUT | `/api/inventory/:id` | Update item | Manager/Admin |
| PATCH | `/api/inventory/:id/stock` | Update stock | Private |
| DELETE | `/api/inventory/:id` | Delete item | Manager/Admin |

### Alerts

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/alerts` | Get all alerts | Private |
| GET | `/api/alerts/shopping-list` | Generate list | Private |
| GET | `/api/alerts/export` | Export CSV | Private |

### AI Assistant

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/ai/chat` | Chat with AI | Private |
| POST | `/api/ai/predictions` | Get predictions | Private |
| POST | `/api/ai/shopping-list` | AI shopping list | Private |
| POST | `/api/ai/insights` | Get insights | Private |

### POS Integration (Legacy)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/pos/config` | Get POS config | Private |
| POST | `/api/pos/config` | Save POS config | Manager/Admin |
| DELETE | `/api/pos/config` | Disconnect POS | Manager/Admin |

### Tables (WaiterApp)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/tables` | List tables (?active=true) | Private |
| GET | `/api/tables/:id` | Get single table | Private |
| POST | `/api/tables` | Create table | Manager/Admin |
| PUT | `/api/tables/:id` | Update table | Manager/Admin |
| DELETE | `/api/tables/:id` | Delete table | Manager/Admin |

### Menu Items (WaiterApp)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/menu-items` | List items with stock indicators | Private |
| GET | `/api/menu-items/:id` | Get item with stock info | Private |
| POST | `/api/menu-items` | Create item (recipe mandatory) | Admin |
| PUT | `/api/menu-items/:id` | Update item | Admin |
| DELETE | `/api/menu-items/:id` | Delete item | Admin |

### Orders (WaiterApp)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/orders` | List orders (?table=X&status=open) | Private |
| GET | `/api/orders/:id` | Get order with items & total | Private |
| POST | `/api/orders` | Create order for table | Private |
| POST | `/api/orders/:id/items` | Add item (auto-increment qty) | Private |
| PUT | `/api/orders/:id/items/:itemId` | Update item qty/status | Private |
| DELETE | `/api/orders/:id/items/:itemId` | Remove item | Private |
| POST | `/api/orders/:id/finalize` | **Close order + deduct inventory** | Private |

### Recipes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/recipes` | Get all recipes | Private |
| GET | `/api/recipes/:id` | Get single recipe | Private |
| POST | `/api/recipes` | Create recipe | Admin |
| PUT | `/api/recipes/:id` | Update recipe | Admin |
| DELETE | `/api/recipes/:id` | Delete recipe | Admin |

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@inventory.com", "password": "admin123."}'
```

### Using the Token

```bash
curl http://localhost:5000/api/inventory \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── firebase.js  # Firebase Admin setup
│   │   └── constants.js # App constants
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.js
│   │   ├── inventory.controller.js
│   │   ├── alerts.controller.js
│   │   ├── ai.controller.js
│   │   ├── pos.controller.js
│   │   ├── recipes.controller.js
│   │   ├── tables.controller.js      # WaiterApp POS
│   │   ├── menuItems.controller.js   # WaiterApp POS
│   │   └── orders.controller.js      # WaiterApp POS (+ finalize)
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # JWT verification
│   │   └── errorHandler.js
│   ├── routes/          # API routes (1 file per resource)
│   └── server.js        # Entry point
├── scripts/
│   ├── seed-fresh.js              # Fresh bar dataset
│   └── migrate-inventory-fields.js # Field migration tool
├── .env.example         # Environment template
├── package.json
└── README.md
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | No |
| `GROQ_API_KEY` | Groq API key for AI features | For AI |
| `FIREBASE_PROJECT_ID` | Firebase project ID | For DB |

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inventory.com | admin123. |
| Manager | manager@inventory.com | manager123. |
| Staff | staff@inventory.com | staff123. |
