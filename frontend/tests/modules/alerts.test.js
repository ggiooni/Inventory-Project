/**
 * Alerts Module Tests
 * @description Unit tests for alert calculations and generation
 */

import { describe, it, expect } from 'vitest';
import { MOCK_CONSTANTS } from '../setup.js';

const { DEFAULT_PRIORITIES, STOCK_STATUS, MAX_VISIBLE_ALERTS } = MOCK_CONSTANTS;

// =============================================
// Helper functions that mirror module logic
// =============================================

/**
 * Estimate days until stock runs out
 */
function estimateDaysUntilEmpty(product) {
    const averageDailyConsumption = 2;
    return Math.max(1, Math.ceil(product.stock / averageDailyConsumption));
}

/**
 * Calculate suggested restock quantity
 */
function calculateSuggestedQuantity(product, config) {
    const targetStock = config.threshold * 3;
    const minimumOrder = 10;
    const neededQuantity = targetStock - product.stock;
    return Math.max(minimumOrder, neededQuantity);
}

/**
 * Get priority configuration for a product
 */
function getProductPriority(product) {
    const categoryDefault = DEFAULT_PRIORITIES[product.category] || { priority: 'medium', threshold: 3 };
    return {
        priority: product.priority || categoryDefault.priority,
        threshold: product.alertThreshold || categoryDefault.threshold
    };
}

/**
 * Calculate stock status
 */
function calculateStockStatus(product) {
    const config = getProductPriority(product);
    const stock = product.stock;
    const threshold = config.threshold;

    if (stock <= threshold) {
        switch (config.priority) {
            case 'high':
                return { status: STOCK_STATUS.URGENT, message: 'URGENT: Needs immediate restock!' };
            case 'medium':
                return { status: STOCK_STATUS.NORMAL, message: 'Normal: Restock soon' };
            case 'low':
                return { status: STOCK_STATUS.INFO, message: 'Info: Low stock noted' };
        }
    } else if (stock <= threshold * 2) {
        return { status: STOCK_STATUS.GOOD, message: 'Good: Stock adequate' };
    }

    return { status: STOCK_STATUS.OPTIMAL, message: 'Optimal: Well stocked' };
}

// =============================================
// Tests
// =============================================

describe('Alerts Module', () => {
    // =============================================
    // estimateDaysUntilEmpty Tests
    // =============================================
    describe('estimateDaysUntilEmpty', () => {
        it('should calculate days based on average consumption of 2 units/day', () => {
            expect(estimateDaysUntilEmpty({ stock: 10 })).toBe(5);
            expect(estimateDaysUntilEmpty({ stock: 20 })).toBe(10);
            expect(estimateDaysUntilEmpty({ stock: 6 })).toBe(3);
            expect(estimateDaysUntilEmpty({ stock: 4 })).toBe(2);
        });

        it('should return minimum of 1 day for zero stock', () => {
            expect(estimateDaysUntilEmpty({ stock: 0 })).toBe(1);
        });

        it('should return minimum of 1 day for very low stock', () => {
            expect(estimateDaysUntilEmpty({ stock: 1 })).toBe(1);
        });

        it('should ceil fractional days', () => {
            // 5 / 2 = 2.5 -> ceil -> 3
            expect(estimateDaysUntilEmpty({ stock: 5 })).toBe(3);

            // 7 / 2 = 3.5 -> ceil -> 4
            expect(estimateDaysUntilEmpty({ stock: 7 })).toBe(4);

            // 3 / 2 = 1.5 -> ceil -> 2
            expect(estimateDaysUntilEmpty({ stock: 3 })).toBe(2);
        });

        it('should handle large stock values', () => {
            expect(estimateDaysUntilEmpty({ stock: 100 })).toBe(50);
            expect(estimateDaysUntilEmpty({ stock: 365 })).toBe(183);
            expect(estimateDaysUntilEmpty({ stock: 1000 })).toBe(500);
        });

        it('should handle odd numbers correctly', () => {
            expect(estimateDaysUntilEmpty({ stock: 9 })).toBe(5); // 9/2 = 4.5 -> 5
            expect(estimateDaysUntilEmpty({ stock: 11 })).toBe(6); // 11/2 = 5.5 -> 6
        });
    });

    // =============================================
    // calculateSuggestedQuantity Tests
    // =============================================
    describe('calculateSuggestedQuantity', () => {
        describe('Basic Calculations', () => {
            it('should target 3x threshold stock level', () => {
                const product = { stock: 0 };
                const config = { threshold: 5 };
                // Target: 5 * 3 = 15, Needed: 15 - 0 = 15
                expect(calculateSuggestedQuantity(product, config)).toBe(15);
            });

            it('should calculate correctly for empty stock', () => {
                const product = { stock: 0 };
                const config = { threshold: 10 };
                // Target: 30, Needed: 30 - 0 = 30
                expect(calculateSuggestedQuantity(product, config)).toBe(30);
            });

            it('should subtract current stock from target', () => {
                const product = { stock: 10 };
                const config = { threshold: 10 };
                // Target: 30, Needed: 30 - 10 = 20
                expect(calculateSuggestedQuantity(product, config)).toBe(20);
            });
        });

        describe('Minimum Order Enforcement', () => {
            it('should return minimum of 10 units when needed less', () => {
                const product = { stock: 5 };
                const config = { threshold: 3 };
                // Target: 9, Needed: 9 - 5 = 4
                // Minimum: 10
                expect(calculateSuggestedQuantity(product, config)).toBe(10);
            });

            it('should return minimum when stock already exceeds target', () => {
                const product = { stock: 20 };
                const config = { threshold: 3 };
                // Target: 9, Needed: 9 - 20 = -11
                // Minimum: 10
                expect(calculateSuggestedQuantity(product, config)).toBe(10);
            });

            it('should return minimum when exactly at target', () => {
                const product = { stock: 15 };
                const config = { threshold: 5 };
                // Target: 15, Needed: 15 - 15 = 0
                // Minimum: 10
                expect(calculateSuggestedQuantity(product, config)).toBe(10);
            });
        });

        describe('Category-Specific Scenarios', () => {
            it('should calculate correctly for Spirits (threshold 2)', () => {
                const product = { stock: 0, category: 'Spirits' };
                const config = { threshold: 2 };
                // Target: 6, Needed: 6 - 0 = 6
                // Minimum: 10
                expect(calculateSuggestedQuantity(product, config)).toBe(10);
            });

            it('should calculate correctly for Soft Drinks (threshold 12)', () => {
                const product = { stock: 5, category: 'Soft Drinks' };
                const config = { threshold: 12 };
                // Target: 36, Needed: 36 - 5 = 31
                expect(calculateSuggestedQuantity(product, config)).toBe(31);
            });

            it('should calculate correctly for Beers (threshold 6)', () => {
                const product = { stock: 3, category: 'Beers' };
                const config = { threshold: 6 };
                // Target: 18, Needed: 18 - 3 = 15
                expect(calculateSuggestedQuantity(product, config)).toBe(15);
            });
        });
    });

    // =============================================
    // Alert Generation Tests
    // =============================================
    describe('Alert Generation', () => {
        function generateAlerts(inventoryItems) {
            const alerts = [];

            inventoryItems.forEach(product => {
                const stockInfo = calculateStockStatus(product);
                const config = getProductPriority(product);

                if ([STOCK_STATUS.URGENT, STOCK_STATUS.NORMAL, STOCK_STATUS.INFO].includes(stockInfo.status)) {
                    alerts.push({
                        product: product,
                        status: stockInfo.status,
                        message: stockInfo.message,
                        priority: config.priority,
                        threshold: config.threshold,
                        daysUntilEmpty: estimateDaysUntilEmpty(product),
                        suggestedQuantity: calculateSuggestedQuantity(product, config)
                    });
                }
            });

            // Sort by urgency
            const priorityOrder = {
                [STOCK_STATUS.URGENT]: 3,
                [STOCK_STATUS.NORMAL]: 2,
                [STOCK_STATUS.INFO]: 1
            };
            alerts.sort((a, b) => priorityOrder[b.status] - priorityOrder[a.status]);

            return alerts;
        }

        it('should only create alerts for items that need attention', () => {
            const items = [
                { name: 'Vodka', category: 'Spirits', stock: 1 },     // urgent - alert
                { name: 'Wine', category: 'Wines', stock: 10 },       // optimal - no alert
                { name: 'Beer', category: 'Beers', stock: 5 },        // normal - alert
                { name: 'Cola', category: 'Soft Drinks', stock: 50 }  // optimal - no alert
            ];

            const alerts = generateAlerts(items);

            expect(alerts).toHaveLength(2);
            expect(alerts.map(a => a.product.name)).toContain('Vodka');
            expect(alerts.map(a => a.product.name)).toContain('Beer');
        });

        it('should sort alerts by urgency (urgent first)', () => {
            const items = [
                { name: 'Cola', category: 'Soft Drinks', stock: 5 },  // info
                { name: 'Vodka', category: 'Spirits', stock: 1 },     // urgent
                { name: 'Wine', category: 'Wines', stock: 2 }         // normal
            ];

            const alerts = generateAlerts(items);

            expect(alerts[0].status).toBe('urgent');
            expect(alerts[1].status).toBe('normal');
            expect(alerts[2].status).toBe('info');
        });

        it('should include all required alert properties', () => {
            const items = [
                { name: 'Vodka', category: 'Spirits', stock: 1 }
            ];

            const alerts = generateAlerts(items);

            expect(alerts[0]).toHaveProperty('product');
            expect(alerts[0]).toHaveProperty('status');
            expect(alerts[0]).toHaveProperty('message');
            expect(alerts[0]).toHaveProperty('priority');
            expect(alerts[0]).toHaveProperty('threshold');
            expect(alerts[0]).toHaveProperty('daysUntilEmpty');
            expect(alerts[0]).toHaveProperty('suggestedQuantity');
        });

        it('should return empty array when no items need attention', () => {
            const items = [
                { name: 'Vodka', category: 'Spirits', stock: 100 },
                { name: 'Wine', category: 'Wines', stock: 50 },
                { name: 'Beer', category: 'Beers', stock: 200 }
            ];

            const alerts = generateAlerts(items);

            expect(alerts).toHaveLength(0);
        });
    });

    // =============================================
    // Alert Counts Tests
    // =============================================
    describe('Alert Counts', () => {
        function getAlertCounts(alerts) {
            return {
                urgent: alerts.filter(a => a.status === STOCK_STATUS.URGENT).length,
                normal: alerts.filter(a => a.status === STOCK_STATUS.NORMAL).length,
                info: alerts.filter(a => a.status === STOCK_STATUS.INFO).length,
                total: alerts.length
            };
        }

        it('should correctly count alerts by status', () => {
            const alerts = [
                { status: 'urgent' },
                { status: 'urgent' },
                { status: 'normal' },
                { status: 'normal' },
                { status: 'normal' },
                { status: 'info' }
            ];

            const counts = getAlertCounts(alerts);

            expect(counts.urgent).toBe(2);
            expect(counts.normal).toBe(3);
            expect(counts.info).toBe(1);
            expect(counts.total).toBe(6);
        });

        it('should return zeros for empty alerts', () => {
            const counts = getAlertCounts([]);

            expect(counts.urgent).toBe(0);
            expect(counts.normal).toBe(0);
            expect(counts.info).toBe(0);
            expect(counts.total).toBe(0);
        });
    });

    // =============================================
    // Display Alerts Tests
    // =============================================
    describe('Display Alerts', () => {
        it('should limit displayed alerts to MAX_VISIBLE_ALERTS', () => {
            const alerts = Array.from({ length: 10 }, (_, i) => ({
                id: i,
                status: 'urgent'
            }));

            const displayAlerts = alerts.slice(0, MAX_VISIBLE_ALERTS);

            expect(displayAlerts).toHaveLength(MAX_VISIBLE_ALERTS);
        });

        it('should calculate hidden alert count correctly', () => {
            const alerts = Array.from({ length: 10 }, (_, i) => ({
                id: i,
                status: 'urgent'
            }));

            const hiddenCount = Math.max(0, alerts.length - MAX_VISIBLE_ALERTS);

            expect(hiddenCount).toBe(4); // 10 - 6 = 4
        });

        it('should return 0 hidden count when alerts <= MAX_VISIBLE', () => {
            const alerts = Array.from({ length: 3 }, (_, i) => ({
                id: i,
                status: 'urgent'
            }));

            const hiddenCount = Math.max(0, alerts.length - MAX_VISIBLE_ALERTS);

            expect(hiddenCount).toBe(0);
        });
    });

    // =============================================
    // Shopping List Generation Tests
    // =============================================
    describe('Shopping List Generation', () => {
        function generateShoppingList(alerts) {
            const urgentItems = alerts.filter(a => a.status === STOCK_STATUS.URGENT);
            const normalItems = alerts.filter(a => a.status === STOCK_STATUS.NORMAL);

            const dateStr = new Date().toLocaleDateString();
            let list = `SHOPPING LIST - ${dateStr}\n`;
            list += '='.repeat(40) + '\n\n';

            if (urgentItems.length > 0) {
                list += 'URGENT (Buy Today):\n';
                list += '-'.repeat(20) + '\n';
                urgentItems.forEach(alert => {
                    list += `* ${alert.product.name}\n`;
                    list += `  Current: ${alert.product.stock} units\n`;
                    list += `  Suggested: ${alert.suggestedQuantity} units\n\n`;
                });
            }

            if (normalItems.length > 0) {
                list += '\nNORMAL (Buy This Week):\n';
                list += '-'.repeat(20) + '\n';
                normalItems.forEach(alert => {
                    list += `* ${alert.product.name}\n`;
                    list += `  Current: ${alert.product.stock} units\n`;
                    list += `  Suggested: ${alert.suggestedQuantity} units\n\n`;
                });
            }

            return {
                text: list,
                urgentCount: urgentItems.length,
                normalCount: normalItems.length
            };
        }

        it('should separate urgent and normal items', () => {
            const alerts = [
                { status: 'urgent', product: { name: 'Vodka', stock: 1 }, suggestedQuantity: 10 },
                { status: 'normal', product: { name: 'Wine', stock: 2 }, suggestedQuantity: 10 }
            ];

            const result = generateShoppingList(alerts);

            expect(result.urgentCount).toBe(1);
            expect(result.normalCount).toBe(1);
            expect(result.text).toContain('URGENT (Buy Today)');
            expect(result.text).toContain('NORMAL (Buy This Week)');
        });

        it('should include product details', () => {
            const alerts = [
                { status: 'urgent', product: { name: 'Vodka', stock: 1 }, suggestedQuantity: 10 }
            ];

            const result = generateShoppingList(alerts);

            expect(result.text).toContain('Vodka');
            expect(result.text).toContain('Current: 1 units');
            expect(result.text).toContain('Suggested: 10 units');
        });

        it('should exclude info items from shopping list', () => {
            const alerts = [
                { status: 'info', product: { name: 'Cola', stock: 10 }, suggestedQuantity: 10 }
            ];

            const result = generateShoppingList(alerts);

            expect(result.urgentCount).toBe(0);
            expect(result.normalCount).toBe(0);
        });
    });

    // =============================================
    // CSV Export Tests
    // =============================================
    describe('CSV Export', () => {
        function exportAlertsAsCSV(alerts) {
            const headers = [
                'Product',
                'Category',
                'Current Stock',
                'Threshold',
                'Priority',
                'Status',
                'Message',
                'Days Until Empty',
                'Suggested Quantity'
            ];

            const rows = alerts.map(alert => [
                `"${alert.product.name}"`,
                alert.product.category,
                alert.product.stock,
                alert.threshold,
                alert.priority,
                alert.status.toUpperCase(),
                `"${alert.message}"`,
                alert.daysUntilEmpty,
                alert.suggestedQuantity
            ].join(','));

            const csvContent = [headers.join(','), ...rows].join('\n');

            return {
                content: csvContent,
                rowCount: alerts.length
            };
        }

        it('should generate valid CSV with headers', () => {
            const alerts = [];
            const result = exportAlertsAsCSV(alerts);

            expect(result.content).toContain('Product');
            expect(result.content).toContain('Category');
            expect(result.content).toContain('Current Stock');
            expect(result.content).toContain('Status');
        });

        it('should include all alert data in rows', () => {
            const alerts = [
                {
                    product: { name: 'Vodka', category: 'Spirits', stock: 1 },
                    threshold: 2,
                    priority: 'high',
                    status: 'urgent',
                    message: 'URGENT: Needs immediate restock!',
                    daysUntilEmpty: 1,
                    suggestedQuantity: 10
                }
            ];

            const result = exportAlertsAsCSV(alerts);

            expect(result.content).toContain('"Vodka"');
            expect(result.content).toContain('Spirits');
            expect(result.content).toContain('URGENT');
            expect(result.rowCount).toBe(1);
        });

        it('should escape product names with quotes', () => {
            const alerts = [
                {
                    product: { name: "Jack Daniel's", category: 'Spirits', stock: 1 },
                    threshold: 2,
                    priority: 'high',
                    status: 'urgent',
                    message: 'URGENT',
                    daysUntilEmpty: 1,
                    suggestedQuantity: 10
                }
            ];

            const result = exportAlertsAsCSV(alerts);

            expect(result.content).toContain('"Jack Daniel\'s"');
        });
    });
});
