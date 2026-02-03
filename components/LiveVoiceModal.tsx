
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';
import { X, Mic, Volume2, Power, Copy, Check, User, Bot, Radio, Save, UserCog, Languages, MicOff, Waves, MessageSquare } from 'lucide-react';
import { Message, Role } from '../types';

interface LiveVoiceModalProps {
  onClose: () => void;
  onSaveHistory: (messages: VoiceMessage[]) => void;
  systemInstruction: string;
  history: Message[];
  darkMode: boolean;
  t: any;
}

interface VoiceMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isFromHistory?: boolean;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ onClose, onSaveHistory, systemInstruction: initialInstruction, history, darkMode, t }) => {
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'error'>('connecting');
  const [isMicOn, setIsMicOn] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isEditingPersonality, setIsEditingPersonality] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(initialInstruction);
  const [voiceLanguage, setVoiceLanguage] = useState<'ja' | 'en'>('ja');
  const [micVolume, setMicVolume] = useState(0); 
  const [realtimeTranscription, setRealtimeTranscription] = useState(''); 
  
  const currentInputText = useRef('');
  const currentOutputText = useRef('');
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // セッション開始時にユーザーがまだ喋っていない間は音声を無視する
  const hasUserSpokenThisSession = useRef(false);
  const pendingAudioQueue = useRef<string[]>([]);

  // 1. 履歴の初期ロード（文脈を保持するため）
  useEffect(() => {
    const historyMessages: VoiceMessage[] = history.map(m => ({
      id: m.id,
      role: m.role === Role.USER ? 'user' : 'model',
      text: m.content,
      timestamp: m.timestamp,
      isFromHistory: true
    }));
    setMessages(historyMessages);
  }, []);

  // ログの自動スクロール
  useEffect(() => {
    const timer = setTimeout(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, realtimeTranscription]);

  // 設定変更時にセッションを再起動
  useEffect(() => {
    hasUserSpokenThisSession.current = false; // 再起動時は「まだ喋っていない」状態にリセット
    startSession();
    return () => {
      stopSession();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [customPrompt, voiceLanguage]);

  const stopSession = () => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(() => {});
    }
    if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
    if (outputAudioCtxRef.current) outputAudioCtxRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
      const analyser = inputAudioCtxRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (analyserRef.current && isMicOn) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const average = sum / bufferLength;
          const normalized = average > 5 ? (average - 5) / 80 : 0;
          setMicVolume(Math.min(normalized, 1.2));
        } else {
          setMicVolume(0);
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 文脈の構築（直近10件）
      const contextSummary = history.length > 0 
        ? history.slice(-10).map(m => `${m.role === Role.USER ? 'User' : 'AI'}: ${m.content}`).join('\n')
        : "";

      const langHint = voiceLanguage === 'ja' 
        ? "日本語で応答してください。ユーザーが話し終わるまで（マイクが切られるまで）待機し、マイクが切られた瞬間に返答を開始します。ユーザーが最初に話しかけるまで、あなたから絶対に話し始めないでください（挨拶も不要です）。" 
        : "Always respond in English. Wait until the user finishes talking (mic off). DO NOT initiate speech until the user speaks first. No greetings.";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (!isMicOn) setStatus('connecting');
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (!isMicOn) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: Blob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              hasUserSpokenThisSession.current = true; // 実際に文字起こしが発生したら許可
              const text = message.serverContent.inputTranscription.text;
              currentInputText.current += text;
              setRealtimeTranscription(currentInputText.current); 
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputText.current += text;
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              // ユーザーが一度も話していない間のAIの音声は破棄（設定変更直後の反応を防ぐ）
              if (!hasUserSpokenThisSession.current) return;

              if (isMicOn) {
                pendingAudioQueue.current.push(audioData);
              } else {
                playAudioChunk(audioData);
              }
            }
          },
          onerror: () => setStatus('error'),
          onclose: () => console.log('Live Session Closed')
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `対話ガイドライン: ${langHint}\n\nこれまでの会話コンテキスト:\n${contextSummary}\n\n現在の性格設定:\n${customPrompt}`,
        },
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) { setStatus('error'); }
  };

  const playAudioChunk = async (audioData: string) => {
    setStatus('speaking');
    const ctx = outputAudioCtxRef.current!;
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
    const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
    const audioSource = ctx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(ctx.destination);
    audioSource.onended = () => { 
      sourcesRef.current.delete(audioSource); 
      if (sourcesRef.current.size === 0 && !isMicOn) setStatus('connecting'); 
    };
    audioSource.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    sourcesRef.current.add(audioSource);
  };

  const finalizeTurn = () => {
    const userText = currentInputText.current.trim();
    const modelText = currentOutputText.current.trim();
    
    if (userText || modelText) {
      setMessages(prev => [
        ...prev, 
        { id: Date.now() + '-u', role: 'user', text: userText || "...", timestamp: Date.now() },
        { id: Date.now() + '-m', role: 'model', text: modelText || "...", timestamp: Date.now() + 1 }
      ]);
    }
    currentInputText.current = ''; 
    currentOutputText.current = '';
    setRealtimeTranscription('');
  };

  const toggleMic = async () => {
    if (isMicOn) {
      setIsMicOn(false);
      setStatus('connecting');
      setTimeout(() => {
        finalizeTurn();
        if (pendingAudioQueue.current.length > 0) {
          pendingAudioQueue.current.forEach(chunk => playAudioChunk(chunk));
          pendingAudioQueue.current = [];
        }
      }, 500);
    } else {
      hasUserSpokenThisSession.current = true; // マイクを押した時点でユーザーの意思として認識
      setIsMicOn(true);
      setStatus('listening');
      setMicVolume(0);
      pendingAudioQueue.current = []; 
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
  };

  const handleFinishAndSave = () => { 
    finalizeTurn();
    setTimeout(() => {
      // 履歴から読み込んだものではない、新しい対話のみを保存
      const newMessages = messages.filter(m => !m.isFromHistory);
      if (newMessages.length > 0) {
        onSaveHistory(newMessages); 
      }
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/98 backdrop-blur-3xl animate-in fade-in duration-700">
      <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} w-full max-w-7xl h-full sm:h-[94vh] rounded-none sm:rounded-[3.5rem] border shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-500`}>
        
        {/* Header */}
        <div className="px-10 py-6 border-b dark:border-gray-800/50 flex items-center justify-between shrink-0 bg-white/5 dark:bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${isMicOn ? 'bg-blue-600 shadow-blue-500/40 rotate-12 scale-110' : 'bg-gray-800 border border-white/5'}`}>
              {isMicOn ? <Radio size={30} className="text-white animate-pulse" /> : <MicOff size={28} className="text-gray-400" />}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                {t.liveVoice}
                <span className={`inline-block w-2 h-2 rounded-full ${isMicOn ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
              </h2>
              <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em]">
                Push-to-Talk • Context Sync Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden sm:flex bg-black/30 rounded-2xl p-1.5 gap-1.5 border border-white/5">
                <button onClick={() => setVoiceLanguage('ja')} className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${voiceLanguage === 'ja' ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}><Languages size={14}/> 日本語</button>
                <button onClick={() => setVoiceLanguage('en')} className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${voiceLanguage === 'en' ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}><Languages size={14}/> English</button>
             </div>
             <button onClick={() => setIsEditingPersonality(true)} className="p-3 rounded-2xl bg-white/5 border border-white/5 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"><UserCog size={22} /></button>
             <button onClick={onClose} className="p-3 rounded-2xl hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"><X size={30} /></button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-[42%] flex flex-col items-center justify-center p-12 border-b lg:border-b-0 lg:border-r dark:border-gray-800/50 bg-gradient-to-b from-transparent to-gray-950/20 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
               {[1, 2, 3].map(i => (
                 <div key={i} className={`absolute border-2 border-blue-500 rounded-full transition-all duration-1000 ${isMicOn ? 'animate-ping' : ''}`} style={{ width: `${220 * i}px`, height: `${220 * i}px`, animationDelay: `${i * 0.3}s` }}></div>
               ))}
            </div>

            <button onClick={toggleMic} className={`relative group flex items-center justify-center transition-all duration-150 active:scale-90`} style={{ transform: isMicOn ? `scale(${1 + micVolume * 0.45})` : undefined }}>
              {isMicOn && <div className="absolute inset-[-90px] rounded-full bg-blue-500/15 blur-3xl animate-pulse"></div>}
              <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 shadow-[0_20px_80px_rgba(0,0,0,0.5)] overflow-hidden ${isMicOn ? 'bg-gradient-to-tr from-blue-700 via-blue-500 to-indigo-700 ring-[12px] ring-blue-500/20' : (status === 'speaking' ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-600 animate-gradient-xy' : 'bg-gray-800 border-4 border-gray-700')}`}>
                {status === 'speaking' ? <Volume2 size={110} className="text-white animate-bounce" /> : (isMicOn ? <Mic size={110} className="text-white drop-shadow-2xl" /> : <MicOff size={110} className="text-gray-600" />)}
              </div>
            </button>

            <div className="text-center mt-16 space-y-6 relative z-10">
              <h3 className="text-5xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                {status === 'speaking' ? (voiceLanguage === 'ja' ? "AIが応答中" : "AI Speaking") : (isMicOn ? (voiceLanguage === 'ja' ? "録音しています" : "Capturing Voice") : (voiceLanguage === 'ja' ? "ボタンを押して話す" : "Push to Talk"))}
              </h3>
              <p className="text-lg text-gray-500 font-bold max-w-sm mx-auto leading-relaxed">
                {isMicOn ? "話し終わったらボタンをもう一度タップ。音声入力を確定してAIが返答します。" : "トランシーバー感覚で話す時だけONにしてください。これまでの履歴も含めた文脈で会話できます。"}
              </p>
            </div>

            <div className="mt-16 flex gap-4 relative z-10">
              <button onClick={handleFinishAndSave} className="group px-12 py-5 rounded-[2.5rem] bg-blue-600 text-white font-black shadow-[0_15px_40px_rgba(37,99,235,0.4)] hover:bg-blue-500 active:scale-95 transition-all flex items-center gap-4">
                <Save size={24} /> 対話を保存して終了
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0c] relative">
            <div className="px-10 py-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/5 backdrop-blur-md z-10">
                <div className="flex items-center gap-3 font-black text-gray-400 text-xs tracking-widest uppercase">
                  <MessageSquare size={16} className="text-blue-500" />
                  Conversation Stream
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar scroll-smooth">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-6 animate-in slide-in-from-bottom-5 fade-in duration-500 ${msg.role === 'user' ? 'flex-row-reverse text-right' : ''}`}>
                  <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-xl shadow-2xl ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white' : 'bg-gray-800 border border-white/10 text-blue-400'}`}>
                    {msg.role === 'user' ? <User size={24} /> : <Bot size={24} />}
                  </div>
                  <div className={`flex flex-col gap-3 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-8 py-5 rounded-[2.5rem] text-[1.1rem] font-medium leading-relaxed shadow-xl relative whitespace-pre-wrap ${msg.isFromHistory ? 'opacity-50' : ''} ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800/80 border border-white/5 text-gray-100 rounded-tl-none'}`}>
                      {msg.text}
                      {msg.isFromHistory && <div className="absolute -top-6 right-2 text-[8px] font-black text-gray-600 uppercase tracking-widest">History Context</div>}
                    </div>
                    <span className="text-[10px] opacity-30 font-black uppercase">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              
              {/* Real-time Transcription */}
              {(realtimeTranscription || isMicOn) && (
                <div className="flex gap-6 animate-in slide-in-from-bottom-4 duration-300 flex-row-reverse text-right group">
                  <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-blue-50 text-white animate-pulse">
                    <Waves size={24} />
                  </div>
                  <div className="flex flex-col gap-3 max-w-[85%] items-end">
                    <div className="px-8 py-6 rounded-[2.5rem] text-[1.2rem] font-bold leading-relaxed bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-2 border-blue-500/40 text-blue-200 rounded-tr-none shadow-2xl backdrop-blur-sm relative overflow-hidden">
                      {realtimeTranscription || <span className="opacity-40 italic">Waiting for voice...</span>}
                      <span className="inline-block ml-1 w-2 h-7 bg-blue-400 animate-pulse align-middle"></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Input Streaming</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={logEndRef} className="h-20" />
            </div>
          </div>
        </div>
      </div>

      {isEditingPersonality && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6">
          <div className={`${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} w-full max-w-2xl rounded-[3rem] p-10 shadow-[0_0_80px_rgba(0,0,0,1)] border border-white/5`}>
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-black">AI Personality</h3>
                <button onClick={() => setIsEditingPersonality(false)} className="p-4 rounded-3xl hover:bg-white/5 text-gray-400"><X size={30}/></button>
             </div>
             <textarea 
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className={`w-full p-8 rounded-[2rem] border h-72 resize-none focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-mono text-base leading-relaxed ${darkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                placeholder="プロンプトを入力..."
             />
             <div className="mt-8 flex justify-end">
                <button onClick={() => setIsEditingPersonality(false)} className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-blue-500 transition-all active:scale-95">保存して適用</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradient-xy 12s ease infinite;
        }
      `}</style>
    </div>
  );
};
