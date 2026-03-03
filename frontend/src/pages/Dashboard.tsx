import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import {
  clearToken,
  listAssets,
  listDocuments,
  listDocumentVersions,
  listFieldUpdates,
  listTickets
} from "../lib/api";

export function Dashboard() {
  const authUser = getAuthUser();
  const appVersion = import.meta.env.VITE_APP_VERSION ?? "";
  const [assetsTotal, setAssetsTotal] = useState(0);
  const [expiredDocs, setExpiredDocs] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [fieldPending, setFieldPending] = useState(0);
  const [fieldProcessed, setFieldProcessed] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listAssets(),
      listDocuments(),
      listDocumentVersions(),
      listTickets(),
      listFieldUpdates()
    ])
      .then(([assets, documents, versions, tickets, updates]) => {
        if (!isMounted) return;
        setAssetsTotal(assets.length);

        const latestVersion = new Map<string, { valid_until: string | null; created_at: string }>();
        versions.forEach((version) => {
          const existing = latestVersion.get(version.document_id);
          if (!existing || new Date(version.created_at) > new Date(existing.created_at)) {
            latestVersion.set(version.document_id, {
              valid_until: version.valid_until,
              created_at: version.created_at
            });
          }
        });
        const now = Date.now();
        const expired = documents.filter((doc) => {
          const version = latestVersion.get(doc.id);
          if (!version?.valid_until) return false;
          return new Date(version.valid_until).getTime() < now;
        }).length;
        setExpiredDocs(expired);

        const closedStatuses = ["resolvido", "finalizado", "concluido", "fechado"];
        const openCount = tickets.filter((ticket) => {
          const status = (ticket.status ?? "").toLowerCase();
          return !closedStatuses.includes(status);
        }).length;
        setOpenTickets(openCount);

        const pendingCount = updates.filter(
          (update) => (update.status ?? "").toLowerCase() !== "processado"
        ).length;
        setFieldPending(pendingCount);
        setFieldProcessed(updates.length - pendingCount);
        setLoadError("");
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : "Falha ao carregar indicadores.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fieldSummary = useMemo(
    () => `Processadas: ${fieldProcessed} • Pendentes: ${fieldPending}`,
    [fieldProcessed, fieldPending]
  );
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden="true" />
          <span className="sidebar-title">VoltDocs</span>
          {appVersion ? <span className="sidebar-version">v{appVersion}</span> : null}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-label">GESTÃO</p>
            <Link className="nav-item is-active" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="nav-icon" />
              Visão Geral
            </Link>
            <Link className="nav-item" to="/equipamentos">
              <LucideIcon name="cpu" className="nav-icon" />
              Equipamentos
            </Link>
            <Link className="nav-item" to="/locais">
              <LucideIcon name="map-pin" className="nav-icon" />
              Locais
            </Link>
            <Link className="nav-item" to="/documentos">
              <LucideIcon name="file-text" className="nav-icon" />
              Documentos
            </Link>
            <Link className="nav-item" to="/chamados">
              <LucideIcon name="life-buoy" className="nav-icon" />
              Chamados
            </Link>
          </div>

          <div className="nav-section">
            <p className="nav-label">ANÁLISE</p>
            <Link className="nav-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="nav-icon" />
              Relatórios
            </Link>
          </div>

          <div className="nav-section">
            <p className="nav-label">PIE</p>
            <Link className="nav-item" to="/pie">
              <LucideIcon name="shield" className="nav-icon" />
              PIE
            </Link>
          </div>

          <div className="nav-section">
            <p className="nav-label">CAMPO</p>
            <Link className="nav-item" to="/registros">
              <LucideIcon name="clipboard-check" className="nav-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="nav-section">
            <p className="nav-label">SISTEMA</p>
            <Link className="nav-item" to="/usuarios">
              <LucideIcon name="users" className="nav-icon" />
              Usuários
            </Link>

            <Link className="nav-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="nav-icon" />
              Dados Empresa
            </Link>
            <Link className="nav-item" to="/grupos">
              <LucideIcon name="users-2" className="nav-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="user-meta">
            <p className="user-name">{authUser?.name ?? "—"}</p>
            <p className="user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <span className="topbar-org">Apogeu Automação</span>
          <div className="topbar-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="topbar-icon" />
            <Link className="topbar-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="topbar-logout-icon" />
              Alterar senha
            </Link>
            <Link className="topbar-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="topbar-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="overview">
          <div className="overview-header">
            <h1>Visão Geral</h1>
            <p>Resumo dos ativos elétricos e status de conformidade.</p>
          </div>
          {loadError ? <p className="overview-error">{loadError}</p> : null}

          <div className="cards-grid">
            <article className="stat-card">
              <div className="card-head">
                <h2>Total de Equipamentos</h2>
                <LucideIcon name="cpu" className="card-icon" />
              </div>
              <div className="card-value">{assetsTotal}</div>
              <p className="card-note">ativos cadastrados</p>
            </article>

            <article className="stat-card">
              <div className="card-head">
                <h2>Docs Vencidos</h2>
                <LucideIcon name="file-warning" className="card-icon is-alert" />
              </div>
              <div className="card-value is-alert">{expiredDocs}</div>
              <p className="card-note">Ação imediata necessária</p>
            </article>

            <article className="stat-card">
              <div className="card-head">
                <h2>Chamados Abertos</h2>
                <LucideIcon name="life-buoy" className="card-icon" />
              </div>
              <div className="card-value">{openTickets}</div>
              <p className="card-note">Manutenção necessária</p>
            </article>

            <article className="stat-card is-wide">
              <div className="card-head">
                <h2>Registros de Campo</h2>
                <LucideIcon name="clipboard-check" className="card-icon" />
              </div>
              <div className="card-value">{fieldPending + fieldProcessed}</div>
              <p className="card-note">{fieldSummary}</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
