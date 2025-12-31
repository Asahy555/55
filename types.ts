
export interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string; // Base64 or URL
  voice?: string;
  color: string; // Bubble color
  created_at: number;
  evolutionContext?: string; // Stores learned memories and personality shifts
}

export interface Message {
  id: string;
  senderId: string; // 'user' or character ID
  senderName: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  timestamp: number;
  isAction?: boolean; // If purely action
  isLoading?: boolean; // Indicates loading state
}

export interface ChatSession {
  id: string;
  name: string;
  participants: string[]; // Character IDs
  messages: Message[];
  backgroundUrl?: string; // Dynamic background
  lastUpdated: number;
  isNSFW?: boolean; // NSFW toggle state
}

export interface GalleryItem {
    id: string;
    type: 'image' | 'video' | 'background';
    url: string;
    caption?: string; // Prompt or description
    timestamp: number;
}

export enum Page {
  HOME = 'HOME',
  CREATE = 'CREATE',
  CHAT = 'CHAT',
  GALLERY = 'GALLERY'
}

export interface AppState {
  characters: Character[];
  chats: ChatSession[];
  activeChatId: string | null;
  page: Page;
}