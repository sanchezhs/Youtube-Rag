import { Header } from '@/components/layout/Header';
import { ChannelList } from '@/components/channels/ChannelList';

export default function ChannelsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Channels" 
        subtitle="Manage your YouTube channels" 
      />
      <div className="p-6">
        <ChannelList />
      </div>
    </div>
  );
}
