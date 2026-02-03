import React, { useState } from 'react';
import { X, Bot, Sparkles, Code, Terminal, FileText, Gavel, Globe } from 'lucide-react';
import { Agent } from '../types';

interface AgentCreatorProps {
  onClose: () => void;
  onSave: (agent: Agent) => void;
  darkMode: boolean;
  lang: 'ja' | 'en';
}

const ICONS = [
  { id: 'bot', icon: <Bot /> },
  { id: 'sparkles', icon: <Sparkles /> },
  { id: 'code', icon: <Code /> },
  { id: 'terminal', icon: <Terminal /> },
  { id: 'file-text', icon: <FileText /> },
  { id: 'gavel', icon: <Gavel /> },
  { id: 'globe', icon: <Globe /> },
];

const TRANSLATIONS = {
  ja: {
    title: "新規AIエージェント作成",
    iconLabel: "アイコン選択",
    nameLabel: "エージェント名",
    namePlaceholder: "例: React専門コーチ",
    descLabel: "短い説明",
    descPlaceholder: "サイドバーに表示されます",
    promptLabel: "システム指示 (プロンプト)",
    promptPlaceholder: "あなたは〇〇の専門家です。〜のように振る舞ってください...",
    promptHint: "具体的な指示を書くほど精度が上がります",
    cancel: "キャンセル",
    create: "エージェントを作成"
  },
  en: {
    title: "Create New AI Agent",
    iconLabel: "Select Icon",
    nameLabel: "Agent Name",
    namePlaceholder: "e.g. React Coach",
    descLabel: "Short Description",
    descPlaceholder: "Shown in sidebar",
    promptLabel: "System Instruction (Prompt)",
    promptPlaceholder: "You are an expert in... Act like...",
    promptHint: "More specific instructions lead to better results",
    cancel: "Cancel",
    create: "Create Agent"
  }
};

export const AgentCreator: React.FC<AgentCreatorProps> = ({ onClose, onSave, darkMode, lang }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instruction, setInstruction] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('bot');

  const t = TRANSLATIONS[lang];

  const handleSave = () => {
    if (!name || !instruction) return;
    
    const newAgent: Agent = {
      id: Date.now().toString(),
      name,
      description,
      systemInstruction: instruction,
      icon: selectedIcon,
      isSystem: false,
      category: 'general'
    };
    
    onSave(newAgent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] scale-100`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="text-blue-500" size={18} />
            {t.title}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-70">{t.iconLabel}</label>
            <div className="flex gap-3 flex-wrap">
              {ICONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedIcon(item.id)}
                  className={`p-3 rounded-xl transition-all ${
                    selectedIcon === item.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 24 })}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t.nameLabel}</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                  darkMode ? 'bg-gray-800 border-gray-700 placeholder-gray-500' : 'bg-gray-50 border-gray-200'
                }`}
                placeholder={t.namePlaceholder}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t.descLabel}</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                  darkMode ? 'bg-gray-800 border-gray-700 placeholder-gray-500' : 'bg-gray-50 border-gray-200'
                }`}
                placeholder={t.descPlaceholder}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t.promptLabel}</label>
              <textarea 
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={6}
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-mono text-sm ${
                  darkMode ? 'bg-gray-800 border-gray-700 placeholder-gray-500' : 'bg-gray-50 border-gray-200'
                }`}
                placeholder={t.promptPlaceholder}
              />
              <p className="text-xs text-gray-500 mt-2 text-right">{t.promptHint}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'} flex justify-end gap-3`}>
          <button 
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            {t.cancel}
          </button>
          <button 
            onClick={handleSave}
            disabled={!name || !instruction}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t.create}
          </button>
        </div>

      </div>
    </div>
  );
};