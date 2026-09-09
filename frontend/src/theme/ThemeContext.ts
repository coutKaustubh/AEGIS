import { createContext } from 'react';
import type { ThemeId } from './themes';

export type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
