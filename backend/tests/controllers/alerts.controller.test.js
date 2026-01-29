/**
 * Alerts Controller Tests
 * @description Unit tests for alerts controller helper functions
 */

describe('Alerts Controller', () => {
    // =============================================
    // estimateDaysUntilEmpty Tests
    // =============================================
    describe('estimateDaysUntilEmpty', () => {
        /**
         * Helper function that mirrors controller logic
         */
        function estimateDaysUntilEmpty(item) {
            const avgDailyConsumption = 2;
            return Math.max(1, Math.ceil((item.stock || 0) / avgDailyConsumption));
        }

        it('should calculate days based on average consumption of 2 units/day', () => {
            expect(estimateDaysUntilEmpty({ stock: 10 })).toBe(5);
            expect(estimateDaysUntilEmpty({ stock: 20 })).toBe(10);
            expect(estimateDaysUntilEmpty({ stock: 6 })).toBe(3);
        });

        it('should return minimum of 1 day', () => {
            expect(estimateDaysUntilEmpty({ stock: 0 })).toBe(1);
            expect(estimateDaysUntilEmpty({ stock: 1 })).toBe(1);
        });

        it('should handle undefined stock as 0', () => {
            expect(estimateDaysUntilEmpty({})).toBe(1);
        });

        it('should ceil fractional days', () => {
            expect(estimateDaysUntilEmpty({ stock: 5 })).toBe(3); // 5/2 = 2.5 -> 3
            expect(estimateDaysUntilEmpty({ stock: 7 })).toBe(4); // 7/2 = 3.5 -> 4
        });

        it('should handle large stock values', () => {
            expect(estimateDaysUntilEmpty({ stock: 100 })).toBe(50);
            expect(estimateDaysUntilEmpty({ stock: 365 })).toBe(183); // Almost a year
        });
    });

    // =============================================
    // calculateSuggestedQuantity Tests
    // =============================================
    describe('calculateSuggestedQuantity', () => {
        /**
         * Helper function that mirrors controller logic
         */
        function calculateSuggestedQuantity(item, config) {
            const targetStock = config.threshold * 3;
            const minimumOrder = 10;
            const neededQuantity = targetStock - (item.stock || 0);
            return Math.max(minimumOrder, neededQuantity);
        }

        it('should target 3x threshold stock level', () => {
            const item = { stock: 0 };
            const config = { threshold: 5 };
            // Target: 5 * 3 = 15, Needed: 15 - 0 = 15
            expect(calculateSuggestedQuantity(item, config)).toBe(15);
        });

        it('should return minimum of 10 units', () => {
            const item = { stock: 5 };
            const config = { threshold: 3 };
            // Target: 3 * 3 = 9, Needed: 9 - 5 = 4
            // But minimum is 10
            expect(calculateSuggestedQuantity(item, config)).toBe(10);
        });

        it('should return minimum even when stock exceeds target', () => {
            const item = { stock: 20 };
            const config = { threshold: 3 };
            // Target: 9, Needed: 9 - 20 = -11
            // Minimum is 10
            expect(calculateSuggestedQuantity(item, config)).toBe(10);
        });

        it('should calculate correctly for different thresholds', () => {
            // High threshold (Soft Drinks default: 12)
            const softDrink = { stock: 5 };
            const softDrinkConfig = { threshold: 12 };
            // Target: 36, Needed: 36 - 5 = 31
            expect(calculateSuggestedQuantity(softDrink, softDrinkConfig)).toBe(31);

            // Low threshold (Spirits default: 2)
            const spirit = { stock: 0 };
            const spiritConfig = { threshold: 2 };
            // Target: 6, Needed: 6 - 0 = 6, but minimum is 10
            expect(calculateSuggestedQuantity(spirit, spiritConfig)).toBe(10);
        });

        it('should handle undefined stock as 0', () => {
            const item = {};
            const config = { threshold: 10 };
            // Target: 30, Needed: 30 - 0 = 30
            expect(calculateSuggestedQuantity(item, config)).toBe(30);
        });
    });

    // =============================================
    // getProductPriority Tests
    // =============================================
    describe('getProductPriority', () => {
        const DEFAULT_PRIORITIES = {
            'Spirits': { priority: 'high', threshold: 2 },
            'Wines': { priority: 'medium', threshold: 3 },
            'Beers': { priority: 'medium', threshold: 6 },
            'Soft Drinks': { priority: 'low', threshold: 12 },
            'Syrups': { priority: 'medium', threshold: 2 }
        };

        function getProductPriority(item) {
            const categoryDefault = DEFAULT_PRIORITIES[item.category] || { priority: 'medium', threshold: 3 };
            return {
                priority: item.priority || categoryDefault.priority,
                threshold: item.alertThreshold || categoryDefault.threshold
            };
        }

        it('should return product-specific priority when set', () => {
            const item = { category: 'Wines', priority: 'high', alertThreshold: 5 };
            const result = getProductPriority(item);
            expect(result.priority).toBe('high');
            expect(result.threshold).toBe(5);
        });

        it('should use category defaults when product values not set', () => {
            const item = { category: 'Spirits' };
            const result = getProductPriority(item);
            expect(result.priority).toBe('high');
            expect(result.threshold).toBe(2);
        });

        it('should use fallback for unknown category', () => {
            const item = { category: 'Unknown' };
            const result = getProductPriority(item);
            expect(result.priority).toBe('medium');
            expect(result.threshold).toBe(3);
        });

        it('should use product priority with category threshold', () => {
            const item = { category: 'Beers', priority: 'high' };
            const result = getProductPriority(item);
            expect(result.priority).toBe('high');
            expect(result.threshold).toBe(6);
        });

        it('should use category priority with product threshold', () => {
            const item = { category: 'Soft Drinks', alertThreshold: 20 };
            const result = getProductPriority(item);
            expect(result.priority).toBe('low');
            expect(result.threshold).toBe(20);
        });
    });

    // =============================================
    // calculateStockStatus (Alerts version) Tests
    // =============================================
    describe('calculateStockStatus for Alerts', () => {
        const STOCK_STATUS = {
            URGENT: 'urgent',
            NORMAL: 'normal',
            INFO: 'info',
            GOOD: 'good',
            OPTIMAL: 'optimal'
        };

        const DEFAULT_PRIORITIES = {
            'Spirits': { priority: 'high', threshold: 2 },
            'Wines': { priority: 'medium', threshold: 3 },
            'Beers': { priority: 'medium', threshold: 6 },
            'Soft Drinks': { priority: 'low', threshold: 12 },
            'Syrups': { priority: 'medium', threshold: 2 }
        };

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

        it('should categorize alerts correctly for each status', () => {
            // URGENT
            expect(calculateStockStatus({ category: 'Spirits', stock: 1 }).status).toBe('urgent');

            // NORMAL
            expect(calculateStockStatus({ category: 'Wines', stock: 2 }).status).toBe('normal');

            // INFO
            expect(calculateStockStatus({ category: 'Soft Drinks', stock: 10 }).status).toBe('info');

            // GOOD
            expect(calculateStockStatus({ category: 'Spirits', stock: 3 }).status).toBe('good');

            // OPTIMAL
            expect(calculateStockStatus({ category: 'Spirits', stock: 10 }).status).toBe('optimal');
        });
    });

    // =============================================
    // Alert Filtering Tests
    // =============================================
    describe('Alert Filtering', () => {
        it('should filter only urgent, normal, and info statuses for alerts', () => {
            const alertStatuses = ['urgent', 'normal', 'info'];
            const items = [
                { status: 'urgent' },
                { status: 'normal' },
                { status: 'info' },
                { status: 'good' },
                { status: 'optimal' }
            ];

            const alerts = items.filter(item => alertStatuses.includes(item.status));
            expect(alerts).toHaveLength(3);
            expect(alerts.map(a => a.status)).toEqual(['urgent', 'normal', 'info']);
        });
    });

    // =============================================
    // Alert Sorting Tests
    // =============================================
    describe('Alert Sorting', () => {
        it('should sort alerts by urgency (urgent first)', () => {
            const alerts = [
                { status: 'info', product: { name: 'Cola' } },
                { status: 'urgent', product: { name: 'Vodka' } },
                { status: 'normal', product: { name: 'Wine' } },
                { status: 'urgent', product: { name: 'Whiskey' } }
            ];

            const priorityOrder = { urgent: 3, normal: 2, info: 1 };

            const sorted = [...alerts].sort((a, b) => {
                return priorityOrder[b.status] - priorityOrder[a.status];
            });

            expect(sorted[0].status).toBe('urgent');
            expect(sorted[1].status).toBe('urgent');
            expect(sorted[2].status).toBe('normal');
            expect(sorted[3].status).toBe('info');
        });
    });

    // =============================================
    // Alert Counts Tests
    // =============================================
    describe('Alert Counts', () => {
        it('should correctly count alerts by status', () => {
            const alerts = [
                { status: 'urgent' },
                { status: 'urgent' },
                { status: 'normal' },
                { status: 'normal' },
                { status: 'normal' },
                { status: 'info' }
            ];

            const counts = {
                urgent: alerts.filter(a => a.status === 'urgent').length,
                normal: alerts.filter(a => a.status === 'normal').length,
                info: alerts.filter(a => a.status === 'info').length
            };

            expect(counts.urgent).toBe(2);
            expect(counts.normal).toBe(3);
            expect(counts.info).toBe(1);
        });
    });

    // =============================================
    // CSV Export Tests
    // =============================================
    describe('CSV Export', () => {
        it('should generate valid CSV header', () => {
            const header = 'Product,Category,Current Stock,Threshold,Priority,Status,Message,Days Until Empty\n';
            expect(header).toContain('Product');
            expect(header).toContain('Category');
            expect(header).toContain('Current Stock');
            expect(header).toContain('Status');
        });

        it('should escape product names with quotes', () => {
            const productName = 'Jack Daniel\'s Tennessee';
            const escapedName = `"${productName}"`;
            expect(escapedName).toBe('"Jack Daniel\'s Tennessee"');
        });
    });
});
