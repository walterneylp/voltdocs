import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import { clearToken, listUserGroupMembers, listUserGroups } from "../lib/api";
import "../styles/grupos.css";

export function Grupos() {
  const authUser = getAuthUser();
  const [groups, setGroups] = useState<Array<{ id: string; name: string; description: string | null }>>(
    []
  );
  const [members, setMembers] = useState<Array<{ group_id: string }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([listUserGroups(), listUserGroupMembers()])
      .then(([groupsList, membersList]) => {
        if (!isMounted) return;
        setGroups(groupsList);
        setMembers(membersList.map((member) => ({ group_id: member.group_id })));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar grupos.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const groupCounts = useMemo(() => {
    return members.reduce<Record<string, number>>((acc, member) => {
      acc[member.group_id] = (acc[member.group_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [members]);

  return (
    <div className="grupos">
      <aside className="grupos-sidebar">
        <div className="grupos-brand">
          <div className="grupos-logo" aria-hidden="true" />
          <span className="grupos-title">VoltDocs</span>
        </div>

        <nav className="grupos-nav">
          <div className="grupos-section">
            <p className="grupos-label">GESTÃO</p>
            <Link className="grupos-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="grupos-icon" />
              Visão Geral
            </Link>
            <Link className="grupos-item" to="/equipamentos">
              <LucideIcon name="cpu" className="grupos-icon" />
              Equipamentos
            </Link>
            <Link className="grupos-item" to="/locais">
              <LucideIcon name="map-pin" className="grupos-icon" />
              Locais
            </Link>
            <Link className="grupos-item" to="/documentos">
              <LucideIcon name="file-text" className="grupos-icon" />
              Documentos
            </Link>
            <Link className="grupos-item" to="/chamados">
              <LucideIcon name="life-buoy" className="grupos-icon" />
              Chamados
            </Link>
          </div>

          <div className="grupos-section">
            <p className="grupos-label">ANÁLISE</p>
            <Link className="grupos-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="grupos-icon" />
              Relatórios
            </Link>
          </div>

          <div className="grupos-section">
            <p className="grupos-label">PIE</p>
            <Link className="grupos-item" to="/pie">
              <LucideIcon name="shield" className="grupos-icon" />
              PIE
            </Link>
          </div>

          <div className="grupos-section">
            <p className="grupos-label">CAMPO</p>
            <Link className="grupos-item" to="/registros">
              <LucideIcon name="clipboard-check" className="grupos-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="grupos-section">
            <p className="grupos-label">SISTEMA</p>
            <Link className="grupos-item" to="/usuarios">
              <LucideIcon name="users" className="grupos-icon" />
              Usuários
            </Link>

            <Link className="grupos-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="grupos-icon" />
              Dados Empresa
            </Link>
            <Link className="grupos-item is-active" to="/grupos">
              <LucideIcon name="users-2" className="grupos-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="grupos-user">
          <div className="grupos-user-meta">
            <p className="grupos-user-name">{authUser?.name ?? "—"}</p>
            <p className="grupos-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="grupos-content">
        <header className="grupos-topbar">
          <span className="grupos-org">Apogeu Automação</span>
          <div className="grupos-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="grupos-bell" />
            <Link className="grupos-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="grupos-logout-icon" />
              Alterar senha
            </Link>
            <Link
              className="grupos-logout"
              to="/login"
              onClick={() => {
                clearToken();
                clearAuthUser();
              }}
            >
              <LucideIcon name="log-out" className="grupos-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="grupos-main">
          <div className="grupos-header">
            <div>
              <h1>Grupos de Manutenção</h1>
              <p>Crie equipes para organizar chamados e permissões.</p>
            </div>
            <Link className="grupos-new" to="/grupos/novo">
              <span className="grupos-plus">
                <LucideIcon name="plus" className="grupos-plus-icon" />
              </span>
              Novo Grupo
            </Link>
          </div>

          {error ? <p className="grupos-error">{error}</p> : null}

          <div className="grupos-grid">
            {groups.length === 0 && !error ? (
              <p className="grupos-empty">Nenhum grupo encontrado.</p>
            ) : null}
            {groups.map((group) => (
              <article className="grupos-card" key={group.id}>
                <div className="grupos-card-main">
                  <div className="grupos-card-icon">
                    <LucideIcon name="users-round" className="grupos-card-svg" />
                  </div>
                  <div>
                    <p className="grupos-card-title">
                      {group.name}{" "}
                      <span className="grupos-count">{groupCounts[group.id] ?? 0}</span>
                    </p>
                    <p className="grupos-card-sub">
                      {group.description || "Sem descrição informada."}
                    </p>
                  </div>
                </div>
                <div className="grupos-card-actions">
                  <Link className="grupos-members" to={`/grupos/membros?id=${group.id}`}>
                    <LucideIcon name="user-round" className="grupos-action-icon" />
                    Membros
                  </Link>
                  <Link className="grupos-edit" to={`/grupos/editar/${group.id}`}>
                    <LucideIcon name="pencil" className="grupos-action-icon" />
                    Editar
                  </Link>
                  <button className="grupos-delete" type="button" aria-label="Excluir">
                    <LucideIcon name="trash-2" className="grupos-action-icon" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
