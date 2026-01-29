// Main Application Logic
import { db, auth } from './firebase-config.js';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    onSnapshot,
    setDoc,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// AI Assistant Integration
import {
    sendToGroq,
    getInventoryPredictions,
    generateAIShoppingList,
    getInventoryInsights,
    clearAIConversation
} from './ai-assistant.js';

// =============================================
// GLOBAL STATE VARIABLES
// =============================================
let inventoryData = [];
let filteredData = [];
let currentUser = null;
let userRole = 'staff';
let alertsData = [];
let posConfig = {
    connected: false,
    system: 'toast',
    lastSync: null,
    mappedItems: 0
};

// User roles and permissions
const USER_ROLES = {
    'admin@inventory.com': 'admin',
    'manager@inventory.com': 'manager',
    'staff@inventory.com': 'staff',
    // Legacy support
    'admin@wishbone.com': 'admin',
    'manager@wishbone.com': 'manager',
    'staff@wishbone.com': 'staff'
};

// Default priority settings
const DEFAULT_PRIORITIES = {
    'Spirits': { priority: 'high', threshold: 2 },
    'Wines': { priority: 'medium', threshold: 3 },
    'Beers': { priority: 'medium', threshold: 6 },
    'Soft Drinks': { priority: 'low', threshold: 12 },
    'Syrups': { priority: 'medium', threshold: 2 }
};

// =============================================
// PERMISSION CHECKS
// =============================================
function canModifyStock() {
    return currentUser !== null;
}

function canManageProducts() {
    return userRole === 'admin' || userRole === 'manager';
}

function canManagePriorities() {
    return userRole === 'admin';
}

// =============================================
// AUTHENTICATION FUNCTIONS
// =============================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userRole = USER_ROLES[user.email] || 'staff';

        // Update sidebar user info
        const userName = user.email.split('@')[0];
        document.getElementById('userName').textContent = userName.charAt(0).toUpperCase() + userName.slice(1);
        document.getElementById('userAvatar').textContent = userName.charAt(0).toUpperCase();
        document.getElementById('userRoleBadge').textContent = userRole;
        document.getElementById('userRoleBadge').className = `user-role-badge ${userRole}`;

        updateUIPermissions();

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContent').style.display = 'flex';

        loadInventoryData();
        setupRealtimeListener();
        loadPOSConfig();

        showNotification(`Welcome back, ${userName}!`, 'success');

        // Show tour for first-time users
        if (!localStorage.getItem('tourCompleted')) {
            setTimeout(() => {
                if (typeof startTour === 'function') {
                    startTour();
                    localStorage.setItem('tourCompleted', 'true');
                }
            }, 1500);
        }
    } else {
        currentUser = null;
        userRole = 'staff';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContent').style.display = 'none';
    }
});

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
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Invalid email or password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Try again later.';
                break;
        }
        
        showError(errorMessage);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

window.logout = async function() {
    if (confirm('Are you sure you want to sign out?')) {
        try {
            await signOut(auth);
            showNotification('Signed out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Error signing out', 'error');
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function updateUIPermissions() {
    const priorityPanel = document.getElementById('priorityPanel');
    const adminSection = document.getElementById('adminSection');

    if (canManagePriorities()) {
        priorityPanel.style.display = 'block';
        if (adminSection) adminSection.style.display = 'block';
    } else {
        priorityPanel.style.display = 'none';
        if (adminSection) adminSection.style.display = 'none';
    }
}

// =============================================
// POS INTEGRATION FUNCTIONS (NEW)
// =============================================

async function loadPOSConfig() {
    try {
        const configDoc = await getDocs(collection(db, 'posConfig'));
        if (!configDoc.empty) {
            configDoc.forEach((doc) => {
                posConfig = { ...posConfig, ...doc.data() };
            });
            updatePOSUI();
        }
    } catch (error) {
        console.error('Error loading POS config:', error);
    }
}

function updatePOSUI() {
    const toastStatus = document.getElementById('toastStatus');
    const lastSync = document.getElementById('lastSync');
    const mappedItems = document.getElementById('mappedItems');
    const autoUpdates = document.getElementById('autoUpdates');
    
    if (posConfig.connected) {
        toastStatus.textContent = 'Connected';
        toastStatus.className = 'status-badge connected';
    } else {
        toastStatus.textContent = 'Not Connected';
        toastStatus.className = 'status-badge disconnected';
    }
    
    lastSync.textContent = posConfig.lastSync ? 
        new Date(posConfig.lastSync).toLocaleString() : 'Never';
    
    mappedItems.textContent = posConfig.mappedItems || 0;
    autoUpdates.textContent = posConfig.autoUpdates || 0;
}

window.configurePOS = function() {
    if (!canManageProducts()) {
        showNotification('Manager or Admin access required', 'error');
        return;
    }
    document.getElementById('posConfigModal').classList.add('show');
}

window.savePOSConfig = async function() {
    const posSystem = document.getElementById('posSystem').value;
    const apiKey = document.getElementById('posApiKey').value;
    const restaurantId = document.getElementById('posRestaurantId').value;
    const syncFrequency = document.getElementById('syncFrequency').value;
    
    if (!apiKey || !restaurantId) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        // In a real implementation, you would validate the API key here
        // by making a test call to the POS API
        
        const configData = {
            system: posSystem,
            apiKey: apiKey, // In production, encrypt this!
            restaurantId: restaurantId,
            syncFrequency: syncFrequency,
            connected: true,
            lastSync: new Date().toISOString(),
            updatedBy: currentUser.email
        };
        
        await setDoc(doc(db, 'posConfig', 'main'), configData);
        
        posConfig = { ...posConfig, ...configData };
        updatePOSUI();
        
        showNotification('POS configuration saved successfully!', 'success');
        closeModal('posConfigModal');
        
        // Start sync process
        if (syncFrequency === 'realtime') {
            startRealtimeSync();
        }
        
    } catch (error) {
        console.error('Error saving POS config:', error);
        showNotification('Error saving configuration', 'error');
    }
}

// Simulate POS sync (in real app, this would call Toast API)
async function startRealtimeSync() {
    if (!posConfig.connected) {
        showNotification('POS not connected', 'warning');
        return;
    }
    
    showNotification('Real-time sync started with ' + posConfig.system.toUpperCase(), 'info');
    
    // In a real implementation, you would:
    // 1. Set up webhook endpoint to receive POS events
    // 2. Listen for sale transactions
    // 3. Parse transaction data to extract menu items
    // 4. Look up recipe mappings
    // 5. Deduct ingredients from inventory
    
    // For demo purposes, we'll simulate this
}

window.syncWithPOS = async function() {
    if (!posConfig.connected) {
        showNotification('Please configure POS integration first', 'warning');
        configurePOS();
        return;
    }
    
    showNotification('Syncing with POS...', 'info');
    
    try {
        // Simulate API call to POS system
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In real implementation:
        // const response = await fetch(`https://api.toasttab.com/v2/orders`, {
        //     headers: {
        //         'Authorization': `Bearer ${posConfig.apiKey}`,
        //         'Toast-Restaurant-External-ID': posConfig.restaurantId
        //     }
        // });
        
        posConfig.lastSync = new Date().toISOString();
        posConfig.autoUpdates = (posConfig.autoUpdates || 0) + 5; // Simulate 5 updates
        
        await setDoc(doc(db, 'posConfig', 'main'), posConfig);
        updatePOSUI();
        
        showNotification('Sync completed successfully!', 'success');
        
    } catch (error) {
        console.error('Error syncing with POS:', error);
        showNotification('Sync failed. Please check your connection.', 'error');
    }
}

window.openItemMapping = function() {
    if (!canManageProducts()) {
        showNotification('Manager or Admin access required', 'error');
        return;
    }
    
    if (!posConfig.connected) {
        showNotification('Please configure POS integration first', 'warning');
        configurePOS();
        return;
    }
    
    // Load mapping interface
    loadItemMappings();
    document.getElementById('itemMappingModal').classList.add('show');
}

async function loadItemMappings() {
    const mappingList = document.getElementById('mappingList');
    mappingList.innerHTML = '<p>Loading menu items from POS...</p>';
    
    try {
        // In real implementation, fetch menu items from Toast API
        // For now, simulate with sample data
        const sampleMenuItems = [
            { id: 'item1', name: 'Classic Margarita', category: 'Cocktails' },
            { id: 'item2', name: 'Mojito', category: 'Cocktails' },
            { id: 'item3', name: 'Caesar Salad', category: 'Appetizers' }
        ];
        
        mappingList.innerHTML = '';
        
        sampleMenuItems.forEach(item => {
            const mappingDiv = document.createElement('div');
            mappingDiv.className = 'mapping-item';
            mappingDiv.innerHTML = `
                <h4>${item.name} (${item.category})</h4>
                <div class="mapping-row">
                    <select class="ingredient-select">
                        <option value="">Select Ingredient</option>
                        ${inventoryData.map(inv => 
                            `<option value="${inv.id}">${inv.name}</option>`
                        ).join('')}
                    </select>
                    <input type="number" placeholder="Quantity" step="0.1" min="0">
                    <select>
                        <option>oz</option>
                        <option>ml</option>
                        <option>units</option>
                        <option>g</option>
                    </select>
                    <button onclick="removeIngredient(this)">Remove</button>
                </div>
                <button class="add-ingredient-btn" onclick="addIngredientRow(this)">+ Add Ingredient</button>
            `;
            mappingList.appendChild(mappingDiv);
        });
        
    } catch (error) {
        console.error('Error loading mappings:', error);
        mappingList.innerHTML = '<p style="color: red;">Error loading menu items</p>';
    }
}

window.addIngredientRow = function(btn) {
    const mappingItem = btn.parentElement;
    const newRow = document.createElement('div');
    newRow.className = 'mapping-row';
    newRow.innerHTML = `
        <select class="ingredient-select">
            <option value="">Select Ingredient</option>
            ${inventoryData.map(inv => 
                `<option value="${inv.id}">${inv.name}</option>`
            ).join('')}
        </select>
        <input type="number" placeholder="Quantity" step="0.1" min="0">
        <select>
            <option>oz</option>
            <option>ml</option>
            <option>units</option>
            <option>g</option>
        </select>
        <button onclick="removeIngredient(this)">Remove</button>
    `;
    mappingItem.insertBefore(newRow, btn);
}

window.removeIngredient = function(btn) {
    btn.parentElement.remove();
}

window.saveItemMappings = async function() {
    showNotification('Saving item mappings...', 'info');
    
    try {
        // In real implementation, save mappings to Firestore
        // and use them when processing POS transactions
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        posConfig.mappedItems = document.querySelectorAll('.mapping-item').length;
        await setDoc(doc(db, 'posConfig', 'main'), posConfig);
        updatePOSUI();
        
        showNotification('Item mappings saved successfully!', 'success');
        closeModal('itemMappingModal');
        
    } catch (error) {
        console.error('Error saving mappings:', error);
        showNotification('Error saving mappings', 'error');
    }
}

// =============================================
// PRIORITY & ALERTS SYSTEM
// =============================================

function getProductPriority(product) {
    return {
        priority: product.priority || DEFAULT_PRIORITIES[product.category]?.priority || 'medium',
        threshold: product.alertThreshold || DEFAULT_PRIORITIES[product.category]?.threshold || 3
    };
}

function calculateStockStatus(product) {
    const config = getProductPriority(product);
    const stock = product.stock;
    const threshold = config.threshold;
    
    if (stock <= threshold) {
        switch (config.priority) {
            case 'high':
                return { status: 'urgent', message: 'URGENT: Needs immediate restock!' };
            case 'medium':
                return { status: 'normal', message: 'Normal: Restock soon' };
            case 'low':
                return { status: 'info', message: 'Info: Low stock noted' };
        }
    } else if (stock <= threshold * 2) {
        return { status: 'good', message: 'Good: Stock adequate' };
    } else {
        return { status: 'optimal', message: 'Optimal: Well stocked' };
    }
}

function generateAlerts() {
    alertsData = [];
    
    inventoryData.forEach(product => {
        const stockInfo = calculateStockStatus(product);
        const config = getProductPriority(product);
        
        if (['urgent', 'normal', 'info'].includes(stockInfo.status)) {
            alertsData.push({
                product: product,
                status: stockInfo.status,
                message: stockInfo.message,
                priority: config.priority,
                threshold: config.threshold,
                daysUntilEmpty: Math.ceil(product.stock / 2)
            });
        }
    });
    
    alertsData.sort((a, b) => {
        const priorityOrder = { urgent: 3, normal: 2, info: 1 };
        return priorityOrder[b.status] - priorityOrder[a.status];
    });
    
    updateAlertsDisplay();
}

function updateAlertsDisplay() {
    const urgentCount = alertsData.filter(a => a.status === 'urgent').length;
    const normalCount = alertsData.filter(a => a.status === 'normal').length;
    const infoCount = alertsData.filter(a => a.status === 'info').length;
    
    document.getElementById('urgentNumber').textContent = urgentCount;
    document.getElementById('normalNumber').textContent = normalCount;
    document.getElementById('infoNumber').textContent = infoCount;
    
    const alertsGrid = document.getElementById('alertsGrid');
    alertsGrid.innerHTML = '';
    
    if (alertsData.length === 0) {
        alertsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.8);">
                <h3>🎉 No Alerts!</h3>
                <p>All products are well stocked according to their priority settings.</p>
            </div>
        `;
        return;
    }
    
    alertsData.slice(0, 6).forEach(alert => {
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
                <button class="alert-btn" onclick="updatePriority('${alert.product.id}')">Adjust Priority</button>
            </div>
        `;
        alertsGrid.appendChild(card);
    });
    
    if (alertsData.length > 6) {
        const moreCard = document.createElement('div');
        moreCard.className = 'alert-card info';
        moreCard.innerHTML = `
            <h4>+ ${alertsData.length - 6} More Alerts</h4>
            <p>View full inventory table below for complete list</p>
            <div class="alert-actions">
                <button class="alert-btn" onclick="showAllAlerts()">View All</button>
            </div>
        `;
        alertsGrid.appendChild(moreCard);
    }
}

// =============================================
// INVENTORY MANAGEMENT
// =============================================

function showNotification(message, type = 'success') {
    // Use new toast system if available
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }

    // Fallback to toast container
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
        }, 4000);
        return;
    }

    // Last resort fallback
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

function renderTable() {
    const tbody = document.getElementById('inventoryBody');
    const cardsContainer = document.getElementById('inventoryCards');
    if (tbody) tbody.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';

    const sortedData = [...filteredData].sort((a, b) => {
        const aStatus = calculateStockStatus(a).status;
        const bStatus = calculateStockStatus(b).status;

        const statusOrder = { urgent: 4, normal: 3, info: 2, good: 1, optimal: 0 };
        const statusDiff = statusOrder[aStatus] - statusOrder[bStatus];

        return statusDiff !== 0 ? statusDiff : a.name.localeCompare(b.name);
    });

    if (sortedData.length === 0) {
        const emptyHtml = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="empty-state-icon">&#128269;</div>
                    <p>No products match your filters</p>
                </td>
            </tr>
        `;
        if (tbody) tbody.innerHTML = emptyHtml;
        if (cardsContainer) cardsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128269;</div><p>No products match your filters</p></div>';
        return;
    }

    sortedData.forEach((item) => {
        const stockInfo = calculateStockStatus(item);
        const config = getProductPriority(item);

        // Table row
        let stockControls = `
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
                    <button class="btn btn-icon btn-primary" onclick="saveProductSettings('${item.id}')" title="Save">&#128190;</button>
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

        const posMapping = item.posItemId ?
            `<span style="color: var(--success);">&#10004; Mapped</span>` :
            `<span style="color: var(--text-muted);">Not mapped</span>`;

        const rowClass = stockInfo.status === 'urgent' ? 'urgent' : stockInfo.status === 'normal' ? 'warning' : '';

        const row = `
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
                        <div>
                            <strong>${stockInfo.status.toUpperCase()}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="stock-value ${stockInfo.status}">${item.stock}</span>
                </td>
                <td>${priorityControls}</td>
                <td>
                    <div class="action-buttons">
                        ${stockControls}
                    </div>
                </td>
            </tr>
        `;
        if (tbody) tbody.innerHTML += row;

        // Mobile card
        const card = `
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
        if (cardsContainer) cardsContainer.innerHTML += card;
    });
}

window.quickUpdate = function(itemId, itemName, currentStock, action) {
    if (!canModifyStock()) {
        showNotification('Permission denied', 'error');
        return;
    }
    
    const quantity = parseInt(prompt(`${action === 'add' ? 'Add' : 'Remove'} quantity for ${itemName}:`, '1')) || 1;
    let newStock;
    
    if (action === 'add') {
        newStock = currentStock + quantity;
    } else {
        newStock = currentStock - quantity;
        if (newStock < 0) {
            showNotification('Cannot have negative stock!', 'error');
            return;
        }
    }

    performStockUpdate(itemId, itemName, newStock, currentStock, quantity, action);
}

async function performStockUpdate(itemId, itemName, newStock, oldStock, quantity, action) {
    try {
        const itemRef = doc(db, 'inventory', itemId);
        await updateDoc(itemRef, {
            stock: newStock,
            lastUpdated: new Date(),
            updatedBy: currentUser.email
        });
        
        const actionText = action === 'add' ? `Added ${quantity}` : `Removed ${quantity}`;
        showNotification(`${actionText} ${itemName}. Stock: ${oldStock} → ${newStock}`, 'success');
        
    } catch (error) {
        console.error('Error updating stock:', error);
        showNotification('Error updating stock', 'error');
    }
}

window.updateProductPriority = async function(itemId, priority, threshold) {
    if (!canManagePriorities()) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    try {
        const itemRef = doc(db, 'inventory', itemId);
        await updateDoc(itemRef, {
            priority: priority,
            alertThreshold: parseInt(threshold),
            lastUpdated: new Date(),
            updatedBy: currentUser.email
        });
        
        showNotification('Priority settings updated', 'success');
        setTimeout(() => {
            generateAlerts();
            renderTable();
        }, 500);
        
    } catch (error) {
        console.error('Error updating priority:', error);
        showNotification('Error updating priority', 'error');
    }
}

window.saveProductSettings = function(itemId) {
    const prioritySelect = document.querySelector(`select[onchange*='${itemId}']`);
    const thresholdInput = document.getElementById(`threshold_${itemId}`);
    
    if (prioritySelect && thresholdInput) {
        updateProductPriority(itemId, prioritySelect.value, thresholdInput.value);
    }
}

// =============================================
// FILTERING AND SEARCH
// =============================================

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const alertFilter = document.getElementById('alertFilter').value;

    filteredData = inventoryData.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        
        let matchesAlert = true;
        if (alertFilter) {
            const stockInfo = calculateStockStatus(item);
            matchesAlert = stockInfo.status === alertFilter;
        }

        return matchesSearch && matchesCategory && matchesAlert;
    });

    renderTable();
}

window.clearFilters = function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('alertFilter').value = '';
    applyFilters();
}

// =============================================
// ADMIN FUNCTIONS
// =============================================

window.resetPriorityDefaults = function() {
    if (!canManagePriorities()) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    if (confirm('Reset all products to default priority settings? This will overwrite custom settings.')) {
        inventoryData.forEach(async (item) => {
            const defaultConfig = DEFAULT_PRIORITIES[item.category];
            if (defaultConfig) {
                try {
                    const itemRef = doc(db, 'inventory', item.id);
                    await updateDoc(itemRef, {
                        priority: defaultConfig.priority,
                        alertThreshold: defaultConfig.threshold,
                        lastUpdated: new Date(),
                        updatedBy: currentUser.email
                    });
                } catch (error) {
                    console.error('Error resetting priority:', error);
                }
            }
        });
        
        showNotification('Priorities reset to defaults', 'success');
        setTimeout(() => {
            loadInventoryData();
        }, 1000);
    }
}

window.bulkPriorityUpdate = function() {
    if (!canManagePriorities()) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    document.getElementById('bulkUpdateModal').classList.add('show');
}

window.confirmBulkUpdate = async function() {
    const category = document.getElementById('bulkCategory').value;
    const priority = document.getElementById('bulkPriority').value;
    const threshold = parseInt(document.getElementById('bulkThreshold').value);
    
    const itemsToUpdate = category ? 
        inventoryData.filter(item => item.category === category) : 
        inventoryData;
    
    if (confirm(`Update ${itemsToUpdate.length} products with priority: ${priority}, threshold: ${threshold}?`)) {
        for (const item of itemsToUpdate) {
            try {
                const itemRef = doc(db, 'inventory', item.id);
                await updateDoc(itemRef, {
                    priority: priority,
                    alertThreshold: threshold,
                    lastUpdated: new Date(),
                    updatedBy: currentUser.email
                });
            } catch (error) {
                console.error('Error in bulk update:', error);
            }
        }
        
        showNotification(`Bulk updated ${itemsToUpdate.length} products`, 'success');
        closeModal('bulkUpdateModal');
        setTimeout(() => {
            loadInventoryData();
        }, 1000);
    }
}

window.applyPriorityFilters = function() {
    applyFilters();
}

// =============================================
// ALERT ACTIONS
// =============================================

window.generateShoppingList = function() {
    const urgentItems = alertsData.filter(a => a.status === 'urgent');
    const normalItems = alertsData.filter(a => a.status === 'normal');
    
    let list = "🛒 SHOPPING LIST - " + new Date().toLocaleDateString() + "\n\n";
    
    if (urgentItems.length > 0) {
        list += "🔴 URGENT (Buy Today):\n";
        urgentItems.forEach(alert => {
            const suggested = Math.max(alert.threshold * 3, 5);
            list += `• ${alert.product.name} - Current: ${alert.product.stock}, Suggested: ${suggested}\n`;
        });
        list += "\n";
    }
    
    if (normalItems.length > 0) {
        list += "🟡 NORMAL (Buy This Week):\n";
        normalItems.forEach(alert => {
            const suggested = Math.max(alert.threshold * 2, 3);
            list += `• ${alert.product.name} - Current: ${alert.product.stock}, Suggested: ${suggested}\n`;
        });
    }
    
    const blob = new Blob([list], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping_list_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Shopping list generated!', 'success');
}

window.exportAlerts = function() {
    const headers = ['Product', 'Category', 'Current Stock', 'Threshold', 'Priority', 'Status', 'Message', 'Days Until Empty'];
    const csvContent = [
        headers.join(','),
        ...alertsData.map(alert => [
            `"${alert.product.name}"`,
            alert.product.category,
            alert.product.stock,
            alert.threshold,
            alert.priority,
            alert.status.toUpperCase(),
            `"${alert.message}"`,
            alert.daysUntilEmpty
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_alerts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Alerts exported successfully', 'success');
}

window.quickRestock = function(productId) {
    const product = inventoryData.find(p => p.id === productId);
    if (product) {
        const config = getProductPriority(product);
        const suggested = Math.max(config.threshold * 3, 10);
        const quantity = parseInt(prompt(`Quick restock for ${product.name}.\nSuggested quantity: ${suggested}`, suggested)) || 0;
        
        if (quantity > 0) {
            performStockUpdate(productId, product.name, product.stock + quantity, product.stock, quantity, 'add');
        }
    }
}

window.updatePriority = function(productId) {
    if (!canManagePriorities()) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    const product = inventoryData.find(p => p.id === productId);
    if (product) {
        const newPriority = prompt(`Set priority for ${product.name}:`, getProductPriority(product).priority);
        const newThreshold = parseInt(prompt(`Set alert threshold:`, getProductPriority(product).threshold));
        
        if (newPriority && newThreshold >= 0) {
            updateProductPriority(productId, newPriority, newThreshold);
        }
    }
}

window.showAllAlerts = function() {
    document.getElementById('alertFilter').value = 'urgent';
    applyFilters();
    document.querySelector('table').scrollIntoView({ behavior: 'smooth' });
}

// =============================================
// DATA LOADING AND SETUP
// =============================================

async function loadInventoryData() {
    if (!currentUser) {
        console.log('Not authenticated, skipping data load');
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        inventoryData = [];
        querySnapshot.forEach((doc) => {
            inventoryData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        const loadingEl = document.getElementById('loadingState');
        const tableContainer = document.getElementById('inventoryTableContainer');

        if (inventoryData.length === 0) {
            showNotification('No inventory data found', 'warning');
            if (loadingEl) loadingEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128230;</div><h3 class="empty-state-title">No Products Found</h3><p class="empty-state-message">Your inventory is empty. Add products to get started.</p></div>';
        } else {
            showNotification(`Loaded ${inventoryData.length} items`, 'success');
            if (loadingEl) loadingEl.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';
        }

        // Update stats
        updateStats();
        generateAlerts();
        applyFilters();

    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data', 'error');
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) loadingEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#10060;</div><h3 class="empty-state-title">Error Loading Data</h3><p class="empty-state-message">Please check your connection and refresh the page.</p></div>';
    }
}

function updateStats() {
    // Calculate stats
    let urgentCount = 0;
    let lowStockCount = 0;
    let goodStockCount = 0;

    inventoryData.forEach(item => {
        const stockInfo = calculateStockStatus(item);
        if (stockInfo.status === 'urgent') urgentCount++;
        else if (stockInfo.status === 'normal' || stockInfo.status === 'info') lowStockCount++;
        else goodStockCount++;
    });

    // Update stat cards
    const totalEl = document.getElementById('totalProducts');
    const urgentEl = document.getElementById('urgentAlertsCount');
    const lowEl = document.getElementById('lowStockCount');
    const goodEl = document.getElementById('goodStockCount');

    if (totalEl) totalEl.textContent = inventoryData.length;
    if (urgentEl) urgentEl.textContent = urgentCount;
    if (lowEl) lowEl.textContent = lowStockCount;
    if (goodEl) goodEl.textContent = goodStockCount;

    // Update sidebar badges
    const alertBadge = document.getElementById('alertBadge');
    const urgentBadge = document.getElementById('urgentBadge');

    if (alertBadge) alertBadge.textContent = urgentCount + lowStockCount;
    if (urgentBadge) urgentBadge.textContent = urgentCount;
}

function setupRealtimeListener() {
    if (!currentUser) return;
    
    onSnapshot(collection(db, 'inventory'), (snapshot) => {
        inventoryData = [];
        snapshot.forEach((doc) => {
            inventoryData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        generateAlerts();
        applyFilters();
    }, (error) => {
        console.error('Real-time listener error:', error);
        showNotification('Connection error', 'error');
    });
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('alertFilter').addEventListener('change', applyFilters);

// Enter key for login
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    [emailInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    attemptLogin();
                }
            });
        }
    });
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
}

// =============================================
// AI ASSISTANT FUNCTIONS
// =============================================

let isAIProcessing = false;

/**
 * Send a message to the AI assistant
 */
window.sendAIMessage = async function() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message || isAIProcessing) return;

    input.value = '';
    await processAIMessage(message);
}

/**
 * Quick ask AI with predefined question
 */
window.askAI = async function(question) {
    if (isAIProcessing) return;
    await processAIMessage(question);
}

/**
 * Process AI message and display response
 */
async function processAIMessage(message) {
    const chatMessages = document.getElementById('aiChatMessages');
    const sendBtn = document.querySelector('.ai-send-btn');
    const loading = document.getElementById('aiLoading');

    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'ai-message user';
    userMessageDiv.innerHTML = `<div class="ai-message-content">${escapeHtml(message)}</div>`;
    chatMessages.appendChild(userMessageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show loading state
    isAIProcessing = true;
    sendBtn.disabled = true;
    loading.style.display = 'inline';

    try {
        // Send to Groq AI with current inventory data
        const response = await sendToGroq(message, inventoryData);

        // Add AI response to chat
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'ai-message assistant';
        aiMessageDiv.innerHTML = `<div class="ai-message-content">${formatAIResponse(response)}</div>`;
        chatMessages.appendChild(aiMessageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
        console.error('AI Error:', error);

        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-message assistant';
        errorDiv.innerHTML = `
            <div class="ai-message-content" style="border-color: #ff5757;">
                ⚠️ Sorry, I encountered an error: ${escapeHtml(error.message)}
                <br><br>Please try again or check your connection.
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } finally {
        // Reset loading state
        isAIProcessing = false;
        sendBtn.disabled = false;
        loading.style.display = 'none';
    }
}

/**
 * Format AI response with basic markdown-like formatting
 */
function formatAIResponse(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);

    // Convert markdown-like formatting
    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Bullet points
    formatted = formatted.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already structured
    if (!formatted.startsWith('<')) {
        formatted = '<p>' + formatted + '</p>';
    }

    return formatted;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get AI-powered shopping list
 */
window.generateAIShoppingListAction = async function() {
    if (!currentUser) {
        showNotification('Please sign in to use AI features', 'error');
        return;
    }

    showNotification('Generating AI shopping list...', 'info');

    try {
        const shoppingList = await generateAIShoppingList(inventoryData);

        // Download as text file
        const blob = new Blob([shoppingList], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_shopping_list_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('AI shopping list generated and downloaded!', 'success');

    } catch (error) {
        console.error('AI Shopping List Error:', error);
        showNotification('Error generating AI shopping list', 'error');
    }
}

/**
 * Get AI inventory insights
 */
window.getAIInsightsAction = async function() {
    if (!currentUser) {
        showNotification('Please sign in to use AI features', 'error');
        return;
    }

    await askAI('Provide a comprehensive analysis of my current inventory status, including health assessment, risks, and optimization recommendations.');
}

console.log('📦 Smart Inventory Management System loaded successfully!');
console.log('🤖 AI Assistant powered by Groq is ready!');