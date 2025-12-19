/**
 * React hook for translations
 * Provides access to translation function and loading state
 */
import { useEffect, useState } from 'react';
import {
  t,
  initializeTranslations,
  loadTranslationsByScope,
  loadTranslationsByPrefix,
  loadTranslationsByKeys,
  areTranslationsLoaded,
  getTranslations,
} from '@/utils/translations';
interface UseTranslationOptions {
  scope?: string;
  prefix?: string;
  keys?: string[];
  autoLoad?: boolean;
}
export function useTranslation(options?: UseTranslationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(areTranslationsLoaded());
  useEffect(() => {
    const loadTranslations = async () => {
      if (options?.autoLoad === false) {
        return;
      }
      setIsLoading(true);
      try {
        if (options?.scope) {
          await loadTranslationsByScope(options.scope, options.scope === 'permissions');
        } else if (options?.prefix) {
          await loadTranslationsByPrefix(options.prefix);
        } else if (options?.keys && options.keys.length > 0) {
          await loadTranslationsByKeys(options.keys);
        } else {
          // Load default translations (permissions)
          await initializeTranslations();
        }
        setIsReady(true);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };
    loadTranslations();
  }, [options?.scope, options?.prefix, options?.keys?.join(','), options?.autoLoad]);
  return {
    t,
    isLoading,
    isReady,
    translations: getTranslations(),
  };
}
/**
 * Simple translation hook that just provides the translation function
 */
export function useT() {
  return t;
}