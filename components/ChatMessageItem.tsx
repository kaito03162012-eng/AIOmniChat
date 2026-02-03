
import React, { memo, useRef, useEffect, useState } from 'react';
import { Bot, Code, PenTool, Search, Terminal, FileText, Box, Sparkles, X, File } from 'lucide-react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageItemProps {
  message: Message;
  agentIcon: string;
  isLast: boolean;
  isGenerating: boolean;
  darkMode: boolean;
  t: any;
}

const renderIcon = (iconName: string, size: number = 18) => {
  const props = { size };
  switch(iconName) {
    case 'code': return <Code {...props} />;
    case 'pen-tool': return <PenTool {...props} />;
    case 'search': return <Search {...props} />;
    case 'terminal': return <Terminal {...props} />;
    case 'file-text': return <FileText {...props} />;
    case 'box': return <Box {...props} />;
    default: return <Bot {...props} />;
  }
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = memo(({ 
  message, 
  agentIcon, 
  isLast, 
  isGenerating, 
  darkMode, 
  t 
}) => {
  const isUser = message.role === Role.USER;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(isLast); // Default to true if it's the last message (to show typing immediately)
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // Store height before hiding content to prevent scroll jumping
          if (entry.boundingClientRect.height > 0) {
            setHeight(entry.boundingClientRect.height);
          }
          setIsVisible(false);
        }
      },
      {
        root: null,
        rootMargin: '600px', // Pre-render content 600px before it enters viewport
        threshold: 0
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Update height when content changes (especially during generation)
  useEffect(() => {
    if (isVisible && containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
           setHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [isVisible, message.content]);

  return (
    <div 
      ref={containerRef}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ 
        minHeight: height ? `${height}px` : 'auto',
        containIntrinsicSize: height ? `auto ${height}px` : 'auto 100px'
      }} 
    >
      {!isVisible && height ? (
         // Placeholder when out of view to improve performance (Virtualization)
         <div style={{ height: height }} className="w-full" />
      ) : (
        <>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isUser ? 'bg-blue-600 text-white' : (darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 text-gray-600')}`}>
            {isUser ? <div className="text-xs font-bold">You</div> : renderIcon(agentIcon, 18)}
          </div>
          
          <div className={`flex flex-col min-w-0 max-w-[90%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
            
            {/* Attachments Display */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 justify-end">
                {message.attachments.map(att => (
                  <div key={att.id} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-32 h-32 bg-gray-100 dark:bg-gray-800">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full p-2 text-center text-xs text-gray-500">
                          <File size={24} className="mb-1"/>
                          <span className="truncate w-full">{att.name}</span>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}

            <div className={`px-5 py-3.5 shadow-sm w-full ${isUser ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : (darkMode ? 'bg-gray-800/80 border border-gray-700/50 backdrop-blur-sm rounded-2xl rounded-tl-sm' : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm')}`}>
              {isUser ? (
                <p className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
              ) : (
                message.content ? (
                  <MarkdownRenderer content={message.content} darkMode={darkMode} />
                ) : (
                  (isGenerating && isLast) ? (
                    <span className="animate-pulse flex items-center gap-2 text-gray-400">
                      <Sparkles size={14} className="animate-spin" /> {t.thinking}
                    </span>
                  ) : (
                    <span className="text-gray-500 italic flex items-center gap-2 text-xs">
                      <X size={12}/> {t.cancelled}
                    </span>
                  )
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.agentIcon === nextProps.agentIcon
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';
