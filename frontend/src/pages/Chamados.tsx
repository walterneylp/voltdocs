import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import { clearToken, listAssets, listProfiles, listTickets, listUserGroups } from "../lib/api";
import "../styles/chamados.css";

export function Chamados() {
  const authUser = getAuthUser();
  const [tickets, setTickets] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      status: string | null;
      priority: string | null;
      equipment_id: string;
      assigned_to_id: string | null;
      assigned_group_ids: string[] | null;
      created_at: string;
    }>
  >([]);
  const [assets, setAssets] = useState<Array<{ id: string; tag: string; name: string }>>(
    []
  );
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string | null }>>(
    []
  );
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState("date_desc");
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([listTickets(), listAssets(), listProfiles(), listUserGroups()])
      .then(([ticketList, assetList, profileList, groupList]) => {
        if (!isMounted) return;
        setTickets(ticketList);
        setAssets(assetList);
        setProfiles(profileList.map((profile) => ({ id: profile.id, name: profile.name })));
        setGroups(groupList);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar chamados.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const assetById = useMemo(() => {
    return new Map(assets.map((asset) => [asset.id, asset]));
  }, [assets]);

  const profileById = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile.name ?? "—"]));
  }, [profiles]);

  const groupById = useMemo(() => {
    return new Map(groups.map((group) => [group.id, group.name]));
  }, [groups]);

  const titleOptions = useMemo(() => {
    return Array.from(new Set(tickets.map((ticket) => ticket.title))).sort();
  }, [tickets]);

  const filteredTitleOptions = titleOptions.filter((title) => {
    if (!titleQuery) return true;
    return title.toLowerCase().includes(titleQuery.toLowerCase());
  });

  const filteredEquipmentOptions = assets.filter((asset) => {
    if (!equipmentQuery) return true;
    const query = equipmentQuery.toLowerCase();
    return (
      asset.tag.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query)
    );
  });

  const showTitleOptions =
    showTitleDropdown && (!selectedTitle || titleQuery !== selectedTitle);
  const showEquipmentOptions =
    showEquipmentDropdown && !selectedEquipmentId;

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tickets.forEach((ticket) => {
      const status = (ticket.status ?? "ABERTO").toUpperCase();
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });
    return counts;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const titleFilter = (selectedTitle ?? titleQuery).trim().toLowerCase();
    const equipmentFilter = equipmentQuery.trim().toLowerCase();
    const hasStatusFilter = selectedStatuses.length > 0;
    const hasPriorityFilter = selectedPriorities.length > 0;

    let list = tickets.filter((ticket) => {
      const titleMatch = titleFilter
        ? ticket.title.toLowerCase().includes(titleFilter)
        : true;

      let equipmentMatch = true;
      if (selectedEquipmentId) {
        equipmentMatch = ticket.equipment_id === selectedEquipmentId;
      } else if (equipmentFilter) {
        const asset = assetById.get(ticket.equipment_id);
        equipmentMatch = asset
          ? asset.tag.toLowerCase().includes(equipmentFilter) ||
            asset.name.toLowerCase().includes(equipmentFilter)
          : false;
      }

      const statusValue = (ticket.status ?? "ABERTO").toUpperCase();
      const priorityValue = (ticket.priority ?? "").toUpperCase();
      const statusMatch = hasStatusFilter
        ? selectedStatuses.includes(statusValue)
        : true;
      const priorityMatch = hasPriorityFilter
        ? selectedPriorities.includes(priorityValue)
        : true;

      return titleMatch && equipmentMatch && statusMatch && priorityMatch;
    });

    if (sortMode === "date_asc") {
      list = [...list].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (sortMode === "status") {
      list = [...list].sort((a, b) =>
        (a.status ?? "ABERTO").localeCompare(b.status ?? "ABERTO")
      );
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [
    tickets,
    titleQuery,
    selectedTitle,
    equipmentQuery,
    selectedEquipmentId,
    selectedStatuses,
    selectedPriorities,
    sortMode,
    assetById
  ]);

  const handleSelectTitle = (title: string) => {
    setSelectedTitle(title);
    setTitleQuery(title);
    setShowTitleDropdown(false);
  };

  const handleSelectEquipment = (assetId: string) => {
    const asset = assets.find((item) => item.id === assetId);
    setSelectedEquipmentId(assetId);
    setEquipmentQuery(asset?.tag ?? "");
    setShowEquipmentDropdown(false);
  };

  const clearTitleFilter = () => {
    setSelectedTitle(null);
    setTitleQuery("");
    setShowTitleDropdown(false);
  };

  const clearEquipmentFilter = () => {
    setSelectedEquipmentId(null);
    setEquipmentQuery("");
    setShowEquipmentDropdown(false);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status]
    );
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((item) => item !== priority)
        : [...prev, priority]
    );
  };

  return (
    <div className="chamados">
      <aside className="chamados-sidebar">
        <div className="chamados-brand">
          <div className="chamados-logo" aria-hidden="true" />
          <span className="chamados-title">VoltDocs</span>
        </div>

        <nav className="chamados-nav">
          <div className="chamados-section">
            <p className="chamados-label">GESTÃO</p>
            <Link className="chamados-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="chamados-icon" />
              Visão Geral
            </Link>
            <Link className="chamados-item" to="/equipamentos">
              <LucideIcon name="cpu" className="chamados-icon" />
              Equipamentos
            </Link>
            <Link className="chamados-item" to="/locais">
              <LucideIcon name="map-pin" className="chamados-icon" />
              Locais
            </Link>
            <Link className="chamados-item" to="/documentos">
              <LucideIcon name="file-text" className="chamados-icon" />
              Documentos
            </Link>
            <Link className="chamados-item is-active" to="/chamados">
              <LucideIcon name="life-buoy" className="chamados-icon" />
              Chamados
            </Link>
          </div>

          <div className="chamados-section">
            <p className="chamados-label">ANÁLISE</p>
            <Link className="chamados-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="chamados-icon" />
              Relatórios
            </Link>
          </div>

          <div className="chamados-section">
            <p className="chamados-label">PIE</p>
            <Link className="chamados-item" to="/pie">
              <LucideIcon name="shield" className="chamados-icon" />
              PIE
            </Link>
          </div>

          <div className="chamados-section">
            <p className="chamados-label">CAMPO</p>
            <Link className="chamados-item" to="/registros">
              <LucideIcon name="clipboard-check" className="chamados-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="chamados-section">
            <p className="chamados-label">SISTEMA</p>
            <Link className="chamados-item" to="/usuarios">
              <LucideIcon name="users" className="chamados-icon" />
              Usuários
            </Link>

            <Link className="chamados-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="chamados-icon" />
              Dados Empresa
            </Link>
            <Link className="chamados-item" to="/grupos">
              <LucideIcon name="users-2" className="chamados-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="chamados-user">
          <div className="chamados-user-meta">
            <p className="chamados-user-name">{authUser?.name ?? "—"}</p>
            <p className="chamados-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="chamados-content">
        <header className="chamados-topbar">
          <span className="chamados-org">Apogeu Automação</span>
          <div className="chamados-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="chamados-bell" />
            <Link className="chamados-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="chamados-logout-icon" />
              Alterar senha
            </Link>
            <Link className="chamados-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="chamados-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="chamados-main">
          <div className="chamados-header">
            <div>
              <h1>Chamados</h1>
              <p>Solicitações de manutenção corretiva.</p>
            </div>
            <Link className="chamados-new" to="/chamados/novo">
              <span className="chamados-plus">
                <LucideIcon name="plus" className="chamados-plus-icon" />
              </span>
              Abrir Chamado
            </Link>
          </div>

          <div className="chamados-summary">
            {["ABERTO", "EM ANDAMENTO", "RESOLVIDO"].map((status) => (
              <div className="chamados-summary-card" key={status}>
                <p>{status}</p>
                <strong>{statusCounts.get(status) ?? 0}</strong>
              </div>
            ))}
          </div>

          <div className="chamados-filters">
            <div className="chamados-filter">
              <label>Nome do Chamado</label>
              <div className="chamados-input">
                <LucideIcon name="search" className="chamados-input-icon" />
                <input
                  type="text"
                  placeholder="Todos"
                  value={titleQuery}
                  onChange={(event) => {
                    setTitleQuery(event.target.value);
                    if (selectedTitle && event.target.value !== selectedTitle) {
                      setSelectedTitle(null);
                    }
                    setShowTitleDropdown(true);
                  }}
                  onFocus={() => {
                    setShowTitleDropdown(true);
                    if (selectedTitle && titleQuery === selectedTitle) {
                      setSelectedTitle(null);
                      setTitleQuery("");
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowTitleDropdown(false), 120)}
                />
              </div>
              {showTitleOptions && filteredTitleOptions.length > 0 ? (
                <div className="chamados-filter-results">
                  <button
                    type="button"
                    className="chamados-filter-item"
                    onMouseDown={clearTitleFilter}
                  >
                    Todos
                  </button>
                  {filteredTitleOptions.slice(0, 6).map((title) => (
                    <button
                      key={title}
                      type="button"
                      className="chamados-filter-item"
                      onMouseDown={() => handleSelectTitle(title)}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="chamados-filter">
              <label>Equipamento</label>
              <div className="chamados-input">
                <LucideIcon name="search" className="chamados-input-icon" />
                <input
                  type="text"
                  placeholder="Todos"
                  value={equipmentQuery}
                  onChange={(event) => {
                    setEquipmentQuery(event.target.value);
                    if (selectedEquipmentId && event.target.value) {
                      setSelectedEquipmentId(null);
                    }
                    setShowEquipmentDropdown(true);
                  }}
                  onFocus={() => {
                    setShowEquipmentDropdown(true);
                    if (selectedEquipmentId && equipmentQuery) {
                      setSelectedEquipmentId(null);
                      setEquipmentQuery("");
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowEquipmentDropdown(false), 120)}
                />
              </div>
              {showEquipmentOptions && filteredEquipmentOptions.length > 0 ? (
                <div className="chamados-filter-results">
                  <button
                    type="button"
                    className="chamados-filter-item"
                    onMouseDown={clearEquipmentFilter}
                  >
                    Todos
                  </button>
                  {filteredEquipmentOptions.slice(0, 6).map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="chamados-filter-item"
                      onMouseDown={() => handleSelectEquipment(asset.id)}
                    >
                      {asset.tag} - {asset.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="chamados-filter">
              <label>Ordenar por</label>
              <div className="chamados-select">
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                  <option value="date_desc">Data (mais recente)</option>
                  <option value="date_asc">Data (mais antiga)</option>
                  <option value="status">Status</option>
                </select>
                <LucideIcon name="chevron-down" className="chamados-select-icon" />
              </div>
            </div>
          </div>

          <div className="chamados-filter-checks">
            <div>
              <p>Status</p>
              {["ABERTO", "EM ANDAMENTO", "RESOLVIDO"].map((status) => (
                <label className="chamados-check" key={status}>
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  {status}
                </label>
              ))}
            </div>
            <div>
              <p>Prioridade</p>
              {["BAIXA", "MÉDIA", "ALTA", "CRÍTICA"].map((priority) => (
                <label className="chamados-check" key={priority}>
                  <input
                    type="checkbox"
                    checked={selectedPriorities.includes(priority)}
                    onChange={() => togglePriority(priority)}
                  />
                  {priority}
                </label>
              ))}
            </div>
          </div>

          {error ? <p className="chamados-error">{error}</p> : null}

          {filteredTickets.length === 0 ? (
            <div className="chamados-empty">Nenhum chamado registrado.</div>
          ) : (
            filteredTickets.map((ticket) => {
              const asset = assetById.get(ticket.equipment_id);
              const assignee = ticket.assigned_to_id
                ? profileById.get(ticket.assigned_to_id)
                : null;
              const assignedGroupIds = ticket.assigned_group_ids ?? [];
              const groupNames = assignedGroupIds
                .map((id) => groupById.get(id))
                .filter(Boolean) as string[];
              const technicianNames = assignedGroupIds
                .map((id) => profileById.get(id))
                .filter(Boolean) as string[];
              const extraTechnicians = technicianNames.filter(
                (name) => name !== assignee
              );
              const createdAt = ticket.created_at
                ? new Date(ticket.created_at).toLocaleDateString("pt-BR")
                : "—";
              return (
                <article className="chamados-card" key={ticket.id}>
                  <div className="chamados-card-left">
                    <div className="chamados-status-icon">
                      <LucideIcon name="check-circle" className="chamados-status-svg" />
                    </div>
                    <div>
                      <div className="chamados-card-title">
                        <span>{ticket.title}</span>
                        {ticket.priority ? (
                          <span className="chamados-badge">{ticket.priority}</span>
                        ) : null}
                      </div>
                      <p className="chamados-card-desc">
                        {ticket.description ?? "Sem descrição."}
                      </p>
                      <p className="chamados-card-meta">
                        Equipamento:{" "}
                        <strong>{asset ? asset.tag : ticket.equipment_id}</strong> •
                        Criado: {createdAt}
                      </p>
                      {assignee || groupNames.length > 0 || extraTechnicians.length > 0 ? (
                        <div className="chamados-card-pill">
                          <LucideIcon name="user" className="chamados-pill-icon" />
                          Atribuído a:{" "}
                          {assignee ? <strong>{assignee}</strong> : null}
                          {assignee &&
                          (groupNames.length > 0 || extraTechnicians.length > 0)
                            ? " + "
                            : null}
                          {extraTechnicians.map((name, index) => (
                            <strong key={`${name}-${index}`}>
                              {index > 0 ? " + " : ""}
                              {name}
                            </strong>
                          ))}
                          {extraTechnicians.length > 0 && groupNames.length > 0 ? " + " : null}
                          {groupNames.map((group, index) => (
                            <strong key={group}>
                              {index > 0 ? " + " : ""}
                              {group}
                            </strong>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="chamados-card-right">
                    <span className="chamados-resolvido">
                      {(ticket.status ?? "ABERTO").toUpperCase()}
                    </span>
                    <Link className="chamados-edit" to={`/chamados/atualizar?id=${ticket.id}`}>
                      <LucideIcon name="pencil" className="chamados-edit-icon" />
                      Editar
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
