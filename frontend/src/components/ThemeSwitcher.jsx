import React from "react";

export function ThemeSwitcher({ theme, toggleTheme }) {
  return (
    <button 
      className="btn btn--ghost btn--sm theme-switcher"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ fontSize: "16px", padding: "6px 10px", borderRadius: "8px" }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
