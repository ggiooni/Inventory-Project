/**
 * @file recipes.js
 * @description Recipe management module - Admin only for CRUD, all users can view
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

import { db } from '../config/firebase.js';

// =============================================
// MODULE STATE
// =============================================

let recipes = [];
let changeListeners = [];

// =============================================
// DATA OPERATIONS
// =============================================

/**
 * Load all recipes from Firestore
 */
export async function loadRecipes() {
    try {
        if (!db) {
            recipes = getMockRecipes();
            notifyListeners();
            return { success: true, data: recipes };
        }

        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const q = query(collection(db, 'recipes'), orderBy('name'));
        const snapshot = await getDocs(q);

        recipes = [];
        snapshot.forEach(doc => {
            recipes.push({ id: doc.id, ...doc.data() });
        });

        notifyListeners();
        return { success: true, data: recipes };
    } catch (error) {
        console.error('Error loading recipes:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new recipe in Firestore
 */
export async function createRecipe(recipeData, userEmail) {
    try {
        if (!db) {
            const newRecipe = { id: 'mock_' + Date.now(), ...recipeData, createdAt: new Date().toISOString(), createdBy: userEmail };
            recipes.push(newRecipe);
            notifyListeners();
            return { success: true, data: newRecipe };
        }

        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const newRecipe = {
            ...recipeData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userEmail
        };

        const docRef = await addDoc(collection(db, 'recipes'), newRecipe);

        const created = { id: docRef.id, ...newRecipe };
        recipes.push(created);
        notifyListeners();

        return { success: true, data: created };
    } catch (error) {
        console.error('Error creating recipe:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(recipeId, recipeData, userEmail) {
    try {
        if (!db) {
            const index = recipes.findIndex(r => r.id === recipeId);
            if (index === -1) return { success: false, error: 'Recipe not found' };
            recipes[index] = { ...recipes[index], ...recipeData, updatedAt: new Date().toISOString(), updatedBy: userEmail };
            notifyListeners();
            return { success: true, data: recipes[index] };
        }

        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const updates = {
            ...recipeData,
            updatedAt: new Date().toISOString(),
            updatedBy: userEmail
        };

        await updateDoc(doc(db, 'recipes', recipeId), updates);

        const index = recipes.findIndex(r => r.id === recipeId);
        if (index !== -1) {
            recipes[index] = { ...recipes[index], ...updates };
        }
        notifyListeners();

        return { success: true, data: recipes[index] };
    } catch (error) {
        console.error('Error updating recipe:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(recipeId) {
    try {
        if (!db) {
            recipes = recipes.filter(r => r.id !== recipeId);
            notifyListeners();
            return { success: true };
        }

        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await deleteDoc(doc(db, 'recipes', recipeId));

        recipes = recipes.filter(r => r.id !== recipeId);
        notifyListeners();

        return { success: true };
    } catch (error) {
        console.error('Error deleting recipe:', error);
        return { success: false, error: error.message };
    }
}

// =============================================
// GETTERS
// =============================================

export function getRecipes() {
    return [...recipes];
}

export function getRecipeById(id) {
    return recipes.find(r => r.id === id) || null;
}

export function getRecipeCategories() {
    const categories = new Set(recipes.map(r => r.category));
    return [...categories].sort();
}

// =============================================
// LISTENERS
// =============================================

export function onRecipesChange(callback) {
    changeListeners.push(callback);
}

function notifyListeners() {
    changeListeners.forEach(cb => cb(recipes));
}

// =============================================
// MOCK DATA
// =============================================

function getMockRecipes() {
    return [
        {
            id: 'mock_1',
            name: 'Margarita',
            category: 'Cocktails',
            ingredients: [
                { inventoryItemId: '1', name: 'Tequila', quantity: 50, unit: 'ml' },
                { inventoryItemId: '6', name: 'Lime Juice', quantity: 25, unit: 'ml' },
                { inventoryItemId: '8', name: 'Sugar Syrup', quantity: 10, unit: 'ml' }
            ]
        },
        {
            id: 'mock_2',
            name: 'Gin Sour',
            category: 'Cocktails',
            ingredients: [
                { inventoryItemId: '3', name: 'Gin', quantity: 50, unit: 'ml' },
                { inventoryItemId: '6', name: 'Lime Juice', quantity: 25, unit: 'ml' },
                { inventoryItemId: '8', name: 'Sugar Syrup', quantity: 15, unit: 'ml' },
                { inventoryItemId: '7', name: 'Eggs', quantity: 1, unit: 'units' }
            ]
        }
    ];
}
