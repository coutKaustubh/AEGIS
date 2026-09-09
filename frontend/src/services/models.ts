// ─── AEGIS Model Configuration ─────────────────────────────────────────────────
// Local fallback used only while the runtime health endpoint is unavailable.

export interface AegisModel {
  id: string;
  name: string;
  description: string;
  capability: 'Reasoning' | 'Speed' | 'Vision' | 'Code' | 'General';
  contextWindow: string;
  isDefault: boolean;
}

export const AEGIS_MODELS: AegisModel[] = [
  {
    id: 'qwen-general',
    name: 'qwen3.5:4b',
    description: 'Deep analysis & multi-step reasoning for complex industrial queries',
    capability: 'Reasoning',
    contextWindow: '32K',
    isDefault: true,
  },
  {
    id: 'llama-small',
    name: 'llama3.2:1b',
    description: 'Low-latency responses for quick lookups and simple tasks',
    capability: 'Speed',
    contextWindow: '8K',
    isDefault: false,
  },
  {
    id: 'qwen-vision',
    name: 'qwen3-vl:4b',
    description: 'P&ID drawings, engineering diagrams, and image analysis',
    capability: 'Vision',
    contextWindow: '32K',
    isDefault: false,
  },
  {
    id: 'qwen-coder',
    name: 'qwen2.5-coder:7b',
    description: 'Code generation, calculations, and sandbox execution',
    capability: 'Code',
    contextWindow: '32K',
    isDefault: false,
  },
];

export function getModels(): AegisModel[] {
  return AEGIS_MODELS;
}

export async function loadModels(): Promise<AegisModel[]> {
  try {
    const { apiClient } = await import('./api');
    const response = await apiClient.get<{ models: Array<Record<string, any>> }>('/chats/models/');
    const live = (response.models || []).map((model) => ({
      id: String(model.id),
      name: String(model.name || model.id),
      description: `${model.provider || 'local'} · ${model.available ? 'available' : 'unavailable'}`,
      capability: (model.capabilities || []).some((value: string) => value.toLowerCase().includes('vision')) ? 'Vision'
        : (model.capabilities || []).some((value: string) => value.toLowerCase().includes('coding')) ? 'Code'
        : (model.capabilities || []).some((value: string) => value.toLowerCase().includes('reasoning')) ? 'Reasoning'
        : (model.capabilities || []).some((value: string) => value.toLowerCase().includes('lightweight')) ? 'Speed' : 'General',
      contextWindow: `${Math.round(Number(model.context_length || 8192) / 1024)}K`,
      isDefault: String(model.id).includes('general'),
    } as AegisModel));
    return live.length ? live : AEGIS_MODELS;
  } catch {
    return AEGIS_MODELS;
  }
}

export function getDefaultModel(): AegisModel {
  return AEGIS_MODELS.find((m) => m.isDefault) || AEGIS_MODELS[0];
}

export function getModelById(id: string): AegisModel | undefined {
  return AEGIS_MODELS.find((m) => m.id === id);
}
