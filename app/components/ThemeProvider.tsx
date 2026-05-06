// ─── ThemeProvider Component ──────────────────────────────────────────────────
// Provides light/dark theme state to the entire component tree via React context.
// On mount, reads the user's saved preference from localStorage, falling back to
// the OS-level prefers-color-scheme media query.
// Toggling adds/removes the "dark" class on <html>, which activates Tailwind's
// dark: variants throughout the app.

'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Theme type — only two valid values.
type Theme = 'light' | 'dark';

// Context shape: the current theme value and a toggle function.
// Defaults are safe fallbacks used before the provider mounts.
const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: 'dark', toggle: () => { } });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Theme state — starts as 'dark' to match the <html className="dark"> default
  // set in layout.tsx, preventing a flash of light mode on first render.
  const [theme, setTheme] = useState<Theme>('dark');

  // On mount, read the user's stored preference or detect the OS setting.
  // Runs client-side only (useEffect) so it never runs during SSR.
  useEffect(() => {
    // Check localStorage for a previously saved preference.
    const stored = localStorage.getItem('theme') as Theme | null;

    // If no stored preference, fall back to the OS prefers-color-scheme setting.
    const preferred = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    // Apply the resolved theme to state and to the <html> element's class list.
    setTheme(preferred);
    document.documentElement.classList.toggle('dark', preferred === 'dark');
  }, []); // empty deps — runs once on mount only

  // Switches between light and dark, persists the choice to localStorage,
  // and updates the <html> class immediately so Tailwind dark: classes apply.
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'; // flip the current theme
    setTheme(next);
    localStorage.setItem('theme', next);               // persist across sessions
    document.documentElement.classList.toggle('dark', next === 'dark'); // apply to DOM
  };

  return (
    // Provide theme state and toggle function to all child components.
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Convenience hook — components call useTheme() instead of useContext(ThemeContext) directly.
export const useTheme = () => useContext(ThemeContext);