// ThemeContext.tsx
import { createContext } from 'react';

interface ThemeContextProps {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

 export const ThemeContext = createContext<ThemeContextProps>({
  themeColor: '#3B82F6',
  setThemeColor: () => {},
});
