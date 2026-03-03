import { Link } from "react-router-dom";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import { clearToken } from "../lib/api";
import "../styles/relatorios.css";
import "../styles/relatorios-auditoria.css";

export function RelatoriosAuditoria() {
  const authUser = getAuthUser();
  return (
    <div className="relatorios">
      <aside className="relatorios-sidebar">
        <div className="relatorios-brand">
          <div className="relatorios-logo" aria-hidden="true" />
          <span className="relatorios-title">VoltDocs</span>
        </div>

        <nav className="relatorios-nav">
          <div className="relatorios-section">
            <p className="relatorios-label">GESTÃO</p>
            <Link className="relatorios-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="relatorios-icon" />
              Visão Geral
            </Link>
            <Link className="relatorios-item" to="/equipamentos">
              <LucideIcon name="cpu" className="relatorios-icon" />
              Equipamentos
            </Link>
            <Link className="relatorios-item" to="/locais">
              <LucideIcon name="map-pin" className="relatorios-icon" />
              Locais
            </Link>
            <Link className="relatorios-item" to="/documentos">
              <LucideIcon name="file-text" className="relatorios-icon" />
              Documentos
            </Link>
            <Link className="relatorios-item" to="/chamados">
              <LucideIcon name="life-buoy" className="relatorios-icon" />
              Chamados
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">ANÁLISE</p>
            <Link className="relatorios-item is-active" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="relatorios-icon" />
              Relatórios
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">PIE</p>
            <Link className="relatorios-item" to="/pie">
              <LucideIcon name="shield" className="relatorios-icon" />
              PIE
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">CAMPO</p>
            <Link className="relatorios-item" to="/registros">
              <LucideIcon name="clipboard-check" className="relatorios-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">SISTEMA</p>
            <Link className="relatorios-item" to="/usuarios">
              <LucideIcon name="users" className="relatorios-icon" />
              Usuários
            </Link>

            <Link className="relatorios-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="relatorios-icon" />
              Dados Empresa
            </Link>
            <Link className="relatorios-item" to="/grupos">
              <LucideIcon name="users-2" className="relatorios-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="relatorios-user">
          <div className="relatorios-user-meta">
            <p className="relatorios-user-name">{authUser?.name ?? "—"}</p>
            <p className="relatorios-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="relatorios-content">
        <header className="relatorios-topbar">
          <span className="relatorios-org">Apogeu Automação</span>
          <div className="relatorios-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="relatorios-bell" />
            <Link className="relatorios-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="relatorios-logout-icon" />
              Alterar senha
            </Link>
            <Link className="relatorios-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="relatorios-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="relatorios-main">
          <div className="relatorios-header">
            <div>
              <h1>Relatórios Gerenciais</h1>
              <p>Análise de conformidade NR-10 e histórico de auditoria.</p>
            </div>
            <div className="relatorios-header-actions">
              <Link className="relatorios-tab" to="/relatorios">
                <LucideIcon name="check-square" className="relatorios-tab-icon" />
                Conformidade
              </Link>
              <Link className="relatorios-tab is-active" to="/relatorios/auditoria">
                <LucideIcon name="history" className="relatorios-tab-icon" />
                Auditoria
              </Link>
              <button className="relatorios-export" type="button">
                <LucideIcon name="download" className="relatorios-tab-icon" />
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="relatorios-auditoria">
            <div className="relatorios-auditoria-header">
              <h2>Histórico de Atividades Recentes</h2>
              <p>Log de auditoria e rastreabilidade do sistema.</p>
            </div>

            <div className="relatorios-auditoria-table">
              <div className="relatorios-auditoria-row is-head">
                <div>Data/Hora</div>
                <div>Usuário</div>
                <div>Ação</div>
                <div>Tipo</div>
                <div>Evidências</div>
                <div>Status</div>
              </div>

              <div className="relatorios-auditoria-row">
                <div>2023-10-25 14:30</div>
                <div>Administrador</div>
                <div>Atualizou diagrama QGBT-01</div>
                <div>
                  <span className="relatorios-tag">DOC_UPDATE</span>
                </div>
                <div>—</div>
                <div>—</div>
              </div>

              <div className="relatorios-auditoria-row">
                <div>25/11/2025, 21:22:10</div>
                <div>Walternet L Pinto</div>
                <div>
                  Registro de campo (9363f363-682e-4ebf-b155-fcfa94271e9e): Baixa do
                  chamado Chamado 01234
                </div>
                <div>
                  <span className="relatorios-tag">FIELD_UPDATE</span>
                </div>
                <div>
                  <span className="relatorios-pill">6 anexo(s)</span>
                  <span className="relatorios-pill">áudio</span>
                </div>
                <div>
                  <span className="relatorios-status is-pending">Pendente</span>
                </div>
              </div>

              <div className="relatorios-auditoria-row">
                <div>25/11/2025, 18:46:28</div>
                <div>Walternet L Pinto</div>
                <div>Registro de campo: Posso testar de evidências</div>
                <div>
                  <span className="relatorios-tag">FIELD_UPDATE</span>
                </div>
                <div>
                  <span className="relatorios-pill">1 anexo(s)</span>
                  <span className="relatorios-pill">áudio</span>
                </div>
                <div>
                  <span className="relatorios-status is-done">Processado</span>
                </div>
              </div>

              <div className="relatorios-auditoria-row">
                <div>25/11/2025, 18:43:36</div>
                <div>Walternet L Pinto</div>
                <div>Registro de campo: mais uma</div>
                <div>
                  <span className="relatorios-tag">FIELD_UPDATE</span>
                </div>
                <div>
                  <span className="relatorios-pill">1 anexo(s)</span>
                  <span className="relatorios-pill">áudio</span>
                </div>
                <div>
                  <span className="relatorios-status is-pending">Pendente</span>
                </div>
              </div>

              <div className="relatorios-auditoria-row">
                <div>25/11/2025, 18:30:21</div>
                <div>Walternet L Pinto</div>
                <div>Registro de campo: Evidências 00345</div>
                <div>
                  <span className="relatorios-tag">FIELD_UPDATE</span>
                </div>
                <div>
                  <span className="relatorios-pill">2 anexo(s)</span>
                  <span className="relatorios-pill">áudio</span>
                </div>
                <div>
                  <span className="relatorios-status is-pending">Pendente</span>
                </div>
              </div>

              <div className="relatorios-auditoria-row">
                <div>25/11/2025, 18:27:20</div>
                <div>Walternet L Pinto</div>
                <div>Registro de campo: teste de evidências pelo PC</div>
                <div>
                  <span className="relatorios-tag">FIELD_UPDATE</span>
                </div>
                <div>
                  <span className="relatorios-pill">2 anexo(s)</span>
                  <span className="relatorios-pill">áudio</span>
                </div>
                <div>
                  <span className="relatorios-status is-pending">Pendente</span>
                </div>
              </div>

              <div className="relatorios-auditoria-row">
                <div>25/11/2025, 19:01:27</div>
                <div>Walternet L Pinto</div>
                <div>
                  Baixa do registro e3a6e99f-15a9-4a4a-8a48-48236bdcb3c6: fiz as
                  adequações.
                </div>
                <div>
                  <span className="relatorios-tag">FIELD_CLOSED</span>
                </div>
                <div>—</div>
                <div>—</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
