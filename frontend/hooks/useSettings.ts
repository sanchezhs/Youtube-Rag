import { useState, useEffect, useCallback, useMemo } from 'react';
import { settingsApi } from '@/lib/api';
import type { SettingUpdate, SettingsMap, SettingComponent, SettingValueType } from '@/types';

interface UseSettingsOptions {
  autoFetch?: boolean;
}

interface SettingToUpdate {
  section: string;
  key: string;
  value: string | number | boolean;
  value_type?: SettingValueType;
}

interface UseSettingsReturn {
  settings: SettingsMap;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getSetting: <T extends string | number | boolean>(key: string, defaultValue: T) => T;
  updateSetting: (section: string, key: string, data: SettingUpdate) => Promise<boolean>;
  updateValue: (section: string, key: string, value: string | number | boolean, valueType?: SettingValueType) => Promise<boolean>;
  bulkUpdate: (settings: SettingToUpdate[]) => Promise<boolean>;
}

export function useSettings(
  component: SettingComponent,
  options: UseSettingsOptions = {}
): UseSettingsReturn {
  const { autoFetch = true } = options;
  
  const [settings, setSettings] = useState<SettingsMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getByComponent(component);
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
      console.error(`Failed to fetch settings for ${component}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [component]);

  useEffect(() => {
    if (autoFetch) {
      fetchSettings();
    }
  }, [autoFetch, fetchSettings]);

  const getSetting = useCallback(
    <T extends string | number | boolean>(key: string, defaultValue: T): T => {
      if (key in settings) {
        return settings[key] as T;
      }
      return defaultValue;
    },
    [settings]
  );

  const updateSetting = useCallback(
    async (section: string, key: string, data: SettingUpdate): Promise<boolean> => {
      try {
        await settingsApi.update(component, section, key, data);
        await fetchSettings();
        return true;
      } catch (err) {
        console.error('Failed to update setting:', err);
        return false;
      }
    },
    [component, fetchSettings]
  );

  const updateValue = useCallback(
    async (section: string, key: string, value: string | number | boolean, valueType?: SettingValueType): Promise<boolean> => {
      try {
        await settingsApi.updateValue(component, section, key, value, valueType);
        await fetchSettings();
        return true;
      } catch (err) {
        console.error('Failed to update setting:', err);
        return false;
      }
    },
    [component, fetchSettings]
  );

  const bulkUpdate = useCallback(
    async (settingsToUpdate: SettingToUpdate[]): Promise<boolean> => {
      try {
        await Promise.all(
          settingsToUpdate.map((s) =>
            settingsApi.update(component, s.section, s.key, {
              value: s.value,
              value_type: s.value_type,
            })
          )
        );
        await fetchSettings();
        return true;
      } catch (err) {
        console.error('Failed to bulk update settings:', err);
        return false;
      }
    },
    [component, fetchSettings]
  );

  return useMemo(
    () => ({
      settings,
      isLoading,
      error,
      refetch: fetchSettings,
      getSetting,
      updateSetting,
      updateValue,
      bulkUpdate,
    }),
    [
      settings,
      isLoading,
      error,
      fetchSettings,
      getSetting,
      updateSetting,
      updateValue,
      bulkUpdate,
    ]
  );
}

// Typed hooks for specific components
export function useWorkerSettings() {
  return useSettings('WORKER');
}

export function useBackendSettings() {
  return useSettings('BACKEND');
}
