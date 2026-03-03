import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { clearAuthUser, getAuthUser } from "../lib/auth";
import {
  clearToken,
  createCompanyProfile,
  deleteCompanyProfile,
  getMe,
  listCompanyProfiles,
  updateCompanyProfile
} from "../lib/api";
import "../styles/dados-empresa.css";

const emptyForm = {
  legal_name: "",
  trade_name: "",
  cnpj: "",
  state_registration: "",
  municipal_registration: "",
  email: "",
  phone: "",
  website: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_district: "",
  address_city: "",
  address_state: "",
  address_zip: ""
};

export function DadosEmpresa() {
  const authUser = getAuthUser();
  const [profiles, setProfiles] = useState<
    Array<{
      id: string;
      tenant_id: string;
      legal_name: string;
      trade_name: string | null;
      cnpj: string;
      state_registration: string | null;
      municipal_registration: string | null;
      email: string | null;
      phone: string | null;
      website: string | null;
      address_street: string | null;
      address_number: string | null;
      address_complement: string | null;
      address_district: string | null;
      address_city: string | null;
      address_state: string | null;
      address_zip: string | null;
      created_at: string;
    }>
  >([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;
    Promise.all([getMe(), listCompanyProfiles()])
      .then(([me, list]) => {
        if (!isMounted) return;
        setTenantId(me.profile.tenant_id);
        setProfiles(list);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar empresas.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = () => {
    setError("");
    setForm({ ...emptyForm });
    setEditingProfileId(null);
    setShowModal(true);
  };

  const handleEditProfile = (profile: (typeof profiles)[number]) => {
    setError("");
    setEditingProfileId(profile.id);
    setForm({
      legal_name: profile.legal_name ?? "",
      trade_name: profile.trade_name ?? "",
      cnpj: profile.cnpj ?? "",
      state_registration: profile.state_registration ?? "",
      municipal_registration: profile.municipal_registration ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      website: profile.website ?? "",
      address_street: profile.address_street ?? "",
      address_number: profile.address_number ?? "",
      address_complement: profile.address_complement ?? "",
      address_district: profile.address_district ?? "",
      address_city: profile.address_city ?? "",
      address_state: profile.address_state ?? "",
      address_zip: profile.address_zip ?? ""
    });
    setShowModal(true);
  };

  const handleConfirmDelete = (profile: (typeof profiles)[number]) => {
    setDeleteTarget({ id: profile.id, name: profile.legal_name });
    setShowDeleteModal(true);
  };

  const handleSave = async () => {
    if (!tenantId) {
      setError("Tenant nao encontrado no perfil.");
      return;
    }
    if (!form.legal_name.trim() || !form.cnpj.trim()) {
      setError("Razao social e CNPJ sao obrigatorios.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const payload = {
        legal_name: form.legal_name.trim(),
        trade_name: form.trade_name.trim() || null,
        cnpj: form.cnpj.trim(),
        state_registration: form.state_registration.trim() || null,
        municipal_registration: form.municipal_registration.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        address_street: form.address_street.trim() || null,
        address_number: form.address_number.trim() || null,
        address_complement: form.address_complement.trim() || null,
        address_district: form.address_district.trim() || null,
        address_city: form.address_city.trim() || null,
        address_state: form.address_state.trim() || null,
        address_zip: form.address_zip.trim() || null
      };
      if (editingProfileId) {
        await updateCompanyProfile(editingProfileId, payload);
        setProfiles((prev) =>
          prev.map((item) => (item.id === editingProfileId ? { ...item, ...payload } : item))
        );
      } else {
        const response = await createCompanyProfile({
          ...payload,
          tenant_id: tenantId
        });
        const created = {
          ...payload,
          id: response.id,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        };
        setProfiles((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteCompanyProfile(deleteTarget.id);
      setProfiles((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir empresa.");
    } finally {
      setIsDeleting(false);
    }
  };

  const companyCards = useMemo(() => {
    return profiles.map((profile) => {
      const address = [
        profile.address_street,
        profile.address_number,
        profile.address_complement,
        profile.address_district,
        profile.address_city,
        profile.address_state,
        profile.address_zip
      ]
        .filter(Boolean)
        .join(", ");
      return { profile, address };
    });
  }, [profiles]);

  return (
    <div className="empresa">
      <aside className="empresa-sidebar">
        <div className="empresa-brand">
          <div className="empresa-logo" aria-hidden="true" />
          <span className="empresa-title">VoltDocs</span>
        </div>

        <nav className="empresa-nav">
          <div className="empresa-section">
            <p className="empresa-label">GESTAO</p>
            <Link className="empresa-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="empresa-icon" />
              Visao Geral
            </Link>
            <Link className="empresa-item" to="/equipamentos">
              <LucideIcon name="cpu" className="empresa-icon" />
              Equipamentos
            </Link>
            <Link className="empresa-item" to="/locais">
              <LucideIcon name="map-pin" className="empresa-icon" />
              Locais
            </Link>
            <Link className="empresa-item" to="/documentos">
              <LucideIcon name="file-text" className="empresa-icon" />
              Documentos
            </Link>
            <Link className="empresa-item" to="/chamados">
              <LucideIcon name="life-buoy" className="empresa-icon" />
              Chamados
            </Link>
          </div>

          <div className="empresa-section">
            <p className="empresa-label">ANALISE</p>
            <Link className="empresa-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="empresa-icon" />
              Relatorios
            </Link>
          </div>

          <div className="empresa-section">
            <p className="empresa-label">PIE</p>
            <Link className="empresa-item" to="/pie">
              <LucideIcon name="shield" className="empresa-icon" />
              PIE
            </Link>
          </div>

          <div className="empresa-section">
            <p className="empresa-label">CAMPO</p>
            <Link className="empresa-item" to="/registros">
              <LucideIcon name="clipboard-check" className="empresa-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="empresa-section">
            <p className="empresa-label">SISTEMA</p>
            <Link className="empresa-item" to="/usuarios">
              <LucideIcon name="users" className="empresa-icon" />
              Usuarios
            </Link>
            <Link className="empresa-item is-active" to="/dados-empresa">
              <LucideIcon name="file-text" className="empresa-icon" />
              Dados Empresa
            </Link>
            <Link className="empresa-item" to="/grupos">
              <LucideIcon name="users-2" className="empresa-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="empresa-user">
          <div className="empresa-user-meta">
            <p className="empresa-user-name">{authUser?.name ?? "—"}</p>
            <p className="empresa-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="empresa-content">
        <header className="empresa-topbar">
          <span className="empresa-org">Apogeu Automacao</span>
          <div className="empresa-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="empresa-bell" />
            <Link className="empresa-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="empresa-logout-icon" />
              Alterar senha
            </Link>
            <Link
              className="empresa-logout"
              to="/login"
              onClick={() => {
                clearToken();
                clearAuthUser();
              }}
            >
              <LucideIcon name="log-out" className="empresa-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="empresa-main">
          <div className="empresa-header">
            <div>
              <h1>Dados da Empresa</h1>
              <p>Informacoes cadastrais da empresa para relatorios e conformidade.</p>
            </div>
            <button className="empresa-button" type="button" onClick={handleOpenModal}>
              <LucideIcon name="plus" className="empresa-button-icon" />
              Cadastrar Empresa
            </button>
          </div>

          {error ? <div className="empresa-error">{error}</div> : null}

          {companyCards.length === 0 ? (
            <div className="empresa-empty">
              Nenhuma empresa cadastrada. Clique em "Cadastrar Empresa" para iniciar.
            </div>
          ) : (
            <div className="empresa-grid">
              {companyCards.map(({ profile, address }) => (
                <article key={profile.id} className="empresa-card">
                  <div className="empresa-card-head">
                    <div>
                      <h2>{profile.legal_name}</h2>
                      {profile.trade_name ? (
                        <span className="empresa-card-sub">{profile.trade_name}</span>
                      ) : null}
                    </div>
                    <div className="empresa-card-actions">
                      <span className="empresa-card-tag">CNPJ {profile.cnpj}</span>
                      <button
                        type="button"
                        className="empresa-card-icon"
                        onClick={() => handleEditProfile(profile)}
                        title="Editar"
                      >
                        <LucideIcon name="pencil" className="empresa-card-icon-svg" />
                      </button>
                      <button
                        type="button"
                        className="empresa-card-icon danger"
                        onClick={() => handleConfirmDelete(profile)}
                        title="Excluir"
                      >
                        <LucideIcon name="trash-2" className="empresa-card-icon-svg" />
                      </button>
                    </div>
                  </div>
                  <div className="empresa-card-body">
                    <div>
                      <span className="empresa-card-label">Inscricao Estadual</span>
                      <strong>{profile.state_registration ?? "—"}</strong>
                    </div>
                    <div>
                      <span className="empresa-card-label">Inscricao Municipal</span>
                      <strong>{profile.municipal_registration ?? "—"}</strong>
                    </div>
                    <div>
                      <span className="empresa-card-label">Email</span>
                      <strong>{profile.email ?? "—"}</strong>
                    </div>
                    <div>
                      <span className="empresa-card-label">Telefone</span>
                      <strong>{profile.phone ?? "—"}</strong>
                    </div>
                    <div>
                      <span className="empresa-card-label">Site</span>
                      <strong>{profile.website ?? "—"}</strong>
                    </div>
                    <div>
                      <span className="empresa-card-label">Endereco</span>
                      <strong>{address || "—"}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showModal ? (
        <div className="empresa-modal-overlay">
          <div className="empresa-modal">
            <div className="empresa-modal-header">
              <div>
                <h3>{editingProfileId ? "Editar Empresa" : "Cadastrar Empresa"}</h3>
                <p>Preencha os dados cadastrais da empresa.</p>
              </div>
              <button
                type="button"
                className="empresa-modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="empresa-modal-body">
              <div className="empresa-field">
                <label>Razao Social *</label>
                <input
                  type="text"
                  value={form.legal_name}
                  onChange={(event) => handleChange("legal_name", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Nome Fantasia</label>
                <input
                  type="text"
                  value={form.trade_name}
                  onChange={(event) => handleChange("trade_name", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>CNPJ *</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(event) => handleChange("cnpj", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Inscricao Estadual</label>
                <input
                  type="text"
                  value={form.state_registration}
                  onChange={(event) => handleChange("state_registration", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Inscricao Municipal</label>
                <input
                  type="text"
                  value={form.municipal_registration}
                  onChange={(event) =>
                    handleChange("municipal_registration", event.target.value)
                  }
                />
              </div>
              <div className="empresa-field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Telefone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Site</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(event) => handleChange("website", event.target.value)}
                />
              </div>
              <div className="empresa-field empresa-field-full">
                <label>Endereco</label>
                <input
                  type="text"
                  value={form.address_street}
                  onChange={(event) => handleChange("address_street", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Numero</label>
                <input
                  type="text"
                  value={form.address_number}
                  onChange={(event) => handleChange("address_number", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Complemento</label>
                <input
                  type="text"
                  value={form.address_complement}
                  onChange={(event) => handleChange("address_complement", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Bairro</label>
                <input
                  type="text"
                  value={form.address_district}
                  onChange={(event) => handleChange("address_district", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Cidade</label>
                <input
                  type="text"
                  value={form.address_city}
                  onChange={(event) => handleChange("address_city", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>Estado</label>
                <input
                  type="text"
                  value={form.address_state}
                  onChange={(event) => handleChange("address_state", event.target.value)}
                />
              </div>
              <div className="empresa-field">
                <label>CEP</label>
                <input
                  type="text"
                  value={form.address_zip}
                  onChange={(event) => handleChange("address_zip", event.target.value)}
                />
              </div>
            </div>

            {error ? <div className="empresa-modal-error">{error}</div> : null}

            <div className="empresa-modal-actions">
              <button
                type="button"
                className="empresa-modal-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="empresa-modal-save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showDeleteModal && deleteTarget ? (
        <div className="empresa-modal-overlay">
          <div className="empresa-modal">
            <div className="empresa-modal-header">
              <div>
                <h3>Excluir Empresa</h3>
                <p>Confirme para remover o cadastro.</p>
              </div>
              <button
                type="button"
                className="empresa-modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="empresa-modal-body">
              <p>
                Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>?
              </p>
            </div>
            {error ? <div className="empresa-modal-error">{error}</div> : null}
            <div className="empresa-modal-actions">
              <button
                type="button"
                className="empresa-modal-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="empresa-modal-save"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
