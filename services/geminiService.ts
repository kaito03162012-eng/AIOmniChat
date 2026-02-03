
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Message, Role, ModelId, Attachment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GenerateOptions {
  modelId: ModelId;
  history: Message[];
  prompt: string;
  attachments?: Attachment[];
  systemInstruction?: string;
  enableThinking?: boolean;
  enableComparison?: boolean; 
  language?: 'ja' | 'en';
}

export async function* streamGenerateResponse(
  options: GenerateOptions
): AsyncGenerator<string, void, unknown> {
  const {
    modelId,
    history,
    prompt,
    attachments = [],
    systemInstruction,
    enableThinking,
    enableComparison,
    language = 'ja'
  } = options;
  
  // 1. Prepare History
  const pastContent = history.map(m => {
    const parts: any[] = [];
    if (m.content) parts.push({ text: m.content });
    if (m.attachments && m.attachments.length > 0) {
      m.attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }
    return {
      role: m.role === Role.USER ? 'user' : 'model',
      parts: parts
    };
  });

  // 2. Prepare System Instruction
  let finalSystemInstruction = systemInstruction || "";
  if (enableComparison) {
    finalSystemInstruction += `\n\n【天秤(Tenbin)モード】客観的に評価し、以下の形式で出力:
    1. ⚖️ 比較対象
    2. 📈 メリット
    3. 📉 デメリット
    4. 🏆 推奨`;
  }
  
  // 3. Prepare Thinking Config
  let thinkingConfig = undefined;
  if (enableThinking) {
    // High power models get more budget
    // Fixed: Use correct ModelId enum property GEMINI_2_0_PRO instead of GEMINI_2_0_PRO_EXP
    const isHighPower = modelId === ModelId.GEMINI_3_PRO || modelId === ModelId.GEMINI_2_0_PRO;
    const budget = isHighPower ? 16000 : 8000; 
    thinkingConfig = { thinkingBudget: budget };
  }

  // 4. Prepare Current Request
  const currentParts: any[] = [{ text: prompt }];
  if (attachments.length > 0) {
    attachments.forEach(att => {
      currentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      });
    });
  }

  try {
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: [...pastContent, { role: 'user', parts: currentParts }],
      config: {
        systemInstruction: finalSystemInstruction,
        thinkingConfig: thinkingConfig,
        tools: [{ googleSearch: {} }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Fallback Logic: Switch to stable 2.0 Flash if others fail
    if (modelId !== ModelId.GEMINI_2_0_FLASH) {
       yield `\n\n> ⚡ **Auto-Switch**: API Error detected on ${modelId}. Switching to **Gemini 2.0 Flash** to maintain connection...\n\n---\n\n`;
       
       try {
         const fallbackOptions: GenerateOptions = {
            ...options,
            modelId: ModelId.GEMINI_2_0_FLASH,
            enableThinking: false // Disable thinking to ensure maximum stability
         };

         const fallbackStream = streamGenerateResponse(fallbackOptions);

         for await (const fallbackChunk of fallbackStream) {
           yield fallbackChunk;
         }
         return; 
       } catch (fbError: any) {
         console.error("Fallback Error:", fbError);
         yield `\n\n**[Critical System Error]** Connection lost. Please try again later.`;
         return;
       }
    }

    yield `\n\n**[Connection Error]**\n${(error as Error).message}`;
  }
}
