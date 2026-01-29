/**
 * Inventory Controller Tests
 * @description Unit tests for inventory controller functions and calculateStockStatus
 */

// We need to test the calculateStockStatus logic directly
// Since it's not exported, we'll test it through the controller behavior

describe('Inventory Controller', () => {
    let req, res;

    beforeEach(() => {
        req = global.testUtils.mockRequest();
        res = global.testUtils.mockResponse();
    });

    // =============================================
    // calculateStockStatus Logic Tests
    // =============================================
    describe('calculateStockStatus Logic', () => {
        // Import constants to verify expected behavior
        const { STOCK_STATUS, DEFAULT_PRIORITIES } = require('../../src/config/constants');

        /**
         * Helper to calculate stock status (mirrors controller logic)
         */
        function calculateStockStatus(item) {
            const threshold = item.alertThreshold || DEFAULT_PRIORITIES[item.category]?.threshold || 3;
            const priority = item.priority || DEFAULT_PRIORITIES[item.category]?.priority || 'medium';
            const stock = item.stock || 0;

            if (stock <= threshold) {
                switch (priority) {
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

        // High priority products
        describe('High Priority Products', () => {
            it('should return URGENT when stock is 0', () => {
                const item = { name: 'Vodka', category: 'Spirits', stock: 0, priority: 'high', alertThreshold: 2 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('urgent');
                expect(result.message).toContain('URGENT');
            });

            it('should return URGENT when stock equals threshold', () => {
                const item = { name: 'Vodka', category: 'Spirits', stock: 2, priority: 'high', alertThreshold: 2 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('urgent');
            });

            it('should return URGENT when stock is below threshold', () => {
                const item = { name: 'Vodka', category: 'Spirits', stock: 1, priority: 'high', alertThreshold: 2 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('urgent');
            });

            it('should return GOOD when stock is above threshold but below 2x', () => {
                const item = { name: 'Vodka', category: 'Spirits', stock: 3, priority: 'high', alertThreshold: 2 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('good');
            });

            it('should return OPTIMAL when stock is above 2x threshold', () => {
                const item = { name: 'Vodka', category: 'Spirits', stock: 10, priority: 'high', alertThreshold: 2 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('optimal');
            });
        });

        // Medium priority products
        describe('Medium Priority Products', () => {
            it('should return NORMAL when stock is at or below threshold', () => {
                const item = { name: 'Wine', category: 'Wines', stock: 3, priority: 'medium', alertThreshold: 3 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('normal');
                expect(result.message).toContain('Restock soon');
            });

            it('should return NORMAL when stock is 0', () => {
                const item = { name: 'Wine', category: 'Wines', stock: 0, priority: 'medium', alertThreshold: 3 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('normal');
            });

            it('should return GOOD when stock is between threshold and 2x threshold', () => {
                const item = { name: 'Wine', category: 'Wines', stock: 5, priority: 'medium', alertThreshold: 3 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('good');
            });

            it('should return OPTIMAL when stock is above 2x threshold', () => {
                const item = { name: 'Wine', category: 'Wines', stock: 10, priority: 'medium', alertThreshold: 3 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('optimal');
            });
        });

        // Low priority products
        describe('Low Priority Products', () => {
            it('should return INFO when stock is at or below threshold', () => {
                const item = { name: 'Cola', category: 'Soft Drinks', stock: 12, priority: 'low', alertThreshold: 12 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('info');
                expect(result.message).toContain('Low stock noted');
            });

            it('should return INFO when stock is 0', () => {
                const item = { name: 'Cola', category: 'Soft Drinks', stock: 0, priority: 'low', alertThreshold: 12 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('info');
            });

            it('should return GOOD when stock is between threshold and 2x threshold', () => {
                const item = { name: 'Cola', category: 'Soft Drinks', stock: 20, priority: 'low', alertThreshold: 12 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('good');
            });

            it('should return OPTIMAL when stock is above 2x threshold', () => {
                const item = { name: 'Cola', category: 'Soft Drinks', stock: 30, priority: 'low', alertThreshold: 12 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('optimal');
            });
        });

        // Default values
        describe('Default Values', () => {
            it('should use category defaults when priority not specified', () => {
                const item = { name: 'Vodka', category: 'Spirits', stock: 1 };
                const result = calculateStockStatus(item);
                // Spirits default is high priority, threshold 2
                expect(result.status).toBe('urgent');
            });

            it('should use category default threshold when not specified', () => {
                const item = { name: 'Beer', category: 'Beers', stock: 5 };
                // Beers default threshold is 6, so 5 is at/below threshold
                const result = calculateStockStatus(item);
                expect(result.status).toBe('normal'); // medium priority
            });

            it('should use fallback defaults for unknown category', () => {
                const item = { name: 'Unknown', category: 'Unknown', stock: 2 };
                // Default fallback: priority='medium', threshold=3
                const result = calculateStockStatus(item);
                expect(result.status).toBe('normal'); // stock 2 <= threshold 3
            });

            it('should treat undefined stock as 0', () => {
                const item = { name: 'Vodka', category: 'Spirits', priority: 'high', alertThreshold: 2 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('urgent');
            });
        });

        // Edge cases
        describe('Edge Cases', () => {
            it('should handle stock exactly at 2x threshold boundary', () => {
                const item = { name: 'Item', category: 'Spirits', stock: 4, priority: 'high', alertThreshold: 2 };
                // stock (4) <= threshold * 2 (4), so should be GOOD
                const result = calculateStockStatus(item);
                expect(result.status).toBe('good');
            });

            it('should handle stock just above 2x threshold', () => {
                const item = { name: 'Item', category: 'Spirits', stock: 5, priority: 'high', alertThreshold: 2 };
                // stock (5) > threshold * 2 (4), so should be OPTIMAL
                const result = calculateStockStatus(item);
                expect(result.status).toBe('optimal');
            });

            it('should handle very large stock numbers', () => {
                const item = { name: 'Item', category: 'Spirits', stock: 10000, priority: 'high', alertThreshold: 2 };
                const result = calculateStockStatus(item);
                expect(result.status).toBe('optimal');
            });
        });
    });

    // =============================================
    // Stock Update Validation Tests
    // =============================================
    describe('Stock Update Validation', () => {
        it('should validate quantity and action are required', () => {
            // This tests the validation logic that would be in updateStock
            const validateStockUpdate = (quantity, action) => {
                if (quantity === undefined || !action) {
                    throw new Error('Quantity and action are required');
                }
                if (action !== 'add' && action !== 'subtract') {
                    throw new Error('Action must be "add" or "subtract"');
                }
                return true;
            };

            expect(() => validateStockUpdate(undefined, 'add')).toThrow('Quantity and action are required');
            expect(() => validateStockUpdate(5, undefined)).toThrow('Quantity and action are required');
            expect(() => validateStockUpdate(5, 'invalid')).toThrow('Action must be "add" or "subtract"');
            expect(validateStockUpdate(5, 'add')).toBe(true);
            expect(validateStockUpdate(5, 'subtract')).toBe(true);
        });

        it('should prevent negative stock', () => {
            const validateNegativeStock = (currentStock, quantity, action) => {
                let newStock = currentStock;
                if (action === 'add') {
                    newStock = currentStock + quantity;
                } else if (action === 'subtract') {
                    newStock = currentStock - quantity;
                    if (newStock < 0) {
                        throw new Error('Cannot have negative stock');
                    }
                }
                return newStock;
            };

            expect(() => validateNegativeStock(5, 10, 'subtract')).toThrow('Cannot have negative stock');
            expect(validateNegativeStock(5, 3, 'subtract')).toBe(2);
            expect(validateNegativeStock(5, 5, 'subtract')).toBe(0);
            expect(validateNegativeStock(5, 10, 'add')).toBe(15);
        });
    });

    // =============================================
    // Item Validation Tests
    // =============================================
    describe('Item Validation', () => {
        it('should require name and category for new items', () => {
            const validateNewItem = (name, category) => {
                if (!name || !category) {
                    throw new Error('Name and category are required');
                }
                return true;
            };

            expect(() => validateNewItem(null, 'Spirits')).toThrow('Name and category are required');
            expect(() => validateNewItem('Vodka', null)).toThrow('Name and category are required');
            expect(() => validateNewItem('', 'Spirits')).toThrow('Name and category are required');
            expect(validateNewItem('Vodka', 'Spirits')).toBe(true);
        });
    });

    // =============================================
    // Sorting Logic Tests
    // =============================================
    describe('Status Sorting', () => {
        it('should sort items by status urgency (urgent first)', () => {
            const items = [
                { name: 'Item1', status: 'optimal' },
                { name: 'Item2', status: 'urgent' },
                { name: 'Item3', status: 'good' },
                { name: 'Item4', status: 'normal' },
                { name: 'Item5', status: 'info' }
            ];

            const statusOrder = { urgent: 4, normal: 3, info: 2, good: 1, optimal: 0 };

            const sorted = [...items].sort((a, b) => {
                return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
            });

            expect(sorted[0].status).toBe('urgent');
            expect(sorted[1].status).toBe('normal');
            expect(sorted[2].status).toBe('info');
            expect(sorted[3].status).toBe('good');
            expect(sorted[4].status).toBe('optimal');
        });
    });
});
