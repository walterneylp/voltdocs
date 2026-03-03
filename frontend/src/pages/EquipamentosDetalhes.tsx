import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { clearAuthUser, getAuthUser } from "../lib/auth";
import {
  clearToken,
  deleteDocument,
  getDocumentVersionUrl,
  listAssets,
  listDocumentEquipments,
  listDocuments,
  listDocumentVersions,
  listTickets
} from "../lib/api";
import "../styles/equipamentos.css";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

export function EquipamentosDetalhes() {
  const authUser = getAuthUser();
  const [params] = useSearchParams();
  const assetId = params.get("id") ?? "";
  const [assets, setAssets] = useState<
    Array<{
      id: string;
      tag: string;
      name: string;
      description?: string | null;
      patrimony_number?: string | null;
      voltage?: string | null;
      current_rating?: number | null;
      atpv?: number | null;
      risk_level?: string | null;
      site_id?: string | null;
    }>
  >([]);
  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      title: string;
      category: string;
      category_id?: string | null;
      equipment_id?: string | null;
    }>
  >([]);
  const [documentEquipments, setDocumentEquipments] = useState<
    Array<{ document_id: string; equipment_id: string }>
  >([]);
  const [versions, setVersions] = useState<
    Array<{ id: string; document_id: string; valid_until: string | null; created_at: string }>
  >([]);
  const [tickets, setTickets] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      status: string | null;
      priority: string | null;
      equipment_id: string;
      created_at: string;
    }>
  >([]);
  const [showElectrical, setShowElectrical] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [error, setError] = useState("");
  const [openError, setOpenError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listAssets(),
      listDocuments(),
      listDocumentEquipments(),
      listDocumentVersions(),
      listTickets()
    ])
      .then(([assetList, docs, links, versionList, ticketList]) => {
        if (!isMounted) return;
        setAssets(assetList);
        setDocuments(docs);
        setDocumentEquipments(links);
        setVersions(
          versionList.map((item) => ({
            id: item.id,
            document_id: item.document_id,
            valid_until: item.valid_until,
            created_at: item.created_at
          }))
        );
        setTickets(ticketList);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar equipamento.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const asset = useMemo(() => {
    return assets.find((item) => item.id === assetId) ?? null;
  }, [assets, assetId]);

  const latestVersionByDoc = useMemo(() => {
    const map = new Map<string, { id: string; valid_until: string | null; created_at: string }>();
    versions.forEach((version) => {
      const existing = map.get(version.document_id);
      if (!existing || new Date(version.created_at) > new Date(existing.created_at)) {
        map.set(version.document_id, version);
      }
    });
    return map;
  }, [versions]);

  const documentsByEquipment = useMemo(() => {
    const map = new Map<string, string[]>();
    documentEquipments.forEach((link) => {
      const list = map.get(link.equipment_id) ?? [];
      if (!list.includes(link.document_id)) list.push(link.document_id);
      map.set(link.equipment_id, list);
    });
    documents.forEach((doc) => {
      if (!doc.equipment_id) return;
      const list = map.get(doc.equipment_id) ?? [];
      if (!list.includes(doc.id)) list.push(doc.id);
      map.set(doc.equipment_id, list);
    });
    return map;
  }, [documents, documentEquipments]);

  const linkedDocuments = useMemo(() => {
    if (!asset) return [];
    const docIds = new Set<string>();
    const linkedIds = documentsByEquipment.get(asset.id) ?? [];
    linkedIds.forEach((id) => docIds.add(id));
    documents.forEach((doc) => {
      if (doc.equipment_id === asset.id) docIds.add(doc.id);
    });
    return documents.filter((doc) => docIds.has(doc.id));
  }, [asset, documents, documentsByEquipment]);

  const equipmentTickets = useMemo(() => {
    if (!asset) return [];
    return tickets
      .filter((ticket) => ticket.equipment_id === asset.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [tickets, asset]);

  const handleOpenDocument = async (docId: string) => {
    const version = latestVersionByDoc.get(docId);
    if (!version) {
      setOpenError("Documento sem versao disponivel.");
      return;
    }
    setOpenError("");
    try {
      const response = await getDocumentVersionUrl(version.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Falha ao abrir documento.");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setIsDeleting(true);
    setOpenError("");
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      setDeleteTarget(null);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Falha ao excluir documento.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="equipamentos">
      <aside className="equip-sidebar">
        <div className="equip-brand">
          <div className="equip-logo" aria-hidden="true" />
          <span className="equip-title">VoltDocs</span>
        </div>

        <nav className="equip-nav">
          <div className="equip-section">
            <p className="equip-label">GESTAO</p>
            <Link className="equip-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="equip-icon" />
              Visao Geral
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
            <p className="equip-label">ANALISE</p>
            <Link className="equip-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="equip-icon" />
              Relatorios
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
              Usuarios
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
          <span className="equip-org">Apogeu Automacao</span>
          <div className="equip-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="equip-bell" />
            <Link className="equip-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="equip-logout-icon" />
              Alterar senha
            </Link>
            <Link
              className="equip-logout"
              to="/login"
              onClick={() => {
                clearToken();
                clearAuthUser();
              }}
            >
              <LucideIcon name="log-out" className="equip-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="equip-main">
          <div className="equip-details-header">
            <div>
              <h1>Detalhes do Equipamento</h1>
              <p>Dados e documentos vinculados ao equipamento selecionado.</p>
            </div>
            <div className="equip-details-actions">
              <Link
                className="equip-new"
                to={`/documentos/novo?equipment_id=${asset?.id ?? ""}`}
              >
                Novo documento
              </Link>
              <Link
                className="equip-new ghost"
                to={`/equipamentos/vincular?id=${asset?.id ?? ""}`}
              >
                Vincular documentos
              </Link>
              <Link className="equip-new ghost" to="/equipamentos">
                Voltar
              </Link>
            </div>
          </div>

          {error ? <div className="equip-error">{error}</div> : null}
          {openError ? <div className="equip-error">{openError}</div> : null}

          {asset ? (
            <div className="equip-details-card">
              <div>
                <p className="equip-tag">{asset.tag}</p>
                <p className="equip-name">{asset.name}</p>
              </div>
              <div className="equip-details-meta">
                <span>ID: {asset.id}</span>
                <span>Total de documentos: {linkedDocuments.length}</span>
              </div>
            </div>
          ) : (
            <div className="equip-empty">Equipamento nao encontrado.</div>
          )}

          <div className="equip-details-filters">
            <label>
              <input
                type="checkbox"
                checked={showElectrical}
                onChange={(event) => setShowElectrical(event.target.checked)}
              />
              Exibir dados eletricos completos
            </label>
            <label>
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(event) => setShowHistory(event.target.checked)}
              />
              Exibir historico de chamados
            </label>
          </div>

          {asset && showElectrical ? (
            <div className="equip-details-card equip-details-full">
              <div>
                <p className="equip-tag">Patrimonio</p>
                <p className="equip-name">{asset.patrimony_number ?? "-"}</p>
              </div>
              <div>
                <p className="equip-tag">Tensao</p>
                <p className="equip-name">{asset.voltage ?? "-"}</p>
              </div>
              <div>
                <p className="equip-tag">Corrente</p>
                <p className="equip-name">
                  {asset.current_rating != null ? `${asset.current_rating} A` : "-"}
                </p>
              </div>
              <div>
                <p className="equip-tag">ATPV</p>
                <p className="equip-name">{asset.atpv ?? "-"}</p>
              </div>
              <div>
                <p className="equip-tag">Risco</p>
                <p className="equip-name">{asset.risk_level ?? "-"}</p>
              </div>
              <div>
                <p className="equip-tag">Descricao</p>
                <p className="equip-name">{asset.description ?? "-"}</p>
              </div>
            </div>
          ) : null}

          {asset && showHistory ? (
            <div className="equip-docs">
              <h2>Historico de chamados</h2>
              {equipmentTickets.length === 0 ? (
                <p>Nenhum chamado registrado para este equipamento.</p>
              ) : (
                <div className="equip-docs-grid">
                  {equipmentTickets.map((ticket) => (
                    <article key={ticket.id} className="equip-doc-card">
                      <div>
                        <strong>{ticket.title}</strong>
                        <p>{ticket.description ?? "Sem descricao."}</p>
                        <span>Status: {ticket.status ?? "—"}</span>
                        <span>Prioridade: {ticket.priority ?? "—"}</span>
                        <span>Data: {formatDate(ticket.created_at)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="equip-docs">
            <h2>Documentos vinculados</h2>
            {linkedDocuments.length === 0 ? (
              <p>Nenhum documento vinculado a este equipamento.</p>
            ) : (
              <div className="equip-docs-grid">
                {linkedDocuments.map((doc) => {
                  const version = latestVersionByDoc.get(doc.id);
                  return (
                    <article key={doc.id} className="equip-doc-card">
                      <div>
                        <strong>{doc.title}</strong>
                        <p>{doc.category}</p>
                        <span>
                          Validade: {version?.valid_until ? formatDate(version.valid_until) : "—"}
                        </span>
                      </div>
                      <div className="equip-doc-actions">
                        <button onClick={() => handleOpenDocument(doc.id)}>Abrir</button>
                        <button
                          className="danger"
                          onClick={() => setDeleteTarget(doc.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {deleteTarget ? (
        <div className="equip-modal-backdrop">
          <div className="equip-modal">
            <h3>Excluir documento</h3>
            <p>Confirme para remover este documento.</p>
            <div className="equip-modal-actions">
              <button onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button
                className="danger"
                onClick={() => handleDeleteDocument(deleteTarget)}
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
