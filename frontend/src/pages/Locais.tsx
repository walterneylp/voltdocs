import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import { clearToken, listSites } from "../lib/api";
import "../styles/locais.css";

export function Locais() {
  const authUser = getAuthUser();
  const [sites, setSites] = useState<Array<{ id: string; name: string; address: string | null }>>(
    []
  );
  const [error, setError] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    listSites()
      .then((data) => {
        if (!isMounted) return;
        setSites(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar locais.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const nameOptions = Array.from(new Set(sites.map((site) => site.name))).sort((a, b) =>
    a.localeCompare(b)
  );
  const addressOptions = Array.from(
    new Set(sites.map((site) => site.address ?? "").filter((value) => value.trim()))
  ).sort((a, b) => a.localeCompare(b));

  const filteredNameOptions = nameOptions.filter((name) =>
    nameQuery ? name.toLowerCase().includes(nameQuery.trim().toLowerCase()) : true
  );
  const filteredAddressOptions = addressOptions.filter((address) =>
    addressQuery ? address.toLowerCase().includes(addressQuery.trim().toLowerCase()) : true
  );

  const filteredSites = sites.filter((site) => {
    const nameFilter = (selectedName ?? nameQuery).trim();
    const addressFilter = (selectedAddress ?? addressQuery).trim();
    const nameMatch = nameFilter
      ? site.name.toLowerCase().includes(nameFilter.toLowerCase())
      : true;
    const addressMatch = addressFilter
      ? (site.address ?? "").toLowerCase().includes(addressFilter.toLowerCase())
      : true;
    return nameMatch && addressMatch;
  });
  return (
    <div className="locais">
      <aside className="locais-sidebar">
        <div className="locais-brand">
          <div className="locais-logo" aria-hidden="true" />
          <span className="locais-title">VoltDocs</span>
        </div>

        <nav className="locais-nav">
          <div className="locais-section">
            <p className="locais-label">GESTÃO</p>
            <Link className="locais-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="locais-icon" />
              Visão Geral
            </Link>
            <Link className="locais-item" to="/equipamentos">
              <LucideIcon name="cpu" className="locais-icon" />
              Equipamentos
            </Link>
            <Link className="locais-item is-active" to="/locais">
              <LucideIcon name="map-pin" className="locais-icon" />
              Locais
            </Link>
            <Link className="locais-item" to="/documentos">
              <LucideIcon name="file-text" className="locais-icon" />
              Documentos
            </Link>
            <Link className="locais-item" to="/chamados">
              <LucideIcon name="life-buoy" className="locais-icon" />
              Chamados
            </Link>
          </div>

          <div className="locais-section">
            <p className="locais-label">ANÁLISE</p>
            <Link className="locais-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="locais-icon" />
              Relatórios
            </Link>
          </div>

          <div className="locais-section">
            <p className="locais-label">PIE</p>
            <Link className="locais-item" to="/pie">
              <LucideIcon name="shield" className="locais-icon" />
              PIE
            </Link>
          </div>

          <div className="locais-section">
            <p className="locais-label">CAMPO</p>
            <Link className="locais-item" to="/registros">
              <LucideIcon name="clipboard-check" className="locais-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="locais-section">
            <p className="locais-label">SISTEMA</p>
            <Link className="locais-item" to="/usuarios">
              <LucideIcon name="users" className="locais-icon" />
              Usuários
            </Link>

            <Link className="locais-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="locais-icon" />
              Dados Empresa
            </Link>
            <Link className="locais-item" to="/grupos">
              <LucideIcon name="users-2" className="locais-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="locais-user">
          <div className="locais-user-meta">
            <p className="locais-user-name">{authUser?.name ?? "—"}</p>
            <p className="locais-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="locais-content">
        <header className="locais-topbar">
          <span className="locais-org">Apogeu Automação</span>
          <div className="locais-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="locais-bell" />
            <Link className="locais-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="locais-logout-icon" />
              Alterar senha
            </Link>
            <Link className="locais-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="locais-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="locais-main">
          <div className="locais-header">
            <div>
              <h1>Locais</h1>
              <p>Gerencie as unidades fabris e endereços.</p>
            </div>
            <Link className="locais-new" to="/locais/novo">
              <span className="locais-plus">
                <LucideIcon name="plus" className="locais-plus-icon" />
              </span>
              Novo Local
            </Link>
          </div>

          <div className="locais-filters">
            <div className="locais-filter">
              <label htmlFor="locais-filter-name">Nome da Unidade</label>
              <div className="locais-filter-input">
                <LucideIcon name="search" className="locais-filter-icon" />
                <input
                  id="locais-filter-name"
                  type="text"
                  placeholder="Buscar pelo nome"
                  value={nameQuery}
                  onChange={(event) => {
                    setNameQuery(event.target.value);
                    if (selectedName && event.target.value !== selectedName) {
                      setSelectedName(null);
                    }
                  }}
                  onFocus={() => {
                    setShowNameDropdown(true);
                    if (selectedName && nameQuery === selectedName) {
                      setSelectedName(null);
                      setNameQuery("");
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowNameDropdown(false), 120)}
                />
              </div>
              {showNameDropdown ? (
                <div className="locais-filter-results">
                  <button
                    type="button"
                    className="locais-filter-item"
                    onMouseDown={() => {
                      setSelectedName(null);
                      setNameQuery("");
                    }}
                  >
                    Todos
                  </button>
                  {filteredNameOptions.map((name) => (
                    <button
                      type="button"
                      key={name}
                      className="locais-filter-item"
                      onMouseDown={() => {
                        setSelectedName(name);
                        setNameQuery(name);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                  {filteredNameOptions.length === 0 ? (
                    <div className="locais-filter-empty">Nenhum resultado.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="locais-filter">
              <label htmlFor="locais-filter-address">Localização Completa</label>
              <div className="locais-filter-input">
                <LucideIcon name="search" className="locais-filter-icon" />
                <input
                  id="locais-filter-address"
                  type="text"
                  placeholder="Buscar pelo endereço"
                  value={addressQuery}
                  onChange={(event) => {
                    setAddressQuery(event.target.value);
                    if (selectedAddress && event.target.value !== selectedAddress) {
                      setSelectedAddress(null);
                    }
                  }}
                  onFocus={() => {
                    setShowAddressDropdown(true);
                    if (selectedAddress && addressQuery === selectedAddress) {
                      setSelectedAddress(null);
                      setAddressQuery("");
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowAddressDropdown(false), 120)}
                />
              </div>
              {showAddressDropdown ? (
                <div className="locais-filter-results">
                  <button
                    type="button"
                    className="locais-filter-item"
                    onMouseDown={() => {
                      setSelectedAddress(null);
                      setAddressQuery("");
                    }}
                  >
                    Todos
                  </button>
                  {filteredAddressOptions.map((address) => (
                    <button
                      type="button"
                      key={address}
                      className="locais-filter-item"
                      onMouseDown={() => {
                        setSelectedAddress(address);
                        setAddressQuery(address);
                      }}
                    >
                      {address}
                    </button>
                  ))}
                  {filteredAddressOptions.length === 0 ? (
                    <div className="locais-filter-empty">Nenhum resultado.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="locais-grid">
            {error ? <p className="locais-error">{error}</p> : null}
            {filteredSites.length === 0 && !error ? (
              <p className="locais-empty">Nenhum local cadastrado.</p>
            ) : null}
            {filteredSites.map((site) => (
              <article className="locais-card" key={site.id}>
                <div className="locais-card-main">
                  <div className="locais-card-icon">
                    <LucideIcon name="map-pin" className="locais-card-svg" />
                  </div>
                  <div>
                    <p className="locais-card-title">{site.name}</p>
                    <p className="locais-card-sub">{site.address ?? "-"}</p>
                  </div>
                </div>
                <div className="locais-card-actions">
                  <Link className="locais-edit" to={`/locais/editar?id=${site.id}`}>
                    <LucideIcon name="pencil" className="locais-action-icon" />
                    Editar
                  </Link>
                  <Link className="locais-delete" to={`/locais/deletar?id=${site.id}`} aria-label="Excluir">
                    <LucideIcon name="trash-2" className="locais-action-icon" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
