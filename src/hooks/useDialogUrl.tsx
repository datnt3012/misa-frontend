import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useCallback } from 'react';

export type DialogType = 'detail' | 'edit' | 'create' | 'view';

export interface DialogUrlParams {
  entityType: string; // 'orders', 'customers', 'products', etc.
  dialogType: DialogType;
  entityId?: string;
}

/**
 * Hook to manage dialog URL state
 * Format: /entityType?dialog=dialogType&id=entityId
 * Example: /orders?dialog=detail&id=123
 */
export const useDialogUrl = (entityType: string) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get current dialog state from URL
  const getDialogState = useCallback((): {
    dialogType: DialogType | null;
    entityId: string | null;
    tab: string | null;
    isOpen: boolean;
  } => {
    const dialogType = searchParams.get('dialog') as DialogType | null;
    const entityId = searchParams.get('id') || null;
    const tab = searchParams.get('tab') || null;
    const urlEntityType = location.pathname.split('/').filter(Boolean)[0] || '';

    // Only return dialog state if it matches current entity type
    if (urlEntityType === entityType && dialogType) {
      return {
        dialogType,
        entityId,
        tab,
        isOpen: true,
      };
    }

    return {
      dialogType: null,
      entityId: null,
      tab: null,
      isOpen: false,
    };
  }, [searchParams, location.pathname, entityType]);

  // Open dialog and update URL
  const openDialog = useCallback((dialogType: DialogType, entityId?: string, tab?: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('dialog', dialogType);
    if (entityId) {
      newParams.set('id', entityId);
    } else {
      newParams.delete('id');
    }
    if (tab !== undefined) {
      // If tab is explicitly provided, set it
      if (tab) {
        newParams.set('tab', tab);
      } else {
        newParams.delete('tab');
      }
    }
    // If tab is not provided, keep existing tab param (don't delete it)
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Close dialog and remove from URL
  const closeDialog = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('dialog');
    newParams.delete('id');
    // Don't delete 'tab' when closing dialog - keep it for tab navigation
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Check if specific dialog is open
  const isDialogOpen = useCallback((dialogType: DialogType, entityId?: string): boolean => {
    const state = getDialogState();
    if (!state.isOpen || state.dialogType !== dialogType) {
      return false;
    }
    if (entityId !== undefined && state.entityId !== entityId) {
      return false;
    }
    return true;
  }, [getDialogState]);

  return {
    getDialogState,
    openDialog,
    closeDialog,
    isDialogOpen,
  };
};

