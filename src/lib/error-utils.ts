/**
 * Utility functions for handling API errors and extracting meaningful error messages
 */

export interface ApiError {
  message?: string;
  error?: string;
  details?: string;
  status?: number;
}

/**
 * Extract error message from API response
 * @param error - The error object from API call
 * @param fallbackMessage - Fallback message if no specific error found
 * @returns User-friendly error message
 */
export function getErrorMessage(error: any, fallbackMessage: string = 'Có lỗi xảy ra'): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Try to extract from axios error response
  if (error?.response?.data) {
    const data = error.response.data;
    
    // Check for message field
    if (data.message) {
      return data.message;
    }
    
    // Check for error field
    if (data.error) {
      return data.error;
    }
    
    // Check for details field
    if (data.details) {
      return data.details;
    }
    
    // Check for validation errors
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map((err: any) => err.message || err).join(', ');
    }
  }

  // Try to extract from error object directly
  if (error?.message) {
    return error.message;
  }

  // Try to extract from error object
  if (error?.error) {
    return error.error;
  }

  // Return fallback message
  return fallbackMessage;
}

/**
 * Get error message with status code information
 * @param error - The error object from API call
 * @param fallbackMessage - Fallback message if no specific error found
 * @returns User-friendly error message with status code
 */
export function getErrorMessageWithStatus(error: any, fallbackMessage: string = 'Có lỗi xảy ra'): string {
  const message = getErrorMessage(error, fallbackMessage);
  const status = error?.response?.status || error?.status;
  
  if (status) {
    return `${message} (HTTP ${status})`;
  }
  
  return message;
}
