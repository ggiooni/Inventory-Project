/**
 * Firebase Cloud Functions for Smart Inventory System
 *
 * This module provides a secure proxy for AI API calls.
 * The API key is stored securely in Firebase environment configuration
 * and never exposed to the client.
 *
 * @author Nicolas Boggioni Troncoso
 * @project BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

// CORS configuration - allow requests from any origin during development
const corsHandler = cors({ origin: true });

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_MODEL = 'llama-3.3-70b-versatile';

/**
 * System prompt for the AI assistant
 * Defines the AI's personality and capabilities
 */
const SYSTEM_PROMPT = `You are an intelligent AI assistant for an inventory management system. Your name is "Smart Inventory AI".

Your capabilities include:
1. Analyzing current stock levels and identifying items that need restocking
2. Predicting future inventory needs based on consumption patterns
3. Generating shopping lists with recommended quantities
4. Identifying overstocked items that might go to waste
5. Providing cost optimization recommendations
6. Answering questions about inventory status

When analyzing inventory data, consider:
- Priority levels (high, medium, low) affect urgency of restocking
- Alert thresholds indicate when items need attention
- Categories include: Spirits, Wines, Beers, Soft Drinks, Syrups

Always be helpful, concise, and provide actionable recommendations.
Format your responses clearly with bullet points or numbered lists when appropriate.
If you don't have enough data, say so and suggest what information would help.

Respond in the same language the user writes in (English or Spanish).`;

/**
 * Cloud Function: AI Chat Proxy
 *
 * Securely proxies requests to Groq API without exposing the API key.
 *
 * @param {Object} request.body.message - User's message
 * @param {Array} request.body.inventoryContext - Current inventory data
 * @param {Array} request.body.conversationHistory - Previous messages
 * @returns {Object} AI response
 */
exports.aiChat = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        // Only allow POST requests
        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            const { message, inventoryContext, conversationHistory = [] } = request.body;

            // Validate input
            if (!message) {
                response.status(400).json({ error: 'Message is required' });
                return;
            }

            // Get API key from Firebase environment config
            const apiKey = functions.config().groq?.apikey;

            if (!apiKey) {
                console.error('Groq API key not configured');
                response.status(500).json({
                    error: 'AI service not configured. Please contact administrator.'
                });
                return;
            }

            // Build messages array for Groq
            const messages = [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT + (inventoryContext ? '\n\n' + inventoryContext : '')
                },
                ...conversationHistory.slice(-10), // Keep last 10 messages for context
                { role: 'user', content: message }
            ];

            // Call Groq API
            const groqResponse = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1024,
                    top_p: 1,
                    stream: false
                })
            });

            if (!groqResponse.ok) {
                const errorData = await groqResponse.json();
                console.error('Groq API error:', errorData);
                response.status(groqResponse.status).json({
                    error: 'AI service error. Please try again.'
                });
                return;
            }

            const data = await groqResponse.json();
            const aiMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

            // Return successful response
            response.status(200).json({
                success: true,
                message: aiMessage,
                usage: data.usage
            });

        } catch (error) {
            console.error('Function error:', error);
            response.status(500).json({
                error: 'Internal server error. Please try again.'
            });
        }
    });
});

/**
 * Cloud Function: Get AI Predictions
 *
 * Generates inventory predictions based on current stock levels.
 *
 * @param {Array} request.body.inventoryData - Current inventory
 * @returns {Object} Predictions and recommendations
 */
exports.getAIPredictions = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            const { inventoryData } = request.body;
            const apiKey = functions.config().groq?.apikey;

            if (!apiKey) {
                response.status(500).json({ error: 'AI service not configured' });
                return;
            }

            const inventoryContext = buildInventoryContext(inventoryData);

            const predictionPrompt = `Based on the current inventory data, provide:
1. Items likely to run out in the next 7 days
2. Recommended order quantities for each
3. Priority ranking for purchasing
4. Any cost-saving opportunities

Please format as a structured list.`;

            const groqResponse = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + inventoryContext },
                        { role: 'user', content: predictionPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            if (!groqResponse.ok) {
                response.status(groqResponse.status).json({ error: 'AI service error' });
                return;
            }

            const data = await groqResponse.json();

            response.status(200).json({
                success: true,
                predictions: data.choices[0]?.message?.content,
                generatedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Prediction error:', error);
            response.status(500).json({ error: 'Internal server error' });
        }
    });
});

/**
 * Cloud Function: Generate Shopping List
 *
 * Creates an AI-powered shopping list based on inventory needs.
 *
 * @param {Array} request.body.inventoryData - Current inventory
 * @returns {Object} Generated shopping list
 */
exports.generateShoppingList = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            const { inventoryData } = request.body;
            const apiKey = functions.config().groq?.apikey;

            if (!apiKey) {
                response.status(500).json({ error: 'AI service not configured' });
                return;
            }

            const inventoryContext = buildInventoryContext(inventoryData);

            const shoppingPrompt = `Generate a comprehensive shopping list for restocking. Include:
1. All items below their threshold levels
2. Suggested quantities to order (aim for 2 weeks of stock)
3. Group by category
4. Mark urgent items clearly
5. Include estimated priority for each item

Format it as a clear, actionable shopping list.`;

            const groqResponse = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + inventoryContext },
                        { role: 'user', content: shoppingPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                })
            });

            if (!groqResponse.ok) {
                response.status(groqResponse.status).json({ error: 'AI service error' });
                return;
            }

            const data = await groqResponse.json();

            response.status(200).json({
                success: true,
                shoppingList: data.choices[0]?.message?.content,
                generatedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Shopping list error:', error);
            response.status(500).json({ error: 'Internal server error' });
        }
    });
});

/**
 * Helper function to build inventory context for AI
 * @param {Array} inventoryData - Inventory items
 * @returns {string} Formatted context string
 */
function buildInventoryContext(inventoryData) {
    if (!inventoryData || inventoryData.length === 0) {
        return 'CURRENT INVENTORY: No inventory data available.';
    }

    const urgentItems = [];
    const lowStockItems = [];
    const categoryTotals = {};

    inventoryData.forEach(item => {
        const threshold = item.alertThreshold || 3;
        const priority = item.priority || 'medium';

        if (item.stock <= threshold) {
            if (priority === 'high') {
                urgentItems.push(item);
            } else {
                lowStockItems.push(item);
            }
        }

        if (!categoryTotals[item.category]) {
            categoryTotals[item.category] = { count: 0, totalStock: 0, lowStock: 0 };
        }
        categoryTotals[item.category].count++;
        categoryTotals[item.category].totalStock += item.stock;
        if (item.stock <= threshold) {
            categoryTotals[item.category].lowStock++;
        }
    });

    return `
CURRENT INVENTORY STATUS (${new Date().toLocaleDateString()}):
Total Items: ${inventoryData.length}
Urgent Alerts: ${urgentItems.length}
Low Stock Items: ${lowStockItems.length}

CATEGORY BREAKDOWN:
${Object.entries(categoryTotals).map(([cat, data]) =>
    `- ${cat}: ${data.count} items, ${data.lowStock} need attention`
).join('\n')}

URGENT ITEMS:
${urgentItems.length > 0 ? urgentItems.map(item =>
    `- ${item.name}: ${item.stock} units (threshold: ${item.alertThreshold || 3})`
).join('\n') : 'None'}

LOW STOCK ITEMS:
${lowStockItems.length > 0 ? lowStockItems.slice(0, 10).map(item =>
    `- ${item.name}: ${item.stock} units`
).join('\n') : 'None'}

FULL INVENTORY:
${inventoryData.map(item =>
    `- ${item.name} (${item.category}): ${item.stock} units, Priority: ${item.priority || 'medium'}`
).join('\n')}
`;
}
