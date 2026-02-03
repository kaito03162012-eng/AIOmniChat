
import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Plus, MessageSquare, Settings, Sun, Moon, 
  Send, Bot, Sparkles, Scale, BrainCircuit, X, Trash2,
  ChevronDown, Globe, Code, FileText, Terminal, Wand2,
  Zap, PenTool, LayoutTemplate, Bug, Search, Languages,
  History, Users, PanelLeftClose, PanelLeftOpen, Type,
  Share2, HelpCircle, Layout, Users2, FileJson, Paperclip,
  ImageIcon as ImageIcon, File, Download, Copy, StopCircle, RefreshCw, Eraser,
  Box, FlaskConical, GitMerge, ArrowRight, Stethoscope, Youtube,
  Mic, MicOff, Volume2, Radio, UserCog, CheckCircle2, MoreHorizontal, PanelRight
} from 'lucide-react';
import { streamGenerateResponse } from './services/geminiService';
import { Message, Agent, ChatSession, Role, ModelId, AppSettings, GenerationConfig, QuickAction, Attachment } from './types';
import { AgentCreator } from './components/AgentCreator';
import { ChatMessageItem } from './components/ChatMessageItem';
import { CodeTransmuter } from './components/CodeTransmuter';
import { CodeDoctor } from './components/CodeDoctor';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { CodeViewer } from './components/CodeViewer';

const TRANSLATIONS = {
  ja: {
    assistants: "アシスタント",
    history: "履歴",
    createAgent: "作成",
    availableAgents: "エージェント",
    newChat: "新規チャット",
    noHistory: "履歴なし",
    delete: "削除",
    deepThink: "思考",
    tenbin: "天秤",
    codeLab: "ラボ",
    codeDoctor: "診断",
    export: "出力",
    copy: "コピー",
    settings: "設定",
    sessionSettings: "AIの性格（ペルソナ）設定",
    personalityPlaceholder: "例: あなたはプログラミング講師です...",
    save: "保存",
    personalitySaved: "更新完了",
    greeting: "何かお手伝いしましょうか？",
    thinking: "思考中...",
    cancelled: "中断",
    error: "エラー",
    filesAttached: "添付",
    inputPlaceholder: "メッセージを入力...",
    inputPlaceholderCompare: "比較対象を入力...",
    send: "送信",
    stop: "停止",
    magicTools: "ツール",
    attach: "添付",
    liveVoice: "ボイス",
    voiceConnecting: "接続中...",
    voiceListening: "聞き取り...",
    voiceSpeaking: "応答中...",
    voiceError: "エラー",
    appearance: "外観",
    darkMode: "ダーク",
    fontSize: "サイズ",
    behavior: "動作",
    language: "言語",
    enterToSend: "Enter送信",
    clearAll: "全削除",
    confirmClear: "削除しますか？",
    labTitle: "コードラボ",
    debugTitle: "クリニック",
    small: "小",
    medium: "中",
    large: "大",
    toggleCodeView: "コード表示"
  },
  en: {
    assistants: "Assistants",
    history: "History",
    createAgent: "Create",
    availableAgents: "Agents",
    newChat: "New",
    noHistory: "No history",
    delete: "Delete",
    deepThink: "Think",
    tenbin: "Compare",
    codeLab: "Lab",
    codeDoctor: "Clinic",
    export: "Export",
    copy: "Copy",
    settings: "Settings",
    sessionSettings: "Personality",
    personalityPlaceholder: "e.g. You are a coach...",
    save: "Save",
    personalitySaved: "Saved",
    greeting: "How can I help?",
    thinking: "Thinking...",
    cancelled: "Cancelled",
    error: "Error",
    filesAttached: "Files",
    inputPlaceholder: "Type message...",
    inputPlaceholderCompare: "Compare...",
    send: "Send",
    stop: "Stop",
    magicTools: "Tools",
    attach: "Attach",
    liveVoice: "Voice",
    voiceConnecting: "Connecting...",
    voiceListening: "Listening...",
    voiceSpeaking: "Speaking...",
    voiceError: "Error",
    appearance: "Appearance",
    darkMode: "Dark",
    fontSize: "Font",
    behavior: "Behavior",
    language: "Lang",
    enterToSend: "Enter Send",
    clearAll: "Clear",
    confirmClear: "Delete all?",
    labTitle: "Code Lab",
    debugTitle: "Clinic",
    small: "S",
    medium: "M",
    large: "L",
    toggleCodeView: "Code"
  }
};

const DEFAULT_AGENTS: Agent[] = [
  { id: 'general', name: 'Gemini', description: '標準アシスタント', systemInstruction: 'あなたはGoogleのGeminiです。丁寧に回答してください。', icon: 'bot', isSystem: true, category: 'general' },
  { id: 'coder', name: 'Coding', description: '開発支援', systemInstruction: 'あなたは優秀なプログラマです。', icon: 'code', isSystem: true, category: 'coding' }
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'summary', label: '要約', promptTemplate: '以下の内容を3つのポイントで要約してください：\n\n', icon: 'file-text', category: 'util' },
  { id: 'debug', label: 'デバッグ', promptTemplate: '以下のコードのバグを見つけて修正案を提示してください：\n\n', icon: 'bug', category: 'dev' },
  { id: 'trans', label: '翻訳', promptTemplate: '以下の日本語を自然な英語に翻訳してください：\n\n', icon: 'languages', category: 'util' },
];

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({ darkMode: true, language: 'ja', fontSize: 'medium', enterToSend: true });
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [sidebarTab, setSidebarTab] = useState<'agents' | 'history'>('agents');
  const [isAgentCreatorOpen, setIsAgentCreatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  const [isCodeLabOpen, setIsCodeLabOpen] = useState(false);
  const [isCodeDoctorOpen, setIsCodeDoctorOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationIdRef = useRef<string | null>(null);
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>(ModelId.GEMINI_3_PRO);
  const [config, setConfig] = useState<GenerationConfig>({ thinkingMode: false, comparisonMode: false });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[settings.language];

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  useEffect(() => {
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, currentSessionId, isGenerating]); 

  useEffect(() => {
    if (sessions.length === 0) createNewSession(DEFAULT_AGENTS[0].id);
  }, []);

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);
  const currentSessionData = getCurrentSession();

  const getCurrentAgent = () => {
    return agents.find(a => a.id === currentSessionData?.agentId) || DEFAULT_AGENTS[0];
  };

  const createNewSession = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId) || DEFAULT_AGENTS[0];
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: t.newChat,
      messages: [],
      agentId,
      modelId: selectedModel,
      updatedAt: Date.now(),
      customSystemInstruction: agent.systemInstruction
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setSidebarTab('history');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (rev) => {
        const base64 = (rev.target?.result as string).split(',')[1];
        const att: Attachment = { id: Date.now().toString() + Math.random(), name: file.name, mimeType: file.type, data: base64 };
        setAttachments(prev => [...prev, att]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (rev) => {
            const base64 = (rev.target?.result as string).split(',')[1];
            const att: Attachment = { id: Date.now().toString(), name: 'Pasted Image', mimeType: file.type, data: base64 };
            setAttachments(prev => [...prev, att]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() && attachments.length === 0) return;
    if (!currentSessionId) return;
    
    if (isGenerating) handleStopGeneration();
    const session = getCurrentSession();
    if (!session) return;
    
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    
    const userMessage: Message = { id: Date.now().toString(), role: Role.USER, content: textToSend, timestamp: Date.now(), attachments: currentAttachments };
    const updatedMessages = [...session.messages, userMessage];
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
      ...s, 
      messages: updatedMessages, 
      title: s.messages.length === 0 ? textToSend.slice(0, 30) : s.title, 
      updatedAt: Date.now() 
    } : s));
    
    setIsGenerating(true);
    const thisGenId = Date.now().toString();
    generationIdRef.current = thisGenId;
    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = { id: botMessageId, role: Role.MODEL, content: '', timestamp: Date.now() };
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...updatedMessages, botMessage] } : s));
    
    try {
      const stream = streamGenerateResponse({
        modelId: selectedModel,
        history: updatedMessages,
        prompt: userMessage.content,
        attachments: userMessage.attachments,
        systemInstruction: session.customSystemInstruction,
        enableThinking: config.thinkingMode,
        enableComparison: config.comparisonMode,
        language: settings.language
      });
      
      let accumulatedText = '';
      for await (const chunk of stream) {
        if (generationIdRef.current !== thisGenId) break; 
        accumulatedText += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            const msgs = [...s.messages];
            const lastMsgIndex = msgs.findIndex(m => m.id === botMessageId);
            if (lastMsgIndex !== -1) msgs[lastMsgIndex] = { ...msgs[lastMsgIndex], content: accumulatedText };
            return { ...s, messages: msgs };
          }
          return s;
        }));
      }
    } catch (error) { console.error(error); } finally { setIsGenerating(false); }
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
    generationIdRef.current = null;
  };

  const handleSaveVoiceHistory = (voiceMessages: any[]) => {
    if (voiceMessages.length === 0) return;
    const formattedMessages: Message[] = voiceMessages.map(m => ({
      id: m.id, role: m.role === 'user' ? Role.USER : Role.MODEL, content: m.text, timestamp: m.timestamp
    }));
    if (currentSessionId && currentSessionData) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s, messages: [...s.messages, ...formattedMessages], updatedAt: Date.now()
      } : s));
    } else {
      createNewSession('general');
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.promptTemplate);
    setIsQuickToolsOpen(false);
    inputRef.current?.focus();
  };

  const handleUpdateSessionPersonality = (instruction: string) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
      ...s, 
      customSystemInstruction: instruction,
      updatedAt: Date.now() 
    } : s));
  };

  return (
    <div className={`flex h-screen overflow-hidden ${settings.darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'} font-sans relative`}>
      
      {/* Sidebar - Overlay logic for mobile */}
      <div className={`fixed inset-0 z-40 lg:relative lg:inset-auto ${isSidebarOpen ? 'visible' : 'invisible lg:hidden'}`}>
        <div 
          className={`absolute inset-0 bg-black/50 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <div className={`w-72 h-full flex flex-col bg-white dark:bg-gray-900 border-r dark:border-gray-800 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="p-4 border-b dark:border-gray-800 h-16 flex items-center justify-between">
            <h1 className="font-bold text-lg flex items-center gap-2"><Zap size={20} className="text-blue-600" /> Omni</h1>
            <button onClick={() => createNewSession(DEFAULT_AGENTS[0].id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-500"><Plus size={20}/></button>
          </div>
          <div className="flex p-2 gap-1 border-b dark:border-gray-800 bg-gray-50 dark:bg-black/20">
            <button onClick={() => setSidebarTab('agents')} className={`flex-1 py-1.5 rounded-md text-xs font-black transition-all ${sidebarTab === 'agents' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}>{t.assistants}</button>
            <button onClick={() => setSidebarTab('history')} className={`flex-1 py-1.5 rounded-md text-xs font-black transition-all ${sidebarTab === 'history' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-500'}`}>{t.history}</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {sidebarTab === 'agents' ? (
              <div className="space-y-1.5">
                <button onClick={() => setIsAgentCreatorOpen(true)} className="w-full p-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-blue-500 text-gray-500 transition-all font-bold text-xs flex items-center gap-3"><Plus size={16}/> {t.createAgent}</button>
                {agents.map(agent => (
                  <button key={agent.id} onClick={() => { createNewSession(agent.id); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all ${currentSessionData?.agentId === agent.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800"><Bot size={18}/></div>
                    <div className="min-w-0 flex-1"><div className="font-bold text-xs truncate">{agent.name}</div><div className="text-[10px] text-gray-500 truncate">{agent.description}</div></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map(session => (
                  <div key={session.id} onClick={() => { setCurrentSessionId(session.id); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-all ${currentSessionId === session.id ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
                    <MessageSquare size={14} className={currentSessionId === session.id ? 'text-blue-500' : 'text-gray-400'} />
                    <div className="flex-1 text-xs truncate font-bold">{session.title}</div>
                    <button onClick={(e) => {e.stopPropagation(); setSessions(s => s.filter(x => x.id !== session.id))}} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 border-b dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><PanelLeftClose size={20} /></button>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-xs uppercase tracking-tighter">{getCurrentAgent().name}</span>
              <button onClick={() => setIsSessionSettingsOpen(true)} className="text-[9px] text-blue-500 hover:underline flex items-center gap-1 font-black"><UserCog size={9} /> PERSONALITY</button>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="hidden md:block relative">
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as ModelId)} className="pl-3 pr-8 py-1.5 rounded-lg text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-900 border dark:border-gray-800 outline-none appearance-none cursor-pointer">
                <optgroup label="Gemini 3 (Latest Preview)">
                  <option value={ModelId.GEMINI_3_PRO}>Gemini 3 Pro</option>
                  <option value={ModelId.GEMINI_3_FLASH}>Gemini 3 Flash</option>
                </optgroup>
                <optgroup label="Gemini 2.0 (Stable/Exp)">
                  <option value={ModelId.GEMINI_2_0_PRO}>Gemini 2.0 Pro Exp</option>
                  <option value={ModelId.GEMINI_2_0_FLASH}>Gemini 2.0 Flash</option>
                  <option value={ModelId.GEMINI_2_0_FLASH_LITE}>Gemini 2.0 Flash Lite</option>
                </optgroup>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            </div>
            
            <button onClick={() => setIsLiveVoiceOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"><Radio size={14} className="animate-pulse" /> {t.liveVoice}</button>
            
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-1 gap-1">
               <button onClick={() => setIsCodeViewOpen(!isCodeViewOpen)} className={`p-1.5 rounded-md transition-all ${isCodeViewOpen ? 'bg-blue-600 text-white' : 'text-gray-400'}`} title={t.toggleCodeView}><PanelRight size={16} /></button>
               <button onClick={() => setConfig(p => ({...p, thinkingMode: !p.thinkingMode}))} className={`p-1.5 rounded-md transition-all ${config.thinkingMode ? 'bg-purple-600 text-white' : 'text-gray-400'}`} title={t.deepThink}><BrainCircuit size={16} /></button>
               <button onClick={() => setConfig(p => ({...p, comparisonMode: !p.comparisonMode}))} className={`p-1.5 rounded-md transition-all ${config.comparisonMode ? 'bg-amber-600 text-white' : 'text-gray-400'}`} title={t.tenbin}><Scale size={16} /></button>
            </div>

            <div className="hidden sm:flex items-center gap-1 border-l dark:border-gray-800 ml-1 pl-1">
              <button onClick={() => setIsCodeLabOpen(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-indigo-500" title={t.codeLab}><FlaskConical size={16} /></button>
              <button onClick={() => setIsCodeDoctorOpen(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-rose-500" title={t.codeDoctor}><Stethoscope size={16} /></button>
            </div>
            
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"><Settings size={20} /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Panel */}
          <div className={`flex-1 flex flex-col min-w-[320px] transition-all duration-500 relative bg-white dark:bg-black overflow-hidden`}>
            <main className={`flex-1 overflow-y-auto p-4 sm:p-8 ${settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
              <div className="max-w-3xl mx-auto space-y-10 pb-40">
                {currentSessionData?.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                    <div className="w-16 h-16 rounded-3xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-6"><Sparkles size={32}/></div>
                    <h3 className="text-lg font-black tracking-widest">{t.greeting}</h3>
                  </div>
                )}
                {currentSessionData?.messages.map((msg, index) => (
                  <ChatMessageItem key={msg.id} message={msg} agentIcon={getCurrentAgent().icon} isLast={index === (currentSessionData?.messages.length || 0) - 1} isGenerating={isGenerating} darkMode={settings.darkMode} t={t} />
                ))}
                <div ref={el => setMessagesEndRef(el)} />
              </div>
            </main>

            {/* Input Container */}
            <div className="p-4 sm:p-6 bg-gradient-to-t from-white dark:from-black via-white dark:via-black absolute bottom-0 left-0 right-0 z-20">
              <div className="max-w-3xl mx-auto flex flex-col gap-3">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 animate-in slide-in-from-bottom-2">
                    {attachments.map(att => (
                      <div key={att.id} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 w-16 h-16 bg-gray-100 dark:bg-gray-800 shadow-xl">
                        {att.mimeType.startsWith('image/') ? <img src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><File size={20}/></div>}
                        <button onClick={() => setAttachments(prev => prev.filter(x => x.id !== att.id))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={10}/></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <button onClick={() => setIsQuickToolsOpen(!isQuickToolsOpen)} className={`p-3 rounded-full border transition-all ${isQuickToolsOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'}`}><Wand2 size={20} /></button>
                    {isQuickToolsOpen && (
                      <div className="absolute bottom-24 left-6 flex flex-col gap-1.5 p-2 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 shadow-2xl animate-in zoom-in-90 z-50">
                        {QUICK_ACTIONS.map(action => (
                          <button key={action.id} onClick={() => handleQuickAction(action)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl whitespace-nowrap text-[11px] font-black transition-all uppercase tracking-tight">{action.label}</button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"><Paperclip size={20} /></button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
                  </div>

                  <div className="relative flex-1">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && settings.enterToSend) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder={config.comparisonMode ? t.inputPlaceholderCompare : t.inputPlaceholder}
                      className={`w-full px-5 py-3.5 rounded-2xl border resize-none outline-none shadow-xl focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm ${settings.darkMode ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-200'}`}
                      rows={1}
                      style={{ minHeight: '52px', maxHeight: '160px' }}
                    />
                  </div>

                  <button 
                    onClick={() => isGenerating ? handleStopGeneration() : handleSendMessage()} 
                    disabled={!isGenerating && !input.trim() && attachments.length === 0}
                    className={`p-3.5 mb-1 rounded-full active:scale-90 transition-all shadow-xl ${isGenerating ? 'bg-red-500 text-white animate-pulse' : (!input.trim() && attachments.length === 0) ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-blue-600 text-white shadow-blue-500/20'}`}
                  >
                    {isGenerating ? <StopCircle size={22} /> : <Send size={22} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Code Viewer - Dynamic sizing */}
          {isCodeViewOpen && (
            <div className={`hidden sm:flex h-full transition-all duration-300 ${isCodeViewOpen ? 'w-[45%] min-w-[500px]' : 'w-0 overflow-hidden'}`}>
              <CodeViewer 
                onClose={() => setIsCodeViewOpen(false)}
                darkMode={settings.darkMode}
                messages={currentSessionData?.messages || []}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals ... (Remains largely the same, integrated via state) */}
      {isLiveVoiceOpen && (
        <LiveVoiceModal 
          onClose={() => setIsLiveVoiceOpen(false)} 
          onSaveHistory={handleSaveVoiceHistory} 
          systemInstruction={currentSessionData?.customSystemInstruction || getCurrentAgent().systemInstruction} 
          history={currentSessionData?.messages || []}
          darkMode={settings.darkMode} 
          t={t} 
        />
      )}
      
      {isCodeLabOpen && <CodeTransmuter onClose={() => setIsCodeLabOpen(false)} onSend={(p) => { setIsCodeLabOpen(false); handleSendMessage(p); }} darkMode={settings.darkMode} t={t} />}
      {isCodeDoctorOpen && <CodeDoctor onClose={() => setIsCodeDoctorOpen(false)} onSend={(p) => { setIsCodeDoctorOpen(false); handleSendMessage(p); }} darkMode={settings.darkMode} t={t} />}
      {isAgentCreatorOpen && <AgentCreator onClose={() => setIsAgentCreatorOpen(false)} onSave={(agent) => { setAgents(prev => [...prev, agent]); setIsAgentCreatorOpen(false); createNewSession(agent.id); }} darkMode={settings.darkMode} lang={settings.language} />}
      
      {isSessionSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in zoom-in duration-300">
          <div className={`${settings.darkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} w-full max-w-xl rounded-3xl p-8 shadow-2xl border`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black flex items-center gap-3 tracking-tighter"><UserCog size={24} className="text-blue-500" /> {t.sessionSettings}</h2>
              <button onClick={() => setIsSessionSettingsOpen(false)} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <textarea 
              defaultValue={currentSessionData?.customSystemInstruction || ''} 
              onBlur={(e) => handleUpdateSessionPersonality(e.target.value)}
              className={`w-full p-5 rounded-2xl border h-56 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-mono text-sm leading-relaxed ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              placeholder={t.personalityPlaceholder}
            />
            <div className="mt-8 flex justify-end gap-4"><button onClick={() => setIsSessionSettingsOpen(false)} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest">{t.save}</button></div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className={`${settings.darkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} w-full max-w-md rounded-3xl border shadow-2xl p-8 space-y-6`}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-black tracking-widest uppercase">Settings</h2><button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button></div>
            
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] text-gray-500">{settings.darkMode ? <Moon size={14} className="text-blue-400" /> : <Sun size={14} className="text-amber-500" />} {t.darkMode}</div>
                <input type="checkbox" checked={settings.darkMode} onChange={() => setSettings(s => ({...s, darkMode: !s.darkMode}))} className="w-10 h-6 appearance-none bg-gray-300 dark:bg-gray-700 rounded-full checked:bg-blue-600 transition-all relative cursor-pointer after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-4 after:h-4 after:rounded-full checked:after:translate-x-4" />
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-800 space-y-2.5">
                 <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]"><Languages size={14}/> {t.language}</div>
                 <div className="flex gap-2">
                   {['ja', 'en'].map(l => (
                     <button key={l} onClick={() => setSettings(s => ({...s, language: l as 'ja' | 'en'}))} className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${settings.language === l ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 uppercase'}`}>{l === 'ja' ? '日本語' : 'English'}</button>
                   ))}
                 </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-800 space-y-2.5">
                 <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]"><Type size={14}/> {t.fontSize}</div>
                 <div className="flex gap-2">
                   {(['small', 'medium', 'large'] as const).map(f => (
                     <button key={f} onClick={() => setSettings(s => ({...s, fontSize: f}))} className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${settings.fontSize === f ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 uppercase'}`}>{t[f]}</button>
                   ))}
                 </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] text-gray-500"><Terminal size={14}/> {t.enterToSend}</div>
                <input type="checkbox" checked={settings.enterToSend} onChange={() => setSettings(s => ({...s, enterToSend: !s.enterToSend}))} className="w-10 h-6 appearance-none bg-gray-300 dark:bg-gray-700 rounded-full checked:bg-blue-600 transition-all relative cursor-pointer after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-4 after:h-4 after:rounded-full checked:after:translate-x-4" />
              </div>
            </div>

            <div className="text-center text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] opacity-40 pt-4">OmniChat v7.0 • RESPONSIVE REFINED</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
