import { useState } from "react";
import { LucideIcon } from "./LucideIcon";
import { AppTheme, readStoredTheme, saveTheme } from "../lib/theme";

export function GlobalThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>(() => readStoredTheme());

  const handleToggleTheme = () => {
    const nextTheme: AppTheme = theme === "light" ? "dark" : "light";
    saveTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="global-theme-toggle"
      onClick={handleToggleTheme}
      aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
      title={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
    >
      <LucideIcon name={theme === "light" ? "moon" : "sun"} className="global-theme-toggle-icon" />
    </button>
  );
}
