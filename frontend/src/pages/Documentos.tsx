import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import {
  clearToken,
  deleteDocument,
  getDocumentVersionUrl,
  listAssets,
  listDocumentCategories,
  listDocumentEquipments,
  listDocuments,
  listDocumentVersions
} from "../lib/api";
import "../styles/documentos.css";
import "../styles/documentos-novo.css";

export function Documentos() {
  const authUser = getAuthUser();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      title: string;
      category: string;
      category_id?: string | null;
      equipment_id?: string | null;
    }>
  >([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [assets, setAssets] = useState<Array<{ id: string; tag: string; name: string }>>(
    []
  );
  const [documentEquipments, setDocumentEquipments] = useState<
    Array<{ document_id: string; equipment_id: string }>
  >([]);
  const [documentVersions, setDocumentVersions] = useState<
    Array<{
      id: string;
      document_id: string;
      file_path: string;
      file_name: string;
      created_at: string;
    }>
  >([]);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(
    null
  );
  const [titleQuery, setTitleQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listDocuments(),
      listDocumentCategories(),
      listAssets(),
      listDocumentEquipments(),
      listDocumentVersions()
    ])
      .then(([docs, cats, assetList, links, versions]) => {
        if (!isMounted) return;
        setDocuments(docs);
        setCategories(cats.map((item) => ({ id: item.id, name: item.name })));
        setAssets(assetList);
        setDocumentEquipments(
          links.map((link) => ({
            document_id: link.document_id,
            equipment_id: link.equipment_id
          }))
        );
        setDocumentVersions(
          versions.map((version) => ({
            id: version.id,
            document_id: version.document_id,
            file_path: version.file_path,
            file_name: version.file_name,
            created_at: version.created_at
          }))
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar documentos.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteDocument = async () => {
    if (!deleteTarget) return;
    setIsDeleting(deleteTarget.id);
    setError("");
    try {
      await deleteDocument(deleteTarget.id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== deleteTarget.id));
      setDocumentEquipments((prev) =>
        prev.filter((link) => link.document_id !== deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir documento.");
    } finally {
      setIsDeleting(null);
    }
  };

  const equipmentById = useMemo(() => {
    return new Map(assets.map((asset) => [asset.id, asset]));
  }, [assets]);

  const docEquipmentMap = useMemo(() => {
    const map = new Map<string, Array<{ id: string; tag: string; name: string }>>();
    documentEquipments.forEach((link) => {
      const asset = equipmentById.get(link.equipment_id);
      if (!asset) return;
      const list = map.get(link.document_id) ?? [];
      if (!list.find((item) => item.id === asset.id)) {
        list.push(asset);
      }
      map.set(link.document_id, list);
    });
    documents.forEach((doc) => {
      if (!doc.equipment_id) return;
      const asset = equipmentById.get(doc.equipment_id);
      if (!asset) return;
      const list = map.get(doc.id) ?? [];
      if (!list.find((item) => item.id === asset.id)) {
        list.push(asset);
      }
      map.set(doc.id, list);
    });
    return map;
  }, [documents, documentEquipments, equipmentById]);

  const versionByDocument = useMemo(() => {
    const sorted = [...documentVersions].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
    const map = new Map<string, { id: string; file_path: string; file_name: string }>();
    sorted.forEach((version) => {
      if (!map.has(version.document_id)) {
        map.set(version.document_id, {
          id: version.id,
          file_path: version.file_path,
          file_name: version.file_name
        });
      }
    });
    return map;
  }, [documentVersions]);

  const titleOptions = useMemo(() => {
    return Array.from(new Set(documents.map((doc) => doc.title))).sort();
  }, [documents]);

  const filteredTitleOptions = titleOptions.filter((title) => {
    if (!titleQuery) return true;
    return title.toLowerCase().includes(titleQuery.toLowerCase());
  });

  const filteredCategoryOptions = categories.filter((category) => {
    if (!categoryQuery) return true;
    return category.name.toLowerCase().includes(categoryQuery.toLowerCase());
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
  const showCategoryOptions = showCategoryDropdown && !selectedCategoryId;
  const showEquipmentOptions = showEquipmentDropdown && !selectedEquipmentId;

  const filteredDocuments = documents.filter((doc) => {
    const titleFilter = (selectedTitle ?? titleQuery).trim().toLowerCase();
    const categoryFilter =
      (selectedCategoryId
        ? categories.find((item) => item.id === selectedCategoryId)?.name
        : categoryQuery) ?? "";
    const categoryMatch = categoryFilter
      ? doc.category.toLowerCase().includes(categoryFilter.trim().toLowerCase())
      : true;
    const titleMatch = titleFilter
      ? doc.title.toLowerCase().includes(titleFilter)
      : true;
    let equipmentMatch = true;
    if (selectedEquipmentId) {
      const equipmentList = docEquipmentMap.get(doc.id) ?? [];
      equipmentMatch = equipmentList.some((item) => item.id === selectedEquipmentId);
    } else if (equipmentQuery.trim()) {
      const equipmentList = docEquipmentMap.get(doc.id) ?? [];
      const eqQuery = equipmentQuery.toLowerCase();
      equipmentMatch = equipmentList.some(
        (item) =>
          item.tag.toLowerCase().includes(eqQuery) ||
          item.name.toLowerCase().includes(eqQuery)
      );
    }
    return titleMatch && categoryMatch && equipmentMatch;
  });

  const resetFilters = () => {
    setTitleQuery("");
    setCategoryQuery("");
    setEquipmentQuery("");
    setSelectedTitle(null);
    setSelectedCategoryId(null);
    setSelectedEquipmentId(null);
  };

  const handleSelectTitle = (title: string) => {
    setSelectedTitle(title);
    setTitleQuery(title);
    setShowList(true);
    setShowTitleDropdown(false);
  };

  const handleSelectCategory = (categoryId: string) => {
    const name = categories.find((item) => item.id === categoryId)?.name ?? "";
    setSelectedCategoryId(categoryId);
    setCategoryQuery(name);
    setShowList(true);
    setShowCategoryDropdown(false);
  };

  const handleSelectEquipment = (equipmentId: string) => {
    const asset = assets.find((item) => item.id === equipmentId);
    setSelectedEquipmentId(equipmentId);
    setEquipmentQuery(asset ? `${asset.tag} - ${asset.name}` : "");
    setShowList(true);
    setShowEquipmentDropdown(false);
  };

  const clearTitleFilter = () => {
    setSelectedTitle(null);
    setTitleQuery("");
    setShowTitleDropdown(false);
  };

  const clearCategoryFilter = () => {
    setSelectedCategoryId(null);
    setCategoryQuery("");
    setShowCategoryDropdown(false);
  };

  const clearEquipmentFilter = () => {
    setSelectedEquipmentId(null);
    setEquipmentQuery("");
    setShowEquipmentDropdown(false);
  };

  return (
    <div className="documentos">
      <aside className="documentos-sidebar">
        <div className="documentos-brand">
          <div className="documentos-logo" aria-hidden="true" />
          <span className="documentos-title">VoltDocs</span>
        </div>

        <nav className="documentos-nav">
          <div className="documentos-section">
            <p className="documentos-label">GESTÃO</p>
            <Link className="documentos-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="documentos-icon" />
              Visão Geral
            </Link>
            <Link className="documentos-item" to="/equipamentos">
              <LucideIcon name="cpu" className="documentos-icon" />
              Equipamentos
            </Link>
            <Link className="documentos-item" to="/locais">
              <LucideIcon name="map-pin" className="documentos-icon" />
              Locais
            </Link>
            <Link className="documentos-item is-active" to="/documentos">
              <LucideIcon name="file-text" className="documentos-icon" />
              Documentos
            </Link>
            <Link className="documentos-item" to="/chamados">
              <LucideIcon name="life-buoy" className="documentos-icon" />
              Chamados
            </Link>
          </div>

          <div className="documentos-section">
            <p className="documentos-label">ANÁLISE</p>
            <Link className="documentos-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="documentos-icon" />
              Relatórios
            </Link>
          </div>

          <div className="documentos-section">
            <p className="documentos-label">PIE</p>
            <Link className="documentos-item" to="/pie">
              <LucideIcon name="shield" className="documentos-icon" />
              PIE
            </Link>
          </div>

          <div className="documentos-section">
            <p className="documentos-label">CAMPO</p>
            <Link className="documentos-item" to="/registros">
              <LucideIcon name="clipboard-check" className="documentos-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="documentos-section">
            <p className="documentos-label">SISTEMA</p>
            <Link className="documentos-item" to="/usuarios">
              <LucideIcon name="users" className="documentos-icon" />
              Usuários
            </Link>

            <Link className="documentos-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="documentos-icon" />
              Dados Empresa
            </Link>
            <Link className="documentos-item" to="/grupos">
              <LucideIcon name="users-2" className="documentos-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="documentos-user">
          <div className="documentos-user-meta">
            <p className="documentos-user-name">{authUser?.name ?? "—"}</p>
            <p className="documentos-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="documentos-content">
        <header className="documentos-topbar">
          <span className="documentos-org">Apogeu Automação</span>
          <div className="documentos-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="documentos-bell" />
            <Link className="documentos-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="documentos-logout-icon" />
              Alterar senha
            </Link>
            <Link className="documentos-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="documentos-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="documentos-main">
          <div className="documentos-header">
            <div>
              <h1>Documentos</h1>
              <p>Biblioteca digital de diagramas e laudos (NR-10).</p>
            </div>
            <div className="documentos-header-actions">
              <Link className="documentos-categories" to="/documentos/categorias">
                <LucideIcon name="folder" className="documentos-upload-icon" />
                Categorias
              </Link>
              <Link className="documentos-upload" to="/documentos/novo">
                <LucideIcon name="upload" className="documentos-upload-icon" />
                Upload Documento
              </Link>
            </div>
          </div>

          <div className="documentos-filters">
            <div className="documentos-search">
              <label>Título</label>
              <div className="documentos-input">
                <LucideIcon name="search" className="documentos-input-icon" />
                <input
                  type="text"
                  placeholder="Todos"
                  value={titleQuery}
                  onChange={(event) => {
                    setTitleQuery(event.target.value);
                    if (selectedTitle && event.target.value !== selectedTitle) {
                      setSelectedTitle(null);
                    }
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
                <div className="documentos-filter-results">
                  <button
                    type="button"
                    className="documentos-filter-item"
                    onMouseDown={clearTitleFilter}
                  >
                    Todos
                  </button>
                  {filteredTitleOptions.slice(0, 6).map((title) => (
                    <button
                      key={title}
                      type="button"
                      className="documentos-filter-item"
                      onMouseDown={() => handleSelectTitle(title)}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="documentos-filter">
              <label>Categoria</label>
              <div className="documentos-input">
                <LucideIcon name="search" className="documentos-input-icon" />
                <input
                  type="text"
                  placeholder="Todos"
                  value={categoryQuery}
                  onChange={(event) => {
                    setCategoryQuery(event.target.value);
                    if (selectedCategoryId && event.target.value) {
                      setSelectedCategoryId(null);
                    }
                  }}
                  onFocus={() => {
                    setShowCategoryDropdown(true);
                    if (selectedCategoryId && categoryQuery) {
                      setSelectedCategoryId(null);
                      setCategoryQuery("");
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 120)}
                />
              </div>
              {showCategoryOptions ? (
                <div className="documentos-filter-results documentos-filter-results-scroll">
                  <div className="documentos-filter-meta">
                    {categories.length} categorias
                  </div>
                  <button
                    type="button"
                    className="documentos-filter-item"
                    onMouseDown={clearCategoryFilter}
                  >
                    Todos
                  </button>
                  {filteredCategoryOptions.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="documentos-filter-item"
                      onMouseDown={() => handleSelectCategory(category.id)}
                    >
                      {category.name}
                    </button>
                  ))}
                  {filteredCategoryOptions.length === 0 ? (
                    <div className="documentos-filter-empty">Nenhuma categoria encontrada.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="documentos-filter">
              <label>Equipamento</label>
              <div className="documentos-input">
                <LucideIcon name="search" className="documentos-input-icon" />
                <input
                  type="text"
                  placeholder="Todos"
                  value={equipmentQuery}
                  onChange={(event) => {
                    setEquipmentQuery(event.target.value);
                    if (selectedEquipmentId && event.target.value) {
                      setSelectedEquipmentId(null);
                    }
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
                <div className="documentos-filter-results">
                  <button
                    type="button"
                    className="documentos-filter-item"
                    onMouseDown={clearEquipmentFilter}
                  >
                    Todos
                  </button>
                  {filteredEquipmentOptions.slice(0, 6).map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="documentos-filter-item"
                      onMouseDown={() => handleSelectEquipment(asset.id)}
                    >
                      {asset.tag} - {asset.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {error ? <p className="documentos-error">{error}</p> : null}

          {!showList ? (
            <div className="documentos-summary">
              <button
                type="button"
                className="documentos-summary-card"
                onClick={() => {
                  resetFilters();
                  setShowList(true);
                }}
              >
                <p>Total de Documentos</p>
                <strong>{documents.length}</strong>
              </button>
              <button
                type="button"
                className="documentos-summary-card"
                onClick={() => {
                  resetFilters();
                  setShowList(true);
                }}
              >
                <p>Categorias</p>
                <strong>{categories.length}</strong>
              </button>
              <button
                type="button"
                className="documentos-summary-card"
                onClick={() => {
                  resetFilters();
                  setShowList(true);
                }}
              >
                <p>Equipamentos</p>
                <strong>{assets.length}</strong>
              </button>
            </div>
          ) : (
            <div className="documentos-list">
              {filteredDocuments.length === 0 ? (
                <div className="documentos-empty">Nenhum documento encontrado.</div>
              ) : (
                filteredDocuments.map((doc) => {
                  const equipmentList = docEquipmentMap.get(doc.id) ?? [];
                  return (
                    <article className="documentos-row" key={doc.id}>
                      <div className="documentos-doc">
                        <div className="documentos-doc-icon">
                          <LucideIcon name="file-text" className="documentos-doc-svg" />
                        </div>
                        <div>
                          <p className="documentos-doc-title">{doc.title}</p>
                          <p className="documentos-doc-sub">
                            {doc.category}
                            {equipmentList.length > 0 ? " • " : ""}
                            {equipmentList.map((asset) => (
                              <span className="documentos-pill" key={asset.id}>
                                {asset.tag}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                      <div className="documentos-validade">
                        <p className="documentos-validade-label">Validade</p>
                        <p className="documentos-validade-date is-muted">
                          Indeterminado
                        </p>
                      </div>
                      <div className="documentos-row-actions">
                        <Link
                          className="documentos-action"
                          to={`/documentos/vincular/${doc.id}`}
                        >
                          <LucideIcon name="link" className="documentos-action-icon" />
                          Vincular
                        </Link>
                        <button
                          className="documentos-action"
                          type="button"
                          onClick={async () => {
                            const version = versionByDocument.get(doc.id);
                            if (!version) return;
                            try {
                              const response = await getDocumentVersionUrl(version.id);
                              window.open(response.url, "_blank", "noopener,noreferrer");
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Falha ao abrir documento."
                              );
                            }
                          }}
                          disabled={!versionByDocument.has(doc.id)}
                        >
                          <LucideIcon name="external-link" className="documentos-action-icon" />
                          Abrir documento
                        </button>
                        <button
                          className="documentos-action"
                          type="button"
                          onClick={() => navigate(`/documentos/editar/${doc.id}`)}
                        >
                          <LucideIcon name="pencil" className="documentos-action-icon" />
                          Editar
                        </button>
                        <button
                          className="documentos-delete"
                          type="button"
                          aria-label="Excluir"
                          onClick={() => setDeleteTarget({ id: doc.id, title: doc.title })}
                          disabled={isDeleting === doc.id}
                        >
                          <LucideIcon name="trash-2" className="documentos-action-icon" />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </section>
      </main>

      {deleteTarget ? (
        <>
          <div className="documentos-modal-backdrop" aria-hidden="true" />
          <section className="documentos-modal" role="dialog" aria-label="Excluir Documento">
            <header className="documentos-modal-header">
              <h2>Excluir documento</h2>
              <button
                className="documentos-modal-close"
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Fechar"
              >
                <LucideIcon name="x" className="documentos-modal-close-icon" />
              </button>
            </header>
            <div className="documentos-modal-body">
              <p className="documentos-error">
                Tem certeza que deseja excluir o documento "{deleteTarget.title}"?
              </p>
            </div>
            <footer className="documentos-modal-footer">
              <button
                className="documentos-modal-cancel"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                className="documentos-modal-save"
                type="button"
                onClick={handleDeleteDocument}
                disabled={isDeleting === deleteTarget.id}
              >
                {isDeleting === deleteTarget.id ? "Excluindo..." : "Excluir"}
              </button>
            </footer>
          </section>
        </>
      ) : null}
    </div>
  );
}
