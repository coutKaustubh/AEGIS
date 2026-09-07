// ─── AEGIS Model Configuration ─────────────────────────────────────────────────
// Mock model registry. Replace with API calls when Django backend is integrated.

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
    id: 'aegis-reasoner',
    name: 'AEGIS Reasoner',
    description: 'Deep analysis & multi-step reasoning for complex industrial queries',
    capability: 'Reasoning',
    contextWindow: '128K',
    isDefault: true,
  },
  {
    id: 'aegis-fast',
    name: 'AEGIS Fast',
    description: 'Low-latency responses for quick lookups and simple tasks',
    capability: 'Speed',
    contextWindow: '32K',
    isDefault: false,
  },
  {
    id: 'aegis-vision',
    name: 'AEGIS Vision',
    description: 'P&ID drawings, engineering diagrams, and image analysis',
    capability: 'Vision',
    contextWindow: '64K',
    isDefault: false,
  },
  {
    id: 'aegis-code',
    name: 'AEGIS Code',
    description: 'Code generation, calculations, and sandbox execution',
    capability: 'Code',
    contextWindow: '64K',
    isDefault: false,
  },
  {
    id: 'aegis-general',
    name: 'AEGIS General',
    description: 'Balanced model for everyday operational queries',
    capability: 'General',
    contextWindow: '64K',
    isDefault: false,
  },
];

export function getModels(): AegisModel[] {
  return AEGIS_MODELS;
}

export function getDefaultModel(): AegisModel {
  return AEGIS_MODELS.find((m) => m.isDefault) || AEGIS_MODELS[0];
}

export function getModelById(id: string): AegisModel | undefined {
  return AEGIS_MODELS.find((m) => m.id === id);
}
