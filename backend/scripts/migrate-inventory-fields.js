/**
 * One-time migration script: align inventory field names
 *
 * Fernando's seed script used:    stockItems, sizeMl
 * Backend API expects:            stock, bottleSizeMl
 *
 * This script renames the fields in Firestore and removes the old ones.
 * Safe to run multiple times (idempotent).
 *
 * Usage: node scripts/migrate-inventory-fields.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase
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

async function migrate() {
    const snapshot = await db.collection('inventory').get();

    console.log(`Found ${snapshot.size} inventory items\n`);

    let migrated = 0;
    let skipped = 0;

    const batch = db.batch();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const updates = {};
        const deletes = {};
        let needsUpdate = false;

        // stockItems → stock
        if (data.stockItems !== undefined && data.stock === undefined) {
            updates.stock = data.stockItems;
            deletes.stockItems = admin.firestore.FieldValue.delete();
            needsUpdate = true;
        } else if (data.stockItems !== undefined && data.stock !== undefined) {
            // Both exist — keep stock, remove stockItems
            deletes.stockItems = admin.firestore.FieldValue.delete();
            needsUpdate = true;
        }

        // sizeMl → bottleSizeMl
        if (data.sizeMl !== undefined && data.bottleSizeMl === undefined) {
            updates.bottleSizeMl = data.sizeMl;
            deletes.sizeMl = admin.firestore.FieldValue.delete();
            needsUpdate = true;
        } else if (data.sizeMl !== undefined && data.bottleSizeMl !== undefined) {
            deletes.sizeMl = admin.firestore.FieldValue.delete();
            needsUpdate = true;
        }

        // Add alertThreshold and priority if missing (needed for web frontend)
        if (data.alertThreshold === undefined) {
            const defaults = {
                'Spirits': { priority: 'high', threshold: 2 },
                'Wines': { priority: 'medium', threshold: 3 },
                'Beers': { priority: 'medium', threshold: 6 },
                'Beer': { priority: 'medium', threshold: 6 },
                'Soft Drinks': { priority: 'low', threshold: 12 },
                'Syrups': { priority: 'medium', threshold: 2 }
            };
            const def = defaults[data.category] || { priority: 'medium', threshold: 3 };
            updates.alertThreshold = def.threshold;
            updates.priority = def.priority;
            needsUpdate = true;
        }

        if (needsUpdate) {
            batch.update(doc.ref, { ...updates, ...deletes });
            migrated++;
            console.log(`  ✓ ${data.name}: stockItems(${data.stockItems}) → stock(${updates.stock ?? data.stock}), sizeMl(${data.sizeMl}) → bottleSizeMl(${updates.bottleSizeMl ?? data.bottleSizeMl})`);
        } else {
            skipped++;
        }
    }

    if (migrated > 0) {
        await batch.commit();
        console.log(`\n✅ Migrated ${migrated} items, skipped ${skipped}`);
    } else {
        console.log('\n✅ Nothing to migrate — all items already use the correct field names');
    }
}

migrate().then(() => process.exit(0)).catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
