export type ThemeId = 'aegis' | 'aquatic' | 'desert';

export const THEME_STORAGE_KEY = 'aegis-theme';

export const themes: Array<{ id: ThemeId; name: string; description: string }> = [
  { id: 'aegis', name: 'AEGIS', description: 'Premium charcoal command interface' },
  { id: 'aquatic', name: 'Aquatic', description: 'Cool blue and cyan enterprise interface' },
  { id: 'desert', name: 'Desert', description: 'Warm cream and earth-tone interface' },
];

export function isThemeId(value: string | null): value is ThemeId {
  return value === 'aegis' || value === 'aquatic' || value === 'desert';
}
