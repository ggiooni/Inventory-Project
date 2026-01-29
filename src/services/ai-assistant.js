/**
 * @file ai-assistant.js
 * @module services/ai-assistant
 * @description AI Assistant Service - Intelligent inventory analysis using LLM
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This service provides AI-powered features for inventory management:
 * - Natural language queries about inventory status
 * - Predictive demand forecasting
 * - Intelligent shopping list generation
 * - Inventory optimization recommendations
 *
 * Technology Stack:
 * - Groq API for ultra-fast LLM inference
 * - Llama 3.3 70B model for high-quality responses
 * - Firebase Cloud Functions for secure API key storage
 *
 * Security Architecture:
 * - API keys are NEVER exposed to the client
 * - All requests are proxied through Firebase Cloud Functions
 * - CORS is configured on the server side
 *
 * @see {@link https://groq.com/} - Groq API Documentation
 * @see {@link https://firebase.google.com/docs/functions} - Cloud Functions
 */

import { MAX_CONVERSATION_HISTORY, AI_CONFIG } from '../config/constants.js';

// =============================================
// CONFIGURATION
// =============================================

/**
 * API Endpoints configuration
 *
 * NOTE: Always using production URLs since Cloud Functions are deployed.
 * To use local emulators, run: firebase emulators:start
 * and set USE_EMULATOR = true below.
 *
 * @constant {Object}
 */
const USE_EMULATOR = false; // Set to true only when running firebase emulators

const ENDPOINTS = {
    production: {
        aiChat: 'https://us-central1-bar-inventory-15a15.cloudfunctions.net/aiChat',
        predictions: 'https://us-central1-bar-inventory-15a15.cloudfunctions.net/getAIPredictions',
        shoppingList: 'https://us-central1-bar-inventory-15a15.cloudfunctions.net/generateShoppingList'
    },
    development: {
        aiChat: 'http://localhost:5001/bar-inventory-15a15/us-central1/aiChat',
        predictions: 'http://localhost:5001/bar-inventory-15a15/us-central1/getAIPredictions',
        shoppingList: 'http://localhost:5001/bar-inventory-15a15/us-central1/generateShoppingList'
    }
};

/**
 * Detect if running in production environment
 * Uses USE_EMULATOR flag to determine which endpoints to use
 * @constant {boolean}
 */
const isProduction = !USE_EMULATOR;

/**
 * Active API endpoints based on environment
 * @constant {Object}
 */
const API = isProduction ? ENDPOINTS.production : ENDPOINTS.development;

// Log which endpoints are being used
console.log(`🤖 AI Service: Using ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} endpoints`);

// =============================================
// MODULE STATE
// =============================================

/**
 * Conversation history for context maintenance
 * @private
 * @type {Array<Object>}
 */
let conversationHistory = [];

/**
 * AI service availability flag
 * @private
 * @type {boolean}
 */
let serviceAvailable = true;

// =============================================
// PUBLIC API - CHAT FUNCTIONS
// =============================================

/**
 * Send a message to the AI assistant
 *
 * This function sends a user message along with inventory context to the
 * AI model via Cloud Functions. The response is contextually aware of
 * the current inventory state.
 *
 * @async
 * @param {string} userMessage - The user's question or request
 * @param {Array<Object>} inventoryData - Current inventory items for context
 * @returns {Promise<string>} AI response text
 * @throws {Error} If AI service is unavailable or request fails
 *
 * @example
 * const response = await sendToGroq(
 *     'What items need restocking?',
 *     inventoryItems
 * );
 * console.log(response);
 */
export async function sendToGroq(userMessage, inventoryData = []) {
    // Build inventory context for the AI
    const inventoryContext = buildInventoryContext(inventoryData);

    // Add user message to history
    conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    // Maintain conversation history limit
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
    }

    try {
        const response = await fetch(API.aiChat, {
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

        serviceAvailable = true;
        return assistantMessage;

    } catch (error) {
        console.error('AI Assistant Error:', error);

        // Remove failed message from history
        conversationHistory.pop();

        // Check for network errors
        if (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
            serviceAvailable = false;
            throw new Error('AI service is not available. Please ensure Cloud Functions are deployed.');
        }

        throw error;
    }
}

/**
 * Get AI-powered inventory predictions
 *
 * Analyzes current inventory and predicts:
 * - Items likely to run out in the next 7 days
 * - Recommended order quantities
 * - Priority ranking for purchasing
 * - Cost-saving opportunities
 *
 * @async
 * @param {Array<Object>} inventoryData - Current inventory
 * @returns {Promise<Object>} Predictions and recommendations
 *
 * @example
 * const predictions = await getInventoryPredictions(items);
 * console.log(predictions.text);
 */
export async function getInventoryPredictions(inventoryData) {
    try {
        const response = await fetch(API.predictions, {
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
 *
 * Creates a comprehensive shopping list based on:
 * - Items below threshold levels
 * - Category grouping
 * - Priority marking for urgent items
 * - Suggested quantities for 2-week stock
 *
 * @async
 * @param {Array<Object>} inventoryData - Current inventory
 * @returns {Promise<string>} Formatted shopping list text
 *
 * @example
 * const list = await generateAIShoppingList(items);
 * downloadAsTextFile(list, 'shopping_list.txt');
 */
export async function generateAIShoppingList(inventoryData) {
    try {
        const response = await fetch(API.shoppingList, {
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
 * Get comprehensive AI insights about inventory
 *
 * Provides analysis on:
 * - Overall inventory health assessment
 * - Categories needing attention
 * - Potential waste risks (overstocked items)
 * - Optimization recommendations
 * - Identified patterns and concerns
 *
 * @async
 * @param {Array<Object>} inventoryData - Current inventory
 * @returns {Promise<string>} Detailed insights text
 */
export async function getInventoryInsights(inventoryData) {
    const prompt = `Analyze the current inventory and provide insights on:
1. Overall inventory health assessment
2. Categories that need attention
3. Potential waste risks (overstocked items)
4. Optimization recommendations
5. Any patterns or concerns you notice

Be specific and actionable in your recommendations.`;

    return await sendToGroq(prompt, inventoryData);
}

// =============================================
// PUBLIC API - UTILITY FUNCTIONS
// =============================================

/**
 * Clear conversation history
 * Useful when starting a new topic or resetting context
 */
export function clearAIConversation() {
    conversationHistory = [];
    console.log('AI conversation history cleared');
}

/**
 * Get current conversation history
 * @returns {Array<Object>} Copy of conversation history
 */
export function getConversationHistory() {
    return [...conversationHistory];
}

/**
 * Check if AI service is available
 *
 * @async
 * @returns {Promise<boolean>} True if service is available
 */
export async function checkAIServiceStatus() {
    try {
        const response = await fetch(API.aiChat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'ping' })
        });

        serviceAvailable = response.ok;
        return response.ok;

    } catch {
        serviceAvailable = false;
        return false;
    }
}

/**
 * Check if service is currently marked as available
 * @returns {boolean} Service availability status
 */
export function isServiceAvailable() {
    return serviceAvailable;
}

// =============================================
// CONTEXT BUILDING
// =============================================

/**
 * Build inventory context string for AI
 *
 * This function creates a structured summary of the current inventory
 * state that provides the AI with necessary context to answer questions
 * accurately.
 *
 * @param {Array<Object>} inventoryData - Current inventory items
 * @returns {string} Formatted context string
 *
 * @example
 * const context = buildInventoryContext(items);
 * // Returns formatted string with categories, counts, alerts, etc.
 */
export function buildInventoryContext(inventoryData) {
    if (!inventoryData || inventoryData.length === 0) {
        return 'CURRENT INVENTORY: No inventory data available.';
    }

    // Categorize items by stock status
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
            categoryTotals[item.category] = {
                count: 0,
                totalStock: 0,
                lowStock: 0
            };
        }
        categoryTotals[item.category].count++;
        categoryTotals[item.category].totalStock += item.stock;
        if (item.stock <= threshold) {
            categoryTotals[item.category].lowStock++;
        }
    });

    // Build context string
    const context = `
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

// Log environment on load
if (!isProduction) {
    console.log('🤖 AI Assistant running in development mode');
    console.log('📡 Using local emulator endpoints');
}
