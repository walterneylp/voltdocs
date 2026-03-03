import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/equipamentos.css";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import { listAssets, clearToken } from "../lib/api";

const formatRisk = (value: string | null) => {
  switch (value) {
    case "LOW":
      return "BAIXO";
    case "MEDIUM":
      return "MEDIO";
    case "HIGH":
      return "ALTO";
    case "CRITICAL":
      return "CRITICO";
    case "MÉDIO":
      return "MÉDIO";
    case "EXTREMO":
      return "EXTREMO";
    default:
      return value ?? "-";
  }
};

export function Equipamentos() {
  const authUser = getAuthUser();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<
    Array<{
      id: string;
      tag: string;
      name: string;
      patrimony_number: string | null;
      voltage: string | null;
      current_rating: number | null;
      atpv: number | null;
      risk_level: string | null;
    }>
  >([]);
  const [error, setError] = useState("");

  const filteredAssets = assets.filter((asset) => {
    if (!query.trim()) return true;
    const haystack = `${asset.tag} ${asset.name} ${asset.patrimony_number ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    let isMounted = true;
    listAssets()
      .then((data) => {
        if (!isMounted) return;
        setAssets(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar equipamentos.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="equipamentos">
      <aside className="equip-sidebar">
        <div className="equip-brand">
          <div className="equip-logo" aria-hidden="true" />
          <span className="equip-title">VoltDocs</span>
        </div>

        <nav className="equip-nav">
          <div className="equip-section">
            <p className="equip-label">GESTÃO</p>
            <Link className="equip-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="equip-icon" />
              Visão Geral
            </Link>
            <Link className="equip-item is-active" to="/equipamentos">
              <LucideIcon name="cpu" className="equip-icon" />
              Equipamentos
            </Link>
            <Link className="equip-item" to="/locais">
              <LucideIcon name="map-pin" className="equip-icon" />
              Locais
            </Link>
            <Link className="equip-item" to="/documentos">
              <LucideIcon name="file-text" className="equip-icon" />
              Documentos
            </Link>
            <Link className="equip-item" to="/chamados">
              <LucideIcon name="life-buoy" className="equip-icon" />
              Chamados
            </Link>
          </div>

          <div className="equip-section">
            <p className="equip-label">ANÁLISE</p>
            <Link className="equip-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="equip-icon" />
              Relatórios
            </Link>
          </div>

          <div className="equip-section">
            <p className="equip-label">PIE</p>
            <Link className="equip-item" to="/pie">
              <LucideIcon name="shield" className="equip-icon" />
              PIE
            </Link>
          </div>

          <div className="equip-section">
            <p className="equip-label">CAMPO</p>
            <Link className="equip-item" to="/registros">
              <LucideIcon name="clipboard-check" className="equip-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="equip-section">
            <p className="equip-label">SISTEMA</p>
            <Link className="equip-item" to="/usuarios">
              <LucideIcon name="users" className="equip-icon" />
              Usuários
            </Link>

            <Link className="equip-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="equip-icon" />
              Dados Empresa
            </Link>
            <Link className="equip-item" to="/grupos">
              <LucideIcon name="users-2" className="equip-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="equip-user">
          <div className="equip-user-meta">
            <p className="equip-user-name">{authUser?.name ?? "—"}</p>
            <p className="equip-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="equip-content">
        <header className="equip-topbar">
          <span className="equip-org">Apogeu Automação</span>
          <div className="equip-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="equip-bell" />
            <Link className="equip-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="equip-logout-icon" />
              Alterar senha
            </Link>
            <Link className="equip-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="equip-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="equip-main">
          <div className="equip-header">
            <div>
              <h1>Equipamentos</h1>
              <p>Gerencie os ativos elétricos e imprima etiquetas QR.</p>
            </div>
            <Link className="equip-new" to="/equipamentos/novo">
              <span className="equip-plus">
                <LucideIcon name="plus" className="equip-plus-icon" />
              </span>
              Novo Equipamento
            </Link>
          </div>

          <div className="equip-search">
            <LucideIcon name="search" className="equip-search-icon" />
            <input
              type="text"
              placeholder="Buscar por tag, nome ou patrimonio"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="equip-table">
            <div className="equip-row equip-row-head">
              <div>Tag / Nome</div>
              <div>Patrimônio</div>
              <div>Tensão/Corrente</div>
              <div>Risco (NR-10)</div>
              <div className="equip-actions-col">Ações</div>
            </div>

            {error ? (
              <div className="equip-row">
                <div className="equip-error">{error}</div>
              </div>
            ) : null}

            {assets.length === 0 && !error ? (
              <div className="equip-row">
                <div className="equip-empty">Nenhum equipamento cadastrado.</div>
              </div>
            ) : null}

            {assets.length > 0 && filteredAssets.length === 0 && !error ? (
              <div className="equip-row">
                <div className="equip-empty">Nenhum equipamento encontrado.</div>
              </div>
            ) : null}

            {filteredAssets.map((asset) => (
              <div className="equip-row" key={asset.id}>
                <div>
                  <p className="equip-tag">{asset.tag}</p>
                  <p className="equip-name">{asset.name}</p>
                </div>
                <div className="equip-muted">{asset.patrimony_number ?? "-"}</div>
                <div>
                  <p className="equip-tag">{asset.voltage ?? "-"}</p>
                  <p className="equip-name">
                    {asset.current_rating != null ? `${asset.current_rating} A` : "-"}
                  </p>
                </div>
                <div>
                  <span className="equip-risk">{formatRisk(asset.risk_level)}</span>
                  <p className="equip-risk-note">
                    {asset.atpv != null ? `ATPV: ${asset.atpv}` : "ATPV: -"}
                  </p>
                </div>
                <div className="equip-actions-col">
                  <Link className="equip-action" to={`/equipamentos/detalhes?id=${asset.id}`}>
                    <LucideIcon name="file-text" className="equip-action-icon" />
                  </Link>
                  <Link className="equip-action" to={`/equipamentos/qr?id=${asset.id}`}>
                    <LucideIcon name="qr-code" className="equip-action-icon" />
                  </Link>
                  <Link className="equip-action" to={`/equipamentos/editar?id=${asset.id}`}>
                    <LucideIcon name="pencil" className="equip-action-icon" />
                  </Link>
                  <Link className="equip-action is-delete" to={`/equipamentos/deletar?id=${asset.id}`}>
                    <LucideIcon name="trash-2" className="equip-action-icon" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
