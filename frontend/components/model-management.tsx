"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCircleCheck, IconCircleX, IconExternalLink, IconRefresh, IconUpload } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getModelInfo, reloadModel, uploadModelArtifacts } from "@/lib/api";
import { formatTimestamp } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";
import type { ModelInfo } from "@/lib/types";

const MODEL_ASSET_DRIVE_URL = "https://drive.google.com/drive/folders/1qtb3YTUzbmE7ohLjInDcx7naNUMmGyUz";

type ModelManagementProps = {
  onModelStatusChange?: () => unknown | Promise<unknown>;
};

export function ModelManagement({ onModelStatusChange }: ModelManagementProps) {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invalidZip = zipFile ? !zipFile.name.toLowerCase().endsWith(".zip") : false;
  const invalidDataset = datasetFile ? !datasetFile.name.toLowerCase().endsWith(".csv") : false;
  const hasZipUpload = Boolean(zipFile) && !invalidZip;
  const hasDatasetUpload = Boolean(datasetFile) && !invalidDataset;
  const uploadReady = hasZipUpload && hasDatasetUpload;

  const artifactRows = useMemo(
    () => [
      { label: "Uploaded model", value: modelInfo?.model_file_name, status: modelInfo?.artifact_status?.["hybrid_model.pkl"] },
      { label: "Uploaded vectorizer", value: modelInfo?.vectorizer_file_name, status: modelInfo?.artifact_status?.["tfidf_vectorizer.pkl"] },
      { label: "Uploaded RF model", value: modelInfo?.rf_model_file_name, status: modelInfo?.artifact_status?.["rf_model.pkl"] },
      { label: "Uploaded XGB model", value: modelInfo?.xgb_model_file_name, status: modelInfo?.artifact_status?.["xgb_model.pkl"] }
    ],
    [modelInfo]
  );

  async function loadModelInfo() {
    setLoadingInfo(true);
    setError("");
    try {
      setModelInfo(await getModelInfo());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load model status");
    } finally {
      setLoadingInfo(false);
    }
  }

  useEffect(() => {
    void loadModelInfo();
  }, []);

  function handleZipChange(fileList: FileList | null) {
    setMessage("");
    setError("");
    setZipFile(fileList?.[0] ?? null);
  }

  function handleDatasetChange(fileList: FileList | null) {
    setMessage("");
    setError("");
    setDatasetFile(fileList?.[0] ?? null);
  }

  async function handleUpload() {
    setMessage("");
    setError("");

    if (!zipFile) {
      setError("Select the model artifact ZIP before uploading.");
      return;
    }

    if (invalidZip) {
      setError(`Invalid ZIP file type: ${zipFile?.name}. Only .zip files are accepted.`);
      return;
    }

    if (invalidDataset) {
      setError(`Invalid dataset file type: ${datasetFile?.name}. Only .csv files are accepted.`);
      return;
    }

    if (!datasetFile) {
      setError("Select the dataset CSV before uploading. The dashboard only analyzes after both model ZIP and dataset are loaded.");
      return;
    }

    const formData = new FormData();
    formData.append("artifact_zip", zipFile);
    if (datasetFile) {
      formData.append("dataset_file", datasetFile);
    }

    setUploading(true);
    try {
      const response = await uploadModelArtifacts(formData);
      setModelInfo(response.model_info);
      setZipFile(null);
      setDatasetFile(null);
      setMessage(response.message);
      await onModelStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleReload() {
    setMessage("");
    setError("");

    setReloading(true);
    try {
      const response = await reloadModel();
      setModelInfo(response.model_info);
      setMessage(response.message);
      await onModelStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reload model");
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Current Uploaded Model Status</CardTitle>
          <Button variant="secondary" size="sm" onClick={loadModelInfo} disabled={loadingInfo}>
            <IconRefresh className={cn("mr-2", loadingInfo && "animate-spin")} size={16} stroke={1.8} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {artifactRows.map((row) => (
              <div key={row.label} className="rounded-xl border border-border bg-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{row.label}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-sm text-foreground">{row.value ?? "Unavailable"}</p>
                  <Badge tone={row.status ? "secondary" : "default"}>{row.status ? "Present" : "Missing"}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <StatusTile label="Model loaded" value={modelInfo?.model_loaded_status ?? false} />
            <StatusTile label="Vectorizer loaded" value={modelInfo?.vectorizer_loaded_status ?? false} />
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Model source</p>
            <p className="mt-2 text-sm text-foreground">
              {modelInfo?.uploaded_from_management ? "Uploaded through Model Management" : "No uploaded model active"}
            </p>
            {modelInfo?.model_source && (
              <p className="mt-1 text-xs text-muted-foreground">{modelInfo.model_source}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Dataset</p>
            <p className="mt-2 text-sm text-foreground">{modelInfo?.dataset_used ?? "Unavailable"}</p>
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Last updated</p>
            <p className="mt-2 text-sm text-foreground">
              {modelInfo?.last_updated ? formatTimestamp(modelInfo.last_updated) : "Unavailable"}
            </p>
          </div>

          <Button onClick={handleReload} disabled={reloading} className="w-full sm:w-auto">
            <IconRefresh className={cn("mr-2", reloading && "animate-spin")} size={16} stroke={1.8} />
            Clear Uploaded Model
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Required Artifacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Google Drive files</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Download <span className="font-mono text-foreground">model_artifacts.zip</span> and{" "}
                  <span className="font-mono text-foreground">Modified_SQL_Dataset.csv</span>, then upload them below.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm" className="shrink-0">
                <a href={MODEL_ASSET_DRIVE_URL} target="_blank" rel="noreferrer">
                  <IconExternalLink className="mr-2" size={16} stroke={1.8} />
                  Open Drive
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Runtime session</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {modelInfo?.runtime_upload_active ? "Uploaded model active" : "Upload required before analysis"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {modelInfo?.runtime_upload_active
                ? "The uploaded model and dataset are active for predictions until the backend is cleared or restarted."
                : "Upload the trained model ZIP and matching dataset CSV, similar to a Streamlit file-upload workflow."}
            </p>
            {modelInfo?.runtime_dataset_used && (
              <p className="mt-3 text-xs text-muted-foreground">Runtime dataset: {modelInfo.runtime_dataset_used}</p>
            )}
            {modelInfo?.runtime_loaded_at && (
              <p className="mt-1 text-xs text-muted-foreground">Runtime loaded: {formatTimestamp(modelInfo.runtime_loaded_at)}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Model artifact ZIP</p>
                <p className="mt-1 text-xs text-muted-foreground">Required ZIP containing the exported .pkl artifact set</p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground">
                Select ZIP
                <input
                  type="file"
                  accept=".zip"
                  className="sr-only"
                  onChange={(event) => handleZipChange(event.target.files)}
                />
              </label>
            </div>
            <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
              {zipFile?.name ?? "No ZIP selected"}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Dataset CSV</p>
                  <p className="mt-1 text-xs text-muted-foreground">Required dataset reference for the uploaded training run</p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground">
                  Select dataset
                  <input
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={(event) => handleDatasetChange(event.target.files)}
                  />
                </label>
              </div>
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                {datasetFile?.name ?? "No dataset selected"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {invalidZip && (
              <p className="text-sm text-warning-foreground">
                Invalid ZIP file type: {zipFile?.name}. Only .zip files are accepted.
              </p>
            )}
            {invalidDataset && (
              <p className="text-sm text-warning-foreground">
                Invalid dataset file type: {datasetFile?.name}. Only .csv files are accepted.
              </p>
            )}
            {!datasetFile && !modelInfo?.runtime_upload_active && (
              <p className="text-sm text-muted-foreground">
                Model ZIP and dataset CSV are both required before analysis is enabled.
              </p>
            )}
            {error && (
              <div className="rounded-xl border border-border bg-warning p-4 text-sm text-warning-foreground">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-border bg-success p-4 text-sm text-success-foreground">
                {message}
              </div>
            )}
          </div>

          <Button onClick={handleUpload} disabled={!uploadReady || uploading} className="w-full sm:w-auto">
            <IconUpload className="mr-2" size={16} stroke={1.8} />
            {uploading ? "Loading" : "Upload and Load Model"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-center gap-2">
        {value ? (
          <IconCircleCheck size={16} className="text-success-foreground" stroke={1.8} />
        ) : (
          <IconCircleX size={16} className="text-warning-foreground" stroke={1.8} />
        )}
        <Badge tone={value ? "secondary" : "default"}>{value ? "Loaded" : "Missing"}</Badge>
      </div>
    </div>
  );
}
