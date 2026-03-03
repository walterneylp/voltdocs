import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import { clearToken, getFieldUpdateFileUrl, listFieldUpdates } from "../lib/api";
import "../styles/registros-campo.css";

export function RegistrosCampoProcessados() {
  const authUser = getAuthUser();
  const [updates, setUpdates] = useState<
    Array<{
      id: string;
      base_path: string | null;
      message: string;
      code: string | null;
      user_id: string;
      user_name: string | null;
      created_at: string;
      status: string | null;
      attachments: string[] | null;
      audio_path: string | null;
      event_report: boolean | null;
      close_note: string | null;
      closed_at: string | null;
      closed_by_name: string | null;
    }>
  >([]);
  const [techQuery, setTechQuery] = useState("");
  const [error, setError] = useState("");
  const [openError, setOpenError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    listFieldUpdates()
      .then((data) => {
        if (!isMounted) return;
        setUpdates(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar registros.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUpdates = useMemo(() => {
    const query = techQuery.trim().toLowerCase();
    return updates.filter((update) => {
      const haystack = `${update.user_name ?? ""} ${update.user_id}`.toLowerCase();
      return query ? haystack.includes(query) : true;
    });
  }, [updates, techQuery]);

  const processedUpdates = filteredUpdates.filter(
    (update) => (update.status ?? "").toLowerCase() === "processado"
  );

  const groupedProcessed = useMemo(() => {
    const sorted = [...processedUpdates].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const map = new Map<
      string,
      { key: string; latest: typeof processedUpdates[number]; updates: typeof processedUpdates }
    >();
    sorted.forEach((update) => {
      const key = update.code ?? update.base_path ?? update.user_id;
      const existing = map.get(key);
      if (existing) {
        existing.updates.push(update);
        existing.latest = update;
      } else {
        map.set(key, { key, latest: update, updates: [update] });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );
  }, [processedUpdates]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR");
  };

  const fileLabel = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const handleOpenFile = async (path: string) => {
    setOpenError("");
    try {
      const response = await getFieldUpdateFileUrl(path);
      setPreviewUrl(response.url);
      setPreviewName(fileLabel(path));
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Falha ao abrir arquivo.");
    }
  };

  const previewType = useMemo(() => {
    if (!previewName) return "unknown";
    const lower = previewName.toLowerCase();
    if (lower.match(/\.(png|jpg|jpeg|gif|webp)$/)) return "image";
    if (lower.endsWith(".pdf")) return "pdf";
    if (lower.match(/\.(webm|mp3|wav|ogg)$/)) return "audio";
    return "unknown";
  }, [previewName]);
  return (
    <div className="rc">
      <aside className="rc-sidebar">
        <div className="rc-brand">
          <div className="rc-logo" aria-hidden="true" />
          <span className="rc-title">VoltDocs</span>
        </div>

        <nav className="rc-nav">
          <div className="rc-section">
            <p className="rc-label">GESTÃO</p>
            <Link className="rc-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="rc-icon" />
              Visão Geral
            </Link>
            <Link className="rc-item" to="/equipamentos">
              <LucideIcon name="cpu" className="rc-icon" />
              Equipamentos
            </Link>
            <Link className="rc-item" to="/locais">
              <LucideIcon name="map-pin" className="rc-icon" />
              Locais
            </Link>
            <Link className="rc-item" to="/documentos">
              <LucideIcon name="file-text" className="rc-icon" />
              Documentos
            </Link>
            <Link className="rc-item" to="/chamados">
              <LucideIcon name="life-buoy" className="rc-icon" />
              Chamados
            </Link>
          </div>

          <div className="rc-section">
            <p className="rc-label">ANÁLISE</p>
            <Link className="rc-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="rc-icon" />
              Relatórios
            </Link>
          </div>

          <div className="rc-section">
            <p className="rc-label">PIE</p>
            <Link className="rc-item" to="/pie">
              <LucideIcon name="shield" className="rc-icon" />
              PIE
            </Link>
          </div>

          <div className="rc-section">
            <p className="rc-label">CAMPO</p>
            <Link className="rc-item is-active" to="/registros">
              <LucideIcon name="clipboard-check" className="rc-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="rc-section">
            <p className="rc-label">SISTEMA</p>
            <Link className="rc-item" to="/usuarios">
              <LucideIcon name="users" className="rc-icon" />
              Usuários
            </Link>

            <Link className="rc-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="rc-icon" />
              Dados Empresa
            </Link>
            <Link className="rc-item" to="/grupos">
              <LucideIcon name="users-2" className="rc-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="rc-user">
          <div className="rc-user-meta">
            <p className="rc-user-name">{authUser?.name ?? "—"}</p>
            <p className="rc-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="rc-content">
        <header className="rc-topbar">
          <span className="rc-org">Apogeu Automação</span>
          <div className="rc-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="rc-bell" />
            <Link className="rc-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="rc-logout-icon" />
              Alterar senha
            </Link>
            <Link
              className="rc-logout"
              to="/login"
              onClick={() => {
                clearToken();
                clearAuthUser();
              }}
            >
              <LucideIcon name="log-out" className="rc-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="rc-main">
          <div className="rc-header">
            <div>
              <h1>Registros de Campo</h1>
              <p>
                Evidências enviadas pelos técnicos (texto, fotos, áudio) com
                identificação do responsável.
              </p>
            </div>
            <div className="rc-tabs">
              <Link className="rc-tab" to="/registros">
                Pendentes
              </Link>
              <Link className="rc-tab is-active" to="/registros/processados">
                Processados
              </Link>
              <span className="rc-count">{processedUpdates.length} registros</span>
            </div>
          </div>

          <div className="rc-filter">
            <label>Filtrar por tecnico</label>
            <div className="rc-filter-input">
              <LucideIcon name="search" className="rc-filter-icon" />
              <input
                type="text"
                placeholder="Nome ou ID do tecnico"
                value={techQuery}
                onChange={(event) => setTechQuery(event.target.value)}
              />
            </div>
          </div>

          {error ? <p className="rc-error">{error}</p> : null}
          {openError ? <p className="rc-error">{openError}</p> : null}

          {groupedProcessed.length === 0 && !error ? (
            <div className="rc-empty">Nenhum registro processado encontrado.</div>
          ) : null}

          {groupedProcessed.map((group) => {
            const attachmentList = Array.from(
              new Set(
                group.updates.flatMap((update) => update.attachments ?? []).filter(Boolean)
              )
            );
            const audioList = Array.from(
              new Set(group.updates.map((update) => update.audio_path).filter(Boolean))
            ) as string[];
            const latestClosed = group.updates.find((item) => item.closed_at || item.close_note) ?? group.latest;
            return (
            <article className="rc-card" key={group.key}>
              <div className="rc-card-header">
                <div className="rc-tech">
                  <div className="rc-tech-icon">
                    <LucideIcon name="user-round" className="rc-tech-svg" />
                  </div>
                  <div>
                    <p className="rc-tech-label">TÉCNICO</p>
                    <p className="rc-tech-name">{group.latest.user_name ?? "Sem nome"}</p>
                    <p className="rc-tech-id">{group.latest.user_id}</p>
                  </div>
                </div>
                <div className="rc-meta">
                  <p>{formatDate(group.latest.created_at)}</p>
                  <span className="rc-status done">Processada</span>
                  <span className={`rc-status ${group.latest.event_report ? "event" : "ticket"}`}>
                    {group.latest.event_report ? "Evento" : "Chamado"}
                  </span>
                </div>
              </div>

              <div className="rc-message-list">
                {group.updates.map((item) => (
                  <div className="rc-message-item" key={item.id}>
                    <span>{formatDate(item.created_at)}</span>
                    <strong>{item.message}</strong>
                  </div>
                ))}
              </div>

              <div className="rc-files">
                {attachmentList.map((file) => (
                  <div className="rc-file" key={file}>
                    <LucideIcon name="paperclip" className="rc-file-icon" />
                    {fileLabel(file)}
                    <button
                      className="rc-open"
                      type="button"
                      onClick={() => handleOpenFile(file)}
                    >
                      Visualizar
                    </button>
                  </div>
                ))}
                {audioList.map((audio) => (
                  <div className="rc-file" key={audio}>
                    <span className="rc-audio-tag">
                      <LucideIcon name="volume-2" className="rc-audio-icon" />
                      Áudio
                    </span>
                    {fileLabel(audio)}
                    <button
                      className="rc-open"
                      type="button"
                      onClick={() => handleOpenFile(audio)}
                    >
                      Ouvir
                    </button>
                  </div>
                ))}
              </div>

              <div className="rc-processed-box">
                <strong>Processado</strong>
                <span>Por: {latestClosed.closed_by_name ?? "—"}</span>
                <span>Em: {latestClosed.closed_at ? formatDate(latestClosed.closed_at) : "—"}</span>
                <span>Justificativa: {latestClosed.close_note ?? "—"}</span>
              </div>
            </article>
          );})}
        </section>
      </main>

      {previewUrl ? (
        <div className="rc-preview-backdrop">
          <div className="rc-preview">
            <div className="rc-preview-header">
              <strong>{previewName ?? "Arquivo"}</strong>
              <button type="button" onClick={() => setPreviewUrl(null)}>
                Fechar
              </button>
            </div>
            <div className="rc-preview-body">
              {previewType === "image" ? (
                <img src={previewUrl} alt={previewName ?? "Arquivo"} />
              ) : null}
              {previewType === "pdf" ? (
                <iframe src={previewUrl} title={previewName ?? "Arquivo"} />
              ) : null}
              {previewType === "audio" ? (
                <audio controls src={previewUrl} />
              ) : null}
              {previewType === "unknown" ? (
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  Abrir arquivo
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
