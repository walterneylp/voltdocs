export type AppTheme = "light" | "dark";

export const APP_THEME_KEY = "app_theme";

export const readStoredTheme = (): AppTheme => {
  const stored = localStorage.getItem(APP_THEME_KEY);
  return stored === "dark" ? "dark" : "light";
};

export const applyThemeToDocument = (theme: AppTheme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.mobileTheme = theme;
};

export const initializeTheme = () => {
  const theme = readStoredTheme();
  applyThemeToDocument(theme);
};

export const saveTheme = (theme: AppTheme) => {
  localStorage.setItem(APP_THEME_KEY, theme);
  applyThemeToDocument(theme);
};
