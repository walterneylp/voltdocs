const appVersion = import.meta.env.VITE_APP_VERSION ?? __APP_VERSION__;
const appBuild = __APP_BUILD_NUMBER__;
const appBuildAt = __APP_BUILD_AT__;

const formatBuildDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
};

export function AppBuildInfo() {
  return (
    <div style={{ marginTop: "6px", fontSize: "11px", lineHeight: 1.35, opacity: 0.78 }}>
      <div>Versão: {appVersion}</div>
      <div>Build: {appBuild}</div>
      <div>Data/Hora: {formatBuildDate(appBuildAt)}</div>
    </div>
  );
}
