
import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Download, File, RotateCcw, ChevronDown, Folder, Code as CodeIcon, FileCode, Search, Terminal } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types';

interface ExtractedCode {
  id: string;
  name: string;
  language: string;
  content: string;
  timestamp: number;
}

interface CodeViewerProps {
  onClose: () => void;
  darkMode: boolean;
  messages: Message[];
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ onClose, darkMode, messages }) => {
  const extractedCodes = useMemo(() => {
    const codes: ExtractedCode[] = [];
    const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
    
    messages.forEach((msg, msgIndex) => {
      let match;
      let codeIndex = 1;
      while ((match = codeRegex.exec(msg.content)) !== null) {
        const lang = match[1] || 'text';
        const content = match[2].trim();
        
        let fileName = '';
        const firstLine = content.split('\n')[0].trim();
        if (firstLine.startsWith('--') || firstLine.startsWith('//') || firstLine.startsWith('#')) {
          const possibleName = firstLine.replace(/^[--|//|#|\s]*/, '').trim();
          if (possibleName.includes('.') && possibleName.length < 50) {
            fileName = possibleName;
          }
        }

        if (!fileName) {
          fileName = `Snippet_${msgIndex + 1}_${codeIndex}`;
        }

        codes.push({
          id: `${msg.id}-${codeIndex}`,
          name: fileName,
          language: lang.toUpperCase(),
          content: content,
          timestamp: msg.timestamp
        });
        codeIndex++;
      }
    });
    return codes.reverse();
  }, [messages]);

  const [selectedId, setSelectedId] = useState<string | null>(
    extractedCodes.length > 0 ? extractedCodes[0].id : null
  );
  const [copied, setCopied] = useState(false);

  const selectedFile = useMemo(() => 
    extractedCodes.find(f => f.id === selectedId) || null
  , [selectedId, extractedCodes]);

  const handleCopy = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (file: ExtractedCode) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.includes('.') ? file.name : `${file.name.toLowerCase()}.${file.language.toLowerCase() || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex-1 flex h-full border-l animate-in slide-in-from-right duration-500 shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
      
      {/* エクスプローラー（幅固定気味、中身はスクロール） */}
      <div className={`w-56 flex flex-col h-full border-r shrink-0 ${darkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white'}`}>
        <div className="px-4 py-4 border-b dark:border-gray-800 flex items-center justify-between bg-black/5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Explorer</span>
            <button onClick={onClose} className="sm:hidden p-1 hover:bg-white/10 rounded"><X size={14}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-2">
            <button className="w-full flex items-center gap-1.5 px-2 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
              <ChevronDown size={12} /> Generated Files
            </button>
            
            <div className="mt-1 space-y-0.5">
              {extractedCodes.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Terminal size={24} className="mx-auto mb-3 opacity-10" />
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest leading-relaxed">Wait for<br/>AI to generate</p>
                </div>
              ) : (
                extractedCodes.map(file => (
                  <div 
                    key={file.id} 
                    onClick={() => setSelectedId(file.id)}
                    className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      selectedId === file.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
                    }`}
                  >
                    <FileCode size={14} className={selectedId === file.id ? 'text-white' : 'text-blue-500'} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate tracking-tight">{file.name}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {extractedCodes.length > 0 && (
          <div className="p-3 border-t dark:border-gray-800 bg-black/5">
            <button 
              onClick={() => extractedCodes.forEach(handleDownload)}
              className="w-full py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
            >
              <Download size={14} /> Export All
            </button>
          </div>
        )}
      </div>

      {/* エディタ（残りの幅をすべて埋める） */}
      <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] min-w-0 relative">
        {!selectedFile ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-700">
            <CodeIcon size={48} className="opacity-5 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Select a file to view</p>
          </div>
        ) : (
          <>
            <div className="h-14 px-4 flex items-center justify-between bg-[#252526] border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] rounded-t-xl border-t border-x border-white/5 relative -bottom-[7px] shadow-2xl">
                  <FileCode size={14} className="text-blue-400" />
                  <span className="text-[11px] font-bold text-gray-300 truncate max-w-[200px]">{selectedFile.name}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all border border-white/5 ${copied ? 'text-green-400' : 'text-gray-400'}`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>
                <button onClick={onClose} className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar-dark bg-[#1e1e1e]">
              <SyntaxHighlighter
                language={selectedFile.language.toLowerCase()}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  background: 'transparent',
                  fontSize: '0.8rem',
                  lineHeight: '1.6',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                showLineNumbers
                lineNumberStyle={{ color: '#444', minWidth: '3.5em', textAlign: 'right', paddingRight: '1.5rem', userSelect: 'none' }}
              >
                {selectedFile.content}
              </SyntaxHighlighter>
            </div>
            
            <div className="h-7 px-4 bg-blue-600 flex items-center justify-between text-[9px] font-black text-white uppercase tracking-widest shrink-0">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><RotateCcw size={10}/> BRANCH: MAIN</span>
                <span>{selectedFile.language}</span>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <span>UTF-8</span>
                <span>LF</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
