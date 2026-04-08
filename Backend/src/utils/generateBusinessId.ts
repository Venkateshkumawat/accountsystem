import Business from '../models/Business.js';

/**
 * Generates a unique Business ID for BharatBill.
 * Format: "BB-" + 4 uppercase letters + "-" + 4 digits (e.g., BB-KRTX-7291)
 */
export const generateBusinessId = async (): Promise<string> => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let result = 'BB-';
    
    // Generate 4 random uppercase letters
    for (let i = 0; i < 4; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    result += '-';
    
    // Generate 4 random digits
    for (let i = 0; i < 4; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    // Check uniqueness in the Business collection
    const existingBusiness = await Business.findOne({ businessId: result });
    
    if (!existingBusiness) {
      return result;
    }

    attempts++;
    console.warn(`Collision detected for Business ID ${result}. Retry attempt ${attempts}/${maxAttempts}.`);
  }

  throw new Error('CRITICAL_SYSTEM_ERROR: Exhausted all retries for unique Business ID generation. Interface density limit reached.');
};

/**
 * Validates if the given string matches the BharatBill Business ID pattern.
 */
export const isValidBusinessId = (id: string): boolean => {
  const pattern = /^BB-[A-Z]{4}-\d{4}$/;
  return pattern.test(id);
};
