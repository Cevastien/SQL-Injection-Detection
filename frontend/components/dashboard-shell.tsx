"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconBulb,
  IconChartBar,
  IconExternalLink,
  IconDatabaseCog,
  IconFileDescription,
  IconLayoutDashboard,
  IconMenu2,
  IconMoon,
  IconSun,
  IconTerminal2
} from "@tabler/icons-react";

import { DetectionLogs } from "@/components/detection-logs";
import { ExplainabilityPanel } from "@/components/explainability-panel";
import { ModelManagement } from "@/components/model-management";
import { ModelPerformance } from "@/components/model-performance";
import { Overview } from "@/components/overview";
import { QueryAnalyzer } from "@/components/query-analyzer";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { getModelInfo } from "@/lib/api";
import type { DetectionLog, ModelInfo, PredictionResult, ViewKey } from "@/lib/types";
import { uiLabels } from "@/lib/ui-labels";

const STORAGE_KEY = "sqli-detection-logs";
const THEME_STORAGE_KEY = "sqli-dashboard-theme";
const MODEL_SESSION_STORAGE_KEY = "sqli-active-model-session";
const MODEL_ASSET_DRIVE_URL = "https://drive.google.com/drive/folders/1qtb3YTUzbmE7ohLjInDcx7naNUMmGyUz";
const REQUIRED_MODEL_FILES = ["hybrid_model.pkl", "tfidf_vectorizer.pkl", "rf_model.pkl", "xgb_model.pkl"];

const navItems: Array<{ key: ViewKey; label: string; icon: typeof IconLayoutDashboard }> = [
  { key: "overview", label: "Overview", icon: IconLayoutDashboard },
  { key: "analyzer", label: "Query Analyzer", icon: IconTerminal2 },
  { key: "explainability", label: "Explainability", icon: IconBulb },
  { key: "performance", label: "Model Performance", icon: IconChartBar },
  { key: "management", label: "Model Management", icon: IconDatabaseCog },
  { key: "logs", label: uiLabels.scanHistory, icon: IconFileDescription }
];

function hasActiveUploadedModel(info: ModelInfo) {
  return Boolean(
    info.runtime_upload_active &&
      info.uploaded_from_management &&
      info.model_loaded_status &&
      info.vectorizer_loaded_status &&
      REQUIRED_MODEL_FILES.every((filename) => info.artifact_status?.[filename])
  );
}

function modelSessionIdFor(info: ModelInfo) {
  return [
    info.runtime_loaded_at ?? info.last_updated ?? "unknown-upload-time",
    info.runtime_dataset_used ?? info.dataset_used ?? "unknown-dataset",
    info.model_file_name,
    info.vectorizer_file_name,
    info.model_type ?? "unknown-model"
  ].join("|");
}

export function DashboardShell() {
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [logs, setLogs] = useState<DetectionLog[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [checkingModel, setCheckingModel] = useState(true);
  const [uploadNoticeDismissed, setUploadNoticeDismissed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" ? "light" : "dark";
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      setLogs(JSON.parse(stored) as DetectionLog[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const checkModelReadiness = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setCheckingModel(true);
    }
    try {
      const info = await getModelInfo();
      const ready = hasActiveUploadedModel(info);
      const sessionId = ready ? modelSessionIdFor(info) : "";
      const storedSessionId = window.localStorage.getItem(MODEL_SESSION_STORAGE_KEY);

      if (ready && storedSessionId !== sessionId) {
        clearLogs();
        window.localStorage.setItem(MODEL_SESSION_STORAGE_KEY, sessionId);
      }

      if (!ready && storedSessionId) {
        clearLogs();
        window.localStorage.removeItem(MODEL_SESSION_STORAGE_KEY);
      }

      setModelReady(ready);
      setUploadNoticeDismissed(ready);
      return ready;
    } catch {
      setModelReady(false);
      setUploadNoticeDismissed(false);
      return false;
    } finally {
      if (!silent) {
        setCheckingModel(false);
      }
    }
  }, [clearLogs]);

  useEffect(() => {
    void checkModelReadiness();
  }, [activeView, checkModelReadiness]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (!document.hidden) {
        void checkModelReadiness({ silent: true });
      }
    }

    const intervalId = window.setInterval(() => {
      void checkModelReadiness({ silent: true });
    }, 15000);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [checkModelReadiness]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const latestLog = logs[0];

  const activeLabel = useMemo(
    () => navItems.find((item) => item.key === activeView)?.label ?? "Overview",
    [activeView]
  );

  function addLog(query: string, result: PredictionResult) {
    const log: DetectionLog = {
      ...result,
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
      query
    };
    const nextLogs = [log, ...logs].slice(0, 100);
    setLogs(nextLogs);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLogs));
  }

  const showUploadNotice = !checkingModel && !modelReady && !uploadNoticeDismissed && activeView !== "management";

  function goToModelManagement() {
    setActiveView("management");
    setUploadNoticeDismissed(true);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {showUploadNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="model-upload-title">
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Model setup required</p>
            <h2 id="model-upload-title" className="mt-2 text-2xl font-semibold text-foreground">
              Upload the model and dataset first
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Before using the dashboard, download the files from Google Drive and upload them in Model Management.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-border bg-muted p-4">
                <p className="text-sm font-medium text-foreground">1. Model artifact ZIP</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload <span className="font-mono text-foreground">model_artifacts.zip</span> to the <span className="font-medium text-foreground">Model artifact ZIP</span> section.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted p-4">
                <p className="text-sm font-medium text-foreground">2. Dataset CSV</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload <span className="font-mono text-foreground">Modified_SQL_Dataset.csv</span> to the <span className="font-medium text-foreground">Dataset CSV</span> section.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <a href={MODEL_ASSET_DRIVE_URL} target="_blank" rel="noreferrer">
                  <IconExternalLink className="mr-2" size={16} stroke={1.8} />
                  Open Google Drive
                </a>
              </Button>
              <Button onClick={goToModelManagement} className="w-full sm:w-auto">
                Go to Model Management
              </Button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <Sidebar>
          <SidebarHeader>
            <div className="logo-motion flex w-full flex-col justify-center">
              <div>
                <div className="text-[24px] font-semibold uppercase leading-none tracking-[-0.05em] text-sidebar-accent-foreground">
                  SQLI
                </div>
                <div className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-sidebar-foreground">
                  Detector
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <p className="px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Workspace</p>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton active={activeView === item.key} onClick={() => setActiveView(item.key)}>
                      <Icon size={16} stroke={1.8} />
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            <div className="mt-auto pt-4">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 w-full justify-start rounded-md border-sidebar-border bg-sidebar-accent px-3 text-[13px] text-sidebar-accent-foreground"
                aria-label={theme === "dark" ? "Switch to white mode" : "Switch to dark mode"}
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? <IconSun size={16} className="mr-2" stroke={1.8} /> : <IconMoon size={16} className="mr-2" stroke={1.8} />}
                {theme === "dark" ? "White mode" : "Dark mode"}
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
      )}

      <SidebarInset>
        <header className="z-20 shrink-0 border-b border-border bg-background px-3 py-3 sm:px-4 md:h-[72px] md:px-8 md:py-0">
          <div className="flex h-full w-full flex-col justify-center gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Subject project</p>
                <h1 className="mt-1 truncate text-xl font-medium tracking-normal text-foreground">{activeLabel}</h1>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 md:hidden">
              <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.key}
                      variant={activeView === item.key ? "default" : "secondary"}
                      size="sm"
                      className="h-8 shrink-0 px-3 text-xs"
                      onClick={() => setActiveView(item.key)}
                    >
                      <Icon size={14} className="mr-1.5" stroke={1.8} />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="hidden min-w-0 items-center gap-3 md:flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground opacity-60 hover:bg-transparent hover:text-subtle-foreground hover:opacity-100 focus-visible:ring-1"
                aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                aria-pressed={sidebarOpen}
                onClick={() => setSidebarOpen((open) => !open)}
              >
                <IconMenu2 size={16} stroke={1.6} />
              </Button>
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 md:px-8 md:py-6">
          <div key={activeView} className="view-motion">
            {activeView === "overview" && <Overview logs={logs} modelReady={modelReady} />}
            {activeView === "analyzer" && <QueryAnalyzer onResult={addLog} />}
            {activeView === "explainability" && <ExplainabilityPanel latestLog={latestLog} />}
            {activeView === "performance" && (
              <ModelPerformance
                checkingModel={checkingModel}
                modelReady={modelReady}
                onGoToModelManagement={goToModelManagement}
              />
            )}
            {activeView === "management" && <ModelManagement onModelStatusChange={checkModelReadiness} />}
            {activeView === "logs" && <DetectionLogs logs={logs} onClear={clearLogs} />}
          </div>
        </section>
      </SidebarInset>
    </div>
  );
}
