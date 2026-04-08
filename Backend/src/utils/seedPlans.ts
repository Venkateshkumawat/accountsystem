import mongoose from 'mongoose';
import Plan from '../models/Plan.js';

/**
 * Nexus Plan Seeder
 * Initializes default SaaS subscription tiers (Free, Pro, Enterprise)
 */
export const seedPlans = async (): Promise<void> => {
  try {
    const planCount = await Plan.countDocuments();

    if (planCount === 0) {
      console.log('⏳ Initialization: Seeding Nexus Subscription Plans...');

      const defaultPlans = [
        {
          name: 'free',
          priceMonthly: 0,
          priceYearly: 0,
          maxProducts: 20,
          maxUsers: 2,
          maxInvoicesPerMonth: 50,
          features: ['Basic POS', 'Inventory Tracking', 'Email Support'],
          isActive: true
        },
        {
          name: 'starter',
          priceMonthly: 499,
          priceYearly: 4990,
          maxProducts: 200,
          maxUsers: 5,
          maxInvoicesPerMonth: 500,
          features: ['Standard POS', 'Billing & SMS', 'Priority Support'],
          isActive: true
        },
        {
          name: 'pro',
          priceMonthly: 999,
          priceYearly: 9999,
          maxProducts: 500,
          maxUsers: 10,
          maxInvoicesPerMonth: 2000,
          features: ['Eway Bill Sync', 'GSTR-1 Reports', 'Dedicated Support', 'API Access'],
          isActive: true
        },
        {
          name: 'elite',
          priceMonthly: 2499,
          priceYearly: 24990,
          maxProducts: 2000,
          maxUsers: 25,
          maxInvoicesPerMonth: 10000,
          features: ['B2B Routing', 'Multi-tenant Node', 'Premium API Access'],
          isActive: true
        },
        {
          name: 'enterprise',
          priceMonthly: 4999,
          priceYearly: 49990,
          maxProducts: 10000,
          maxUsers: 50,
          maxInvoicesPerMonth: 100000,
          features: ['Unlimited Scale', 'Multi-Store Sync', 'Whitelabel Support', 'Custom Integration'],
          isActive: true
        }
      ];

      await Plan.insertMany(defaultPlans);
      console.log('✅ Success: Nexus Subscription Plans Synchronized');
    } else {
      console.log('✅ Nexus Subscription Plans already initialized');
    }
  } catch (error) {
    console.error('❌ Failed to seed Nexus Plans:', error);
  }
};
