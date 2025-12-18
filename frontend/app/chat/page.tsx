import { Header } from '@/components/layout/Header';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title="Chat" 
        subtitle="Ask questions about your video content" 
      />
      <div className="flex-1">
        <ChatInterface />
      </div>
    </div>
  );
}
