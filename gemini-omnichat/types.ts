
export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export enum ModelId {
  // V3 Series (Latest Preview)
  GEMINI_3_PRO = 'gemini-3-pro-preview',
  GEMINI_3_FLASH = 'gemini-3-flash-preview',
  
  // V2.0 Series (Stable / Experimental)
  GEMINI_2_0_PRO = 'gemini-2.0-pro-exp-02-05',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite-preview-02-05',
}

export interface Attachment {
  id: string;
  data: string; // Base64 string
  mimeType: string;
  name: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  icon: string; 
  isSystem?: boolean; 
  category?: 'coding' | 'writing' | 'general' | 'analysis';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  agentId: string;
  modelId: ModelId;
  updatedAt: number;
  customSystemInstruction?: string; // 個別の性格設定
}

export interface AppSettings {
  darkMode: boolean;
  language: 'ja' | 'en';
  fontSize: 'small' | 'medium' | 'large';
  enterToSend: boolean;
}

export interface GenerationConfig {
  thinkingMode: boolean; 
  comparisonMode: boolean; 
}

export interface QuickAction {
  id: string;
  label: string;
  promptTemplate: string;
  icon: string;
  category: 'code' | 'write' | 'analyze' | 'util' | 'fun' | 'business' | 'dev';
}
