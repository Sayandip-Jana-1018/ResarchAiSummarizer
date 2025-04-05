import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
  darkMode: boolean;
  setDarkMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to darken a color
const darkenColor = (color: string, amount: number): string => {
  if (color.startsWith('#')) {
    const r = Math.max(0, parseInt(color.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(color.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(color.slice(5, 7), 16) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return color;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState('#5B21B6'); // Default to deep purple
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode

  // Load theme preferences from localStorage on initial render
  useEffect(() => {
    const savedColor = localStorage.getItem('themeColor');
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedColor) {
      setThemeColor(savedColor);
    }
    
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Apply the theme color to the body as a gradient background
  useEffect(() => {
    // Save preferences to localStorage
    localStorage.setItem('themeColor', themeColor);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    // Create a sophisticated gradient background with the theme color
    document.body.style.background = `
      linear-gradient(135deg,
        ${darkenColor(themeColor, 60)} 0%,
        ${darkenColor(themeColor, 80)} 10%,
        ${darkenColor(themeColor, 100)} 20%,
        rgba(0, 0, 0, 1) 40%,
        rgba(0, 0, 0, 1) 60%,
        ${darkenColor(themeColor, 100)} 80%,
        ${darkenColor(themeColor, 80)} 90%,
        ${darkenColor(themeColor, 60)} 100%
      )
    `;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Apply dark mode class
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Clean up when component unmounts
    return () => {
      document.body.style.background = '';
    };
  }, [themeColor, darkMode]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor, darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
