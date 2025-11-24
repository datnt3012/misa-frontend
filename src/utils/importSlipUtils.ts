/**
 * Utility functions for import slip management
 */

/**
 * Generate a unique import slip code
 * Format: IMP + 8 digits (timestamp) + 4 chars (random) = 15 characters
 * This ensures the code is within the backend validation limit of 3-20 characters
 */
export const generateImportSlipCode = (): string => {
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits
  const random = Math.random().toString(36).substr(2, 4); // 4 chars
  return `IMP${timestamp}${random}`; // IMP + 8 digits + 4 chars = 15 chars
};

/**
 * Validate import slip code format
 * @param code - The code to validate
 * @returns true if valid, false otherwise
 */
export const isValidImportSlipCode = (code: string): boolean => {
  // Format: IMP + 8 digits + 4 alphanumeric chars = 15 chars total
  const pattern = /^IMP\d{8}[a-z0-9]{4}$/;
  return pattern.test(code) && code.length === 15;
};
