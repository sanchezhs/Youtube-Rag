'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useTheme } from '@/lib/theme';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Settings, 
  Database, 
  Bell, 
  Palette,
  Key,
  Server,
  HardDrive,
  Cpu,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsContent() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light mode for bright environments' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark mode for low-light environments' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Automatically match your system preference' },
  ] as const;

  const comingSoonSections = [
    {
      title: 'API Configuration',
      description: 'Configure API endpoints and authentication',
      icon: Key,
    },
    {
      title: 'Database Settings',
      description: 'Manage database connections and backups',
      icon: Database,
    },
    {
      title: 'Notifications',
      description: 'Configure notification preferences',
      icon: Bell,
    },
    {
      title: 'Pipeline Settings',
      description: 'Configure transcription and embedding models',
      icon: Cpu,
    },
    {
      title: 'Storage',
      description: 'Manage video and audio storage locations',
      icon: HardDrive,
    },
    {
      title: 'Server',
      description: 'View server status and configuration',
      icon: Server,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Appearance
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Customize how the application looks
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    theme === option.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      theme === option.value
                        ? 'bg-primary-100 dark:bg-primary-900/40'
                        : 'bg-gray-100 dark:bg-gray-800'
                    )}
                  >
                    <option.icon
                      className={cn(
                        'h-6 w-6',
                        theme === option.value
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        'font-medium',
                        theme === option.value
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                More Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Additional configuration options coming soon
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {comingSoonSections.map((section) => (
              <div
                key={section.title}
                className="flex items-center gap-4 p-4 opacity-50 cursor-not-allowed"
              >
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <section.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {section.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {section.description}
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  Coming Soon
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                About
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Application information
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Application</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">YouTube RAG</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Framework</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Next.js 15</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">UI</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Tailwind CSS 4</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Placeholder */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Settings className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Danger Zone
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Irreversible actions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Clear All Data
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Delete all channels, videos, and chat history
                </p>
              </div>
              <button
                disabled
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-lg opacity-50 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Reset Settings
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reset all settings to default values
                </p>
              </div>
              <button
                disabled
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-lg opacity-50 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
