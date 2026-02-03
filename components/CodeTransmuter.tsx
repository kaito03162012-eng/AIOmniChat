import React, { useState } from 'react';
import { X, FlaskConical, Code, GitMerge } from 'lucide-react';

interface CodeTransmuterProps {
  onClose: () => void;
  onSend: (prompt: string) => void;
  darkMode: boolean;
  t: any;
}

export const CodeTransmuter: React.FC<CodeTransmuterProps> = ({ onClose, onSend, darkMode, t }) => {
  const [sourceCode, setSourceCode] = useState('');
  const [targetStruct, setTargetStruct] = useState('');

  const handleTransmute = () => {
    if (!sourceCode.trim() || !targetStruct.trim()) return;
    
    const prompt = `
【Code Transmutation Request】
Act as a professional "Code Porter/Transmuter".

[INPUT 1: SOURCE LOGIC]
Contains the key algorithm, techniques, or logic to preserve.
\`\`\`
${sourceCode}
\`\`\`

[INPUT 2: TARGET STRUCTURE]
Contains the framework, class design, variable naming conventions, and coding style to adapt to.
\`\`\`
${targetStruct}
\`\`\`

[INSTRUCTION]
Rewrite the logic from [INPUT 1] so that it perfectly matches the code style, framework structure, and variable naming conventions of [INPUT 2].
- DO NOT change the core logic of Input 1.
- DO NOT change the structural style of Input 2.
- Output ONLY the result code in a Markdown code block.
`;
    onSend(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} w-full max-w-4xl h-[85vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col`}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-500">
            <FlaskConical size={20} /> {t.labTitle}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          <div className="flex flex-col h-full gap-2">
            <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1"><Code size={14} /> {t.labSourceLabel}</label>
            <textarea 
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className={`flex-1 w-full p-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-xs ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              placeholder={t.labSourcePlace}
            />
          </div>
          
          <div className="flex flex-col h-full gap-2">
            <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1"><GitMerge size={14} /> {t.labTargetLabel}</label>
            <textarea 
              value={targetStruct}
              onChange={(e) => setTargetStruct(e.target.value)}
              className={`flex-1 w-full p-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-xs ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              placeholder={t.labTargetPlace}
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <button 
              onClick={handleTransmute}
              disabled={!sourceCode || !targetStruct}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <FlaskConical size={18} /> {t.labAction}
            </button>
        </div>
      </div>
    </div>
  );
};
