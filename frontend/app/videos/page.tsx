import { Header } from '@/components/layout/Header';
import { VideoList } from '@/components/videos/VideoList';

export default function VideosPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header 
        title="Videos" 
        subtitle="Browse and manage video content" 
      />
      <div className="p-6">
        <VideoList />
      </div>
    </div>
  );
}
