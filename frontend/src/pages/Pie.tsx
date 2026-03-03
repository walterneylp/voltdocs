import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import {
  clearToken,
  createDocument,
  deleteDocument,
  getDocumentVersionUrl,
  getMe,
  listCompanyProfiles,
  listDocumentCategories,
  listDocumentEquipments,
  listDocuments,
  listDocumentVersions
} from "../lib/api";
import "../styles/pie.css";

export function Pie() {
  const authUser = getAuthUser();
  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("pt-BR");
  };
  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      title: string;
      category: string;
      category_id?: string | null;
      equipment_id?: string | null;
      tenant_id?: string;
    }>
  >([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>(
    []
  );
  const [versions, setVersions] = useState<
    Array<{ id: string; document_id: string; valid_until: string | null; created_at: string }>
  >([]);
  const [documentEquipments, setDocumentEquipments] = useState<
    Array<{ document_id: string; equipment_id: string }>
  >([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyProfiles, setCompanyProfiles] = useState<
    Array<{
      id: string;
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
  const [error, setError] = useState("");
  const [savingNa, setSavingNa] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState<{
    code: string;
    label: string;
    docs: Array<{
      id: string;
      title: string;
      category: string;
      valid_until?: string | null;
      openable: boolean;
    }>;
  } | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    type: "image" | "pdf" | "audio" | "unknown";
  } | null>(null);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getMe(),
      listDocuments(),
      listDocumentCategories(),
      listDocumentVersions(),
      listCompanyProfiles(),
      listDocumentEquipments()
    ])
      .then(([me, docs, cats, versionsList, profiles, docLinks]) => {
        if (!isMounted) return;
        setTenantId(me.profile.tenant_id);
        setDocuments(docs);
        setCategories(cats);
        setVersions(
          versionsList.map((item) => ({
            id: item.id,
            document_id: item.document_id,
            valid_until: item.valid_until,
            created_at: item.created_at
          }))
        );
        setCompanyProfiles(profiles);
        setDocumentEquipments(docLinks);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar PIE.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .trim();

  const categoryKeyById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      const key = normalizeText(category.code || category.name);
      map.set(category.id, key);
    });
    return map;
  }, [categories]);

  const latestVersionByDoc = useMemo(() => {
    const map = new Map<
      string,
      { id: string; valid_until: string | null; created_at: string }
    >();
    versions.forEach((version) => {
      const existing = map.get(version.document_id);
      if (!existing || new Date(version.created_at) > new Date(existing.created_at)) {
        map.set(version.document_id, version);
      }
    });
    return map;
  }, [versions]);

  const isDocumentValid = (docId: string) => {
    const version = latestVersionByDoc.get(docId);
    if (!version || !version.valid_until) return true;
    return new Date(version.valid_until).getTime() >= Date.now();
  };

  const documentsWithoutLink = useMemo(() => {
    const linkedDocIds = new Set(documentEquipments.map((link) => link.document_id));
    return documents.filter(
      (doc) => !doc.equipment_id && !linkedDocIds.has(doc.id)
    ).length;
  }, [documents, documentEquipments]);

  const expiredDocuments = useMemo(() => {
    return documents.filter((doc) => !isDocumentValid(doc.id)).length;
  }, [documents, latestVersionByDoc]);

  const pieItemCategories: Record<string, string[]> = {
    "1.1": ["politica seguranca", "memorial descritivo"],
    "1.2": ["politica seguranca"],
    "1.3": ["politica seguranca"],
    "1.4": ["art"],
    "1.5": ["emergencia"],
    "2.1": ["diagrama unifilar"],
    "2.2": ["memorial descritivo"],
    "2.3": ["aterramento espec"],
    "2.4": ["plantas eletricas"],
    "2.5": ["lista paineis"],
    "2.6": ["registro alteracoes"],
    "3.1": ["politica seguranca"],
    "3.2": ["procedimento"],
    "3.3": ["apr"],
    "3.4": ["pt"],
    "3.5": ["loto"],
    "3.6": ["seccionamento"],
    "3.7": ["controle acesso"],
    "4.1": ["laudo spda"],
    "4.2": ["laudo spda"],
    "4.3": ["laudo aterramento"],
    "4.4": ["laudo aterramento"],
    "4.5": ["registro correcoes"],
    "5.1": ["epc"],
    "5.2": ["epi"],
    "5.3": ["ferramental isolado"],
    "5.4": ["rastreabilidade epi epc"],
    "6.1": ["matriz competencias"],
    "6.2": ["autorizados"],
    "6.3": ["treinamento nr10"],
    "6.4": ["integracao terceiros"],
    "7.1": ["ensaio dieletrico"],
    "7.2": ["inspecao epi epc"],
    "7.3": ["rastreabilidade epi epc"],
    "8.1": ["areas classificadas"],
    "8.2": ["certificacao ex"],
    "8.3": ["integridade ex"],
    "9.1": ["rti"],
    "9.2": ["historico rti"],
    "9.3": ["plano acao"],
    "9.4": ["evidencia encerramento"],
    "10.1": ["emergencia"],
    "10.2": ["certificacao sep"],
    "10.3": ["simulados"],
    "11.1": ["inventario risco eletrico"],
    "11.2": ["energia incidente"],
    "11.3": ["inventario risco eletrico"],
    "12.1": ["energia incidente"],
    "12.2": ["energia incidente"],
    "12.3": ["energia incidente"],
    "13.1": ["cronograma inspecoes"],
    "13.2": ["cronograma inspecoes"],
    "13.3": ["cronograma inspecoes"],
    "14.1": ["revisao pie"],
    "14.2": ["revisao pie"],
    "14.3": ["revisao pie"]
  };

  const notApplicableItems = useMemo(() => {
    const set = new Set<string>();
    const regex = /\b(n\/?a|na|nao se aplica)\s*([0-9]+(?:\.[0-9]+)?)/i;
    documents.forEach((doc) => {
      const key = normalizeText(doc.category ?? "");
      if (key !== "pie status" && key !== "piestatus" && key !== "pie_status") return;
      const match = doc.title.match(regex);
      if (match?.[2]) {
        set.add(match[2]);
      }
    });
    return set;
  }, [documents]);

  const notApplicableDocumentByCode = useMemo(() => {
    const map = new Map<string, string>();
    const regex = /\b(n\/?a|na|nao se aplica)\s*([0-9]+(?:\.[0-9]+)?)/i;
    documents.forEach((doc) => {
      const key = normalizeText(doc.category ?? "");
      if (key !== "pie status" && key !== "piestatus" && key !== "pie_status") return;
      const match = doc.title.match(regex);
      if (match?.[2]) {
        map.set(match[2], doc.id);
      }
    });
    return map;
  }, [documents]);

  const latestCompanyProfile = useMemo(() => {
    if (!companyProfiles.length) return null;
    return [...companyProfiles].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    )[0];
  }, [companyProfiles]);

  const companyProfileStatus = useMemo(() => {
    if (!latestCompanyProfile) return "pendente";
    const fieldsToCheck = [
      latestCompanyProfile.legal_name,
      latestCompanyProfile.trade_name,
      latestCompanyProfile.cnpj,
      latestCompanyProfile.state_registration,
      latestCompanyProfile.municipal_registration,
      latestCompanyProfile.email,
      latestCompanyProfile.phone,
      latestCompanyProfile.website,
      latestCompanyProfile.address_street,
      latestCompanyProfile.address_number,
      latestCompanyProfile.address_complement,
      latestCompanyProfile.address_district,
      latestCompanyProfile.address_city,
      latestCompanyProfile.address_state,
      latestCompanyProfile.address_zip
    ];
    const filledCount = fieldsToCheck.filter(
      (value) => typeof value === "string" && value.trim().length > 0
    ).length;
    if (filledCount === 0) return "pendente";
    if (filledCount >= 6) return "atendido";
    return "parcial";
  }, [latestCompanyProfile]);

  const pieItemStatus = (itemCode: string, folderCode?: string) => {
    if (folderCode && notApplicableItems.has(folderCode)) return "na";
    if (notApplicableItems.has(itemCode)) return "na";
    if (itemCode === "1.1") return companyProfileStatus;
    const categoriesForItem = pieItemCategories[itemCode] ?? [];
    if (categoriesForItem.length === 0) return "pendente";
    const docsForItem = documents.filter((doc) => {
      const key = doc.category_id
        ? categoryKeyById.get(doc.category_id) ?? normalizeText(doc.category ?? "")
        : normalizeText(doc.category ?? "");
      return categoriesForItem.some((cat) => key.includes(normalizeText(cat)));
    });
    if (docsForItem.length === 0) return "pendente";
    if (["1.2", "1.3", "1.4", "1.5"].includes(itemCode)) return "atendido";
    const hasValid = docsForItem.some((doc) => isDocumentValid(doc.id));
    return hasValid ? "atendido" : "parcial";
  };

  const getItemDocuments = (itemCode: string) => {
    if (itemCode === "1.1") {
      const statusLabel =
        companyProfileStatus === "atendido"
          ? "Cadastro completo"
          : companyProfileStatus === "parcial"
            ? "Cadastro parcial"
            : "Cadastro pendente";
      return [
        {
          id: `empresa-${itemCode}`,
          title: statusLabel,
          category: "Cadastro da empresa",
          valid_until: null,
          openable: false
        }
      ];
    }
    const categoriesForItem = pieItemCategories[itemCode] ?? [];
    if (categoriesForItem.length === 0) return [];
    const docsForItem = documents.filter((doc) => {
      const key = doc.category_id
        ? categoryKeyById.get(doc.category_id) ?? normalizeText(doc.category ?? "")
        : normalizeText(doc.category ?? "");
      return categoriesForItem.some((cat) => key.includes(normalizeText(cat)));
    });
    return docsForItem.map((doc) => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      valid_until: latestVersionByDoc.get(doc.id)?.valid_until ?? null,
      openable: true
    }));
  };

  const detectPreviewType = (url: string) => {
    const cleanUrl = url.split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".pdf")) return "pdf";
    if (cleanUrl.match(/\.(png|jpg|jpeg|gif|webp)$/)) return "image";
    if (cleanUrl.match(/\.(mp3|wav|ogg|m4a|webm)$/)) return "audio";
    return "unknown";
  };

  const handleOpenItemDocuments = (item: { code: string; label: string }) => {
    setModalError("");
    setItemModal({
      code: item.code,
      label: item.label,
      docs: getItemDocuments(item.code)
    });
  };

  const handleOpenDocument = async (docId: string, name: string) => {
    const version = latestVersionByDoc.get(docId);
    if (!version) {
      setModalError("Documento sem versão disponível.");
      return;
    }
    try {
      const response = await getDocumentVersionUrl(version.id);
      setPreview({
        name,
        url: response.url,
        type: detectPreviewType(response.url)
      });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Falha ao abrir documento.");
    }
  };

  const pieFolderStatus = (folderCode: string, items: Array<{ code: string }>) => {
    if (notApplicableItems.has(folderCode)) return "na";
    const statuses = items.map((item) => pieItemStatus(item.code, folderCode));
    const nonNaStatuses = statuses.filter((status) => status !== "na");
    if (nonNaStatuses.length === 0) return "na";
    if (nonNaStatuses.every((status) => status === "atendido")) return "atendido";
    if (statuses.every((status) => status === "na")) return "na";
    if (statuses.some((status) => status === "parcial")) return "parcial";
    if (statuses.some((status) => status === "atendido")) return "parcial";
    return "pendente";
  };

  const toggleNotApplicable = async (code: string) => {
    if (!tenantId) {
      setError("Tenant nao encontrado no perfil.");
      return;
    }
    const existingId = notApplicableDocumentByCode.get(code);
    setSavingNa(code);
    setError("");
    try {
      if (existingId) {
        await deleteDocument(existingId);
        setDocuments((prev) => prev.filter((doc) => doc.id !== existingId));
      } else {
        const response = await createDocument({
          title: `NA ${code}`,
          category: "PIE Status",
          tenant_id: tenantId
        });
        setDocuments((prev) => [
          ...prev,
          {
            id: response.id,
            title: `NA ${code}`,
            category: "PIE Status",
            category_id: null,
            tenant_id: tenantId
          }
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar status.");
    } finally {
      setSavingNa(null);
    }
  };

  const folderItems = [
    {
      code: "1",
      title: "Pasta 1 — Identificação da Empresa",
      items: [
        { code: "1.1", label: "Dados cadastrais" },
        { code: "1.2", label: "Organograma manutenção/SESMT/CIPA" },
        { code: "1.3", label: "Responsáveis pelas instalações" },
        { code: "1.4", label: "Responsável Técnico (CREA/ART)" },
        { code: "1.5", label: "Contatos de emergência" }
      ]
    },
    {
      code: "2",
      title: "Pasta 2 — Diagramas e As Built",
      items: [
        { code: "2.1", label: "Unifilares atualizados (BT/MT)" },
        { code: "2.2", label: "Memorial descritivo" },
        { code: "2.3", label: "Aterramento (TN/TT/IT)" },
        { code: "2.4", label: "Plantas e roteiros" },
        { code: "2.5", label: "Lista de painéis/quadros" },
        { code: "2.6", label: "Registros de alterações" }
      ]
    },
    {
      code: "3",
      title: "Pasta 3 — Procedimentos e Instruções",
      items: [
        { code: "3.1", label: "Política de Segurança Elétrica" },
        { code: "3.2", label: "Procedimentos por intervenção" },
        { code: "3.3", label: "APR (modelos e registros)" },
        { code: "3.4", label: "PT (modelos e registros)" },
        { code: "3.5", label: "LOTO (procedimento e registros)" },
        { code: "3.6", label: "Seccionamento e delimitação" },
        { code: "3.7", label: "Controle de acesso e sinalização" }
      ]
    },
    {
      code: "4",
      title: "Pasta 4 — SPDA e Aterramentos",
      items: [
        { code: "4.1", label: "Projeto/As built SPDA" },
        { code: "4.2", label: "Laudos/inspeções periódicas" },
        { code: "4.3", label: "Medições de continuidade" },
        { code: "4.4", label: "Resistência de aterramento" },
        { code: "4.5", label: "Registros de correções" }
      ]
    },
    {
      code: "5",
      title: "Pasta 5 — EPC, EPI e Ferramental",
      items: [
        { code: "5.1", label: "Lista de EPC por área" },
        { code: "5.2", label: "Lista de EPI por atividade" },
        { code: "5.3", label: "Ferramental isolado" },
        { code: "5.4", label: "Validade/CA e inspeções" }
      ]
    },
    {
      code: "6",
      title: "Pasta 6 — Treinamentos e Autorizações",
      items: [
        { code: "6.1", label: "Matriz de competências" },
        { code: "6.2", label: "Lista de autorizados" },
        { code: "6.3", label: "Certificados NR-10/SEP" },
        { code: "6.4", label: "Integração de terceiros" }
      ]
    },
    {
      code: "7",
      title: "Pasta 7 — Ensaios EPC/EPI",
      items: [
        { code: "7.1", label: "Ensaios dielétricos" },
        { code: "7.2", label: "Inspeção e descarte" },
        { code: "7.3", label: "Rastreabilidade" }
      ]
    },
    {
      code: "8",
      title: "Pasta 8 — Áreas Classificadas",
      items: [
        { code: "8.1", label: "Classificação de áreas" },
        { code: "8.2", label: "Certificação Ex" },
        { code: "8.3", label: "Registros de integridade" }
      ]
    },
    {
      code: "9",
      title: "Pasta 9 — RTI e Plano de Ação",
      items: [
        { code: "9.1", label: "RTI vigente" },
        { code: "9.2", label: "Histórico de RTIs" },
        { code: "9.3", label: "Plano de ação consolidado" },
        { code: "9.4", label: "Evidências de encerramento" }
      ]
    },
    {
      code: "10",
      title: "Pasta 10 — SEP e Emergências",
      items: [
        { code: "10.1", label: "Procedimentos de emergência" },
        { code: "10.2", label: "Certificações adicionais" },
        { code: "10.3", label: "Simulados e registros" }
      ]
    },
    {
      code: "11",
      title: "Pasta 11 — Inventário de Riscos Elétricos",
      items: [
        { code: "11.1", label: "Tensões e correntes de curto" },
        { code: "11.2", label: "Energia incidente (arco)" },
        { code: "11.3", label: "Níveis de risco por área" }
      ]
    },
    {
      code: "12",
      title: "Pasta 12 — Análise de Energia Incidente",
      items: [
        { code: "12.1", label: "Categoria por painel (BT/MT)" },
        { code: "12.2", label: "cal/cm² por painel" },
        { code: "12.3", label: "EPI recomendado" }
      ]
    },
    {
      code: "13",
      title: "Pasta 13 — Cronograma Mestre de Inspeções",
      items: [
        { code: "13.1", label: "Frequências de inspeção" },
        { code: "13.2", label: "Responsáveis" },
        { code: "13.3", label: "Base normativa" }
      ]
    },
    {
      code: "14",
      title: "Pasta 14 — Controle de Revisões do PIE",
      items: [
        { code: "14.1", label: "Versão e data" },
        { code: "14.2", label: "Motivo da revisão" },
        { code: "14.3", label: "Responsável técnico" }
      ]
    }
  ];

  const formatStatusLabel = (status: string) => {
    if (status === "atendido") return "Atendido";
    if (status === "parcial") return "Parcial";
    if (status === "pendente") return "Pendente";
    if (status === "na") return "N/A";
    return status;
  };

  const statusColor = (status: string) => {
    if (status === "atendido") return "#16a34a";
    if (status === "parcial") return "#f59e0b";
    if (status === "pendente") return "#ef4444";
    if (status === "na") return "#6b7280";
    return "#111827";
  };

  const buildReportHtml = (mode: "sintetico" | "analitico") => {
    const company = latestCompanyProfile;
    const generatedAt = new Date().toLocaleString("pt-BR");
    const companyName = company?.legal_name ?? "Empresa não cadastrada";
    const companyTrade = company?.trade_name ? ` (${company.trade_name})` : "";
    const addressParts = [
      company?.address_street,
      company?.address_number,
      company?.address_complement,
      company?.address_district,
      company?.address_city,
      company?.address_state,
      company?.address_zip
    ].filter((item) => item && String(item).trim().length > 0);
    const address = addressParts.length ? addressParts.join(", ") : "—";

    const folderRows = folderItems
      .map((folder) => {
        const status = pieFolderStatus(folder.code, folder.items);
        return `
          <tr>
            <td>${folder.code}</td>
            <td>${folder.title}</td>
            <td style="color:${statusColor(status)}">${formatStatusLabel(status)}</td>
          </tr>
        `;
      })
      .join("");

    const itemRows = folderItems
      .flatMap((folder) =>
        folder.items.map((item) => {
          const status = pieItemStatus(item.code, folder.code);
          return `
            <tr>
              <td>${folder.code}</td>
              <td>${item.code}</td>
              <td>${item.label}</td>
              <td style="color:${statusColor(status)}">${formatStatusLabel(status)}</td>
            </tr>
          `;
        })
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>PIE - Relatório ${mode === "sintetico" ? "Sintético" : "Analítico"}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: "Segoe UI", Tahoma, sans-serif; color: #111827; margin: 32px; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            h2 { font-size: 16px; margin: 24px 0 10px; }
            h3 { font-size: 14px; margin: 18px 0 6px; }
            .muted { color: #6b7280; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
            .tag { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #0f172a; color: #fff; font-size: 11px; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
            .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }
            .card strong { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f8fafc; }
            .footer { margin-top: 24px; font-size: 11px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>RTI/PIE - Relatório ${mode === "sintetico" ? "Sintético" : "Analítico"}</h1>
              <p class="muted">Gerado em ${generatedAt}</p>
            </div>
            <span class="tag">NR-10</span>
          </div>

          <h2>Identificação da Empresa</h2>
          <div class="card">
            <strong>${companyName}${companyTrade}</strong>
            <p class="muted">CNPJ: ${company?.cnpj ?? "—"}</p>
            <p class="muted">Inscrição Estadual: ${company?.state_registration ?? "—"}</p>
            <p class="muted">Inscrição Municipal: ${company?.municipal_registration ?? "—"}</p>
            <p class="muted">E-mail: ${company?.email ?? "—"} • Telefone: ${
              company?.phone ?? "—"
            }</p>
            <p class="muted">Endereço: ${address}</p>
            <p class="muted">Website: ${company?.website ?? "—"}</p>
          </div>

          <h2>Resumo Geral</h2>
          <div class="grid">
            <div class="card">
              <p class="muted">Documentos cadastrados</p>
              <strong>${documents.length}</strong>
            </div>
            <div class="card">
              <p class="muted">Documentos vencidos</p>
              <strong>${expiredDocuments}</strong>
            </div>
            <div class="card">
              <p class="muted">Documentos sem vínculo</p>
              <strong>${documentsWithoutLink}</strong>
            </div>
            <div class="card">
              <p class="muted">Pastas atendidas</p>
              <strong>${statusCounts.atendido}</strong>
            </div>
            <div class="card">
              <p class="muted">Pastas parciais</p>
              <strong>${statusCounts.parcial}</strong>
            </div>
            <div class="card">
              <p class="muted">Pastas pendentes</p>
              <strong>${statusCounts.pendente}</strong>
            </div>
          </div>

          <h2>Conformidade por Pasta</h2>
          <table>
            <thead>
              <tr>
                <th>Pasta</th>
                <th>Descrição</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${folderRows}
            </tbody>
          </table>

          ${
            mode === "analitico"
              ? `
                <h2>Detalhamento Analítico</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Pasta</th>
                      <th>Item</th>
                      <th>Descrição</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                </table>
              `
              : ""
          }

          <div class="footer">
            Relatório gerado automaticamente pelo VoltDocs.
          </div>
        </body>
      </html>
    `;
  };

  const handleGenerateReport = (mode: "sintetico" | "analitico") => {
    const html = buildReportHtml(mode);
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      setError("Nao foi possivel abrir o relatorio.");
      return;
    }
    reportWindow.opener = null;
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.onload = () => {
      reportWindow.print();
    };
  };

  const statusCounts = useMemo(() => {
    const counts = { atendido: 0, parcial: 0, pendente: 0, na: 0 };
    folderItems.forEach((folder) => {
      folder.items.forEach((item) => {
        const status = pieItemStatus(item.code, folder.code);
        counts[status] += 1;
      });
    });
    return counts;
  }, [folderItems, documents, versions, categories, notApplicableItems, tenantId]);
  return (
    <div className="pie">
      <aside className="pie-sidebar">
        <div className="pie-brand">
          <div className="pie-logo" aria-hidden="true" />
          <span className="pie-title">VoltDocs</span>
        </div>

        <nav className="pie-nav">
          <div className="pie-section">
            <p className="pie-label">GESTÃO</p>
            <Link className="pie-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="pie-icon" />
              Visão Geral
            </Link>
            <Link className="pie-item" to="/equipamentos">
              <LucideIcon name="cpu" className="pie-icon" />
              Equipamentos
            </Link>
            <Link className="pie-item" to="/locais">
              <LucideIcon name="map-pin" className="pie-icon" />
              Locais
            </Link>
            <Link className="pie-item" to="/documentos">
              <LucideIcon name="file-text" className="pie-icon" />
              Documentos
            </Link>
            <Link className="pie-item" to="/chamados">
              <LucideIcon name="life-buoy" className="pie-icon" />
              Chamados
            </Link>
          </div>

          <div className="pie-section">
            <p className="pie-label">ANÁLISE</p>
            <Link className="pie-item" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="pie-icon" />
              Relatórios
            </Link>
          </div>

          <div className="pie-section">
            <p className="pie-label">PIE</p>
            <Link className="pie-item is-active" to="/pie">
              <LucideIcon name="shield" className="pie-icon" />
              PIE
            </Link>
          </div>

          <div className="pie-section">
            <p className="pie-label">CAMPO</p>
            <Link className="pie-item" to="/registros">
              <LucideIcon name="clipboard-check" className="pie-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="pie-section">
            <p className="pie-label">SISTEMA</p>
            <Link className="pie-item" to="/usuarios">
              <LucideIcon name="users" className="pie-icon" />
              Usuários
            </Link>

            <Link className="pie-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="pie-icon" />
              Dados Empresa
            </Link>
            <Link className="pie-item" to="/grupos">
              <LucideIcon name="users-2" className="pie-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="pie-user">
          <div className="pie-user-meta">
            <p className="pie-user-name">{authUser?.name ?? "—"}</p>
            <p className="pie-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="pie-content">
        <header className="pie-topbar">
          <span className="pie-org">Apogeu Automação</span>
          <div className="pie-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="pie-bell" />
            <Link className="pie-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="pie-logout-icon" />
              Alterar senha
            </Link>
            <Link className="pie-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="pie-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="pie-main">
          <div className="pie-header">
            <div>
              <h1>RTI / PIE - Prontuário das Instalações Elétricas</h1>
              <p>
                Central do Relatório Técnico de Inspeções (RTI), ART e evidências
                para atender NR-10, NBR 5410 e NBR 14039.
              </p>
            </div>
            <div className="pie-header-actions">
              <Link className="pie-button ghost" to="/auditoria/pasta1">
                <LucideIcon name="file-text" className="pie-button-icon" />
                Pasta 1 - Auditoria
              </Link>
              <button
                className="pie-button"
                type="button"
                onClick={() => handleGenerateReport("sintetico")}
              >
                <LucideIcon name="file-down" className="pie-button-icon" />
                PDF Sintético
              </button>
              <button
                className="pie-button ghost"
                type="button"
                onClick={() => handleGenerateReport("analitico")}
              >
                <LucideIcon name="bar-chart-3" className="pie-button-icon" />
                PDF Analítico
              </button>
            </div>
          </div>
          {error ? <p className="pie-error">{error}</p> : null}

          <div className="pie-summary">
            <div className="pie-summary-card">
              <span className="pie-summary-icon-wrap">
                <LucideIcon name="file-text" className="pie-summary-icon" />
              </span>
              <div>
                <p>Documentos RTI/PIE</p>
                <strong>{documents.length}</strong>
              </div>
            </div>
            <div className="pie-summary-card">
              <span className="pie-summary-icon-wrap is-warning">
                <LucideIcon
                  name="alert-triangle"
                  className="pie-summary-icon is-warning"
                />
              </span>
              <div>
                <p>Vencidos</p>
                <strong>{expiredDocuments}</strong>
              </div>
            </div>
            <div className="pie-summary-card">
              <span className="pie-summary-icon-wrap">
                <LucideIcon name="link-2" className="pie-summary-icon" />
              </span>
              <div>
                <p>Sem vínculo</p>
                <strong>{documentsWithoutLink}</strong>
              </div>
            </div>
            <div className="pie-search">
              <label>Busca</label>
              <div className="pie-search-input">
                <LucideIcon name="search" className="pie-search-icon" />
                <input type="text" placeholder="Título, categoria ou tag do equip" />
              </div>
              <span className="pie-search-count">
                {documents.length} de {documents.length} documentos exibidos
              </span>
            </div>
          </div>

          <div className="pie-info-cards">
            <article className="pie-info-card">
              <p>Diagramas Unifilares</p>
              <strong>3</strong>
              <span>Necessários para identificação de circuitos e inspeção.</span>
            </article>
            <article className="pie-info-card">
              <p>Laudos Técnicos</p>
              <strong>0</strong>
              <span>Inclui RTI e inspeções complementares.</span>
            </article>
            <article className="pie-info-card">
              <p>ART do RTI</p>
              <strong>0</strong>
              <span>Emitida pelo engenheiro responsável.</span>
            </article>
          </div>

          <div className="pie-section-card">
            <div className="pie-section-title">
              <div>
                <p>Estrutura do PIE</p>
                <h3>Pastas obrigatórias e complementares</h3>
              </div>
              <span className="pie-count">14 pastas</span>
            </div>
            <div className="pie-folder-summary">
              <div className="pie-folder-summary-card">
                <p>Atendidos</p>
                <strong>{statusCounts.atendido}</strong>
              </div>
              <div className="pie-folder-summary-card">
                <p>Parciais</p>
                <strong>{statusCounts.parcial}</strong>
              </div>
              <div className="pie-folder-summary-card">
                <p>Pendentes</p>
                <strong>{statusCounts.pendente}</strong>
              </div>
              <div className="pie-folder-summary-card">
                <p>Não aplicável</p>
                <strong>{statusCounts.na}</strong>
              </div>
            </div>
            <div className="pie-folder-grid">
              {folderItems.map((folder) => (
                <div className="pie-folder-card" key={folder.title}>
                  {(() => {
                    const folderStatus = pieFolderStatus(folder.code, folder.items);
                    const folderLabel =
                      folderStatus === "atendido"
                        ? "Atendido"
                        : folderStatus === "parcial"
                          ? "Parcial"
                          : folderStatus === "na"
                            ? "Não aplicável"
                            : "Pendente";
                    const folderClass =
                      folderStatus === "atendido"
                        ? "pie-tag ok"
                        : folderStatus === "parcial"
                          ? "pie-tag mid"
                          : folderStatus === "na"
                            ? "pie-tag neutral"
                            : "pie-tag warn";
                    const isFolderNa = notApplicableItems.has(folder.code);
                    return (
                      <div className="pie-folder-head">
                        <h4>{folder.title}</h4>
                        <div className="pie-folder-actions">
                          <span className={folderClass}>{folderLabel}</span>
                          <button
                            type="button"
                            className={`pie-na-button ${isFolderNa ? "is-active" : ""}`}
                            onClick={() => toggleNotApplicable(folder.code)}
                            disabled={savingNa === folder.code}
                          >
                            Não aplicável
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  <ul>
                    {folder.items.map((item) => {
                      const status = pieItemStatus(item.code, folder.code);
                      const label =
                        status === "atendido"
                          ? "Atendido"
                          : status === "parcial"
                            ? "Parcial"
                            : status === "na"
                              ? "Não aplicável"
                              : "Pendente";
                      const className =
                        status === "atendido"
                          ? "pie-tag ok"
                          : status === "parcial"
                            ? "pie-tag mid"
                            : status === "na"
                              ? "pie-tag neutral"
                              : "pie-tag warn";
                      const isItemNa = notApplicableItems.has(item.code);
                      return (
                        <li key={item.code}>
                          <span>
                            {item.code} {item.label}
                          </span>
                          <div className="pie-item-actions">
                            <span className={className}>{label}</span>
                            <button
                              type="button"
                              className="pie-view-button"
                              aria-label={`Ver documentos do item ${item.code}`}
                              onClick={() => handleOpenItemDocuments(item)}
                            >
                              <LucideIcon name="eye" className="pie-view-icon" />
                            </button>
                            <button
                              type="button"
                              className={`pie-na-button ${isItemNa ? "is-active" : ""}`}
                              onClick={() => toggleNotApplicable(item.code)}
                              disabled={savingNa === item.code}
                            >
                              Não aplicável
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          {itemModal ? (
            <>
              <div className="pie-modal-backdrop" />
              <section className="pie-modal" role="dialog" aria-label="Documentos do item">
                <header className="pie-modal-header">
                  <div>
                    <p>Item {itemModal.code}</p>
                    <h3>{itemModal.label}</h3>
                  </div>
                  <button type="button" onClick={() => setItemModal(null)}>
                    Fechar
                  </button>
                </header>
                <div className="pie-modal-body">
                  {modalError ? <p className="pie-modal-error">{modalError}</p> : null}
                  {itemModal.docs.length === 0 ? (
                    <p>Nenhum documento vinculado a este item.</p>
                  ) : (
                    <ul className="pie-modal-list">
                      {itemModal.docs.map((doc) => (
                        <li key={doc.id}>
                          <div>
                            <strong>{doc.title}</strong>
                            <span>{doc.category}</span>
                          </div>
                          <div className="pie-modal-actions">
                            <span className="pie-modal-tag">
                              Validade: {formatDate(doc.valid_until)}
                            </span>
                            {doc.openable ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDocument(doc.id, doc.title)}
                              >
                                Abrir
                              </button>
                            ) : (
                              <span className="pie-modal-tag">Sem arquivo</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          ) : null}
          {preview ? (
            <div className="pie-preview-backdrop">
              <div className="pie-preview">
                <div className="pie-preview-header">
                  <strong>{preview.name}</strong>
                  <button type="button" onClick={() => setPreview(null)}>
                    Fechar
                  </button>
                </div>
                <div className="pie-preview-body">
                  {preview.type === "image" ? (
                    <img src={preview.url} alt={preview.name} />
                  ) : null}
                  {preview.type === "pdf" ? (
                    <iframe src={preview.url} title={preview.name} />
                  ) : null}
                  {preview.type === "audio" ? (
                    <audio controls src={preview.url} />
                  ) : null}
                  {preview.type === "unknown" ? (
                    <a href={preview.url} target="_blank" rel="noreferrer">
                      Abrir arquivo
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="pie-checklist">
            <div className="pie-checklist-header">
              <div className="pie-checklist-header-main">
                <p>Checklist Técnico RTI</p>
                <h2>Conformidade com NR-10, NBR 5410/14039</h2>
              </div>
              <span className="pie-evidence">6 evidências</span>
            </div>

            <div className="pie-checklist-grid">
              <div className="pie-checklist-card">
                <h3>Documentação Técnica</h3>
                <p>Diagramas, manuais, laudos e ART que sustentam o RTI.</p>
                <ul>
                  <li>
                    Diagramas unifilares atualizados
                    <span className="pie-tag ok">Atendido</span>
                  </li>
                  <li>
                    Laudos técnicos anexados
                    <span className="pie-tag warn">Pendente</span>
                  </li>
                  <li>
                    Manuais técnicos disponíveis
                    <span className="pie-tag mid">Parcial</span>
                  </li>
                  <li>
                    ART recolhida para o RTI
                    <span className="pie-tag warn">Pendente</span>
                  </li>
                </ul>
              </div>

              <div className="pie-checklist-card">
                <h3>Proteção contra Choque Elétrico</h3>
                <p>
                  Barreiras, DR em áreas úmidas e integridade de condutores.
                </p>
                <ul>
                  <li>
                    Evidências de DR em áreas úmidas/molhadas
                    <span className="pie-tag warn">Pendente</span>
                  </li>
                  <li>
                    Conservação de cabos/condutores (registro fotográfico)
                    <span className="pie-tag warn">Pendente</span>
                  </li>
                </ul>
              </div>

              <div className="pie-checklist-card">
                <h3>Quadros e Painéis Elétricos</h3>
                <p>Identificação de circuitos e bloqueios.</p>
                <ul>
                  <li>
                    Sinalização de advertência visível
                    <span className="pie-tag mid">Parcial</span>
                  </li>
                  <li>
                    Identificação de circuitos/documentação vinculada
                    <span className="pie-tag ok">Atendido</span>
                  </li>
                  <li>
                    Registro fotográfico de não conformidades em quadros
                    <span className="pie-tag warn">Pendente</span>
                  </li>
                </ul>
              </div>

              <div className="pie-checklist-card">
                <h3>Medidas de Segurança do Trabalho</h3>
                <p>
                  EPI/EPC, bloqueios de religamento e evidências de validade.
                </p>
                <ul>
                  <li>
                    Validade de EPI/EPC registrada no RTI
                    <span className="pie-tag warn">Pendente</span>
                  </li>
                  <li>
                    Procedimentos/POP vinculados
                    <span className="pie-tag ok">Atendido</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pie-section-card">
            <p>Registro Fotográfico e Evidências</p>
            <h3>Rastreabilidade das não conformidades</h3>
            <span>
              Para cada não conformidade: foto, legenda, localização, referência
              normativa e risco.
            </span>
            <div className="pie-two-col">
              <div className="pie-mini-card">
                <h4>Recomendações Técnicas</h4>
                <p>
                  Registrar a solução prescrita pelo engenheiro para cada item (ex:
                  substituição de disjuntor, instalação de barreira, ajuste de DPS).
                </p>
              </div>
              <div className="pie-mini-card">
                <h4>Classificação de Risco</h4>
                <p>
                  Marcar a gravidade: Crítico (risco grave e iminente), Alto/Médio,
                  Baixo. Use essa classificação para priorizar o cronograma.
                </p>
              </div>
            </div>
          </div>

          <div className="pie-section-card">
            <p>Cronograma de Adequação (NR-10 10.2.4 g)</p>
            <h3>Pendências e prazos sugeridos</h3>
            <div className="pie-table">
              <div className="pie-table-row pie-table-head">
                <div>Item</div>
                <div>Risco</div>
                <div>Prazo</div>
                <div>Ação</div>
              </div>
              <div className="pie-table-row">
                <div>wasw</div>
                <div>Crítico (vencido)</div>
                <div>22/01/2026</div>
                <div>Atualizar/renovar evidência e anexar RTI</div>
              </div>
              <div className="pie-table-row">
                <div>mais um grande</div>
                <div>Crítico (vencido)</div>
                <div>22/01/2026</div>
                <div>Atualizar/renovar evidência e anexar RTI</div>
              </div>
              <div className="pie-table-row">
                <div>ART do RTI</div>
                <div>Crítico (ausente)</div>
                <div>18/01/2026</div>
                <div>Emitir ART com engenheiro responsável</div>
              </div>
            </div>
          </div>

          <div className="pie-section-card">
            <div className="pie-section-title">
              <div>
                <p>Evidências Documentais</p>
                <h3>Base para o RTI e o PIE</h3>
              </div>
              <span className="pie-count">6 itens</span>
            </div>
            <div className="pie-table">
              <div className="pie-table-row pie-table-head">
                <div>Título</div>
                <div>Categoria</div>
                <div>Equipamentos</div>
                <div>Validade</div>
                <div>Status</div>
              </div>
              <div className="pie-table-row">
                <div>é mais um teste</div>
                <div>Manual</div>
                <div>GMG-023-A</div>
                <div>Indeterminado</div>
                <div>
                  <span className="pie-tag ok">Válido</span>
                </div>
              </div>
              <div className="pie-table-row">
                <div>outro doc</div>
                <div>Diagrama</div>
                <div>GMG-023-A</div>
                <div>Indeterminado</div>
                <div>
                  <span className="pie-tag ok">Válido</span>
                </div>
              </div>
              <div className="pie-table-row">
                <div>wasw</div>
                <div>Procedimento</div>
                <div>GMG-023-A, MC-AC-22</div>
                <div>01/12/2025</div>
                <div>
                  <span className="pie-tag warn">Vencido</span>
                </div>
              </div>
              <div className="pie-table-row">
                <div>grande</div>
                <div>Manual</div>
                <div>GMG-023-A</div>
                <div>Indeterminado</div>
                <div>
                  <span className="pie-tag ok">Válido</span>
                </div>
              </div>
              <div className="pie-table-row">
                <div>asdasd</div>
                <div>Diagrama</div>
                <div>GMG-023-A</div>
                <div>Indeterminado</div>
                <div>
                  <span className="pie-tag ok">Válido</span>
                </div>
              </div>
              <div className="pie-table-row">
                <div>mais um grande</div>
                <div>Diagrama</div>
                <div>MC-AC-22</div>
                <div>25/11/2025</div>
                <div>
                  <span className="pie-tag warn">Vencido</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
