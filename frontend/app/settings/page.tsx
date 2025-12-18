import { Header } from '@/components/layout/Header';
import { SettingsContent } from '@/components/settings/SettingsContent';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header 
        title="Settings" 
        subtitle="Configure your YouTube RAG application" 
      />
      <div className="p-6">
        <SettingsContent />
      </div>
    </div>
  );
}
