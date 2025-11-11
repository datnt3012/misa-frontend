/**
 * Centralized permission names cache from backend API
 * This ensures all parts of the app use the same permission names
 * to avoid discrepancies between role editing page and error messages
 * 
 * NOTE: This module now uses the new /public/translations endpoint
 * for better translation support. The old /permissions endpoint is kept
 * as a fallback for backward compatibility.
 */

import { usersApi, Permission } from '@/api/users.api';
import { 
  initializeTranslations, 
  getPermissionDisplayName as getTranslationPermissionName,
  areTranslationsLoaded,
  convertPermissionCodesInMessage as convertWithTranslations
} from './translations';

// Cache for permission code -> name mapping (legacy, will be replaced by translations)
let permissionNameCache: Record<string, string> = {};
let isLoading = false;
let loadPromise: Promise<void> | null = null;
// Track which permission codes we've already warned about to avoid spam
const warnedPermissions = new Set<string>();

/**
 * Load permissions from backend and cache them
 */
async function loadPermissions(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  // Don't skip if cache already has entries - we want to merge with /permissions endpoint
  // to get all permissions, not just the ones from user role
  const hasExistingCache = Object.keys(permissionNameCache).length > 0;

  isLoading = true;
  loadPromise = (async () => {
    try {
      const permissions = await usersApi.getPermissions();
      const map: Record<string, string> = { ...permissionNameCache }; // Start with existing cache
      
      permissions.forEach((perm: Permission) => {
        if (perm.code && perm.name) {
          map[perm.code] = perm.name;
        } else {
          console.warn(`Permission missing code or name:`, perm);
        }
      });
      
      permissionNameCache = map;
    } catch (error: any) {
      console.error('Error loading permissions from /permissions endpoint:', error);
      // Keep existing cache (from user role), will return permission code if not found
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Format permission code to a more readable format
 * Example: DASHBOARD_VIEW -> "Dashboard View"
 */
function formatPermissionCode(code: string): string {
  if (!code) return code;
  
  // Split by underscore and capitalize each word
  return code
    .split('_')
    .map(word => {
      // Capitalize first letter and lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Get permission display name from cache
 * Returns formatted permission code if not found in cache (as fallback)
 * 
 * Priority (matches settings page to ensure consistency):
 * 1. Permission name cache (from /permissions endpoint - same source as settings page)
 * 2. Translations cache (from /public/translations - supplementary)
 * 3. Formatted code (fallback)
 */
export function getPermissionDisplayName(code: string): string {
  // PRIORITY 1: Use permission name from /permissions endpoint (same source as settings page)
  // This ensures error messages show the same names as settings page uses
  // Settings page displays permission.name directly from backend API
  const displayName = permissionNameCache[code];
  if (displayName) {
    return displayName;
  }
  
  // PRIORITY 2: Try translations from /public/translations endpoint
  // Only use this if permission name cache doesn't have the permission
  if (areTranslationsLoaded()) {
    const translationName = getTranslationPermissionName(code);
    // Only use translation if it's different from the formatted code (means it's a real translation)
    const formattedCode = formatPermissionCode(code);
    if (translationName && translationName !== code && translationName !== formattedCode) {
      return translationName;
    }
  }
  
  // Last resort: format the code to be more readable
  // This provides better UX than showing raw codes like "REVENUE_VIEW"
  return formatPermissionCode(code);
}

/**
 * Convert permission codes in a message to display names
 */
export function convertPermissionCodesInMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return message;
  }

  // Use translations system first (new system) - this is the primary method
  if (areTranslationsLoaded()) {
    try {
      // Use the imported function directly
      const converted = convertWithTranslations(message);
      // If translations system made changes, return it
      if (converted !== message) {
        return converted;
      }
    } catch (e) {
      // Silently fall back to legacy cache if translations system fails
    }
  }

  // Fallback to legacy cache
  let convertedMessage = message;
  Object.entries(permissionNameCache).forEach(([code, displayName]) => {
    // Use word boundaries to ensure we only replace complete permission codes
    const regex = new RegExp(`\\b${code}\\b`, 'g');
    convertedMessage = convertedMessage.replace(regex, displayName);
  });

  return convertedMessage;
}

/**
 * Initialize permission names cache
 * Call this early in the app lifecycle
 * 
 * PRIORITY: Load from /permissions endpoint first (same source as settings page)
 * Then load translations from /public/translations as supplementary source
 */
export async function initializePermissionNames(): Promise<void> {
  // PRIORITY 1: Load permissions from /permissions endpoint first
  // This is the primary source - same as settings page uses
  // This ensures error messages show the same permission names as settings page
  try {
    await loadPermissions();
  } catch (error: any) {
    console.error('Failed to load permissions from /permissions endpoint:', error);
    // Continue to try translations as fallback
  }
  
  // PRIORITY 2: Also load translations from /public/translations endpoint
  // This serves as a fallback if /permissions endpoint is not available
  // or if some permissions are missing from the cache
  try {
    await initializeTranslations();
  } catch (error: any) {
    console.error('Failed to load translations from /public/translations:', error);
    // Don't throw - permissions cache might already have the data we need
  }
}

/**
 * Get the permission name cache (for use in hooks)
 */
export function getPermissionNameCache(): Record<string, string> {
  return permissionNameCache;
}

/**
 * Check if permissions are loaded
 * Returns true if translations are loaded OR legacy cache has entries
 */
export function arePermissionsLoaded(): boolean {
  // Check both translations system (new) and legacy cache
  return areTranslationsLoaded() || Object.keys(permissionNameCache).length > 0;
}

/**
 * Update permission name cache with permissions from user role
 * This is useful when user doesn't have access to /permissions endpoint
 * but we can extract permission names from their role permissions
 */
export function updatePermissionNameCacheFromRole(permissions: Array<{ code: string; name?: string }>): void {
  if (!permissions || !Array.isArray(permissions)) {
    return;
  }

  permissions.forEach((perm) => {
    if (perm.code && perm.name) {
      // Update cache (override existing entries to ensure we have the latest names from backend)
      permissionNameCache[perm.code] = perm.name;
    } else if (perm.code && !perm.name) {
      console.warn(`Permission ${perm.code} missing name field`);
    }
  });
}

