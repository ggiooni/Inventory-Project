/**
 * Firestore seed/reset script
 *
 * Usage:
 *   1. Place your serviceAccountKey.json in this directory (it is gitignored)
 *   2. npm install
 *   3. node seed.js
 *
 * Resets and repopulates:
 *   - inventory   (inv_001 … inv_085, sorted by category then name)
 *   - menuItems   (menu_001 …, auto-generated from inventory + cocktail definitions)
 *   - tables      (table_001 … table_010)
 *   - counters    (orders counter reset to 0)
 *   - recipes     (deleted — recipes are now embedded in menuItems)
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const CSV_FILE = path.join(__dirname, "inventory_bar_optimized.csv");

// ─── helpers ────────────────────────────────────────────────────────────────

function toBool(v) {
  if (v === true || v === false) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return true;
}

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function getUnitType(name) {
  const n = name.toLowerCase();
  if (n.includes("keg")) return "keg";
  if (n.includes("can") || n.includes("cans")) return "can";
  if (n.includes("bottle") || n.includes("bottles")) return "bottle";
  return "bottle";
}

function isPourBased(category, unitType) {
  if (unitType === "keg") return true;
  return ["Spirits", "Wines", "Syrups"].includes(category);
}

function pad(n, width = 3) {
  return String(n).padStart(width, "0");
}

async function deleteCollection(collectionName) {
  process.stdout.write(`  Clearing '${collectionName}'... `);
  const colRef = db.collection(collectionName);
  let total = 0;
  while (true) {
    const snap = await colRef.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
  }
  console.log(`deleted ${total} docs`);
}

// ─── inventory ──────────────────────────────────────────────────────────────

async function seedInventory() {
  const csvText = fs.readFileSync(CSV_FILE, "utf8");
  const raw = parse(csvText, { columns: true, skip_empty_lines: true });

  // Sort deterministically: by category (A→Z), then by name (A→Z)
  // This ensures inv_001, inv_002... are stable across re-seeds
  const records = [...raw].sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
  });

  const inventoryDocs = [];
  let batch = db.batch();
  let ops = 0;
  let invIdx = 1;

  for (const row of records) {
    if (!String(row.id || "").trim()) continue;

    const name = String(row.name || "").trim();
    const category = String(row.category || "").trim();
    const csvStock = toInt(row.stock, 0);
    const csvBottleSizeMl = toInt(row.bottleSizeMl, 750);
    const active = toBool(row.active);
    const unitType = getUnitType(name);
    const pourBased = isPourBased(category, unitType);
    const sizeMl = unitType === "keg" ? 50000 : csvBottleSizeMl;

    let stockItems, openMl, minOpenMlWarning;

    if (pourBased) {
      stockItems = csvStock > 0 ? csvStock - 1 : 0;
      openMl = csvStock > 0 ? sizeMl : 0;
      minOpenMlWarning =
        unitType === "keg" ? 5000 : toInt(row.minOpenMlWarning, 120);
    } else {
      stockItems = csvStock;
      openMl = 0;
      minOpenMlWarning = 0;
    }

    // Deterministic sequential ID — stable as long as CSV order and sort key don't change
    const id = `inv_${pad(invIdx++)}`;

    const data = {
      name,
      category,
      unitType,
      sizeMl,
      stockItems,
      openMl,
      minOpenMlWarning,
      active,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    inventoryDocs.push({ id, name, category, unitType, sizeMl, stockItems, openMl, active });

    batch.set(db.collection("inventory").doc(id), data);
    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  console.log(`✅ Inventory: ${inventoryDocs.length} items (inv_001 … inv_${pad(inventoryDocs.length)})`);
  return inventoryDocs;
}

// ─── cocktail definitions ────────────────────────────────────────────────────
// Ingredients are looked up by name (case-insensitive) so they automatically
// resolve to the correct inv_### ID regardless of how IDs are assigned.

function buildCocktails(byName) {
  function inv(name) {
    const match = byName[name.toLowerCase()];
    if (!match) {
      console.warn(`  ⚠ Cocktail ingredient not found: "${name}"`);
      return null;
    }
    return match.id;
  }

  function has(...names) {
    return names.every((n) => byName[n.toLowerCase()]);
  }

  const pour = (name, qtyMl) => ({ inventoryId: inv(name), qtyMl });
  const whole = (name) => ({ inventoryId: inv(name), consumeWhole: true });

  const cocktails = [];

  if (has("Aperol", "Rialto Prosecco", "Soda Water")) {
    cocktails.push({
      name: "Aperol Spritz", price: 12.0,
      recipe: [pour("Aperol", 90), pour("Rialto Prosecco", 90), whole("Soda Water")],
    });
  }

  if (has("Gordons Gin", "Campari", "Amaretto Liqueur")) {
    cocktails.push({
      name: "Negroni", price: 12.0,
      recipe: [pour("Gordons Gin", 30), pour("Campari", 30), pour("Amaretto Liqueur", 30)],
    });
  }

  if (has("Jameson Whiskey", "Agave Syrup")) {
    cocktails.push({
      name: "Whiskey Sour", price: 12.0,
      recipe: [pour("Jameson Whiskey", 50), pour("Agave Syrup", 20)],
    });
  }

  if (has("Vanilla Vodka", "Kahlua Coffee Liqueur", "Cacao White Liqueur")) {
    cocktails.push({
      name: "Espresso Martini", price: 13.0,
      recipe: [pour("Vanilla Vodka", 40), pour("Kahlua Coffee Liqueur", 20), pour("Cacao White Liqueur", 15)],
    });
  }

  if (has("Smirnoff Vodka", "Hollows Ginger Beer")) {
    cocktails.push({
      name: "Moscow Mule", price: 12.0,
      recipe: [pour("Smirnoff Vodka", 50), whole("Hollows Ginger Beer")],
    });
  }

  if (has("Jose Cuervo Tequila", "Fanta Orange", "Hibiscus Syrup")) {
    cocktails.push({
      name: "Tequila Sunrise", price: 12.0,
      recipe: [pour("Jose Cuervo Tequila", 50), whole("Fanta Orange"), pour("Hibiscus Syrup", 15)],
    });
  }

  if (has("Gordons Gin", "Elderflower Liqueur", "Raspberry Rum", "Sour Cherry Syrup")) {
    cocktails.push({
      name: "Bramble", price: 13.0,
      recipe: [
        pour("Gordons Gin", 50), pour("Elderflower Liqueur", 15),
        pour("Raspberry Rum", 15), pour("Sour Cherry Syrup", 10),
      ],
    });
  }

  if (has("Gosling Black Rum", "Hollows Ginger Beer")) {
    cocktails.push({
      name: "Dark & Stormy", price: 12.0,
      recipe: [pour("Gosling Black Rum", 50), whole("Hollows Ginger Beer")],
    });
  }

  if (has("Bacardi White Rum", "Coca Cola Cans")) {
    cocktails.push({
      name: "Cuba Libre", price: 11.0,
      recipe: [pour("Bacardi White Rum", 50), whole("Coca Cola Cans")],
    });
  }

  return cocktails;
}

// ─── menu items ──────────────────────────────────────────────────────────────

async function seedMenuItems(inventoryDocs) {
  // Lookup by lowercase name for cocktail ingredient resolution
  const byName = {};
  for (const d of inventoryDocs) byName[d.name.toLowerCase()] = d;

  const items = [];
  let menuIdx = 1;
  function nextMenuId() { return `menu_${pad(menuIdx++)}`; }
  function isAvailablePour(inv) { return inv.stockItems > 0 || inv.openMl > 0; }

  const PREMIUM_SPIRITS = [
    "grey goose", "monkey 47", "hendricks", "dingle",
    "redbreast", "casa amigos", "ciroc", "roe & co", "roku",
  ];

  // 1. Keg beers → pint (500ml)
  for (const inv of inventoryDocs.filter((d) => d.unitType === "keg")) {
    items.push({
      id: nextMenuId(),
      name: inv.name.replace(/ Keg$/i, " Pint"),
      category: "Draught Beer", type: "pint", price: 6.5,
      active: true, isAvailable: isAvailablePour(inv),
      recipe: [{ inventoryId: inv.id, qtyMl: 500 }],
    });
  }

  // 2. Bottled/canned beers → whole unit
  for (const inv of inventoryDocs.filter(
    (d) => d.category === "Beers" && d.unitType !== "keg"
  )) {
    items.push({
      id: nextMenuId(),
      name: inv.name, category: "Bottled Beer", type: inv.unitType, price: 5.0,
      active: true, isAvailable: inv.stockItems > 0,
      recipe: [{ inventoryId: inv.id, consumeWhole: true }],
    });
  }

  // 3. Soft drinks → whole unit
  for (const inv of inventoryDocs.filter((d) => d.category === "Soft Drinks")) {
    items.push({
      id: nextMenuId(),
      name: inv.name, category: "Soft Drink", type: inv.unitType, price: 3.0,
      active: true, isAvailable: inv.stockItems > 0,
      recipe: [{ inventoryId: inv.id, consumeWhole: true }],
    });
  }

  // 4. Spirits → shot (50ml)
  for (const inv of inventoryDocs.filter((d) => d.category === "Spirits")) {
    const isPremium = PREMIUM_SPIRITS.some((p) => inv.name.toLowerCase().includes(p));
    items.push({
      id: nextMenuId(),
      name: `${inv.name} Shot`, category: "Spirits", type: "shot",
      price: isPremium ? 10.0 : 8.0,
      active: true, isAvailable: isAvailablePour(inv),
      recipe: [{ inventoryId: inv.id, qtyMl: 50 }],
    });
  }

  // 5. Wines → glass (200ml)
  for (const inv of inventoryDocs.filter((d) => d.category === "Wines")) {
    items.push({
      id: nextMenuId(),
      name: inv.name, category: "Wine", type: "glass", price: 8.0,
      active: true, isAvailable: isAvailablePour(inv),
      recipe: [{ inventoryId: inv.id, qtyMl: 200 }],
    });
  }

  // 6. Cocktails
  for (const c of buildCocktails(byName)) {
    items.push({
      id: nextMenuId(),
      name: c.name, category: "Cocktails", type: "cocktail", price: c.price,
      active: true, isAvailable: true, recipe: c.recipe,
    });
  }

  // Write in batches
  let batch = db.batch();
  let ops = 0;
  const col = db.collection("menuItems");
  for (const item of items) {
    const { id, ...data } = item;
    batch.set(col.doc(id), data);
    ops++;
    if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();

  const counts = {
    pints:   items.filter((i) => i.category === "Draught Beer").length,
    beers:   items.filter((i) => i.category === "Bottled Beer").length,
    soft:    items.filter((i) => i.category === "Soft Drink").length,
    spirits: items.filter((i) => i.category === "Spirits").length,
    wines:   items.filter((i) => i.category === "Wine").length,
    cocktails: items.filter((i) => i.category === "Cocktails").length,
  };
  console.log(
    `✅ menuItems: ${items.length} items (menu_001 … menu_${pad(items.length)}) — ` +
    `${counts.pints} pints, ${counts.beers} beers, ${counts.soft} soft drinks, ` +
    `${counts.spirits} spirits, ${counts.wines} wines, ${counts.cocktails} cocktails`
  );
}

// ─── tables ──────────────────────────────────────────────────────────────────

async function seedTables() {
  const batch = db.batch();
  for (let i = 1; i <= 10; i++) {
    const id = `table_${pad(i)}`;
    batch.set(db.collection("tables").doc(id), {
      name: `Table ${i}`,
      active: true,
    });
  }
  await batch.commit();
  console.log("✅ Tables: 10 tables (table_001 … table_010)");
}

// ─── counters ────────────────────────────────────────────────────────────────

async function resetCounters() {
  await db.collection("counters").doc("orders").set({ count: 0 });
  console.log("✅ Counters: orders counter reset to 0");
}

// ─── main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log("=== Firestore Seed/Reset ===\n");
  console.log("Clearing collections...");

  await deleteCollection("inventory");
  await deleteCollection("menuItems");
  await deleteCollection("tables");
  await deleteCollection("recipes");   // obsolete — recipes are embedded in menuItems
  await deleteCollection("orders");    // clear orders so counter aligns with data

  console.log("\nSeeding...");
  const inventoryDocs = await seedInventory();
  await seedMenuItems(inventoryDocs);
  await seedTables();
  await resetCounters();

  console.log("\n=== Seed complete ===");
}

run().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
