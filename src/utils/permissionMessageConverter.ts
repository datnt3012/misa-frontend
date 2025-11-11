/**
 * Utility to convert permission codes in error messages to human-readable names
 * 
 * DEPRECATED: This file now re-exports functions from permissionNames.ts
 * to maintain backward compatibility while using the shared permission cache
 */

export { 
  convertPermissionCodesInMessage, 
  getPermissionDisplayName 
} from '@/utils/permissionNames';
