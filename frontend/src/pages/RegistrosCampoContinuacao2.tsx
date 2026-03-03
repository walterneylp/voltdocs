import { Link } from "react-router-dom";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import { clearToken } from "../lib/api";
import "../styles/registros-campo.css";

export function RegistrosCampoContinuacao2() {
  const authUser = getAuthUser();
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
            <Link className="rc-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
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
              <Link className="rc-tab is-active" to="/registros">
                Pendentes
              </Link>
              <Link className="rc-tab" to="/registros/processados">
                Processados
              </Link>
              <span className="rc-count">5 registros</span>
            </div>
          </div>

          <article className="rc-card">
            <div className="rc-card-header">
              <div className="rc-tech">
                <div className="rc-tech-icon">
                  <LucideIcon name="user-round" className="rc-tech-svg" />
                </div>
                <div>
                  <p className="rc-tech-label">TÉCNICO</p>
                  <p className="rc-tech-name">Walternet L Pinto</p>
                  <p className="rc-tech-id">97de1153-6c9a-4640-a953-0dfd70253b8</p>
                </div>
              </div>
              <div className="rc-meta">
                <p>25/11/2025, 18:30:21</p>
                <span className="rc-status pending">Pendente</span>
              </div>
            </div>

            <p className="rc-title">Evidências 00345</p>

            <div className="rc-files">
              <div className="rc-file">
                <LucideIcon name="paperclip" className="rc-file-icon" />
                photo-17641061926868511120483923392889.jpg
              </div>
              <a className="rc-download" href="#">
                Download
              </a>
              <div className="rc-file">
                <LucideIcon name="paperclip" className="rc-file-icon" />
                voice-1764106220835.webm
              </div>
              <a className="rc-download" href="#">
                Download
              </a>
              <span className="rc-audio-tag">
                <LucideIcon name="volume-2" className="rc-audio-icon" />
                Áudio
              </span>
              <div className="rc-audio">
                <LucideIcon name="play" className="rc-audio-play" />
                0:00 / 0:10
                <span className="rc-audio-bar" />
              </div>
            </div>

            <div className="rc-field">
              <label>Justificativa / Providências</label>
              <textarea placeholder="Descreva o que foi feito para tratar este registro." />
            </div>

            <div className="rc-actions-row">
              <button className="rc-primary" type="button">
                Marcar como processada
              </button>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
