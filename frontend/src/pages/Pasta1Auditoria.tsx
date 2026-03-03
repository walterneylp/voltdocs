import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LucideIcon } from "../components/LucideIcon";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import {
  addAuditPasta1Evidence,
  clearToken,
  deleteAuditPasta1Evidence,
  getAuditPasta1Config,
  getAuditPasta1Results,
  getDocumentVersionUrl,
  indexAuditPasta1Documents,
  listAuditPasta1Evidences,
  listDocuments,
  listDocumentVersions,
  runAuditPasta1
} from "../lib/api";
import "../styles/pasta1-auditoria.css";

type AuditItem = {
  item_id: string;
  categoria: string;
  nome: string;
  requisitos_minimos: string[];
  evidencias_esperadas: string[];
};

type AuditResult = {
  item_id: string;
  status: string;
  score_percentual: number;
  itens_faltantes: string[];
  recomendacoes: string[];
  trechos_evidencia: string[];
};

export function Pasta1Auditoria() {
  const authUser = getAuthUser();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [results, setResults] = useState<Record<string, AuditResult>>({});
  const [documents, setDocuments] = useState<
    Array<{ id: string; title: string; category: string }>
  >([]);
  const [versions, setVersions] = useState<
    Array<{ id: string; document_id: string; created_at: string }>
  >([]);
  const [evidences, setEvidences] = useState<
    Record<
      string,
      Array<{
        id: string;
        document_id: string;
        tipo_evidencia: string | null;
        observacao: string | null;
        documents?: { id: string; title: string; category: string } | null;
      }>
    >
  >({});
  const [selectedDoc, setSelectedDoc] = useState<Record<string, string>>({});
  const [evidenceQuery, setEvidenceQuery] = useState<Record<string, string>>({});
  const [showEvidenceDropdown, setShowEvidenceDropdown] = useState<Record<string, boolean>>({});
  const [tipoEvidence, setTipoEvidence] = useState<Record<string, string>>({});
  const [obsEvidence, setObsEvidence] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    type: "image" | "pdf" | "audio" | "unknown";
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAuditPasta1Config(), getAuditPasta1Results(), listDocuments(), listDocumentVersions()])
      .then(([config, auditData, docs, versionList]) => {
        if (!isMounted) return;
        setItems(
          config.items.map((item) => ({
            item_id: item.item_id,
            categoria: item.categoria,
            nome: item.nome,
            requisitos_minimos: item.requisitos_minimos,
            evidencias_esperadas: item.evidencias_esperadas
          }))
        );
        const resultsMap: Record<string, AuditResult> = {};
        auditData.results.forEach((result) => {
          resultsMap[result.item_id] = result;
        });
        setResults(resultsMap);
        setDocuments(docs);
        setVersions(
          versionList.map((version) => ({
            id: version.id,
            document_id: version.document_id,
            created_at: version.created_at
          }))
        );
        return Promise.all(
          config.items.map((item) =>
            listAuditPasta1Evidences(item.item_id).then((data) => ({
              item_id: item.item_id,
              data
            }))
          )
        );
      })
      .then((evidenceSets) => {
        if (!isMounted || !evidenceSets) return;
        const next: typeof evidences = {};
        evidenceSets.forEach((entry) => {
          next[entry.item_id] = entry.data;
        });
        setEvidences(next);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar auditoria.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const latestVersionByDoc = useMemo(() => {
    const map = new Map<string, { id: string; created_at: string }>();
    versions.forEach((version) => {
      const existing = map.get(version.document_id);
      if (!existing || new Date(version.created_at) > new Date(existing.created_at)) {
        map.set(version.document_id, version);
      }
    });
    return map;
  }, [versions]);

  const handleRunAudit = async () => {
    setIsRunning(true);
    setError("");
    try {
      const data = await runAuditPasta1();
      const resultsMap: Record<string, AuditResult> = {};
      data.results.forEach((result) => {
        resultsMap[result.item_id] = result;
      });
      setResults(resultsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao executar auditoria.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleIndexDocuments = async () => {
    setIsIndexing(true);
    setError("");
    try {
      await indexAuditPasta1Documents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao indexar documentos.");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleAddEvidence = async (itemId: string) => {
    const document_id = selectedDoc[itemId];
    if (!document_id) {
      setError("Selecione um documento.");
      return;
    }
    const tipo_evidencia = tipoEvidence[itemId] || "Evidência";
    try {
      await addAuditPasta1Evidence({
        item_id: itemId,
        document_id,
        tipo_evidencia,
        observacao: obsEvidence[itemId] || null
      });
      const updated = await listAuditPasta1Evidences(itemId);
      setEvidences((prev) => ({ ...prev, [itemId]: updated }));
      setSelectedDoc((prev) => ({ ...prev, [itemId]: "" }));
      setEvidenceQuery((prev) => ({ ...prev, [itemId]: "" }));
      setTipoEvidence((prev) => ({ ...prev, [itemId]: "" }));
      setObsEvidence((prev) => ({ ...prev, [itemId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao vincular evidência.");
    }
  };

  const handleRemoveEvidence = async (itemId: string, evidenceId: string) => {
    const confirmed = window.confirm("Deseja remover o vinculo desta evidencia?");
    if (!confirmed) return;
    setError("");
    try {
      await deleteAuditPasta1Evidence(evidenceId);
      const updated = await listAuditPasta1Evidences(itemId);
      setEvidences((prev) => ({ ...prev, [itemId]: updated }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover evidencia.");
    }
  };

  const detectPreviewType = (url: string) => {
    const cleanUrl = url.split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".pdf")) return "pdf";
    if (cleanUrl.match(/\.(png|jpg|jpeg|gif|webp)$/)) return "image";
    if (cleanUrl.match(/\.(mp3|wav|ogg|m4a|webm)$/)) return "audio";
    return "unknown";
  };

  const handleOpenDocument = async (docId: string, name: string) => {
    const version = latestVersionByDoc.get(docId);
    if (!version) {
      setError("Documento sem versão disponível.");
      return;
    }
    const response = await getDocumentVersionUrl(version.id);
    setPreview({
      name,
      url: response.url,
      type: detectPreviewType(response.url)
    });
  };

  return (
    <div className="pasta1">
      <aside className="pasta1-sidebar">
        <div className="pasta1-brand">
          <div className="pasta1-logo" aria-hidden="true" />
          <span className="pasta1-title">VoltDocs</span>
        </div>
        <nav className="pasta1-nav">
          <Link className="pasta1-item" to="/dashboard">
            <LucideIcon name="layout-dashboard" className="pasta1-icon" />
            Visão Geral
          </Link>
          <Link className="pasta1-item" to="/pie">
            <LucideIcon name="shield" className="pasta1-icon" />
            PIE
          </Link>
          <Link className="pasta1-item is-active" to="/auditoria/pasta1">
            <LucideIcon name="file-text" className="pasta1-icon" />
            Pasta 1 - Auditoria
          </Link>
        </nav>
        <div className="pasta1-user">
          <div>
            <p>{authUser?.name ?? "—"}</p>
            <span>{authUser?.email ?? "—"}</span>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="pasta1-content">
        <header className="pasta1-topbar">
          <span>VoltDocs • Pasta 1</span>
          <div className="pasta1-actions">
            <Link className="pasta1-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="pasta1-logout-icon" />
              Alterar senha
            </Link>
            <Link
              className="pasta1-logout"
              to="/login"
              onClick={() => {
                clearToken();
                clearAuthUser();
              }}
            >
              <LucideIcon name="log-out" className="pasta1-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="pasta1-main">
          <div className="pasta1-header">
            <div>
              <h1>Pasta 1 — Identificação da Empresa</h1>
              <p>Auditoria isolada baseada no JSON de configuração.</p>
            </div>
            <div className="pasta1-actions-row">
              <button
                className="pasta1-run secondary"
                onClick={handleIndexDocuments}
                disabled={isIndexing}
              >
                {isIndexing ? "Indexando..." : "Indexar documentos (RAG)"}
              </button>
              <button className="pasta1-run" onClick={handleRunAudit} disabled={isRunning}>
                {isRunning ? "Executando..." : "Executar auditoria Pasta 1"}
              </button>
            </div>
          </div>

          {error ? <p className="pasta1-error">{error}</p> : null}

          <div className="pasta1-grid">
            {items.map((item) => {
              const result = results[item.item_id];
              const itemEvidences = evidences[item.item_id] ?? [];
              return (
                <article className="pasta1-card" key={item.item_id}>
                  <div className="pasta1-card-header">
                    <div>
                      <h3>
                        {item.item_id} • {item.nome}
                      </h3>
                      <span>{item.categoria}</span>
                    </div>
                    <div className="pasta1-score">
                      <div className="pasta1-score-row">
                        <span>{result?.status ?? "INCONCLUSIVO"}</span>
                        <strong>{result?.score_percentual ?? 0}%</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pasta1-block">
                    <h4>Itens faltantes</h4>
                    <ul>
                      {(result?.itens_faltantes?.length
                        ? result.itens_faltantes
                        : item.requisitos_minimos
                      ).map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pasta1-block">
                    <h4>Recomendações</h4>
                    <ul>
                      {(result?.recomendacoes?.length
                        ? result.recomendacoes
                        : ["Execute a auditoria para gerar recomendações."])?.map((rec) => (
                        <li key={rec}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pasta1-block">
                    <h4>Vincular evidência</h4>
                    <div className="pasta1-evidence-form">
                      <div className="pasta1-evidence-picker">
                        <input
                          type="text"
                          placeholder="Buscar documento por título ou categoria"
                          value={evidenceQuery[item.item_id] ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setEvidenceQuery((prev) => ({
                              ...prev,
                              [item.item_id]: value
                            }));
                            setShowEvidenceDropdown((prev) => ({
                              ...prev,
                              [item.item_id]: true
                            }));
                          }}
                          onFocus={() =>
                            setShowEvidenceDropdown((prev) => ({
                              ...prev,
                              [item.item_id]: true
                            }))
                          }
                        />
                        {showEvidenceDropdown[item.item_id] ? (
                          <div className="pasta1-evidence-dropdown">
                            {documents
                              .filter((doc) => {
                                const query = (evidenceQuery[item.item_id] ?? "").toLowerCase();
                                if (!query) return true;
                                return (
                                  doc.title.toLowerCase().includes(query) ||
                                  doc.category.toLowerCase().includes(query)
                                );
                              })
                              .map((doc) => (
                                <button
                                  type="button"
                                  key={doc.id}
                                  onClick={() => {
                                    setSelectedDoc((prev) => ({
                                      ...prev,
                                      [item.item_id]: doc.id
                                    }));
                                    setEvidenceQuery((prev) => ({
                                      ...prev,
                                      [item.item_id]: `${doc.title} (${doc.category})`
                                    }));
                                    setShowEvidenceDropdown((prev) => ({
                                      ...prev,
                                      [item.item_id]: false
                                    }));
                                  }}
                                >
                                  {doc.title} ({doc.category})
                                </button>
                              ))}
                            {documents.length === 0 ? (
                              <span>Nenhum documento disponível.</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <input
                        type="text"
                        placeholder="Tipo de evidência"
                        value={tipoEvidence[item.item_id] ?? ""}
                        onChange={(event) =>
                          setTipoEvidence((prev) => ({
                            ...prev,
                            [item.item_id]: event.target.value
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Observação"
                        value={obsEvidence[item.item_id] ?? ""}
                        onChange={(event) =>
                          setObsEvidence((prev) => ({
                            ...prev,
                            [item.item_id]: event.target.value
                          }))
                        }
                      />
                      <button type="button" onClick={() => handleAddEvidence(item.item_id)}>
                        Vincular
                      </button>
                    </div>
                  </div>

                  <div className="pasta1-block">
                    <h4>Evidências vinculadas</h4>
                    {itemEvidences.length === 0 ? (
                      <p>Nenhuma evidência vinculada.</p>
                    ) : (
                      <ul className="pasta1-evidence-list">
                        {itemEvidences.map((evidence) => (
                          <li key={evidence.id}>
                            <div>
                              <strong>{evidence.documents?.title ?? "Documento"}</strong>
                              <span>
                                {evidence.tipo_evidencia ?? "Evidência"}
                                {evidence.tipo_evidencia?.toLowerCase() === "auto" ? (
                                  <em
                                    className="pasta1-evidence-auto"
                                    title="Vínculo automático baseado em nome/categoria/conteúdo"
                                  >
                                    Auto
                                  </em>
                                ) : null}
                              </span>
                            </div>
                            <div className="pasta1-evidence-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenDocument(
                                    evidence.document_id,
                                    evidence.documents?.title ?? "Documento"
                                  )
                                }
                              >
                                Abrir
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => handleRemoveEvidence(item.item_id, evidence.id)}
                              >
                                Remover vinculo
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {preview ? (
        <div className="pasta1-preview-backdrop">
          <div className="pasta1-preview">
            <div className="pasta1-preview-header">
              <strong>{preview.name}</strong>
              <button type="button" onClick={() => setPreview(null)}>
                Fechar
              </button>
            </div>
            <div className="pasta1-preview-body">
              {preview.type === "image" ? <img src={preview.url} alt={preview.name} /> : null}
              {preview.type === "pdf" ? (
                <iframe src={preview.url} title={preview.name} />
              ) : null}
              {preview.type === "audio" ? <audio controls src={preview.url} /> : null}
              {preview.type === "unknown" ? (
                <a href={preview.url} target="_blank" rel="noreferrer">
                  Abrir arquivo
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
