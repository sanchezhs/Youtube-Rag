import { Header } from '@/components/layout/Header';
import { VideoList } from '@/components/videos/VideoList';

export default function VideosPage() {
  return (
    <div className="min-h-screen">
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
