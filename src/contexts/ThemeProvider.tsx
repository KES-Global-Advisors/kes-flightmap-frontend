// ThemeProvider.tsx
import { ThemeContext } from './ThemeContext';
import {  useState, useEffect, ReactNode } from 'react';
import axios from 'axios';


export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeColor, setThemeColor] = useState<string>('#3B82F6');

  // Fetch the theme from the backend on app startup
  useEffect(() => {
    axios
      .get('/api/theme/')
      .then((response) => {
        setThemeColor(response.data.theme_color);
        // Also set CSS variables to prevent any flash of default color
        document.documentElement.style.setProperty('--theme-color', response.data.theme_color);
      })
      .catch((error) => {
        console.error('Failed to fetch theme color:', error);
      });
  }, []);

  // Listen for local changes (if any) dispatched from other parts of the app
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setThemeColor(event.detail.themeColor);
      document.documentElement.style.setProperty('--theme-color', event.detail.themeColor);
    };

    window.addEventListener('themeColorChanged', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('themeColorChanged', handleThemeChange as EventListener);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};
