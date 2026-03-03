import { Link } from "react-router-dom";
import { useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { GlobalThemeToggle } from "../components/GlobalThemeToggle";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser, clearAuthUser } from "../lib/auth";
import {
  clearToken,
  listAssets,
  listDocumentCategories,
  listDocuments,
  listSites
} from "../lib/api";
import "../styles/relatorios.css";

type ReportColumn = {
  key: string;
  label: string;
};

type ReportPayload = {
  title: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string>>;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const openReportWindow = () => {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    throw new Error("Não foi possível abrir a janela de impressão.");
  }
  return reportWindow;
};

const renderLoadingReportWindow = (reportWindow: Window) => {
  reportWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Gerando relatório...</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 24px;">
        <h1 style="font-size: 18px; margin: 0;">Gerando relatório...</h1>
        <p style="font-size: 13px; color: #475569; margin-top: 8px;">Aguarde alguns segundos.</p>
      </body>
    </html>
  `);
  reportWindow.document.close();
};

const renderPrintableReport = (reportWindow: Window, payload: ReportPayload) => {
  const { title, columns, rows } = payload;
  const generatedAt = new Date().toLocaleString("pt-BR");
  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${escapeHtml(row[column.key] ?? "—")}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  reportWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          p { margin: 0 0 16px; font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>Gerado em: ${escapeHtml(generatedAt)} • Total de registros: ${rows.length}</p>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
};

export function Relatorios() {
  const authUser = getAuthUser();
  const [reportError, setReportError] = useState("");
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  const runReport = async (key: string, task: () => Promise<ReportPayload>) => {
    let reportWindow: Window | null = null;
    setReportError("");
    try {
      reportWindow = openReportWindow();
      renderLoadingReportWindow(reportWindow);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Falha ao abrir janela de impressão.");
      return;
    }

    setLoadingReport(key);
    try {
      const payload = await task();
      if (!reportWindow || reportWindow.closed) {
        throw new Error("A janela de impressão foi fechada antes da geração.");
      }
      renderPrintableReport(reportWindow, payload);
    } catch (error) {
      if (reportWindow && !reportWindow.closed) {
        reportWindow.close();
      }
      setReportError(error instanceof Error ? error.message : "Falha ao gerar relatório.");
    } finally {
      setLoadingReport(null);
    }
  };

  const handleAssetsReport = async (): Promise<ReportPayload> => {
    const [assets, sites] = await Promise.all([listAssets(), listSites()]);
    const siteById = new Map(sites.map((site) => [site.id, site.name]));
    const rows = assets.map((asset) => ({
      tag: asset.tag ?? "—",
      name: asset.name ?? "—",
      patrimony: asset.patrimony_number ?? "—",
      voltage: asset.voltage ?? "—",
      current: asset.current_rating !== null ? String(asset.current_rating) : "—",
      atpv: asset.atpv !== null ? String(asset.atpv) : "—",
      risk: asset.risk_level ?? "—",
      site: asset.site_id ? siteById.get(asset.site_id) ?? "—" : "—"
    }));

    return {
      title: "Listagem de Equipamentos",
      columns: [
        { key: "tag", label: "Tag" },
        { key: "name", label: "Nome" },
        { key: "patrimony", label: "Patrimônio" },
        { key: "voltage", label: "Tensão" },
        { key: "current", label: "Corrente (A)" },
        { key: "atpv", label: "ATPV" },
        { key: "risk", label: "Risco" },
        { key: "site", label: "Local" }
      ],
      rows
    };
  };

  const handleSitesReport = async (): Promise<ReportPayload> => {
    const sites = await listSites();
    const rows = sites.map((site) => ({
      name: site.name ?? "—",
      address: site.address ?? "—"
    }));

    return {
      title: "Listagem de Locais",
      columns: [
        { key: "name", label: "Nome da Unidade" },
        { key: "address", label: "Endereço Completo" }
      ],
      rows
    };
  };

  const handleDocumentsReport = async (): Promise<ReportPayload> => {
    const [documents, assets] = await Promise.all([listDocuments(), listAssets()]);
    const assetById = new Map(
      assets.map((asset) => [asset.id, `${asset.tag} - ${asset.name}`])
    );
    const rows = documents.map((document) => ({
      title: document.title ?? "—",
      category: document.category ?? "—",
      equipment: document.equipment_id ? assetById.get(document.equipment_id) ?? "—" : "—",
      createdAt: formatDate(document.created_at)
    }));

    return {
      title: "Listagem de Todos os Documentos",
      columns: [
        { key: "title", label: "Título" },
        { key: "category", label: "Categoria" },
        { key: "equipment", label: "Equipamento Vinculado" },
        { key: "createdAt", label: "Data de Cadastro" }
      ],
      rows
    };
  };

  const handleCategoriesReport = async (): Promise<ReportPayload> => {
    const [categories, documents] = await Promise.all([listDocumentCategories(), listDocuments()]);
    const countByCategoryId = new Map<string, number>();
    for (const document of documents) {
      if (!document.category_id) continue;
      countByCategoryId.set(
        document.category_id,
        (countByCategoryId.get(document.category_id) ?? 0) + 1
      );
    }

    const rows = categories.map((category) => ({
      code: category.code ?? "—",
      name: category.name ?? "—",
      totalDocs: String(countByCategoryId.get(category.id) ?? 0)
    }));

    return {
      title: "Listagem de Categorias de Documentos",
      columns: [
        { key: "code", label: "Código" },
        { key: "name", label: "Categoria" },
        { key: "totalDocs", label: "Qtd. de Documentos" }
      ],
      rows
    };
  };

  return (
    <div className="relatorios">
      <aside className="relatorios-sidebar">
        <div className="relatorios-brand">
          <div className="relatorios-logo" aria-hidden="true" />
          <span className="relatorios-title">VoltDocs</span>
        </div>

        <nav className="relatorios-nav">
          <div className="relatorios-section">
            <p className="relatorios-label">GESTÃO</p>
            <Link className="relatorios-item" to="/dashboard">
              <LucideIcon name="layout-dashboard" className="relatorios-icon" />
              Visão Geral
            </Link>
            <Link className="relatorios-item" to="/equipamentos">
              <LucideIcon name="cpu" className="relatorios-icon" />
              Equipamentos
            </Link>
            <Link className="relatorios-item" to="/locais">
              <LucideIcon name="map-pin" className="relatorios-icon" />
              Locais
            </Link>
            <Link className="relatorios-item" to="/documentos">
              <LucideIcon name="file-text" className="relatorios-icon" />
              Documentos
            </Link>
            <Link className="relatorios-item" to="/chamados">
              <LucideIcon name="life-buoy" className="relatorios-icon" />
              Chamados
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">ANÁLISE</p>
            <Link className="relatorios-item is-active" to="/relatorios">
              <LucideIcon name="bar-chart-3" className="relatorios-icon" />
              Relatórios
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">PIE</p>
            <Link className="relatorios-item" to="/pie">
              <LucideIcon name="shield" className="relatorios-icon" />
              PIE
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">CAMPO</p>
            <Link className="relatorios-item" to="/registros">
              <LucideIcon name="clipboard-check" className="relatorios-icon" />
              Registros de Campo
            </Link>
          </div>

          <div className="relatorios-section">
            <p className="relatorios-label">SISTEMA</p>
            <Link className="relatorios-item" to="/usuarios">
              <LucideIcon name="users" className="relatorios-icon" />
              Usuários
            </Link>

            <Link className="relatorios-item" to="/dados-empresa">
              <LucideIcon name="file-text" className="relatorios-icon" />
              Dados Empresa
            </Link>
            <Link className="relatorios-item" to="/grupos">
              <LucideIcon name="users-2" className="relatorios-icon" />
              Grupos
            </Link>
          </div>
        </nav>

        <div className="relatorios-user">
          <div className="relatorios-user-meta">
            <p className="relatorios-user-name">{authUser?.name ?? "—"}</p>
            <p className="relatorios-user-email">{authUser?.email ?? "—"}</p>
            <AppBuildInfo />
          </div>
        </div>
      </aside>

      <main className="relatorios-content">
        <header className="relatorios-topbar">
          <span className="relatorios-org">Apogeu Automação</span>
          <div className="relatorios-actions">
            <GlobalThemeToggle />
            <LucideIcon name="bell" className="relatorios-bell" />
            <Link className="relatorios-logout" to="/alterar-senha">
              <LucideIcon name="lock" className="relatorios-logout-icon" />
              Alterar senha
            </Link>
            <Link className="relatorios-logout" to="/login" onClick={() => { clearToken(); clearAuthUser(); }} >
              <LucideIcon name="log-out" className="relatorios-logout-icon" />
              Sair
            </Link>
          </div>
        </header>

        <section className="relatorios-main">
          <div className="relatorios-header">
            <div>
              <h1>Relatórios Gerenciais</h1>
              <p>Análise de conformidade NR-10 e histórico de auditoria.</p>
            </div>
            <div className="relatorios-header-actions">
              <Link className="relatorios-tab is-active" to="/relatorios">
                <LucideIcon name="check-square" className="relatorios-tab-icon" />
                Conformidade
              </Link>
              <Link className="relatorios-tab" to="/relatorios/auditoria">
                <LucideIcon name="history" className="relatorios-tab-icon" />
                Auditoria
              </Link>
            </div>
          </div>
          <div className="relatorios-listagens-card">
            <div className="relatorios-listagens">
              <h2>Listagens para impressão/PDF</h2>
              <p>
                Gere relatórios em formato de impressão para Equipamentos, Locais e Documentos
                (todos os documentos ou categorias).
              </p>
            </div>
            <div className="relatorios-print-grid">
              <button
                type="button"
                className="relatorios-print-btn"
                onClick={() => runReport("equip", handleAssetsReport)}
                disabled={loadingReport !== null}
              >
                <LucideIcon name="cpu" className="relatorios-tab-icon" />
                {loadingReport === "equip" ? "Gerando..." : "PDF Equipamentos"}
              </button>
              <button
                type="button"
                className="relatorios-print-btn"
                onClick={() => runReport("sites", handleSitesReport)}
                disabled={loadingReport !== null}
              >
                <LucideIcon name="map-pin" className="relatorios-tab-icon" />
                {loadingReport === "sites" ? "Gerando..." : "PDF Locais"}
              </button>
              <button
                type="button"
                className="relatorios-print-btn"
                onClick={() => runReport("docs", handleDocumentsReport)}
                disabled={loadingReport !== null}
              >
                <LucideIcon name="file-text" className="relatorios-tab-icon" />
                {loadingReport === "docs" ? "Gerando..." : "PDF Documentos (Todos)"}
              </button>
              <button
                type="button"
                className="relatorios-print-btn"
                onClick={() => runReport("cats", handleCategoriesReport)}
                disabled={loadingReport !== null}
              >
                <LucideIcon name="file-down" className="relatorios-tab-icon" />
                {loadingReport === "cats" ? "Gerando..." : "PDF Categorias de Documentos"}
              </button>
            </div>
          </div>
          {reportError ? <p className="relatorios-report-error">{reportError}</p> : null}

          <div className="relatorios-cards">
            <article className="relatorios-card is-highlight">
              <p className="relatorios-card-label">Score Geral de Conformidade</p>
              <p className="relatorios-card-value">85%</p>
              <p className="relatorios-card-sub">Meta ideal: 100%</p>
            </article>
            <article className="relatorios-card">
              <p className="relatorios-card-label">Ativos Irregulares</p>
              <p className="relatorios-card-value">15</p>
              <p className="relatorios-card-sub">De um total de 100 ativos</p>
            </article>
            <article className="relatorios-card">
              <p className="relatorios-card-label">Pendências Críticas</p>
              <p className="relatorios-card-value">0</p>
              <p className="relatorios-card-sub">Documentos vencidos ou ausentes</p>
            </article>
          </div>

          <div className="relatorios-grid">
            <div className="relatorios-panel">
              <h2>Status Global</h2>
              <div className="relatorios-donut">
                <div className="relatorios-donut-ring">
                  <span className="relatorios-donut-gap" />
                </div>
              </div>
              <div className="relatorios-legend">
                <span className="relatorios-legend-item">
                  <span className="relatorios-legend-dot is-ok" /> Conforme
                </span>
                <span className="relatorios-legend-item">
                  <span className="relatorios-legend-dot is-bad" /> Irregular
                </span>
              </div>
            </div>
            <div className="relatorios-panel">
              <h2>Conformidade por Local</h2>
              <div className="relatorios-placeholder" />
            </div>
          </div>

          <div className="relatorios-panel relatorios-alert">
            <h2>
              <LucideIcon name="alert-triangle" className="relatorios-alert-icon" />
              Lista de Não-Conformidades (Ação Necessária)
            </h2>
          </div>
        </section>
      </main>
    </div>
  );
}
