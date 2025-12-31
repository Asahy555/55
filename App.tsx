import React, { useState, useEffect, useRef } from 'react';
import { Character, ChatSession, Message, Page, GalleryItem } from './types';
import { Button } from './components/Button';
import { generateImage, streamCharacterResponse, getPlotSummary, generateBackground, generateVideo, analyzeCharacterEvolution, generateSpeech } from './services/geminiService';
import { storage } from './services/storage';

// --- Utils ---

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- Icons ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"/></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const GalleryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const SpeakerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;

// --- Helper Components ---

const MessageBubble: React.FC<{ 
  msg: Message; 
  characters: Character[]; 
  onSaveToGallery: (url: string, type: 'image' | 'video', caption: string) => void; 
}> = ({ msg, characters, onSaveToGallery }) => {
  const isUser = msg.senderId === 'user';
  const char = characters.find(c => c.id === msg.senderId);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const borderColor = isUser ? 'border-blue-500' : (char?.color || 'border-gray-500');
  const alignClass = isUser ? 'justify-end' : 'justify-start';
  const bgClass = isUser ? 'bg-blue-900/40' : 'bg-gray-800/80';

  const handlePlayVoice = async () => {
    if (isPlaying || !char) return;
    setIsPlaying(true);
    try {
        const audioBuffer = await generateSpeech(msg.content, char.voice || 'Kore');
        if (audioBuffer) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();
            source.onended = () => setIsPlaying(false);
        } else {
            setIsPlaying(false);
        }
    } catch (e) {
        console.error("Playback failed", e);
        setIsPlaying(false);
    }
  };

  const renderContent = (text: string) => {
    if (text === '...' && !isUser) {
        return (
             <div className="flex space-x-1 h-6 items-center px-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
             </div>
        );
    }

    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={i} className="action-text text-gray-500 italic text-xs block my-1">{part.replace(/\*/g, '')}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`flex w-full mb-4 ${alignClass}`}>
      <div className={`max-w-[80%] md:max-w-[60%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && char && (
          <div className="flex items-center gap-2 mb-1 ml-1">
             <img src={char.avatar} alt={char.name} className="w-6 h-6 rounded-full object-cover" />
             <span className="text-xs text-gray-400 font-bold" style={{ color: char.color }}>{char.name}</span>
          </div>
        )}
        <div className={`relative px-4 py-3 rounded-2xl border-l-4 ${borderColor} ${bgClass} backdrop-blur-md shadow-lg`}>
          <div className="text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap text-gray-100 min-h-[24px]">
            {renderContent(msg.content)}
          </div>
          
          {/* Audio Button for AI */}
          {!isUser && msg.content !== '...' && (
              <button 
                onClick={handlePlayVoice} 
                disabled={isPlaying}
                className={`mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${isPlaying ? 'bg-accent-500/50 text-white' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
              >
                  <SpeakerIcon />
                  {isPlaying ? 'Говорит...' : 'Озвучить'}
              </button>
          )}

          {/* Generated Image Container */}
          {msg.imageUrl && (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-700 relative group">
              <img src={msg.imageUrl} alt="Generated content" className="w-full h-auto max-h-80 object-cover" />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onSaveToGallery(msg.imageUrl!, 'image', `Из чата: ${msg.content.slice(0, 30)}...`)}
                    className="p-2 bg-gray-900/80 rounded-full text-white hover:bg-accent-500 transition-colors"
                    title="Сохранить в галерею"
                  >
                      <SaveIcon />
                  </button>
              </div>
            </div>
          )}
          
          {/* Generated Video Container */}
          {msg.videoUrl && (
             <div className="mt-3 rounded-lg overflow-hidden border border-gray-700 relative group">
                <video src={msg.videoUrl} controls className="w-full h-auto max-h-80" />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <button 
                      onClick={() => onSaveToGallery(msg.videoUrl!, 'video', `Видео: ${msg.content.slice(0, 30)}...`)}
                      className="p-2 bg-gray-900/80 rounded-full text-white hover:bg-accent-500 transition-colors"
                      title="Сохранить в галерею"
                    >
                        <SaveIcon />
                    </button>
                </div>
             </div>
          )}
          
          <div className="text-[10px] text-gray-500 mt-2 text-right">
            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Pages ---

// 1. Create Character
const CreateCharacter = ({ onSave, onCancel }: { onSave: (c: Character) => void, onCancel: () => void }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadRef, setUploadRef] = useState<HTMLInputElement | null>(null);

  const handleGenerateAvatar = async () => {
    if (!desc) return alert("Введите описание для генерации");
    setIsGenerating(true);
    const url = await generateImage(`Anime style portrait, high quality, character avatar: ${desc}`, []);
    setAvatarUrl(url);
    setIsGenerating(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!name || !desc || !avatarUrl) return alert("Заполните все поля");
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    
    onSave({
      id: generateId(),
      name,
      description: desc,
      avatar: avatarUrl,
      color: randomColor,
      voice: voices[Math.floor(Math.random() * voices.length)],
      created_at: Date.now()
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-purple-500">
        Создание Личности
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Имя</label>
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-accent-500 outline-none transition-colors"
            placeholder="Например: Алиса"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Характер и Описание</label>
          <textarea 
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 h-32 text-white focus:border-accent-500 outline-none transition-colors resize-none"
            placeholder="Опишите внешность, характер, манеру речи. Будьте детальны."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Аватар</label>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="relative w-32 h-32 bg-gray-800 rounded-xl overflow-hidden border-2 border-dashed border-gray-600 flex items-center justify-center group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500 text-xs text-center p-2">Нет аватара</div>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
               <div className="flex gap-2">
                 <Button onClick={handleGenerateAvatar} isLoading={isGenerating} type="button">
                   Генерировать ИИ
                 </Button>
                 <Button variant="secondary" onClick={() => uploadRef?.click()} type="button">
                   Загрузить свое
                 </Button>
                 <input 
                   type="file" 
                   ref={setUploadRef} 
                   onChange={handleFileUpload} 
                   className="hidden" 
                   accept="image/*"
                 />
               </div>
               <p className="text-xs text-gray-500 max-w-xs">
                 ИИ сгенерирует аватар на основе вашего описания характера, либо вы можете загрузить свое фото.
               </p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex gap-4">
          <Button onClick={handleSubmit} className="flex-1">Создать</Button>
          <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        </div>
      </div>
    </div>
  );
};

// 2. Chat Interface
const ChatInterface = ({ session, characters, onUpdateSession, onUpdateCharacter, onBack, onOpenDirectChat, onSaveToGallery, setGlobalError }: { 
  session: ChatSession, 
  characters: Character[], 
  onUpdateSession: (s: ChatSession) => void,
  onUpdateCharacter: (c: Character) => void,
  onBack: () => void,
  onOpenDirectChat: (id: string) => void,
  onSaveToGallery: (url: string, type: 'image' | 'video' | 'background', caption: string) => void,
  setGlobalError: (msg: string | null) => void
}) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef(session);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef(input); // Track current input for interim results

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
  useEffect(() => {
      inputRef.current = input;
  }, [input]);

  const sessionCharacters = characters.filter(c => session.participants.includes(c.id));
  const getSessionAvatars = () => sessionCharacters.map(c => c.avatar).filter(a => a.startsWith('data:image'));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    if (window.confirm("Вы уверены, что хотите очистить историю чата? Это действие необратимо.")) {
        onUpdateSession({ ...session, messages: [] });
    }
  };

  const toggleNSFW = () => {
     onUpdateSession({ ...session, isNSFW: !session.isNSFW });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  // Voice Input Logic
  const toggleVoiceInput = async () => {
    // If already recording, stop it
    if (isRecording) {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
        return;
    }

    // Pre-check for microphone permission via getUserMedia
    // This is often required to 'wake up' permissions in some browsers/iframes before WebSpeech API works
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
        console.error("Mic check failed:", err);
        // Custom message for system denial
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('denied')) {
             alert("Доступ к микрофону запрещен. Разрешите доступ в настройках браузера (значок замка в адресной строке) и перезагрузите страницу.");
        } else {
             alert("Ошибка доступа к микрофону. Убедитесь, что он подключен и разрешен в системе.");
        }
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Ваш браузер не поддерживает голосовой ввод");

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = true; // KEEP RECORDING even after pauses
    recognition.interimResults = true; // SHOW RESULTS AS YOU SPEAK
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        setIsRecording(true);
    };

    recognition.onend = () => {
        setIsRecording(false);
    };
    
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
             // Often redundant with getUserMedia check but kept as fallback
             setGlobalError("Микрофон заблокирован. Проверьте разрешения.");
        } else if (event.error === 'audio-capture') {
             setGlobalError("Ошибка захвата аудио.");
        }
    };
    
    let finalTranscript = '';

    recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
             setInput(prev => {
                 const space = prev && !prev.endsWith(' ') ? ' ' : '';
                 return prev + space + finalTranscript;
             });
             finalTranscript = ''; 
        }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Automatic Background Update Logic
  const updateBackground = async () => {
    const currentSession = sessionRef.current;
    if (currentSession.messages.length < 3) return;

    try {
        const activeCharacters = characters.filter(c => currentSession.participants.includes(c.id));
        const charDescriptions = activeCharacters.map(c => `${c.name}: ${c.description}`);
        const charAvatars = activeCharacters.map(c => c.avatar).filter(a => a.startsWith('data:image'));
        const plot = await getPlotSummary(
            currentSession.messages.map(m => ({
                sender: m.senderName, 
                text: m.content 
            })),
            charDescriptions
        );
        const bg = await generateBackground(plot, charAvatars);
        if (bg) {
            onUpdateSession({ ...currentSession, backgroundUrl: bg });
        }
    } catch (error) {
        console.error("Failed to update background:", error);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(updateBackground, 60000); 
    const initialTimer = setTimeout(updateBackground, 5000); 
    return () => {
        clearInterval(intervalId);
        clearTimeout(initialTimer);
    };
  }, [session.id]); 

  // AI Response Logic
  const processAIResponse = async () => {
    let continueConversation = true;
    let loopCount = 0;
    const maxLoops = 5; 
    let chanceToSpeak = 1.0; 

    try {
        while (continueConversation && loopCount < maxLoops) {
            const currentHistory = [...sessionRef.current.messages];
            if (currentHistory.length === 0) break; 

            const lastSenderId = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1].senderId : 'user';
            const potentialSpeakers = sessionCharacters.filter(c => c.id !== lastSenderId);
            if (potentialSpeakers.length === 0) break; 

            const nextSpeaker = potentialSpeakers[Math.floor(Math.random() * potentialSpeakers.length)];
            const tempMsgId = generateId();
            const placeholderMsg: Message = {
                id: tempMsgId,
                senderId: nextSpeaker.id,
                senderName: nextSpeaker.name,
                content: "...", 
                timestamp: Date.now()
            };
            
            const nextState = { ...sessionRef.current, messages: [...currentHistory, placeholderMsg] };
            onUpdateSession(nextState);
            sessionRef.current = nextState; 

            try {
                const chatContext = currentHistory.map(m => ({sender: m.senderName, text: m.content}));
                const otherNames = sessionCharacters.filter(c => c.id !== nextSpeaker.id).map(c => c.name);
                otherNames.push("User");

                let currentContent = "";
                let finalImageUrl = undefined;
                let silenceDetected = false;

                const fullResponse = await streamCharacterResponse(
                    nextSpeaker.name,
                    nextSpeaker.description,
                    nextSpeaker.evolutionContext,
                    chatContext,
                    otherNames,
                    sessionRef.current.isNSFW || false,
                    (chunk) => {
                        currentContent = chunk;
                        if (currentContent.includes("[SILENCE]")) {
                            silenceDetected = true;
                        }
                        if (!silenceDetected) {
                            const msgsWithChunk = [...currentHistory, { ...placeholderMsg, content: chunk }];
                            onUpdateSession({ ...sessionRef.current, messages: msgsWithChunk });
                        }
                    }
                );

                if (fullResponse.includes("[SILENCE]")) {
                    const revertState = { ...sessionRef.current, messages: currentHistory };
                    onUpdateSession(revertState);
                    sessionRef.current = revertState; 
                    chanceToSpeak -= 0.1;
                } else {
                    let finalContent = fullResponse;
                    const imgTagMatch = fullResponse.match(/\[GEN_IMG:\s*(.*?)\]/);
                    if (imgTagMatch) {
                        finalContent = fullResponse.replace(imgTagMatch[0], '').trim();
                        try {
                            const prompt = `${nextSpeaker.description}, ${imgTagMatch[1]}`;
                            finalImageUrl = await generateImage(prompt, getSessionAvatars());
                        } catch (e) { console.error(e); }
                    }

                    const finalMsg: Message = {
                        id: tempMsgId,
                        senderId: nextSpeaker.id,
                        senderName: nextSpeaker.name,
                        content: finalContent,
                        imageUrl: finalImageUrl,
                        timestamp: Date.now()
                    };

                    const updatedHistory = [...currentHistory, finalMsg];
                    const finalizedState = { ...sessionRef.current, messages: updatedHistory };
                    onUpdateSession(finalizedState);
                    sessionRef.current = finalizedState; 

                    analyzeCharacterEvolution(
                        nextSpeaker.name,
                        nextSpeaker.description,
                        nextSpeaker.evolutionContext,
                        chatContext.concat({ sender: nextSpeaker.name, text: finalContent })
                    ).then(newEvo => {
                        if (newEvo && newEvo !== nextSpeaker.evolutionContext) {
                            onUpdateCharacter({ ...nextSpeaker, evolutionContext: newEvo });
                        }
                    });
                    chanceToSpeak -= 0.25; 
                }

            } catch (err: any) {
                console.error(err);
                // Revert placeholder on error
                const revertState = { ...sessionRef.current, messages: currentHistory };
                onUpdateSession(revertState);
                sessionRef.current = revertState;
                
                // Show global error if meaningful
                if (err.message) setGlobalError(err.message);
                break; // Stop loop on error
            }

            loopCount++;
            if (Math.random() > chanceToSpeak) {
                continueConversation = false;
            } else {
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
            }
        }
    } catch (e: any) {
        setGlobalError(e.message || "Ошибка чата");
    }
  };

  const handleMediaGeneration = async (type: 'photo' | 'video') => {
    if (session.messages.length === 0) return alert("Сначала начните общение");
    setIsProcessing(true);

    const activeChar = sessionCharacters[0] || { id: 'system', name: 'System', color: '#888' };
    const tempId = generateId();
    const placeholder: Message = {
        id: tempId,
        senderId: activeChar.id,
        senderName: activeChar.name,
        content: type === 'photo' ? "📸 Генерирую фото..." : "📹 Генерирую видео (это может занять время)...",
        timestamp: Date.now()
    };

    const newHistory = [...session.messages, placeholder];
    const newState = { ...session, messages: newHistory };
    onUpdateSession(newState);
    sessionRef.current = newState; 

    try {
        const plot = await getPlotSummary(session.messages.map(m => ({ sender: m.senderName, text: m.content })));
        let mediaUrl = "";
        let finalContent = type === 'photo' ? "Вот фото текущей ситуации:" : "Видео с места событий:";

        if (type === 'photo') {
            const prompt = `Scene description based on plot: ${plot}`;
            mediaUrl = await generateImage(prompt, getSessionAvatars());
        } else {
            mediaUrl = await generateVideo(plot);
        }

        if (!mediaUrl) throw new Error("Generation failed");

        const successMsg: Message = {
            id: tempId,
            senderId: activeChar.id,
            senderName: activeChar.name,
            content: finalContent,
            imageUrl: type === 'photo' ? mediaUrl : undefined,
            videoUrl: type === 'video' ? mediaUrl : undefined,
            timestamp: Date.now()
        };
        
        const successState = { ...sessionRef.current, messages: [...session.messages, successMsg] };
        onUpdateSession(successState);
        sessionRef.current = successState;

    } catch (e: any) {
        console.error(e);
        const errorState = { ...sessionRef.current, messages: session.messages };
        onUpdateSession(errorState);
        sessionRef.current = errorState;
        setGlobalError(e.message || "Не удалось сгенерировать медиа.");
    } finally {
        setIsProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: generateId(),
      senderId: 'user',
      senderName: 'Вы',
      content: input,
      timestamp: Date.now()
    };

    const newHistory = [...session.messages, userMsg];
    const newState = { ...session, messages: newHistory, lastUpdated: Date.now() };
    onUpdateSession(newState);
    sessionRef.current = newState;
    setInput('');
    setIsProcessing(true);
    await processAIResponse();
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {session.backgroundUrl && (
             <img src={session.backgroundUrl} className="w-full h-full object-cover opacity-50 transition-opacity duration-1000" alt="Background" />
        )}
      </div>

      {/* Header */}
      <div className="relative z-20 h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors mr-1">
            <ArrowLeftIcon />
          </button>
          <div>
            <h3 className="font-bold text-lg text-white leading-none shadow-black drop-shadow-md">{session.name}</h3>
            <div className="flex -space-x-2 overflow-hidden mt-1.5">
              {sessionCharacters.map(c => (
                <img key={c.id} className="inline-block h-5 w-5 rounded-full ring-2 ring-gray-900" src={c.avatar} alt={c.name} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
             {session.backgroundUrl && (
                 <Button 
                    variant="ghost" 
                    className="!p-2 text-gray-400 hover:text-accent-500" 
                    title="Сохранить фон в галерею"
                    onClick={() => onSaveToGallery(session.backgroundUrl!, 'background', `Фон чата ${session.name}`)}
                 >
                     <SaveIcon />
                 </Button>
             )}
             <button 
                onClick={toggleNSFW}
                className={`text-xs font-bold border rounded px-2 py-1 transition-all duration-300 ${session.isNSFW 
                    ? 'border-red-500 text-red-500 bg-red-900/20 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                    : 'border-gray-600 text-gray-500 hover:text-gray-300'}`}
             >
                {session.isNSFW ? 'NSFW' : 'SFW'}
             </button>
            <Button variant="ghost" className="!p-2 text-gray-400 hover:text-white" onClick={() => onOpenDirectChat(session.participants[0])} title="Личный чат">
                <ChatIcon />
            </Button>
            <Button variant="ghost" className="!p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={handleClearHistory} title="Очистить историю">
                <TrashIcon />
            </Button>
            <Button variant="ghost" className="!p-2">
                <SettingsIcon />
            </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-20 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto w-full space-y-4">
            {session.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                <p className="bg-gray-900/50 p-4 rounded-xl backdrop-blur-sm">Чат начался. Скажите "Привет"!</p>
            </div>
            )}
            {session.messages.map(msg => (
                <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    characters={characters} 
                    onSaveToGallery={onSaveToGallery} 
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-20 p-4 bg-gray-900/90 border-t border-gray-800 shrink-0">
        <div className="flex gap-2 max-w-4xl mx-auto items-end">
          <div className="flex gap-1 pb-1">
             <Button 
                variant="ghost" 
                className="!p-2 text-gray-400 hover:text-accent-500" 
                onClick={() => handleMediaGeneration('photo')}
                disabled={isProcessing || session.messages.length === 0}
                title="Сгенерировать фото ситуации"
             >
                 <CameraIcon />
             </Button>
             <Button 
                variant="ghost" 
                className="!p-2 text-gray-400 hover:text-accent-500" 
                onClick={() => handleMediaGeneration('video')}
                disabled={isProcessing || session.messages.length === 0}
                title="Сгенерировать видео ситуации"
             >
                 <VideoIcon />
             </Button>
          </div>
          <div className="flex-1 relative">
            <input
                className="w-full bg-gray-800 border-gray-700 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                placeholder="Напишите сообщение..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isProcessing && sendMessage()}
                disabled={isProcessing}
            />
            <button 
                onClick={toggleVoiceInput}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                title={isRecording ? "Остановить запись" : "Голосовой ввод"}
                disabled={isProcessing}
            >
                {isRecording ? <StopIcon /> : <MicIcon />}
            </button>
          </div>
          <Button onClick={sendMessage} disabled={!input.trim() || isProcessing} className="rounded-xl px-6 h-[50px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </Button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">ИИ может генерировать контент. Все персонажи вымышлены.</p>
      </div>
    </div>
  );
};

// 3. Gallery Page
const GalleryPage = ({ items, onDelete, onBack }: { items: GalleryItem[], onDelete: (id: string) => void, onBack: () => void }) => {
    return (
        <div className="min-h-screen bg-gray-950 p-6 animate-fade-in h-screen overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button onClick={onBack} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">
                        <ArrowLeftIcon />
                    </button>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-purple-500">
                        Галерея
                    </h2>
                </header>

                {items.length === 0 ? (
                    <div className="text-center text-gray-500 py-20 border-2 border-dashed border-gray-800 rounded-xl">
                        <ImageIcon className="mx-auto w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg">Галерея пуста</p>
                        <p className="text-sm mt-2">Сохраняйте фото и видео из чатов, нажимая на значок дискеты.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {items.map(item => (
                            <div key={item.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group relative">
                                <div className="aspect-square bg-gray-800 relative">
                                    {item.type === 'video' ? (
                                        <video src={item.url} controls className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <a href={item.url} download={`soulkyn_${item.type}_${item.id}`} className="p-2 bg-black/60 text-white rounded-full hover:bg-accent-500 transition-colors">
                                            <DownloadIcon />
                                        </a>
                                        <button 
                                            onClick={() => onDelete(item.id)}
                                            className="p-2 bg-black/60 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded uppercase font-bold tracking-wider">
                                        {item.type === 'background' ? 'Фон' : item.type === 'video' ? 'Видео' : 'Фото'}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-300 line-clamp-2">{item.caption || "Без описания"}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const App = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>(Page.HOME);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedChars, loadedChats, loadedGallery] = await Promise.all([
          storage.get<Character[]>('ai_rpg_chars'),
          storage.get<ChatSession[]>('ai_rpg_chats'),
          storage.get<GalleryItem[]>('ai_rpg_gallery')
        ]);

        if (loadedChars) setCharacters(loadedChars);
        if (loadedChats) setChats(loadedChats);
        if (loadedGallery) setGallery(loadedGallery);
        
        setIsDataLoaded(true); 
      } catch (e) {
        console.error("Critical storage error:", e);
        setGlobalError("Critical: Failed to load data. Please refresh.");
      }
    };
    loadData();
  }, []);

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (selectedChars.includes(id)) {
          setSelectedChars(prev => prev.filter(c => c !== id));
      } else {
          setSelectedChars(prev => [...prev, id]);
      }
  };

  const handleStartGroupChat = async () => {
      if (selectedChars.length === 0) return;
      const participants = characters.filter(c => selectedChars.includes(c.id));
      const newChat: ChatSession = {
          id: generateId(),
          name: participants.map(p => p.name).join(', '),
          participants: participants.map(p => p.id),
          messages: [],
          lastUpdated: Date.now()
      };
      
      const updatedChats = [newChat, ...chats];
      setChats(updatedChats);
      setActiveChatId(newChat.id);
      setSelectedChars([]);
      setPage(Page.CHAT);
      
      // Explicit Save
      await storage.set('ai_rpg_chats', updatedChats);
  };

  const handleStartDirectChat = async (charId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const existing = chats.find(c => c.participants.length === 1 && c.participants[0] === charId);
    if (existing) {
      setActiveChatId(existing.id);
      setPage(Page.CHAT);
      return;
    }
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    const newChat: ChatSession = {
      id: generateId(),
      name: char.name,
      participants: [charId],
      messages: [],
      lastUpdated: Date.now()
    };
    
    const newChats = [newChat, ...chats];
    setChats(newChats);
    setActiveChatId(newChat.id);
    setPage(Page.CHAT);
    
    // Explicit Save
    await storage.set('ai_rpg_chats', newChats);
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Удалить чат?")) {
          const newChats = chats.filter(c => c.id !== id);
          setChats(newChats);
          if (activeChatId === id) {
              setActiveChatId(null);
              setPage(Page.HOME);
          }
          // Explicit Save
          await storage.set('ai_rpg_chats', newChats);
      }
  };

  const handleSaveCharacter = async (c: Character) => {
      const newChars = [c, ...characters];
      setCharacters(newChars);
      setPage(Page.HOME);
      // Explicit Save
      await storage.set('ai_rpg_chars', newChars);
  };

  const handleUpdateSession = async (updatedSession: ChatSession) => {
      const newChats = chats.map(c => c.id === updatedSession.id ? updatedSession : c);
      setChats(newChats);
      // Explicit Save
      await storage.set('ai_rpg_chats', newChats);
  }
  
  const handleUpdateCharacter = async (updatedChar: Character) => {
      const newChars = characters.map(char => char.id === updatedChar.id ? updatedChar : char);
      setCharacters(newChars);
      // Explicit Save
      await storage.set('ai_rpg_chars', newChars);
  }

  // --- Gallery Actions ---
  const handleAddToGallery = async (url: string, type: 'image' | 'video' | 'background', caption: string) => {
      const newItem: GalleryItem = {
          id: generateId(),
          type,
          url,
          caption,
          timestamp: Date.now()
      };
      
      const newGallery = [newItem, ...gallery];
      setGallery(newGallery);
      
      try {
          // Explicit Save
          await storage.set('ai_rpg_gallery', newGallery);
          alert("Сохранено в галерею!");
      } catch (e) {
          console.error("Failed to save to gallery", e);
          alert("Ошибка сохранения! Возможно, файл слишком большой.");
      }
  };

  const handleDeleteFromGallery = async (id: string) => {
      if (window.confirm("Удалить из галереи?")) {
          const newGallery = gallery.filter(item => item.id !== id);
          setGallery(newGallery);
          // Explicit Save
          await storage.set('ai_rpg_gallery', newGallery);
      }
  };

  if (!isDataLoaded && !globalError) {
      return (
          <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400 font-mono animate-pulse">Загрузка...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
        {globalError && (
             <div className="bg-red-900/90 text-white p-3 text-center fixed top-0 w-full z-50 backdrop-blur border-b border-red-700 animate-fade-in flex justify-between items-center px-6">
                 <span>⚠️ {globalError}</span>
                 <button onClick={() => setGlobalError(null)} className="text-red-200 hover:text-white">✕</button>
             </div>
        )}

      {page === Page.HOME && (
          <div className="max-w-6xl mx-auto p-6 animate-fade-in pb-24 h-screen overflow-y-auto custom-scrollbar">
              <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 mt-6">
                  <div>
                      <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-purple-500 mb-2">
                        Soulkyn AI
                      </h1>
                      <div className="flex items-center gap-3">
                        <p className="text-gray-400">Ролевой ИИ чат</p>
                      </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => setPage(Page.GALLERY)} variant="secondary">
                        <GalleryIcon /> Галерея
                    </Button>
                    <Button onClick={() => setPage(Page.CREATE)}>
                        <PlusIcon /> Создать Персонажа
                    </Button>
                  </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-6">
                      <div className="flex justify-between items-center">
                          <h2 className="text-2xl font-bold flex items-center gap-2"><UsersIcon /> Ваши Персонажи</h2>
                          {selectedChars.length > 0 && (
                             <span className="text-accent-500 text-sm font-bold">Выбрано: {selectedChars.length}</span>
                          )}
                      </div>

                      {characters.length === 0 ? (
                          <div className="bg-gray-900/50 border-2 border-dashed border-gray-800 rounded-xl p-12 text-center">
                              <p className="text-gray-500 mb-4">Список персонажей пуст</p>
                              <Button variant="secondary" onClick={() => setPage(Page.CREATE)}>Создать первого</Button>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                              {characters.map(char => {
                                  const isSelected = selectedChars.includes(char.id);
                                  return (
                                  <div 
                                    key={char.id} 
                                    onClick={() => handleToggleSelect(char.id)}
                                    className={`relative bg-gray-900 border rounded-xl p-4 flex gap-4 transition-all group cursor-pointer ${isSelected ? 'border-accent-500 bg-accent-900/10' : 'border-gray-800 hover:border-gray-600'}`}
                                  >
                                      <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-accent-500 border-accent-500' : 'border-gray-600 bg-gray-900 group-hover:border-gray-400'}`}>
                                          {isSelected && <CheckIcon />}
                                      </div>

                                      <img src={char.avatar} alt={char.name} className="w-20 h-20 rounded-lg object-cover bg-gray-800 shrink-0" />
                                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                                          <div>
                                              <h3 className="font-bold text-lg truncate pr-8" style={{color: char.color}}>{char.name}</h3>
                                              <p className="text-sm text-gray-400 line-clamp-2 leading-snug">{char.description}</p>
                                          </div>
                                          <button 
                                            onClick={(e) => handleStartDirectChat(char.id, e)}
                                            className="text-xs font-bold text-gray-500 hover:text-white self-start mt-2 uppercase tracking-wide px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 transition-colors z-10"
                                          >
                                              Написать лично
                                          </button>
                                      </div>
                                  </div>
                              )})}
                          </div>
                      )}
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                      <h2 className="text-2xl font-bold flex items-center gap-2"><ChatIcon /> Чаты</h2>
                      <div className="space-y-3">
                          {chats.length === 0 && <p className="text-gray-500 italic">Нет активных чатов</p>}
                          {chats.map(chat => (
                              <div 
                                key={chat.id} 
                                onClick={() => { setActiveChatId(chat.id); setPage(Page.CHAT); }}
                                className="bg-gray-900 hover:bg-gray-800 p-3 rounded-xl cursor-pointer flex items-center gap-3 group relative transition-colors"
                              >
                                  <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden shrink-0 grid place-items-center">
                                      {chat.participants.length > 1 ? (
                                           <div className="grid grid-cols-2 w-full h-full gap-0.5">
                                               {chat.participants.slice(0, 4).map(pid => {
                                                   const p = characters.find(c => c.id === pid);
                                                   return p ? <img key={pid} src={p.avatar} className="w-full h-full object-cover" /> : null;
                                               })}
                                           </div>
                                      ) : (
                                          (() => {
                                              const p = characters.find(c => c.id === chat.participants[0]);
                                              return p ? <img src={p.avatar} className="w-full h-full object-cover" /> : <UsersIcon className="p-2 text-gray-500" />;
                                          })()
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-gray-200 truncate">{chat.name}</h4>
                                      <p className="text-xs text-gray-500 truncate">
                                          {chat.messages.length > 0 ? chat.messages[chat.messages.length-1].content : 'Пусто'}
                                      </p>
                                  </div>
                                  <button 
                                    onClick={(e) => deleteChat(e, chat.id)}
                                    className="p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                      <TrashIcon />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
              
              <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${selectedChars.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                  <Button onClick={handleStartGroupChat} className="shadow-2xl rounded-full px-8 py-4 text-lg animate-bounce-subtle">
                      Создать групповой чат ({selectedChars.length})
                  </Button>
              </div>
          </div>
      )}

      {page === Page.CREATE && (
          <div className="pt-10 pb-10 h-screen overflow-y-auto custom-scrollbar">
              <CreateCharacter 
                  onSave={handleSaveCharacter}
                  onCancel={() => setPage(Page.HOME)}
              />
          </div>
      )}

      {page === Page.GALLERY && (
          <GalleryPage 
              items={gallery}
              onDelete={handleDeleteFromGallery}
              onBack={() => setPage(Page.HOME)}
          />
      )}

      {page === Page.CHAT && activeChatId && (
          <div className="h-screen overflow-hidden">
              <ChatInterface 
                  session={chats.find(c => c.id === activeChatId)!}
                  characters={characters}
                  onUpdateSession={handleUpdateSession}
                  onUpdateCharacter={handleUpdateCharacter}
                  onBack={() => setPage(Page.HOME)}
                  onOpenDirectChat={(id) => handleStartDirectChat(id)}
                  onSaveToGallery={handleAddToGallery}
                  setGlobalError={setGlobalError}
              />
          </div>
      )}
    </div>
  );
};

export default App;