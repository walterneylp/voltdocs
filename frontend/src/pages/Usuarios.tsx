import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import {
  addUserGroupMember,
  blockUser,
  clearToken,
  deleteUser,
  getMe,
  listUserGroupMembers,
  listUserGroups,
  listUsers,
  removeUserGroupMember,
  updateUser
} from "../lib/api";
import "../styles/usuarios.css";
import "../styles/usuarios-novo.css";

export function Usuarios() {
  const authUser = getAuthUser();
  const [profiles, setProfiles] = useState<
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      role: string | null;
      tenant_id?: string | null;
      blocked: boolean;
      deleted: boolean;
      blocked_reason: string | null;
      deleted_reason: string | null;
    }>
  >([]);
  const [error, setError] = useState("");
  const roleLabel = (role?: string | null) => {
    switch ((role ?? "").toUpperCase()) {
      case "ADMIN_GLOBAL":
        return "Administrador Global";
      case "ADMIN_TENANT":
        return "Administrador";
      case "TECHNICIAN":
        return "Técnico";
      default:
        return role ?? "—";
    }
  };
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    role: string;
    groupIds: string[];
  } | null>(null);
  const [blockingUser, setBlockingUser] = useState<{ id: string; name: string } | null>(
    null
  );
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string } | null>(
    null
  );
  const [blockReason, setBlockReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showActive, setShowActive] = useState(true);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [groupMembers, setGroupMembers] = useState<
    Array<{ user_id: string; group_id: string }>
  >([]);
  const [editGroupQuery, setEditGroupQuery] = useState("");
  const [showEditGroupDropdown, setShowEditGroupDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getMe(), listUsers(), listUserGroups(), listUserGroupMembers()])
      .then(([me, data, groupsList, members]) => {
        if (!isMounted) return;
        setTenantId(me.profile?.tenant_id ?? null);
        setProfiles(data);
        setGroups(groupsList);
        setGroupMembers(
          members.map((member) => ({
            user_id: member.user_id,
            group_id: member.group_id
          }))
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar usuarios.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const groupsById = new Map(groups.map((group) => [group.id, group.name]));
  const groupsByUser = groupMembers.reduce<Record<string, string[]>>((acc, member) => {
    const groupName = groupsById.get(member.group_id);
    if (!groupName) return acc;
    acc[member.user_id] ??= [];
    acc[member.user_id].push(groupName);
    return acc;
  }, {});

  const handleEdit = (profile: { id: string; name: string | null; role: string | null }) => {
    const selectedGroupIds = groupMembers
      .filter((member) => member.user_id === profile.id)
      .map((member) => member.group_id);
    setEditingUser({
      id: profile.id,
      name: profile.name ?? "",
      role: profile.role ?? "TECHNICIAN",
      groupIds: selectedGroupIds
    });
    setError("");
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editingUser.name.trim()) {
      setError("Informe o nome do usuario.");
      return;
    }
    setIsSaving(true);
    try {
      await updateUser(editingUser.id, {
        name: editingUser.name.trim(),
        role: editingUser.role
      });
      const existingGroupIds = groupMembers
        .filter((member) => member.user_id === editingUser.id)
        .map((member) => member.group_id);
      const nextGroupIds = editingUser.groupIds ?? [];
      const toAdd = nextGroupIds.filter((id) => !existingGroupIds.includes(id));
      const toRemove = existingGroupIds.filter((id) => !nextGroupIds.includes(id));

      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map((groupId) =>
            removeUserGroupMember({ user_id: editingUser.id, group_id: groupId })
          )
        );
        setGroupMembers((prev) =>
          prev.filter(
            (member) =>
              !(member.user_id === editingUser.id && toRemove.includes(member.group_id))
          )
        );
      }
      if (toAdd.length > 0) {
        if (!tenantId) {
          setError("Tenant nao encontrado no perfil.");
          setIsSaving(false);
          return;
        }
        await Promise.all(
          toAdd.map((groupId) =>
            addUserGroupMember({
              user_id: editingUser.id,
              group_id: groupId,
              tenant_id: tenantId
            })
          )
        );
        setGroupMembers((prev) => [
          ...prev,
          ...toAdd.map((groupId) => ({ user_id: editingUser.id, group_id: groupId }))
        ]);
      }
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === editingUser.id
            ? { ...profile, name: editingUser.name, role: editingUser.role }
            : profile
        )
      );
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    if (!deleteReason.trim()) {
      setError("Informe o motivo da exclusao.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      await deleteUser(deletingUser.id, deleteReason.trim());
      setProfiles((prev) =>
        prev.map((item) =>
          item.id === deletingUser.id
            ? { ...item, deleted: true, blocked: true, deleted_reason: deleteReason.trim() }
            : item
        )
      );
      setGroupMembers((prev) => prev.filter((member) => member.user_id !== deletingUser.id));
      setDeletingUser(null);
      setDeleteReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!blockingUser) return;
    if (!blockReason.trim()) {
      setError("Informe o motivo do bloqueio.");
      return;
    }
    setIsSaving(true);
    try {
      await blockUser(blockingUser.id, blockReason.trim());
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === blockingUser.id
            ? { ...profile, blocked: true, blocked_reason: blockReason.trim() }
            : profile
        )
      );
      setBlockingUser(null);
      setBlockReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao bloquear usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfiles = profiles.filter((profile) => {
    if (profile.deleted) return showDeleted;
    if (profile.blocked) return showBlocked;
    return showActive;
  });

  const filteredEditGroups = groups.filter((group) => {
    if (!editGroupQuery) return true;
    return group.name.toLowerCase().includes(editGroupQuery.toLowerCase());
  });

  return (
    <div className="usuarios">
      <aside className="usuarios-sidebar">
        <div className="usuarios-brand">
          <div className="usuarios-logo" aria-hidden="true" />
          <span className="usuarios-title">VoltDocs</span>
        </div>

        <nav className="usuarios-nav">
          <div className="usuarios-section">
            <p className="usuarios-label">GESTÃO</p>
            <Link className="usuarios-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="usuarios-icon" />
              Visão Geral
            </Link>
            <Link className="usuarios-item" to="/equipamentos">
              <LucideIcon name="cpu" className="usuarios-icon" />
              Equipamentos
            </Link>
            <Link className="usuarios-item" to="/locais">
              <LucideIcon name="map-pin" className="usuarios-icon" />
              Locais
            </Link>
            <Link className="usuarios-item" to="/documentos">
              <LucideIcon name="file-text" className="usuarios-icon" />
              Documentos
            </Link>
            <Link className="usuarios-item" to="/chamados">
              <LucideIcon name="life-buoy" className="usuarios-icon" />
              Chamados
            </Link>
          </div>

          <div className="usuarios-section">
            <p className="usuarios-label">ANÁLISE</p>
            <Link className="usuarios-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="usuarios-icon" />
              Relatórios
            </Link>
          </div>

          <div className="usuarios-section">
            <p className="usuarios-label">PIE</p>
            <Link className="usuarios-item" to="/pie">
              <LucideIcon name="shield" className="usuarios-icon" />
              PIE
            </Link>
          </div>

          <div className="usuarios-section">
            <p className="usuarios-label">CAMPO</p>
            <Link className="usuarios-item" to="/registros">
              <LucideIcon name="clipboard-check" className="usuarios-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="usuarios-section">
            <p className="usuarios-label">SISTEMA</p>
            <Link className="usuarios-item is-active" to="/usuarios">
              <LucideIcon name="users" className="usuarios-icon" />
              Usuários
            </Link>

            <Link className="usuarios-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="usuarios-icon" />
              Dados Empresa
            </Link>
            <Link className="usuarios-item" to="/grupos">
              <LucideIcon name="users-2" className="usuarios-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="usuarios-user">
          <div className="usuarios-user-meta">
            <p className="usuarios-user-name">{authUser?.name ?? "—"}</p>
            <p className="usuarios-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="usuarios-content">
        <header className="usuarios-topbar">
          <span className="usuarios-org">Apogeu Automação</span>
          <div className="usuarios-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="usuarios-bell" />
            <Link
              className="usuarios-logout"
              to="/login"
              onClick={() => { clearToken(); clearAuthUser(); }}
            >
              <LucideIcon name="log-out" className="usuarios-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="usuarios-main">
          <div className="usuarios-header">
            <div>
              <h1>Usuários</h1>
              <p>Gerencie acesso e permissões da equipe.</p>
            </div>
            <Link className="usuarios-new" to="/usuarios/novo">
              <span className="usuarios-plus">
                <LucideIcon name="plus" className="usuarios-plus-icon" />
              </span>
              Novo Usuário
            </Link>
          </div>

          <div className="usuarios-filters">
            <label className="usuarios-check">
              <input
                type="checkbox"
                checked={showActive}
                onChange={(event) => setShowActive(event.target.checked)}
              />
              Ativos
            </label>
            <label className="usuarios-check">
              <input
                type="checkbox"
                checked={showBlocked}
                onChange={(event) => setShowBlocked(event.target.checked)}
              />
              Bloqueados
            </label>
            <label className="usuarios-check">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(event) => setShowDeleted(event.target.checked)}
              />
              Deletados
            </label>
          </div>

          <div className="usuarios-table">
            <div className="usuarios-row usuarios-head">
              <div>Nome / Email</div>
              <div>Função</div>
              <div>Grupos</div>
              <div className="usuarios-actions-col">Ações</div>
            </div>
            {error ? (
              <div className="usuarios-row">
                <div className="usuarios-error">{error}</div>
              </div>
            ) : null}
            {filteredProfiles.map((profile) => (
              <div className="usuarios-row" key={profile.id}>
                <div className="usuarios-usercell">
                  <div className="usuarios-usericon">
                    <LucideIcon name="user-round" className="usuarios-user-svg" />
                  </div>
                  <div>
                    <p className="usuarios-name">{profile.name ?? "—"}</p>
                    <p className="usuarios-email">{profile.email ?? "—"}</p>
                  </div>
                </div>
                <div>
                  <span className="usuarios-pill">{roleLabel(profile.role)}</span>
                  {profile.blocked ? (
                    <span className="usuarios-pill usuarios-pill-warning">Bloqueado</span>
                  ) : null}
                  {profile.deleted ? (
                    <span className="usuarios-pill usuarios-pill-danger">Deletado</span>
                  ) : null}
                </div>
                <div>
                  {groupsByUser[profile.id]?.length ? (
                    groupsByUser[profile.id].map((group) => (
                      <span className="usuarios-pill" key={`${profile.id}-${group}`}>
                        {group}
                      </span>
                    ))
                  ) : (
                    <span className="usuarios-muted">—</span>
                  )}
                </div>
                <div className="usuarios-actions-col">
                  <button
                    className="usuarios-action"
                    type="button"
                    onClick={() => handleEdit(profile)}
                    title="Editar"
                  >
                    <LucideIcon name="pencil" className="usuarios-action-icon" />
                  </button>
                  <button
                    className="usuarios-action is-block"
                    type="button"
                    onClick={() => setBlockingUser({ id: profile.id, name: profile.name ?? "" })}
                    title="Bloquear"
                    disabled={profile.deleted}
                  >
                    <LucideIcon name="alert-triangle" className="usuarios-action-icon" />
                  </button>
                  <button
                    className="usuarios-action is-delete"
                    type="button"
                    onClick={() => setDeletingUser({ id: profile.id, name: profile.name ?? "" })}
                    title="Excluir"
                    disabled={profile.deleted}
                  >
                    <LucideIcon name="trash-2" className="usuarios-action-icon" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {editingUser ? (
        <>
          <div className="usuarios-modal-backdrop" aria-hidden="true" />
          <section className="usuarios-modal" role="dialog" aria-label="Editar Usuario">
            <header className="usuarios-modal-header">
              <h2>Editar Usuario</h2>
              <button
                className="usuarios-modal-close"
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Fechar"
              >
                <LucideIcon name="x" className="usuarios-modal-close-icon" />
              </button>
            </header>
            <div className="usuarios-modal-body">
              <div className="usuarios-field">
                <label htmlFor="usuario-edit-nome">Nome Completo</label>
                <input
                  id="usuario-edit-nome"
                  type="text"
                  value={editingUser.name}
                  onChange={(event) =>
                    setEditingUser((prev) =>
                      prev ? { ...prev, name: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="usuarios-field">
                <label htmlFor="usuario-edit-role">Funcao (Nivel de Acesso)</label>
                <div className="usuarios-select">
                  <select
                    id="usuario-edit-role"
                    value={editingUser.role}
                    onChange={(event) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, role: event.target.value } : prev
                      )
                    }
                  >
                    <option value="ADMIN_GLOBAL">Administrador Global</option>
                    <option value="ADMIN_TENANT">Administrador</option>
                    <option value="TECHNICIAN">Técnico</option>
                  </select>
                  <LucideIcon name="chevron-down" className="usuarios-select-icon" />
                </div>
              </div>
              <div className="usuarios-field">
                <label>Grupos de Manutenção</label>
                <div className="usuarios-multi">
                  <div className="usuarios-multi-input">
                    <LucideIcon name="search" className="usuarios-multi-icon" />
                    <input
                      type="text"
                      placeholder="Buscar grupos"
                      value={editGroupQuery}
                      onChange={(event) => {
                        setEditGroupQuery(event.target.value);
                        setShowEditGroupDropdown(true);
                      }}
                      onFocus={() => setShowEditGroupDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditGroupDropdown(false), 120)}
                    />
                  </div>
                  {showEditGroupDropdown ? (
                    <div className="usuarios-multi-dropdown">
                      {filteredEditGroups.length === 0 ? (
                        <div className="usuarios-multi-empty">Nenhum grupo encontrado.</div>
                      ) : (
                        filteredEditGroups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            className="usuarios-multi-option"
                            onMouseDown={() =>
                              setEditingUser((prev) => {
                                if (!prev) return prev;
                                const exists = prev.groupIds.includes(group.id);
                                return {
                                  ...prev,
                                  groupIds: exists
                                    ? prev.groupIds.filter((id) => id !== group.id)
                                    : [...prev.groupIds, group.id]
                                };
                              })
                            }
                          >
                            <span>{group.name}</span>
                            <input
                              type="checkbox"
                              checked={editingUser.groupIds.includes(group.id)}
                              readOnly
                            />
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                {editingUser.groupIds.length > 0 ? (
                  <div className="usuarios-multi-tags">
                    {editingUser.groupIds.map((groupId) => {
                      const group = groups.find((item) => item.id === groupId);
                      return (
                        <button
                          type="button"
                          className="usuarios-multi-tag"
                          key={groupId}
                          onClick={() =>
                            setEditingUser((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    groupIds: prev.groupIds.filter((id) => id !== groupId)
                                  }
                                : prev
                            )
                          }
                        >
                          {group?.name ?? "Grupo"} <span>×</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {error ? <p className="usuarios-error">{error}</p> : null}
            </div>
            <footer className="usuarios-modal-footer">
              <button
                className="usuarios-modal-cancel"
                type="button"
                onClick={() => setEditingUser(null)}
              >
                Cancelar
              </button>
              <button
                className="usuarios-modal-save"
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </button>
            </footer>
          </section>
        </>
      ) : null}

      {blockingUser ? (
        <>
          <div className="usuarios-modal-backdrop" aria-hidden="true" />
          <section className="usuarios-modal" role="dialog" aria-label="Bloquear Usuario">
            <header className="usuarios-modal-header">
              <h2>Bloquear Usuario</h2>
              <button
                className="usuarios-modal-close"
                type="button"
                onClick={() => setBlockingUser(null)}
                aria-label="Fechar"
              >
                <LucideIcon name="x" className="usuarios-modal-close-icon" />
              </button>
            </header>
            <div className="usuarios-modal-body">
              <p className="usuarios-block-note">
                Informe o motivo do bloqueio para {blockingUser.name || "este usuario"}.
              </p>
              <div className="usuarios-field">
                <label htmlFor="usuario-block-reason">Motivo do bloqueio</label>
                <textarea
                  id="usuario-block-reason"
                  rows={4}
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  placeholder="Ex: Ferias ate 15/02, desligado em 10/01, etc."
                />
              </div>
              {error ? <p className="usuarios-error">{error}</p> : null}
            </div>
            <footer className="usuarios-modal-footer">
              <button
                className="usuarios-modal-cancel"
                type="button"
                onClick={() => setBlockingUser(null)}
              >
                Cancelar
              </button>
              <button
                className="usuarios-modal-save"
                type="button"
                onClick={handleBlock}
                disabled={isSaving}
              >
                {isSaving ? "Bloqueando..." : "Bloquear"}
              </button>
            </footer>
          </section>
        </>
      ) : null}

      {deletingUser ? (
        <>
          <div className="usuarios-modal-backdrop" aria-hidden="true" />
          <section className="usuarios-modal" role="dialog" aria-label="Excluir Usuario">
            <header className="usuarios-modal-header">
              <h2>Excluir Usuario</h2>
              <button
                className="usuarios-modal-close"
                type="button"
                onClick={() => setDeletingUser(null)}
                aria-label="Fechar"
              >
                <LucideIcon name="x" className="usuarios-modal-close-icon" />
              </button>
            </header>
            <div className="usuarios-modal-body">
              <p className="usuarios-block-note">
                Informe o motivo da exclusao para {deletingUser.name || "este usuario"}.
              </p>
              <div className="usuarios-field">
                <label htmlFor="usuario-delete-reason">Motivo da exclusao</label>
                <textarea
                  id="usuario-delete-reason"
                  rows={4}
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  placeholder="Ex: desligado, transferido, etc."
                />
              </div>
              {error ? <p className="usuarios-error">{error}</p> : null}
            </div>
            <footer className="usuarios-modal-footer">
              <button
                className="usuarios-modal-cancel"
                type="button"
                onClick={() => setDeletingUser(null)}
              >
                Cancelar
              </button>
              <button
                className="usuarios-modal-save"
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
              >
                {isSaving ? "Excluindo..." : "Excluir"}
              </button>
            </footer>
          </section>
        </>
      ) : null}
    </div>
  );
}
