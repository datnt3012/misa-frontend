/**
 * Centralized translation system using /public/translations endpoint
 * This provides translations for permissions, error messages, and other UI elements
 */
import { api } from '@/lib/api';
// Cache for translations
let translationsCache: Record<string, string> = {};
let isLoading = false;
let loadPromises: Map<string, Promise<void>> = new Map();
let permissionsLoaded = false;
/**
 * Load translations from backend
 */
async function loadTranslations(options?: {
  scope?: string;
  includeCodes?: boolean;
  prefix?: string;
  keys?: string[];
}): Promise<void> {
  // Create a unique key for this request
  const requestKey = JSON.stringify(options || {});
  // If already loading the same request, return the existing promise
  if (loadPromises.has(requestKey)) {
    return loadPromises.get(requestKey)!;
  }
  isLoading = true;
  const loadPromise = (async () => {
    try {
      const params = new URLSearchParams();
      if (options?.scope) {
        params.append('scope', options.scope);
      }
      if (options?.includeCodes) {
        params.append('includeCodes', 'true');
      }
      if (options?.prefix) {
        params.append('prefix', options.prefix);
      }
      if (options?.keys && options.keys.length > 0) {
        params.append('keys', options.keys.join(','));
      }
      const url = `/public/translations${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<any>(url);
      // Handle different response structures
      const data = response?.data || response;
      let translations: Record<string, string> = {};
      // Try different response formats
      if (data?.translations && typeof data.translations === 'object') {
        translations = data.translations;
      } else if (Array.isArray(data)) {
        // If array, convert to object (assuming format: [{key: '...', value: '...'}])
        data.forEach((item: any) => {
          if (item.key && item.value) {
            translations[item.key] = item.value;
          } else if (item.code && item.name) {
            // Permission format: {code: 'DASHBOARD_VIEW', name: 'Xem Dashboard'}
            translations[item.code] = item.name;
          }
        });
      } else if (typeof data === 'object' && data !== null) {
        // Direct object with translation keys
        translations = data;
      }
      // Merge with existing cache
      translationsCache = { ...translationsCache, ...translations };
      if (Object.keys(translations).length === 0) {
      }
      // If loading permissions, mark as loaded
      if (options?.scope === 'permissions') {
        permissionsLoaded = true;
      }
    } catch (error: any) {
      // Keep existing cache
    } finally {
      isLoading = false;
      loadPromises.delete(requestKey);
    }
  })();
  loadPromises.set(requestKey, loadPromise);
  return loadPromise;
}
/**
 * Initialize translations - load permission names and other common translations
 */
export async function initializeTranslations(): Promise<void> {
  // Load permission translations with codes
  await loadTranslations({ 
    scope: 'permissions', 
    includeCodes: true 
  });
}
/**
 * Load translations with specific scope
 */
export async function loadTranslationsByScope(scope: string, includeCodes?: boolean): Promise<void> {
  await loadTranslations({ scope, includeCodes });
}
/**
 * Load translations by prefix
 */
export async function loadTranslationsByPrefix(prefix: string): Promise<void> {
  await loadTranslations({ prefix });
}
/**
 * Load specific translation keys
 */
export async function loadTranslationsByKeys(keys: string[]): Promise<void> {
  await loadTranslations({ keys });
}
/**
 * Get translation for a key
 * Returns the key itself if translation not found
 */
export function t(key: string, fallback?: string): string {
  return translationsCache[key] || fallback || key;
}
/**
 * Get permission display name
 * This is a convenience function that looks up permission code in translations
 */
export function getPermissionDisplayName(code: string): string {
  if (!code) return code;
  // Special mapping for permissions that have page-specific translations
  // This ensures error messages use the same names as settings page
  // Settings page displays permission.name from backend, which might be "View Revenue Page"
  const permissionPageMapping: Record<string, string[]> = {
    'REVENUE_VIEW': ['View Revenue Page', 'View Revenue', 'REVENUE_VIEW'],
    'DASHBOARD_VIEW': ['View Dashboard Page', 'View Dashboard', 'DASHBOARD_VIEW'],
    // Add more mappings as needed
  };
  // If there's a special mapping for this permission, try those keys first
  if (permissionPageMapping[code]) {
    for (const mappedKey of permissionPageMapping[code]) {
      // Direct match
      if (translationsCache[mappedKey]) {
        return translationsCache[mappedKey];
      }
      // Case-insensitive match
      const foundKey = Object.keys(translationsCache).find(
        k => k.toLowerCase() === mappedKey.toLowerCase()
      );
      if (foundKey) {
        return translationsCache[foundKey];
      }
    }
  }
  // Try multiple possible key formats that backend might use
  // Backend might return keys in various formats, so we try all possibilities
  const possibleKeys = [
    code, // Direct: "REVENUE_VIEW"
    `permission.${code}`, // "permission.REVENUE_VIEW"
    `permissions.${code}`, // "permissions.REVENUE_VIEW"
    code.toLowerCase(), // "revenue_view"
    `permission.${code.toLowerCase()}`, // "permission.revenue_view"
    `permissions.${code.toLowerCase()}`, // "permissions.revenue_view"
    // Also try with underscores replaced by dots
    code.replace(/_/g, '.'), // "REVENUE.VIEW"
    code.toLowerCase().replace(/_/g, '.'), // "revenue.view"
  ];
  // Try each key format (case-insensitive search)
  for (const key of possibleKeys) {
    // Direct match
    if (translationsCache[key]) {
      return translationsCache[key];
    }
    // Case-insensitive match
    const foundKey = Object.keys(translationsCache).find(
      k => k.toLowerCase() === key.toLowerCase()
    );
    if (foundKey) {
      return translationsCache[foundKey];
    }
  }
  // Try partial match - if code is "REVENUE_VIEW", try to find keys containing "REVENUE" and "VIEW"
  if (Object.keys(translationsCache).length > 0) {
    const codeParts = code.split('_');
    if (codeParts.length >= 2) {
      // Try to find key that contains all parts of the permission code
      // But prioritize keys that contain "Page" (like "View Revenue Page")
      const matchingKeys = Object.keys(translationsCache).filter(k => {
        const kLower = k.toLowerCase();
        return codeParts.every(part => kLower.includes(part.toLowerCase()));
      });
      // Prefer keys with "Page" in them (these are usually the page-specific permissions)
      const pageKey = matchingKeys.find(k => k.toLowerCase().includes('page'));
      if (pageKey) {
        return translationsCache[pageKey];
      }
      // Otherwise use the first match
      if (matchingKeys.length > 0) {
        return translationsCache[matchingKeys[0]];
      }
    }
  }
  // Fallback to formatted code
  return formatPermissionCode(code);
}
/**
 * Format permission code to a more readable format (fallback)
 * Example: DASHBOARD_VIEW -> "Dashboard View"
 */
function formatPermissionCode(code: string): string {
  if (!code) return code;
  return code
    .split('_')
    .map(word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
/**
 * Convert permission codes in a message to display names
 */
export function convertPermissionCodesInMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return message;
  }
  let convertedMessage = message;
  // First, try to find translations in the cache that match permission codes
  // Look for patterns like "DASHBOARD_VIEW" (uppercase with underscores)
  const permissionCodePattern = /\b([A-Z][A-Z0-9_]{2,})\b/g;
  const codes = new Set<string>();
  const matches = message.matchAll(permissionCodePattern);
  for (const match of matches) {
    codes.add(match[0]);
  }
  // Replace each permission code with its display name
  codes.forEach(code => {
    const displayName = getPermissionDisplayName(code);
    const formattedCode = formatPermissionCode(code);
    // Always replace with display name (which may be translation or formatted code)
    // This ensures better UX than showing raw codes like "DASHBOARD_VIEW"
    if (displayName !== code) {
      convertedMessage = convertedMessage.replace(new RegExp(`\\b${code}\\b`, 'g'), displayName);
    } else if (formattedCode !== code) {
      // Fallback: use formatted code for better UX
      convertedMessage = convertedMessage.replace(new RegExp(`\\b${code}\\b`, 'g'), formattedCode);
    }
  });
  return convertedMessage;
}
/**
 * Get all translations
 */
export function getTranslations(): Record<string, string> {
  return translationsCache;
}
/**
 * Check if translations are loaded
 */
export function areTranslationsLoaded(): boolean {
  return Object.keys(translationsCache).length > 0;
}
/**
 * Check if permission translations are loaded
 */
export function arePermissionTranslationsLoaded(): boolean {
  return permissionsLoaded || Object.keys(translationsCache).length > 0;
}
/**
 * Clear translations cache (useful for testing or logout)
 */
export function clearTranslationsCache(): void {
  translationsCache = {};
  loadPromises.clear();
  permissionsLoaded = false;
  isLoading = false;
}