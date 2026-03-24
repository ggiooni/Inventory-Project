# WaiterApp Project Overview

A mobile application for waiters to manage restaurant orders, built with Kotlin and Firebase.

## Technology Stack

- **Platform:** Android (Kotlin)
- **Minimum SDK:** 24 (Android 7.0)
- **Target SDK:** 34/36 (Android 14/15)
- **Backend:** Firebase (Authentication, Cloud Firestore)
- **UI Components:** Material Components, RecyclerView, ConstraintLayout

## Architecture & Logic

The application follows a standard Android Activity-based architecture:

- **Authentication:** `LoginActivity` handles user sign-in via Firebase Auth.
- **Table Management:** `TablesActivity` displays a list of active tables from the Firestore `tables` collection.
- **Menu System:** `MenuActivity` fetches menu items from the `menuItems` collection, groups them by category, and allows adding items to an open order.
- **Order Management:** `OrderActivity` manages the current order for a table, displaying items and calculating the total.
- **Business Logic:** `FinalizeOrderService` handles the finalization of orders, including stock level validation and warnings.

### Data Models

- `MenuItem`: Represents a dish or drink with price and category.
- `OrderLine`: Represents a line item in an order with quantity and unit price.
- `MenuRow`: A sealed class used for rendering both category headers and menu items in the same list.

## Firestore Schema

- `tables`: Document for each table. Fields: `name` (string), `active` (boolean).
- `menuItems`: Document for each menu item. ID format: `menu_001`, `menu_002`, …
  Fields: `name` (string), `price` (number), `category` (string), `type` (string),
  `active` (boolean), `isAvailable` (boolean),
  `recipe` (array of `{inventoryId, qtyMl}` OR `{inventoryId, consumeWhole: true}`).
- `orders`: Document for each order. Fields: `table` (string, Firestore doc ID), `status` (string: "open"|"closed"), `createdAt` (timestamp), `closedAt` (timestamp).
    - `items` (sub-collection): `menuItemId` (string), `name` (string), `unitPrice` (number), `qty` (number), `status` (string).
- `inventory`: Document for each stock item. ID from CSV (e.g. `spirit_jameson_whiskey`).
  Fields: `name` (string), `category` (string — what it IS: Spirits/Beer/Wine/Syrups/Soft Drinks),
  `unitType` (string — container format: bottle/can/keg),
  `sizeMl` (number — ml per container; kegs = 50000),
  `stockItems` (number — sealed containers in reserve),
  `openMl` (number — ml remaining in the currently open container; 0 for unit-based items),
  `minOpenMlWarning` (number — alert threshold in ml; 0 = no alert),
  `active` (boolean).

## Building and Running

### Prerequisites
- Android Studio (Iguana or newer recommended)
- JDK 17
- Firebase project configuration (`google-services.json` is required in `WaiterApp/app/`)

### Key Commands
- **Build Debug APK:** `./gradlew assembleDebug`
- **Install on Device:** `./gradlew installDebug`
- **Run Unit Tests:** `./gradlew test`
- **Run Instrumentation Tests:** `./gradlew connectedAndroidTest`

## Firestore Usage Contract

### What each screen reads

| Screen | Collection | Fields read |
|---|---|---|
| `TablesActivity` | `tables` | `name`, `active` |
| `MenuActivity` | `menuItems` | `name`, `price`, `category`, `active`, `isAvailable` |
| `MenuActivity` | `orders` | `status` (query only) |
| `OrderActivity` | `orders` | `status` (query only) |
| `OrderActivity` | `orders/{id}/items` | `name`, `qty`, `unitPrice` |

### What FinalizeOrderService reads and writes

**Reads (outside transaction):**
- `orders/{id}/items` — all sub-documents
- `menuItems/{id}` — `recipe` field only, fetched in **parallel**

**Reads (inside transaction):**
- `orders/{id}` — `status` field
- `inventory/{id}` — `name`, `stockItems`, `sizeMl`, `openMl`, `minOpenMlWarning`
  (reads ALL inventory IDs referenced by recipe, including consumeWhole items)

**Writes (inside transaction — atomic):**
- `inventory/{id}` → updates `stockItems`, `openMl`, `lastUpdated`
- `orders/{id}` → sets `status = "closed"`, `closedAt`

### What the waiter app does NOT handle

- Creating or editing menu items, tables, or inventory entries (admin-only, done via web app)
- Reading or displaying raw stock levels in any Activity
- Any backend REST API calls
- Authentication token management beyond `FirebaseAuth.signInWithEmailAndPassword`

---

## Development Conventions

- **Kotlin DSL:** Gradle build scripts use `build.gradle.kts`.
- **Naming Conventions:** Standard Android/Kotlin camelCase for variables and PascalCase for classes.
- **UI:** Layouts are defined in XML using Material 3 themes.
- **Firebase Interaction:** Activities interact directly with Firestore using the Firebase Android SDK. Business logic that spans multiple steps (like order finalization) should be placed in the `services` package.
