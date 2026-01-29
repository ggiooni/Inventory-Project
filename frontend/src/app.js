/**
 * @file app.js
 * @description Main Application Entry Point - Smart Inventory Management System
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This is the main application file that coordinates all modules and
 * handles the UI interactions. It follows the MVC pattern where:
 * - Models: Firebase Firestore (data layer)
 * - Views: index.html + CSS (presentation layer)
 * - Controllers: This file + modules (business logic)
 *
 * Module Dependencies:
 * @requires config/firebase - Firebase initialization
 * @requires config/constants - Application constants
 * @requires modules/auth - Authentication module
 * @requires modules/inventory - Inventory management
 * @requires modules/alerts - Alert system
 * @requires modules/pos-integration - POS system integration
 * @requires services/ai-assistant - AI features
 *
 * @see README.md for project documentation
 * @see ARCHITECTURE.md for system design
 */

// =============================================
// MODULE IMPORTS
// =============================================

// Configuration
import { db, auth } from './config/firebase.js';
import {
    TOAST_DURATION,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    MAX_VISIBLE_ALERTS
} from './config/constants.js';

// Authentication Module
import {
    initAuth,
    attemptLogin as authLogin,
    logout as authLogout,
    canModifyStock,
    canManageProducts,
    canManagePriorities,
    getCurrentUser,
    getUserRole,
    getUserDisplayInfo
} from './modules/auth.js';

// Inventory Module
import {
    loadInventoryData,
    setupRealtimeListener,
    getInventoryItems,
    getFilteredItems,
    getItemById,
    getProductPriority,
    calculateStockStatus,
    calculateStats,
    updateStock,
    updatePriority,
    resetToDefaults,
    applyFilters,
    clearFilters as clearInventoryFilters,
    onInventoryChange
} from './modules/inventory.js';

// Alerts Module
import {
    generateAlerts,
    getAlerts,
    getAlertCounts,
    getDisplayAlerts,
    getHiddenAlertCount,
    generateShoppingList as createShoppingList,
    exportAlertsAsCSV,
    getRestockSuggestion,
    onAlertsChange
} from './modules/alerts.js';

// POS Integration Module
import {
    loadPOSConfig,
    savePOSConfig,
    syncWithPOS as performPOSSync,
    getPOSConfig,
    isPOSConnected,
    getMenuItems,
    saveItemMappings,
    onPOSChange
} from './modules/pos-integration.js';

// AI Assistant Service
import {
    sendToGroq,
    generateAIShoppingList,
    getInventoryInsights,
    clearAIConversation
} from './services/ai-assistant.js';

// =============================================
// APPLICATION STATE
// =============================================

/**
 * Application state flags
 * @private
 */
const appState = {
    isInitialized: false,
    isAIProcessing: false
};

// =============================================
// INITIALIZATION
// =============================================

/**
 * Initialize the application
 * Sets up authentication listeners and module connections
 */
function initializeApp() {
    console.log('🚀 Initializing Smart Inventory Management System...');

    // Initialize authentication with callbacks
    initAuth({
        onAuthSuccess: handleAuthSuccess,
        onAuthFailure: handleAuthFailure
    });

    // Set up module listeners
    setupModuleListeners();

    // Set up UI event listeners
    setupUIEventListeners();

    appState.isInitialized = true;
    console.log('✅ Application initialized successfully');
}

/**
 * Handle successful authentication
 * @param {Object} authData - Authentication data
 */
async function handleAuthSuccess(authData) {
    const { user, role, displayName } = authData;

    // Update UI with user info
    updateUserDisplay(displayName, role);
    updateUIPermissions(role);

    // Show main application
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'flex';

    // Load data
    await loadInventoryData();
    setupRealtimeListener(
        () => {
            generateAlerts();
            updateStatsDisplay();
            renderInventoryTable();
        },
        (error) => showNotification('Connection error', 'error')
    );

    await loadPOSConfig();

    showNotification(SUCCESS_MESSAGES.LOGIN(displayName), 'success');

    // Show tour for first-time users
    if (!localStorage.getItem('tourCompleted')) {
        setTimeout(() => {
            if (typeof startTour === 'function') {
                startTour();
                localStorage.setItem('tourCompleted', 'true');
            }
        }, 1500);
    }
}

/**
 * Handle authentication failure (user signed out)
 */
function handleAuthFailure() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContent').style.display = 'none';
}

/**
 * Set up listeners between modules
 */
function setupModuleListeners() {
    // When inventory changes, regenerate alerts and update UI
    onInventoryChange((items, filtered) => {
        generateAlerts();
        updateStatsDisplay();
        renderInventoryTable();
    });

    // When alerts change, update alerts display
    onAlertsChange((alerts, counts) => {
        updateAlertsDisplay();
    });

    // When POS config changes, update POS display
    onPOSChange((config) => {
        updatePOSDisplay();
    });
}

/**
 * Set up UI event listeners
 */
function setupUIEventListeners() {
    // Search and filter inputs
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const alertFilter = document.getElementById('alertFilter');

    if (searchInput) {
        searchInput.addEventListener('input', handleFilterChange);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilterChange);
    }
    if (alertFilter) {
        alertFilter.addEventListener('change', handleFilterChange);
    }

    // Login form enter key
    document.addEventListener('DOMContentLoaded', () => {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');

        [emailInput, passwordInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        window.attemptLogin();
                    }
                });
            }
        });
    });

    // Modal close on outside click
    window.onclick = (event) => {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });
    };
}

// =============================================
// UI UPDATE FUNCTIONS
// =============================================

/**
 * Update user display in sidebar
 */
function updateUserDisplay(displayName, role) {
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const userRoleBadgeEl = document.getElementById('userRoleBadge');

    if (userNameEl) userNameEl.textContent = displayName;
    if (userAvatarEl) userAvatarEl.textContent = displayName.charAt(0);
    if (userRoleBadgeEl) {
        userRoleBadgeEl.textContent = role;
        userRoleBadgeEl.className = `user-role-badge ${role}`;
    }
}

/**
 * Update UI based on user permissions
 */
function updateUIPermissions(role) {
    const priorityPanel = document.getElementById('priorityPanel');
    const adminSection = document.getElementById('adminSection');

    const isAdmin = role === 'admin';

    if (priorityPanel) {
        priorityPanel.style.display = isAdmin ? 'block' : 'none';
    }
    if (adminSection) {
        adminSection.style.display = isAdmin ? 'block' : 'none';
    }
}

/**
 * Update statistics display
 */
function updateStatsDisplay() {
    const stats = calculateStats();

    const totalEl = document.getElementById('totalProducts');
    const urgentEl = document.getElementById('urgentAlertsCount');
    const lowEl = document.getElementById('lowStockCount');
    const goodEl = document.getElementById('goodStockCount');

    if (totalEl) totalEl.textContent = stats.total;
    if (urgentEl) urgentEl.textContent = stats.urgent;
    if (lowEl) lowEl.textContent = stats.lowStock;
    if (goodEl) goodEl.textContent = stats.goodStock;

    // Update sidebar badges
    const alertBadge = document.getElementById('alertBadge');
    const urgentBadge = document.getElementById('urgentBadge');

    if (alertBadge) alertBadge.textContent = stats.urgent + stats.lowStock;
    if (urgentBadge) urgentBadge.textContent = stats.urgent;
}

/**
 * Update alerts display
 */
function updateAlertsDisplay() {
    const counts = getAlertCounts();
    const alerts = getDisplayAlerts();
    const hiddenCount = getHiddenAlertCount();

    // Update counters
    document.getElementById('urgentNumber').textContent = counts.urgent;
    document.getElementById('normalNumber').textContent = counts.normal;
    document.getElementById('infoNumber').textContent = counts.info;

    // Render alert cards
    const alertsGrid = document.getElementById('alertsGrid');
    alertsGrid.innerHTML = '';

    if (alerts.length === 0) {
        alertsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.8);">
                <h3>No Alerts!</h3>
                <p>All products are well stocked according to their priority settings.</p>
            </div>
        `;
        return;
    }

    alerts.forEach(alert => {
        const card = document.createElement('div');
        card.className = `alert-card ${alert.status}`;
        card.innerHTML = `
            <h4>
                ${alert.product.name}
                <span class="priority-badge ${alert.priority}">${alert.priority}</span>
            </h4>
            <p><strong>Stock:</strong> ${alert.product.stock} units</p>
            <p><strong>Threshold:</strong> ${alert.threshold} units</p>
            <p><strong>Status:</strong> ${alert.message}</p>
            <p><strong>Est. Days:</strong> ${alert.daysUntilEmpty} days until empty</p>
            <div class="alert-actions">
                <button class="alert-btn" onclick="quickRestock('${alert.product.id}')">Quick Restock</button>
                <button class="alert-btn" onclick="updatePriorityModal('${alert.product.id}')">Adjust Priority</button>
            </div>
        `;
        alertsGrid.appendChild(card);
    });

    if (hiddenCount > 0) {
        const moreCard = document.createElement('div');
        moreCard.className = 'alert-card info';
        moreCard.innerHTML = `
            <h4>+ ${hiddenCount} More Alerts</h4>
            <p>View full inventory table below for complete list</p>
            <div class="alert-actions">
                <button class="alert-btn" onclick="showAllAlerts()">View All</button>
            </div>
        `;
        alertsGrid.appendChild(moreCard);
    }
}

/**
 * Update POS integration display
 */
function updatePOSDisplay() {
    const config = getPOSConfig();

    const statusEl = document.getElementById('toastStatus');
    const lastSyncEl = document.getElementById('lastSync');
    const mappedItemsEl = document.getElementById('mappedItems');
    const autoUpdatesEl = document.getElementById('autoUpdates');

    if (statusEl) {
        statusEl.textContent = config.connected ? 'Connected' : 'Not Connected';
        statusEl.className = `status-badge ${config.connected ? 'connected' : 'disconnected'}`;
    }

    if (lastSyncEl) {
        lastSyncEl.textContent = config.lastSync
            ? new Date(config.lastSync).toLocaleString()
            : 'Never';
    }

    if (mappedItemsEl) {
        mappedItemsEl.textContent = config.mappedItems || 0;
    }

    if (autoUpdatesEl) {
        autoUpdatesEl.textContent = config.autoUpdates || 0;
    }
}

/**
 * Render inventory table and cards
 */
function renderInventoryTable() {
    const items = getFilteredItems();
    const tbody = document.getElementById('inventoryBody');
    const cardsContainer = document.getElementById('inventoryCards');

    if (tbody) tbody.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';

    if (items.length === 0) {
        const emptyHtml = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="empty-state-icon">&#128269;</div>
                    <p>No products match your filters</p>
                </td>
            </tr>
        `;
        if (tbody) tbody.innerHTML = emptyHtml;
        if (cardsContainer) {
            cardsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128269;</div><p>No products match your filters</p></div>';
        }
        return;
    }

    items.forEach(item => {
        const stockInfo = calculateStockStatus(item);
        const config = getProductPriority(item);
        const rowClass = stockInfo.status === 'urgent' ? 'urgent' :
                        stockInfo.status === 'normal' ? 'warning' : '';

        // Table row
        const row = createTableRow(item, stockInfo, config, rowClass);
        if (tbody) tbody.innerHTML += row;

        // Mobile card
        const card = createMobileCard(item, stockInfo, config, rowClass);
        if (cardsContainer) cardsContainer.innerHTML += card;
    });
}

/**
 * Create table row HTML
 */
function createTableRow(item, stockInfo, config, rowClass) {
    const stockControls = `
        <button class="btn btn-icon btn-secondary" onclick="quickUpdate('${item.id}', '${item.name}', ${item.stock}, 'subtract')" title="Remove stock">&#10134;</button>
        <button class="btn btn-icon btn-success" onclick="quickUpdate('${item.id}', '${item.name}', ${item.stock}, 'add')" title="Add stock">&#10133;</button>
    `;

    let priorityControls = '';
    if (canManagePriorities()) {
        priorityControls = `
            <div class="priority-controls-row">
                <select class="priority-selector" onchange="updateProductPriority('${item.id}', this.value, document.getElementById('threshold_${item.id}').value)">
                    <option value="high" ${config.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${config.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${config.priority === 'low' ? 'selected' : ''}>Low</option>
                </select>
                <input type="number" class="threshold-input" id="threshold_${item.id}"
                       value="${config.threshold}" min="0" max="50"
                       onchange="updateProductPriority('${item.id}', document.querySelector('select[onchange*=\\'${item.id}\\']').value, this.value)">
            </div>
        `;
    } else {
        priorityControls = `
            <div>
                <span class="priority-badge ${config.priority}">${config.priority}</span>
                <small style="display: block; margin-top: 4px; color: var(--text-muted);">Threshold: ${config.threshold}</small>
            </div>
        `;
    }

    const posMapping = item.posItemId
        ? `<span style="color: var(--success);">&#10004; Mapped</span>`
        : `<span style="color: var(--text-muted);">Not mapped</span>`;

    return `
        <tr class="${rowClass}">
            <td>
                <div class="product-info">
                    <span class="product-name">${item.name}</span>
                    <span class="product-category">${item.category}</span>
                </div>
            </td>
            <td>${item.category}</td>
            <td>${posMapping}</td>
            <td>
                <div class="stock-status">
                    <div class="status-indicator ${stockInfo.status}"></div>
                    <div><strong>${stockInfo.status.toUpperCase()}</strong></div>
                </div>
            </td>
            <td><span class="stock-value ${stockInfo.status}">${item.stock}</span></td>
            <td>${priorityControls}</td>
            <td><div class="action-buttons">${stockControls}</div></td>
        </tr>
    `;
}

/**
 * Create mobile card HTML
 */
function createMobileCard(item, stockInfo, config, rowClass) {
    return `
        <div class="inventory-card ${rowClass}">
            <div class="inventory-card-header">
                <div>
                    <div class="inventory-card-title">${item.name}</div>
                    <div class="inventory-card-category">${item.category}</div>
                </div>
                <div class="inventory-card-status">
                    <div class="status-indicator ${stockInfo.status}"></div>
                    <span class="priority-badge ${config.priority}">${config.priority}</span>
                </div>
            </div>
            <div class="inventory-card-body">
                <div class="inventory-card-stat">
                    <div class="inventory-card-stat-label">Stock</div>
                    <div class="inventory-card-stat-value stock-value ${stockInfo.status}">${item.stock}</div>
                </div>
                <div class="inventory-card-stat">
                    <div class="inventory-card-stat-label">Threshold</div>
                    <div class="inventory-card-stat-value">${config.threshold}</div>
                </div>
            </div>
            <div class="inventory-card-actions">
                <button class="btn btn-secondary" onclick="quickUpdate('${item.id}', '${item.name}', ${item.stock}, 'subtract')">&#10134; Remove</button>
                <button class="btn btn-success" onclick="quickUpdate('${item.id}', '${item.name}', ${item.stock}, 'add')">&#10133; Add</button>
            </div>
        </div>
    `;
}

// =============================================
// NOTIFICATION SYSTEM
// =============================================

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'success') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }

    const container = document.getElementById('toastContainer');
    if (container) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = {
            success: '&#10004;',
            error: '&#10006;',
            warning: '&#9888;',
            info: '&#8505;'
        };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, TOAST_DURATION);
    }
}

/**
 * Show login error
 */
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// =============================================
// EVENT HANDLERS
// =============================================

/**
 * Handle filter changes
 */
function handleFilterChange() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const status = document.getElementById('alertFilter')?.value || '';

    applyFilters({ search: searchTerm, category, status });
    renderInventoryTable();
}

// =============================================
// GLOBAL FUNCTIONS (Window exports)
// =============================================

// Authentication
window.attemptLogin = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    const result = await authLogin(email, password);

    if (!result.success) {
        showError(result.error);
    }

    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
};

window.logout = async function() {
    if (confirm('Are you sure you want to sign out?')) {
        const result = await authLogout();
        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.error, 'error');
        }
    }
};

// Stock Management
window.quickUpdate = function(itemId, itemName, currentStock, action) {
    if (!canModifyStock()) {
        showNotification(ERROR_MESSAGES.PERMISSION.DENIED, 'error');
        return;
    }

    const quantity = parseInt(prompt(`${action === 'add' ? 'Add' : 'Remove'} quantity for ${itemName}:`, '1')) || 1;
    let newStock;

    if (action === 'add') {
        newStock = currentStock + quantity;
    } else {
        newStock = currentStock - quantity;
        if (newStock < 0) {
            showNotification(ERROR_MESSAGES.INVENTORY.NEGATIVE_STOCK, 'error');
            return;
        }
    }

    performStockUpdate(itemId, itemName, newStock, currentStock, quantity, action);
};

async function performStockUpdate(itemId, itemName, newStock, oldStock, quantity, action) {
    const user = getCurrentUser();
    const result = await updateStock(itemId, newStock, user.email);

    if (result.success) {
        showNotification(SUCCESS_MESSAGES.STOCK_UPDATE(action, quantity, itemName, oldStock, newStock), 'success');
    } else {
        showNotification(result.error, 'error');
    }
}

window.updateProductPriority = async function(itemId, priority, threshold) {
    if (!canManagePriorities()) {
        showNotification(ERROR_MESSAGES.PERMISSION.ADMIN_REQUIRED, 'error');
        return;
    }

    const user = getCurrentUser();
    const result = await updatePriority(itemId, priority, threshold, user.email);

    if (result.success) {
        showNotification(SUCCESS_MESSAGES.PRIORITY_UPDATE, 'success');
        setTimeout(() => {
            generateAlerts();
            renderInventoryTable();
        }, 500);
    } else {
        showNotification(result.error, 'error');
    }
};

window.quickRestock = function(productId) {
    const suggestion = getRestockSuggestion(productId);
    if (suggestion) {
        const quantity = parseInt(prompt(
            `Quick restock for ${suggestion.product.name}.\nSuggested quantity: ${suggestion.suggestedQuantity}`,
            suggestion.suggestedQuantity
        )) || 0;

        if (quantity > 0) {
            performStockUpdate(
                productId,
                suggestion.product.name,
                suggestion.currentStock + quantity,
                suggestion.currentStock,
                quantity,
                'add'
            );
        }
    }
};

// Filters
window.clearFilters = function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('alertFilter').value = '';
    clearInventoryFilters();
    renderInventoryTable();
};

window.showAllAlerts = function() {
    document.getElementById('alertFilter').value = 'urgent';
    handleFilterChange();
    document.querySelector('table')?.scrollIntoView({ behavior: 'smooth' });
};

// Admin Functions
window.resetPriorityDefaults = async function() {
    if (!canManagePriorities()) {
        showNotification(ERROR_MESSAGES.PERMISSION.ADMIN_REQUIRED, 'error');
        return;
    }

    if (confirm('Reset all products to default priority settings?')) {
        const user = getCurrentUser();
        await resetToDefaults(user.email);
        showNotification('Priorities reset to defaults', 'success');
        setTimeout(() => loadInventoryData(), 1000);
    }
};

window.bulkPriorityUpdate = function() {
    if (!canManagePriorities()) {
        showNotification(ERROR_MESSAGES.PERMISSION.ADMIN_REQUIRED, 'error');
        return;
    }
    document.getElementById('bulkUpdateModal').classList.add('show');
};

// Export Functions
window.generateShoppingList = function() {
    const result = createShoppingList();
    downloadFile(result.text, result.filename, 'text/plain');
    showNotification('Shopping list generated!', 'success');
};

window.exportAlerts = function() {
    const result = exportAlertsAsCSV();
    downloadFile(result.content, result.filename, 'text/csv');
    showNotification('Alerts exported successfully', 'success');
};

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// POS Functions
window.configurePOS = function() {
    if (!canManageProducts()) {
        showNotification(ERROR_MESSAGES.PERMISSION.MANAGER_REQUIRED, 'error');
        return;
    }
    document.getElementById('posConfigModal').classList.add('show');
};

window.savePOSConfig = async function() {
    const config = {
        system: document.getElementById('posSystem').value,
        apiKey: document.getElementById('posApiKey').value,
        restaurantId: document.getElementById('posRestaurantId').value,
        syncFrequency: document.getElementById('syncFrequency').value
    };

    const user = getCurrentUser();
    const result = await savePOSConfig(config, user.email);

    if (result.success) {
        showNotification(SUCCESS_MESSAGES.POS_CONFIG_SAVED, 'success');
        closeModal('posConfigModal');
    } else {
        showNotification(result.error, 'error');
    }
};

window.syncWithPOS = async function() {
    if (!isPOSConnected()) {
        showNotification('Please configure POS integration first', 'warning');
        window.configurePOS();
        return;
    }

    showNotification('Syncing with POS...', 'info');
    const result = await performPOSSync();

    if (result.success) {
        showNotification(SUCCESS_MESSAGES.SYNC_COMPLETE, 'success');
    } else {
        showNotification(result.error, 'error');
    }
};

window.openItemMapping = async function() {
    if (!canManageProducts()) {
        showNotification(ERROR_MESSAGES.PERMISSION.MANAGER_REQUIRED, 'error');
        return;
    }

    if (!isPOSConnected()) {
        showNotification('Please configure POS integration first', 'warning');
        window.configurePOS();
        return;
    }

    await loadMappingInterface();
    document.getElementById('itemMappingModal').classList.add('show');
};

async function loadMappingInterface() {
    const mappingList = document.getElementById('mappingList');
    mappingList.innerHTML = '<p>Loading menu items from POS...</p>';

    const menuItems = await getMenuItems();
    const inventoryItems = getInventoryItems();

    mappingList.innerHTML = '';

    menuItems.forEach(item => {
        const mappingDiv = document.createElement('div');
        mappingDiv.className = 'mapping-item';
        mappingDiv.innerHTML = `
            <h4>${item.name} (${item.category})</h4>
            <div class="mapping-row">
                <select class="ingredient-select">
                    <option value="">Select Ingredient</option>
                    ${inventoryItems.map(inv => `<option value="${inv.id}">${inv.name}</option>`).join('')}
                </select>
                <input type="number" placeholder="Quantity" step="0.1" min="0">
                <select>
                    <option>oz</option>
                    <option>ml</option>
                    <option>units</option>
                </select>
                <button onclick="removeIngredient(this)">Remove</button>
            </div>
            <button class="add-ingredient-btn" onclick="addIngredientRow(this)">+ Add Ingredient</button>
        `;
        mappingList.appendChild(mappingDiv);
    });
}

window.addIngredientRow = function(btn) {
    const inventoryItems = getInventoryItems();
    const newRow = document.createElement('div');
    newRow.className = 'mapping-row';
    newRow.innerHTML = `
        <select class="ingredient-select">
            <option value="">Select Ingredient</option>
            ${inventoryItems.map(inv => `<option value="${inv.id}">${inv.name}</option>`).join('')}
        </select>
        <input type="number" placeholder="Quantity" step="0.1" min="0">
        <select>
            <option>oz</option>
            <option>ml</option>
            <option>units</option>
        </select>
        <button onclick="removeIngredient(this)">Remove</button>
    `;
    btn.parentElement.insertBefore(newRow, btn);
};

window.removeIngredient = function(btn) {
    btn.parentElement.remove();
};

window.saveItemMappings = async function() {
    const user = getCurrentUser();
    const mappings = [];  // Would collect from form
    const result = await saveItemMappings(mappings, user.email);

    if (result.success) {
        showNotification('Item mappings saved!', 'success');
        closeModal('itemMappingModal');
    } else {
        showNotification(result.error, 'error');
    }
};

// Modal Functions
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
};

// AI Functions
window.sendAIMessage = async function() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message || appState.isAIProcessing) return;

    input.value = '';
    await processAIMessage(message);
};

window.askAI = async function(question) {
    if (appState.isAIProcessing) return;
    await processAIMessage(question);
};

async function processAIMessage(message) {
    const chatMessages = document.getElementById('aiChatMessages');
    const sendBtn = document.querySelector('.ai-send-btn');
    const loading = document.getElementById('aiLoading');

    // Add user message
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-message user';
    userDiv.innerHTML = `<div class="ai-message-content">${escapeHtml(message)}</div>`;
    chatMessages.appendChild(userDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show loading
    appState.isAIProcessing = true;
    if (sendBtn) sendBtn.disabled = true;
    if (loading) loading.style.display = 'inline';

    try {
        const response = await sendToGroq(message, getInventoryItems());

        const aiDiv = document.createElement('div');
        aiDiv.className = 'ai-message assistant';
        aiDiv.innerHTML = `<div class="ai-message-content">${formatAIResponse(response)}</div>`;
        chatMessages.appendChild(aiDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
        console.error('AI Error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-message assistant';
        errorDiv.innerHTML = `
            <div class="ai-message-content" style="border-color: #ff5757;">
                Sorry, I encountered an error: ${escapeHtml(error.message)}
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } finally {
        appState.isAIProcessing = false;
        if (sendBtn) sendBtn.disabled = false;
        if (loading) loading.style.display = 'none';
    }
}

function formatAIResponse(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    if (!formatted.startsWith('<')) {
        formatted = '<p>' + formatted + '</p>';
    }
    return formatted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.generateAIShoppingListAction = async function() {
    if (!getCurrentUser()) {
        showNotification('Please sign in to use AI features', 'error');
        return;
    }

    showNotification('Generating AI shopping list...', 'info');

    try {
        const shoppingList = await generateAIShoppingList(getInventoryItems());
        downloadFile(shoppingList, `ai_shopping_list_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
        showNotification('AI shopping list generated!', 'success');
    } catch (error) {
        console.error('AI Shopping List Error:', error);
        showNotification('Error generating AI shopping list', 'error');
    }
};

window.getAIInsightsAction = async function() {
    if (!getCurrentUser()) {
        showNotification('Please sign in to use AI features', 'error');
        return;
    }

    await window.askAI('Provide a comprehensive analysis of my current inventory status.');
};

// =============================================
// APPLICATION STARTUP
// =============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('📦 Smart Inventory Management System loaded successfully!');
console.log('🤖 AI Assistant powered by Groq is ready!');
