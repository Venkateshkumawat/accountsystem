/**
 * Nexus Fiscal Utils: GSTIN Validation
 * Pattern: 2 digits (State Code) + 10 alphanumeric (PAN) + 1 digit (Entity No) + 'Z' + 1 digit/char (Checksum)
 */
export const validateGSTIN = (gstin: string): boolean => {
  if (!gstin) return true; // Allow empty if not required
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.toUpperCase());
};

/**
 * Validates Indian Mobile Number (10 digits)
 */
export const validateMobile = (mobile: string): boolean => {
  const regex = /^[6-9][0-9]{9}$/;
  return regex.test(mobile);
};

/**
 * Validates Indian Pincode (6 digits)
 */
export const validatePincode = (pincode: string): boolean => {
  const regex = /^[1-9][0-9]{5}$/;
  return regex.test(pincode);
};
