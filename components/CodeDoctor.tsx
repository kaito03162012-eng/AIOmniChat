import React, { useState } from 'react';
import { X, Stethoscope, Code, AlertTriangle, Bug } from 'lucide-react';

interface CodeDoctorProps {
  onClose: () => void;
  onSend: (prompt: string) => void;
  darkMode: boolean;
  t: any;
}

export const CodeDoctor: React.FC<CodeDoctorProps> = ({ onClose, onSend, darkMode, t }) => {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState('');

  const handleDiagnose = () => {
    if (!code.trim()) return;
    
    // Simple prompt without enforced roles
    const prompt = `
以下のコードにエラーや問題があります。修正してください。

[Code]
\`\`\`
${code}
\`\`\`

[Errors/Logs]
\`\`\`
${errors}
\`\`\`
`;
    onSend(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} w-full max-w-4xl h-[85vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-rose-500">
            <Stethoscope size={20} /> {t.debugTitle}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Source Code Input */}
          <div className="flex flex-col h-full gap-2">
            <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
              <Code size={14} /> {t.debugCodeLabel}
            </label>
            <textarea 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`flex-1 w-full p-4 rounded-xl border focus:ring-2 focus:ring-rose-500 outline-none resize-none font-mono text-xs ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              placeholder={t.debugCodePlace}
            />
          </div>
          
          {/* Error Log Input */}
          <div className="flex flex-col h-full gap-2">
            <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
              <AlertTriangle size={14} /> {t.debugErrorLabel}
            </label>
            <textarea 
              value={errors}
              onChange={(e) => setErrors(e.target.value)}
              className={`flex-1 w-full p-4 rounded-xl border focus:ring-2 focus:ring-rose-500 outline-none resize-none font-mono text-xs ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              placeholder={t.debugErrorPlace}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <button 
              onClick={handleDiagnose}
              disabled={!code.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Bug size={18} /> {t.debugAction}
            </button>
        </div>
      </div>
    </div>
  );
};