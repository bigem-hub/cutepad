export interface AiPresetDef {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  keyHint: string;
  keyUrl?: string;
  note: string;
}

export const AI_PRESETS: AiPresetDef[] = [
  {
    id: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
    keyHint: 'AIza…',
    keyUrl: 'https://aistudio.google.com/apikey',
    note: 'generous free tier · no credit card · works right in your browser',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyHint: 'gsk_…',
    keyUrl: 'https://console.groq.com/keys',
    note: 'free tier · blazing fast · about 30 requests/min',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-31b-it:free',
    keyHint: 'sk-or-…',
    keyUrl: 'https://openrouter.ai/settings/keys',
    note: 'free models tagged :free · browse openrouter.ai/models?filter=free',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    model: 'llama3.3-70b',
    keyHint: 'csk-…',
    keyUrl: 'https://cloud.cerebras.ai/',
    note: 'free tier · ultra-fast inference · no card needed',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyHint: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
    note: 'official paid api from openai',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    keyHint: 'ollama',
    note: '100% free & offline · start ollama with OLLAMA_ORIGINS=* first',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    keyHint: 'lm-studio',
    note: '100% free & offline · turn on cors in the server tab',
  },
];

const normalize = (url: string): string => url.trim().replace(/\/+$/, '').toLowerCase();

export function matchAiPreset(baseUrl: string): AiPresetDef | null {
  const target = normalize(baseUrl);
  if (!target) return null;
  return AI_PRESETS.find((preset) => normalize(preset.baseUrl) === target) ?? null;
}
