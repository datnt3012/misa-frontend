import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userPreferencesApi, ColumnVisibilityPreferences } from '../api/user-preferences.api';

interface ColumnVisibilityConfig {
  /** Column keys that cannot be hidden */
  alwaysVisible?: string[];
  /** Default visibility for each column (true = visible) */
  defaults: Record<string, boolean>;
  /** Unique key for this table to distinguish in storage */
  storageKey: string;
}

export const useColumnVisibility = ({
  alwaysVisible = [],
  defaults,
  storageKey,
}: ColumnVisibilityConfig) => {
  const { user } = useAuth();
  const userId = user?.id;

  // Key for local storage persistence
  const persistenceKey = useMemo(() => 
    userId ? `column-visibility:${userId}:${storageKey}` : `column-visibility:guest:${storageKey}`,
    [userId, storageKey]
  );

  // Initial state logic: localStorage -> defaults
  const getInitialState = useCallback(() => {
    try {
      const saved = localStorage.getItem(persistenceKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure any new columns are handled
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load column visibility from localStorage', e);
    }
    return defaults;
  }, [persistenceKey, defaults]);

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(getInitialState);

  // Update when persistenceKey or defaults change
  useEffect(() => {
    setColumnVisibility(prev => {
      const nextState = getInitialState();
      if (JSON.stringify(prev) === JSON.stringify(nextState)) {
        return prev;
      }
      return nextState;
    });
  }, [getInitialState]);

  // Load from API (Sync background)
  useEffect(() => {
    if (!userId) return;

    const syncFromApi = async () => {
      const allPreferences = await userPreferencesApi.getColumnVisibility();
      const tablePrefs = allPreferences[storageKey];
      
      if (tablePrefs) {
        // Only update if different from current to avoid unnecessary re-renders
        setColumnVisibility(prev => {
          const newState = { ...prev, ...tablePrefs };
          // If different, update localStorage too
          if (JSON.stringify(prev) !== JSON.stringify(newState)) {
            localStorage.setItem(persistenceKey, JSON.stringify(newState));
            return newState;
          }
          return prev;
        });
      }
    };

    syncFromApi();
  }, [userId, storageKey, persistenceKey]);

  const saveVisibility = useCallback((newVisibility: Record<string, boolean>) => {
    // 1. Update State
    setColumnVisibility(newVisibility);
    
    // 2. Update LocalStorage (Cache)
    localStorage.setItem(persistenceKey, JSON.stringify(newVisibility));
    
    // 3. Update API (Persistence)
    if (userId) {
      // In a real scenario, we might want to debounce this or use a mutation
      // We need to fetch all current prefs first as the update might BE destructive or additive
      // For now, let's assume updateColumnVisibility merges or we send the full map for this table
      userPreferencesApi.getColumnVisibility().then(allPrefs => {
        const updatedAll = {
          ...allPrefs,
          [storageKey]: newVisibility
        };
        userPreferencesApi.updateColumnVisibility(updatedAll);
      });
    }
  }, [persistenceKey, userId, storageKey]);

  const toggleColumn = useCallback((key: string) => {
    if (alwaysVisible.includes(key)) return;
    
    const nextVisibility = {
      ...columnVisibility,
      [key]: !columnVisibility[key]
    };
    saveVisibility(nextVisibility);
  }, [columnVisibility, alwaysVisible, saveVisibility]);

  const setColumnVisible = useCallback((key: string, visible: boolean) => {
    if (alwaysVisible.includes(key)) return;
    
    const nextVisibility = {
      ...columnVisibility,
      [key]: visible
    };
    saveVisibility(nextVisibility);
  }, [columnVisibility, alwaysVisible, saveVisibility]);

  const resetToDefaults = useCallback(() => {
    saveVisibility(defaults);
  }, [defaults, saveVisibility]);

  const setAllVisible = useCallback((visible: boolean) => {
    const nextVisibility = { ...columnVisibility };
    Object.keys(defaults).forEach(key => {
      if (!alwaysVisible.includes(key)) {
        nextVisibility[key] = visible;
      }
    });
    saveVisibility(nextVisibility);
  }, [defaults, alwaysVisible, columnVisibility, saveVisibility]);

  const isVisible = useCallback((key: string) => {
    if (alwaysVisible.includes(key)) return true;
    return !!columnVisibility[key];
  }, [columnVisibility, alwaysVisible]);

  return {
    columnVisibility,
    toggleColumn,
    setColumnVisible,
    setAllVisible,
    resetToDefaults,
    isVisible,
    alwaysVisible,
  };
};
