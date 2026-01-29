/**
 * @file ai.controller.js
 * @description AI Assistant controller - Groq/LLM integration
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const { db } = require('../config/firebase');
const { DEFAULT_PRIORITIES } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_MODEL = 'llama-3.3-70b-versatile';

// System prompt for the AI
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
Respond in the same language the user writes in (English or Spanish).`;

/**
 * Chat with AI assistant
 * POST /api/ai/chat
 */
const chat = asyncHandler(async (req, res) => {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
        throw new ApiError(400, 'Message is required');
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new ApiError(500, 'AI service not configured. Please set GROQ_API_KEY.');
    }

    // Build inventory context
    const inventoryContext = await buildInventoryContext();

    // Build messages array
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT + '\n\n' + inventoryContext
        },
        ...conversationHistory.slice(-10),
        { role: 'user', content: message }
    ];

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: AI_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Groq API error:', error);
        throw new ApiError(response.status, 'AI service error. Please try again.');
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'I could not generate a response.';

    res.json({
        success: true,
        data: {
            message: aiMessage,
            usage: data.usage
        }
    });
});

/**
 * Get AI predictions
 * POST /api/ai/predictions
 */
const getPredictions = asyncHandler(async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new ApiError(500, 'AI service not configured');
    }

    const inventoryContext = await buildInventoryContext();

    const predictionPrompt = `Based on the current inventory data, provide:
1. Items likely to run out in the next 7 days
2. Recommended order quantities for each
3. Priority ranking for purchasing
4. Any cost-saving opportunities

Please format as a structured list.`;

    const response = await fetch(GROQ_API_URL, {
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

    if (!response.ok) {
        throw new ApiError(response.status, 'AI service error');
    }

    const data = await response.json();

    res.json({
        success: true,
        data: {
            predictions: data.choices[0]?.message?.content,
            generatedAt: new Date().toISOString()
        }
    });
});

/**
 * Generate AI shopping list
 * POST /api/ai/shopping-list
 */
const generateShoppingList = asyncHandler(async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new ApiError(500, 'AI service not configured');
    }

    const inventoryContext = await buildInventoryContext();

    const shoppingPrompt = `Generate a comprehensive shopping list for restocking. Include:
1. All items below their threshold levels
2. Suggested quantities to order (aim for 2 weeks of stock)
3. Group by category
4. Mark urgent items clearly
5. Include estimated priority for each item

Format it as a clear, actionable shopping list.`;

    const response = await fetch(GROQ_API_URL, {
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

    if (!response.ok) {
        throw new ApiError(response.status, 'AI service error');
    }

    const data = await response.json();

    res.json({
        success: true,
        data: {
            shoppingList: data.choices[0]?.message?.content,
            generatedAt: new Date().toISOString()
        }
    });
});

/**
 * Get AI insights
 * POST /api/ai/insights
 */
const getInsights = asyncHandler(async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new ApiError(500, 'AI service not configured');
    }

    const inventoryContext = await buildInventoryContext();

    const insightsPrompt = `Analyze the current inventory and provide insights on:
1. Overall inventory health assessment
2. Categories that need attention
3. Potential waste risks (overstocked items)
4. Optimization recommendations
5. Any patterns or concerns you notice

Be specific and actionable in your recommendations.`;

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: AI_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT + '\n\n' + inventoryContext },
                { role: 'user', content: insightsPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        throw new ApiError(response.status, 'AI service error');
    }

    const data = await response.json();

    res.json({
        success: true,
        data: {
            insights: data.choices[0]?.message?.content,
            generatedAt: new Date().toISOString()
        }
    });
});

/**
 * Build inventory context string for AI
 */
async function buildInventoryContext() {
    if (!db) {
        return 'CURRENT INVENTORY: No inventory data available (database not connected).';
    }

    const snapshot = await db.collection('inventory').get();
    const items = [];
    const urgentItems = [];
    const lowStockItems = [];
    const categoryTotals = {};

    snapshot.forEach(doc => {
        const item = doc.data();
        items.push(item);

        const threshold = item.alertThreshold || DEFAULT_PRIORITIES[item.category]?.threshold || 3;
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
        categoryTotals[item.category].totalStock += item.stock || 0;
        if (item.stock <= threshold) {
            categoryTotals[item.category].lowStock++;
        }
    });

    return `
CURRENT INVENTORY STATUS (${new Date().toLocaleDateString()}):
Total Items: ${items.length}
Urgent Alerts: ${urgentItems.length}
Low Stock Items: ${lowStockItems.length}

CATEGORY BREAKDOWN:
${Object.entries(categoryTotals).map(([cat, data]) =>
    `- ${cat}: ${data.count} items, ${data.lowStock} need attention`
).join('\n')}

URGENT ITEMS (Need immediate attention):
${urgentItems.length > 0 ? urgentItems.map(item =>
    `- ${item.name}: ${item.stock} units (threshold: ${item.alertThreshold || 3})`
).join('\n') : 'None'}

LOW STOCK ITEMS:
${lowStockItems.length > 0 ? lowStockItems.slice(0, 10).map(item =>
    `- ${item.name}: ${item.stock} units`
).join('\n') : 'None'}

FULL INVENTORY LIST:
${items.map(item =>
    `- ${item.name} (${item.category}): ${item.stock} units, Priority: ${item.priority || 'medium'}`
).join('\n')}
`;
}

module.exports = {
    chat,
    getPredictions,
    generateShoppingList,
    getInsights
};
