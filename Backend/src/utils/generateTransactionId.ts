import Business from '../models/Business.js';

/**
 * Generates a unique Subscription Transaction ID.
 * Format: "NXB-" + 3 segments of 4 alphanumeric chars (e.g., NXB-4F2G-98X1-K09P)
 */
export const generateSubscriptionId = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const segment = () => Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    let result = `NXB-${segment()}-${segment()}-${segment()}`;

    // Check uniqueness in all planHistory entries across all businesses
    const existingEntry = await Business.findOne({ "planHistory.transactionId": result });
    
    if (!existingEntry) {
      return result;
    }

    attempts++;
  }

  // Fallback to timestamp based if collision persists
  return `NXB-ERR-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};
