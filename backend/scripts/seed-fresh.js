/**
 * Fresh seed script — wipes inventory, menuItems, and orders,
 * then creates a simple, clean bar dataset for testing.
 *
 * Usage: node scripts/seed-fresh.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
    });
} else {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

// ─── INVENTORY DATA ──────────────────────────────────────────────

const inventory = [
    // Draught Beer Kegs (50L kegs, served as pints 500ml)
    { id: 'guinness_keg', name: 'Guinness Keg', category: 'Beers', stock: 2, bottleSizeMl: 50000, openMl: 35000, minOpenMlWarning: 5000, alertThreshold: 1, priority: 'high' },
    { id: 'ipa_keg', name: 'Citra IPA Keg', category: 'Beers', stock: 1, bottleSizeMl: 50000, openMl: 42000, minOpenMlWarning: 5000, alertThreshold: 1, priority: 'high' },
    { id: 'lager_keg', name: 'Rockshore Lager Keg', category: 'Beers', stock: 2, bottleSizeMl: 50000, openMl: 28000, minOpenMlWarning: 5000, alertThreshold: 1, priority: 'high' },

    // Bottled Beers (sold as whole units)
    { id: 'corona', name: 'Corona', category: 'Beers', stock: 24, bottleSizeMl: 330, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'medium' },
    { id: 'heineken', name: 'Heineken', category: 'Beers', stock: 24, bottleSizeMl: 330, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'medium' },
    { id: 'cider', name: 'Bulmers Cider', category: 'Beers', stock: 18, bottleSizeMl: 500, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'medium' },

    // Spirits (750ml bottles, served as shots/cocktail measures)
    { id: 'vodka', name: 'Smirnoff Vodka', category: 'Spirits', stock: 3, bottleSizeMl: 750, openMl: 600, minOpenMlWarning: 120, alertThreshold: 2, priority: 'high' },
    { id: 'gin', name: 'Gordons Gin', category: 'Spirits', stock: 2, bottleSizeMl: 750, openMl: 500, minOpenMlWarning: 120, alertThreshold: 2, priority: 'high' },
    { id: 'white_rum', name: 'Bacardi White Rum', category: 'Spirits', stock: 2, bottleSizeMl: 750, openMl: 700, minOpenMlWarning: 120, alertThreshold: 2, priority: 'high' },
    { id: 'dark_rum', name: 'Gosling Black Rum', category: 'Spirits', stock: 1, bottleSizeMl: 750, openMl: 450, minOpenMlWarning: 120, alertThreshold: 2, priority: 'high' },
    { id: 'tequila', name: 'Jose Cuervo Tequila', category: 'Spirits', stock: 2, bottleSizeMl: 750, openMl: 650, minOpenMlWarning: 120, alertThreshold: 2, priority: 'high' },
    { id: 'whiskey', name: 'Jameson Whiskey', category: 'Spirits', stock: 2, bottleSizeMl: 750, openMl: 550, minOpenMlWarning: 120, alertThreshold: 2, priority: 'high' },
    { id: 'aperol', name: 'Aperol', category: 'Spirits', stock: 2, bottleSizeMl: 750, openMl: 600, minOpenMlWarning: 120, alertThreshold: 2, priority: 'medium' },
    { id: 'campari', name: 'Campari', category: 'Spirits', stock: 1, bottleSizeMl: 750, openMl: 500, minOpenMlWarning: 120, alertThreshold: 2, priority: 'medium' },
    { id: 'kahlua', name: 'Kahlua Coffee Liqueur', category: 'Spirits', stock: 1, bottleSizeMl: 750, openMl: 600, minOpenMlWarning: 120, alertThreshold: 2, priority: 'medium' },
    { id: 'triple_sec', name: 'Triple Sec', category: 'Spirits', stock: 1, bottleSizeMl: 750, openMl: 500, minOpenMlWarning: 120, alertThreshold: 2, priority: 'medium' },

    // Wines (750ml bottles, served as glasses 150ml)
    { id: 'house_red', name: 'Casa Silva Cabernet Sauvignon', category: 'Wines', stock: 6, bottleSizeMl: 750, openMl: 450, minOpenMlWarning: 120, alertThreshold: 3, priority: 'medium' },
    { id: 'house_white', name: 'Pinot Grigio', category: 'Wines', stock: 5, bottleSizeMl: 750, openMl: 600, minOpenMlWarning: 120, alertThreshold: 3, priority: 'medium' },
    { id: 'prosecco', name: 'Rialto Prosecco', category: 'Wines', stock: 4, bottleSizeMl: 750, openMl: 750, minOpenMlWarning: 120, alertThreshold: 2, priority: 'medium' },

    // Soft Drinks (sold as whole units)
    { id: 'coca_cola', name: 'Coca Cola', category: 'Soft Drinks', stock: 24, bottleSizeMl: 330, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'low' },
    { id: 'sprite', name: 'Sprite', category: 'Soft Drinks', stock: 18, bottleSizeMl: 330, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'low' },
    { id: 'fanta', name: 'Fanta Orange', category: 'Soft Drinks', stock: 18, bottleSizeMl: 330, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'low' },
    { id: 'soda_water', name: 'Soda Water', category: 'Soft Drinks', stock: 30, bottleSizeMl: 330, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'low' },
    { id: 'ginger_beer', name: 'Ginger Beer', category: 'Soft Drinks', stock: 18, bottleSizeMl: 330, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'low' },
    { id: 'tonic_water', name: 'Tonic Water', category: 'Soft Drinks', stock: 24, bottleSizeMl: 200, openMl: 0, minOpenMlWarning: 0, alertThreshold: 6, priority: 'low' },

    // Syrups & Juices (750ml bottles, used in cocktails)
    { id: 'simple_syrup', name: 'Simple Syrup', category: 'Syrups', stock: 2, bottleSizeMl: 750, openMl: 500, minOpenMlWarning: 100, alertThreshold: 1, priority: 'medium' },
    { id: 'lime_juice', name: 'Lime Juice', category: 'Syrups', stock: 2, bottleSizeMl: 750, openMl: 400, minOpenMlWarning: 100, alertThreshold: 1, priority: 'medium' },
    { id: 'orange_juice', name: 'Orange Juice', category: 'Syrups', stock: 3, bottleSizeMl: 1000, openMl: 700, minOpenMlWarning: 150, alertThreshold: 1, priority: 'medium' },
    { id: 'grenadine', name: 'Grenadine', category: 'Syrups', stock: 1, bottleSizeMl: 750, openMl: 600, minOpenMlWarning: 100, alertThreshold: 1, priority: 'low' },
];

// ─── MENU ITEMS ──────────────────────────────────────────────────

const menuItems = [
    // Draught Beers (pints from kegs, 500ml per pint)
    { id: 'menu_guinness', name: 'Guinness Pint', price: 6.50, category: 'Draught Beer', recipe: [{ inventoryId: 'guinness_keg', qtyMl: 500 }] },
    { id: 'menu_ipa', name: 'Citra IPA Pint', price: 6.50, category: 'Draught Beer', recipe: [{ inventoryId: 'ipa_keg', qtyMl: 500 }] },
    { id: 'menu_lager', name: 'Rockshore Lager Pint', price: 6.50, category: 'Draught Beer', recipe: [{ inventoryId: 'lager_keg', qtyMl: 500 }] },

    // Bottled Beers (whole unit)
    { id: 'menu_corona', name: 'Corona', price: 5.00, category: 'Bottled Beer', recipe: [{ inventoryId: 'corona', consumeWhole: true }] },
    { id: 'menu_heineken', name: 'Heineken', price: 5.00, category: 'Bottled Beer', recipe: [{ inventoryId: 'heineken', consumeWhole: true }] },
    { id: 'menu_cider', name: 'Bulmers Cider', price: 5.50, category: 'Bottled Beer', recipe: [{ inventoryId: 'cider', consumeWhole: true }] },

    // Cocktails
    { id: 'menu_mojito', name: 'Mojito', price: 12.00, category: 'Cocktails', recipe: [
        { inventoryId: 'white_rum', qtyMl: 50 },
        { inventoryId: 'lime_juice', qtyMl: 25 },
        { inventoryId: 'simple_syrup', qtyMl: 20 },
        { inventoryId: 'soda_water', consumeWhole: true }
    ]},
    { id: 'menu_gin_tonic', name: 'Gin & Tonic', price: 11.00, category: 'Cocktails', recipe: [
        { inventoryId: 'gin', qtyMl: 50 },
        { inventoryId: 'tonic_water', consumeWhole: true }
    ]},
    { id: 'menu_margarita', name: 'Margarita', price: 12.00, category: 'Cocktails', recipe: [
        { inventoryId: 'tequila', qtyMl: 50 },
        { inventoryId: 'triple_sec', qtyMl: 25 },
        { inventoryId: 'lime_juice', qtyMl: 25 }
    ]},
    { id: 'menu_espresso_martini', name: 'Espresso Martini', price: 13.00, category: 'Cocktails', recipe: [
        { inventoryId: 'vodka', qtyMl: 40 },
        { inventoryId: 'kahlua', qtyMl: 25 }
    ]},
    { id: 'menu_aperol_spritz', name: 'Aperol Spritz', price: 12.00, category: 'Cocktails', recipe: [
        { inventoryId: 'aperol', qtyMl: 90 },
        { inventoryId: 'prosecco', qtyMl: 90 },
        { inventoryId: 'soda_water', consumeWhole: true }
    ]},

    // Wines (glass = 150ml)
    { id: 'menu_red_wine', name: 'House Red Wine', price: 8.00, category: 'Wine', recipe: [{ inventoryId: 'house_red', qtyMl: 150 }] },
    { id: 'menu_white_wine', name: 'House White Wine', price: 8.00, category: 'Wine', recipe: [{ inventoryId: 'house_white', qtyMl: 150 }] },
    { id: 'menu_prosecco', name: 'Prosecco Glass', price: 9.00, category: 'Wine', recipe: [{ inventoryId: 'prosecco', qtyMl: 150 }] },

    // Soft Drinks (whole unit)
    { id: 'menu_coca_cola', name: 'Coca Cola', price: 3.00, category: 'Soft Drinks', recipe: [{ inventoryId: 'coca_cola', consumeWhole: true }] },
    { id: 'menu_sprite', name: 'Sprite', price: 3.00, category: 'Soft Drinks', recipe: [{ inventoryId: 'sprite', consumeWhole: true }] },
    { id: 'menu_fanta', name: 'Fanta Orange', price: 3.00, category: 'Soft Drinks', recipe: [{ inventoryId: 'fanta', consumeWhole: true }] },
    { id: 'menu_ginger_beer', name: 'Ginger Beer', price: 3.50, category: 'Soft Drinks', recipe: [{ inventoryId: 'ginger_beer', consumeWhole: true }] },
];

// ─── RECIPES (synced with menuItem cocktails for the web frontend) ───

const recipes = [
    { id: 'recipe_mojito', name: 'Mojito', category: 'Cocktails', ingredients: [
        { inventoryItemId: 'white_rum', name: 'Bacardi White Rum', quantity: 50, unit: 'ml' },
        { inventoryItemId: 'lime_juice', name: 'Lime Juice', quantity: 25, unit: 'ml' },
        { inventoryItemId: 'simple_syrup', name: 'Simple Syrup', quantity: 20, unit: 'ml' },
        { inventoryItemId: 'soda_water', name: 'Soda Water', quantity: 1, unit: 'units' }
    ]},
    { id: 'recipe_gin_tonic', name: 'Gin & Tonic', category: 'Cocktails', ingredients: [
        { inventoryItemId: 'gin', name: 'Gordons Gin', quantity: 50, unit: 'ml' },
        { inventoryItemId: 'tonic_water', name: 'Tonic Water', quantity: 1, unit: 'units' }
    ]},
    { id: 'recipe_margarita', name: 'Margarita', category: 'Cocktails', ingredients: [
        { inventoryItemId: 'tequila', name: 'Jose Cuervo Tequila', quantity: 50, unit: 'ml' },
        { inventoryItemId: 'triple_sec', name: 'Triple Sec', quantity: 25, unit: 'ml' },
        { inventoryItemId: 'lime_juice', name: 'Lime Juice', quantity: 25, unit: 'ml' }
    ]},
    { id: 'recipe_espresso_martini', name: 'Espresso Martini', category: 'Cocktails', ingredients: [
        { inventoryItemId: 'vodka', name: 'Smirnoff Vodka', quantity: 40, unit: 'ml' },
        { inventoryItemId: 'kahlua', name: 'Kahlua Coffee Liqueur', quantity: 25, unit: 'ml' }
    ]},
    { id: 'recipe_aperol_spritz', name: 'Aperol Spritz', category: 'Cocktails', ingredients: [
        { inventoryItemId: 'aperol', name: 'Aperol', quantity: 90, unit: 'ml' },
        { inventoryItemId: 'prosecco', name: 'Rialto Prosecco', quantity: 90, unit: 'ml' },
        { inventoryItemId: 'soda_water', name: 'Soda Water', quantity: 1, unit: 'units' }
    ]},
];

// ─── TABLES ──────────────────────────────────────────────────────

const tables = [
    { id: 'table_1', name: 'Table 1', active: true },
    { id: 'table_2', name: 'Table 2', active: true },
    { id: 'table_3', name: 'Table 3', active: true },
    { id: 'table_4', name: 'Table 4', active: true },
    { id: 'table_5', name: 'Table 5', active: true },
    { id: 'table_6', name: 'Table 6', active: true },
    { id: 'bar_1', name: 'Bar 1', active: true },
    { id: 'bar_2', name: 'Bar 2', active: true },
];

// ─── HELPERS ─────────────────────────────────────────────────────

async function deleteCollection(collectionPath) {
    const snapshot = await db.collection(collectionPath).get();
    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
}

async function deleteOrdersWithItems() {
    const ordersSnap = await db.collection('orders').get();
    let count = 0;

    for (const orderDoc of ordersSnap.docs) {
        // Delete items subcollection first
        const itemsSnap = await orderDoc.ref.collection('items').get();
        if (!itemsSnap.empty) {
            const batch = db.batch();
            itemsSnap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            count += itemsSnap.size;
        }
    }

    // Now delete orders themselves
    if (!ordersSnap.empty) {
        const batch = db.batch();
        ordersSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        count += ordersSnap.size;
    }

    return count;
}

// ─── MAIN ────────────────────────────────────────────────────────

async function seed() {
    console.log('🗑️  Cleaning existing data...\n');

    const deletedInv = await deleteCollection('inventory');
    const deletedMenu = await deleteCollection('menuItems');
    const deletedRecipes = await deleteCollection('recipes');
    const deletedTables = await deleteCollection('tables');
    const deletedOrders = await deleteOrdersWithItems();

    console.log(`   Deleted: ${deletedInv} inventory, ${deletedMenu} menu items, ${deletedRecipes} recipes, ${deletedTables} tables, ${deletedOrders} orders/items\n`);

    const now = new Date().toISOString();

    // Seed inventory
    console.log('📦 Seeding inventory...');
    const invBatch = db.batch();
    for (const item of inventory) {
        const { id, ...data } = item;
        invBatch.set(db.collection('inventory').doc(id), {
            ...data,
            active: true,
            createdAt: now,
            updatedAt: now
        });
    }
    await invBatch.commit();
    console.log(`   ✓ ${inventory.length} inventory items\n`);

    // Seed menu items
    console.log('🍹 Seeding menu items...');
    const menuBatch = db.batch();
    for (const item of menuItems) {
        const { id, ...data } = item;
        // Add inventoryName to each recipe ingredient for display
        const enrichedRecipe = data.recipe.map(ing => {
            const invItem = inventory.find(i => i.id === ing.inventoryId);
            return { ...ing, inventoryName: invItem?.name || ing.inventoryId };
        });
        menuBatch.set(db.collection('menuItems').doc(id), {
            ...data,
            recipe: enrichedRecipe,
            active: true,
            createdAt: now,
            updatedAt: now
        });
    }
    await menuBatch.commit();
    console.log(`   ✓ ${menuItems.length} menu items\n`);

    // Seed recipes (synced with cocktail menuItems for web frontend)
    console.log('📋 Seeding recipes...');
    const recipesBatch = db.batch();
    for (const recipe of recipes) {
        const { id, ...data } = recipe;
        recipesBatch.set(db.collection('recipes').doc(id), {
            ...data,
            createdAt: now,
            updatedAt: now,
            createdBy: 'seed-script'
        });
    }
    await recipesBatch.commit();
    console.log(`   ✓ ${recipes.length} recipes\n`);

    // Seed tables
    console.log('🪑 Seeding tables...');
    const tablesBatch = db.batch();
    for (const table of tables) {
        const { id, ...data } = table;
        tablesBatch.set(db.collection('tables').doc(id), {
            ...data,
            createdAt: now,
            updatedAt: now
        });
    }
    await tablesBatch.commit();
    console.log(`   ✓ ${tables.length} tables\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('  SEED COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`  Inventory: ${inventory.length} items`);
    console.log(`  Menu:      ${menuItems.length} items`);
    console.log(`  Recipes:   ${recipes.length}`);
    console.log(`  Tables:    ${tables.length}`);
    console.log('');
    console.log('  Categories in menu:');
    const cats = {};
    menuItems.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
    Object.entries(cats).forEach(([cat, count]) => console.log(`    ${cat}: ${count}`));
    console.log('═══════════════════════════════════════');
}

seed().then(() => process.exit(0)).catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
