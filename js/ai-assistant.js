/**
 * AI Assistant Module - Secure Cloud Functions Integration
 * Smart Inventory Management System
 *
 * This module communicates with Firebase Cloud Functions for AI features.
 * The API key is securely stored on the server and never exposed to clients.
 *
 * @author Nicolas Boggioni Troncoso
 * @project BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

// =============================================
// CONFIGURATION
// =============================================

/**
 * API Endpoints Configuration
 * - Production: Uses Firebase Cloud Functions
 * - Development: Uses local emulator or direct API (for testing only)
 */
const CONFIG = {
    // Firebase Cloud Functions URLs (replace with your actual URLs after deployment)
    production: {
        aiChat: 'https://us-central1-bar-inventory-15a15.cloudfunctions.net/aiChat',
        predictions: 'https://us-central1-bar-inventory-15a15.cloudfunctions.net/getAIPredictions',
        shoppingList: 'https://us-central1-bar-inventory-15a15.cloudfunctions.net/generateShoppingList'
    },
    // Local emulator URLs for development
    development: {
        aiChat: 'http://localhost:5001/bar-inventory-15a15/us-central1/aiChat',
        predictions: 'http://localhost:5001/bar-inventory-15a15/us-central1/getAIPredictions',
        shoppingList: 'http://localhost:5001/bar-inventory-15a15/us-central1/generateShoppingList'
    }
};

// Always use production endpoints (Cloud Functions are deployed)
// Set USE_EMULATOR = true only when running: firebase emulators:start
const USE_EMULATOR = false;

const API_ENDPOINTS = USE_EMULATOR ? CONFIG.development : CONFIG.production;

console.log(`🤖 AI Service: Using ${USE_EMULATOR ? 'DEVELOPMENT' : 'PRODUCTION'} endpoints`);

// Conversation history for context
let conversationHistory = [];

// =============================================
// CORE AI FUNCTIONS
// =============================================

/**
 * Send a message to the AI assistant via Cloud Function
 * @param {string} userMessage - The user's question or request
 * @param {Array} inventoryData - Current inventory data for context
 * @returns {Promise<string>} - AI response
 */
async function sendToGroq(userMessage, inventoryData = []) {
    // Build inventory context
    const inventoryContext = buildInventoryContext(inventoryData);

    // Add user message to history
    conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    // Keep conversation history manageable (last 10 messages)
    if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
    }

    try {
        const response = await fetch(API_ENDPOINTS.aiChat, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: userMessage,
                inventoryContext: inventoryContext,
                conversationHistory: conversationHistory.slice(0, -1) // Exclude current message
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI service unavailable');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to get AI response');
        }

        const assistantMessage = data.message;

        // Add assistant response to history
        conversationHistory.push({
            role: 'assistant',
            content: assistantMessage
        });

        return assistantMessage;

    } catch (error) {
        console.error('AI Assistant Error:', error);

        // Remove the failed user message from history
        conversationHistory.pop();

        // Check if it's a network error (Cloud Functions not deployed yet)
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('AI service is not available. Please ensure Cloud Functions are deployed.');
        }

        throw error;
    }
}

/**
 * Build inventory context string for AI
 * @param {Array} inventoryData - Current inventory items
 * @returns {string} - Formatted context
 */
function buildInventoryContext(inventoryData) {
    if (!inventoryData || inventoryData.length === 0) {
        return 'CURRENT INVENTORY: No inventory data available.';
    }

    // Calculate alerts
    const urgentItems = [];
    const lowStockItems = [];
    const goodStockItems = [];
    const categoryTotals = {};

    inventoryData.forEach(item => {
        const threshold = item.alertThreshold || 3;
        const priority = item.priority || 'medium';

        // Categorize by stock status
        if (item.stock <= threshold) {
            if (priority === 'high') {
                urgentItems.push(item);
            } else {
                lowStockItems.push(item);
            }
        } else {
            goodStockItems.push(item);
        }

        // Aggregate by category
        if (!categoryTotals[item.category]) {
            categoryTotals[item.category] = { count: 0, totalStock: 0, lowStock: 0 };
        }
        categoryTotals[item.category].count++;
        categoryTotals[item.category].totalStock += item.stock;
        if (item.stock <= threshold) {
            categoryTotals[item.category].lowStock++;
        }
    });

    let context = `
CURRENT INVENTORY STATUS (${new Date().toLocaleDateString()}):
Total Items: ${inventoryData.length}
Urgent Alerts: ${urgentItems.length}
Low Stock Items: ${lowStockItems.length}
Good Stock Items: ${goodStockItems.length}

CATEGORY BREAKDOWN:
${Object.entries(categoryTotals).map(([cat, data]) =>
    `- ${cat}: ${data.count} items, ${data.lowStock} need attention`
).join('\n')}

URGENT ITEMS (Need immediate attention):
${urgentItems.length > 0 ? urgentItems.map(item =>
    `- ${item.name}: ${item.stock} units (threshold: ${item.alertThreshold || 3}, priority: ${item.priority || 'medium'})`
).join('\n') : 'None'}

LOW STOCK ITEMS:
${lowStockItems.length > 0 ? lowStockItems.slice(0, 10).map(item =>
    `- ${item.name}: ${item.stock} units (threshold: ${item.alertThreshold || 3})`
).join('\n') : 'None'}

FULL INVENTORY LIST:
${inventoryData.map(item =>
    `- ${item.name} (${item.category}): ${item.stock} units, Priority: ${item.priority || 'medium'}, Threshold: ${item.alertThreshold || 3}`
).join('\n')}
`;

    return context;
}

// =============================================
// SPECIALIZED AI FUNCTIONS
// =============================================

/**
 * Get AI predictions for inventory needs
 * @param {Array} inventoryData - Current inventory
 * @returns {Promise<object>} - Predictions and recommendations
 */
async function getInventoryPredictions(inventoryData) {
    try {
        const response = await fetch(API_ENDPOINTS.predictions, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inventoryData })
        });

        if (!response.ok) {
            throw new Error('Failed to get predictions');
        }

        return await response.json();

    } catch (error) {
        console.error('Predictions Error:', error);
        throw error;
    }
}

/**
 * Generate an AI-powered shopping list
 * @param {Array} inventoryData - Current inventory
 * @returns {Promise<string>} - Formatted shopping list
 */
async function generateAIShoppingList(inventoryData) {
    try {
        const response = await fetch(API_ENDPOINTS.shoppingList, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inventoryData })
        });

        if (!response.ok) {
            throw new Error('Failed to generate shopping list');
        }

        const data = await response.json();
        return data.shoppingList;

    } catch (error) {
        console.error('Shopping List Error:', error);
        throw error;
    }
}

/**
 * Get AI insights about inventory patterns
 * @param {Array} inventoryData - Current inventory
 * @returns {Promise<string>} - Insights and recommendations
 */
async function getInventoryInsights(inventoryData) {
    const prompt = `Analyze the current inventory and provide insights on:
1. Overall inventory health assessment
2. Categories that need attention
3. Potential waste risks (overstocked items)
4. Optimization recommendations
5. Any patterns or concerns you notice

Be specific and actionable in your recommendations.`;

    return await sendToGroq(prompt, inventoryData);
}

/**
 * Clear conversation history
 */
function clearAIConversation() {
    conversationHistory = [];
}

/**
 * Check if AI service is available
 * @returns {Promise<boolean>}
 */
async function checkAIServiceStatus() {
    try {
        const response = await fetch(API_ENDPOINTS.aiChat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'ping' })
        });
        return response.ok;
    } catch {
        return false;
    }
}

// =============================================
// EXPORT FUNCTIONS FOR USE IN APP.JS
// =============================================
export {
    sendToGroq,
    getInventoryPredictions,
    generateAIShoppingList,
    getInventoryInsights,
    clearAIConversation,
    buildInventoryContext,
    checkAIServiceStatus
};
