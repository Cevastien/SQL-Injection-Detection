import type { ExplainabilityResponse, ModelInfo, ModelManagementResponse, PredictionResult } from "@/lib/types";

const DEPLOYED_BACKEND_URL = "https://sqli-sentinel-api.onrender.com";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function directUploadEndpoint() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return `${trimTrailingSlash(configuredUrl)}/upload/artifacts`;
  }

  if (typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) {
    return `${DEPLOYED_BACKEND_URL}/upload/artifacts`;
  }

  return "/api/upload/artifacts";
}

async function parseError(response: Response) {
  const fallback = `${response.status} ${response.statusText}`.trim() || "Request failed";

  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return typeof data.detail === "string" ? data.detail : fallback;
    }

    const text = await response.text();
    return text.trim().slice(0, 240) || fallback;
  } catch {
    return fallback;
  }
}

export async function analyzeQuery(query: string): Promise<PredictionResult> {
  const response = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function explainQuery(query: string): Promise<ExplainabilityResponse> {
  const response = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function getModelInfo(): Promise<ModelInfo> {
  const response = await fetch("/api/model-info", {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function reloadModel(): Promise<ModelManagementResponse> {
  const response = await fetch("/api/reload-model", {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function uploadModelArtifacts(formData: FormData): Promise<ModelManagementResponse> {
  const response = await fetch(directUploadEndpoint(), {
    method: "POST",
    body: formData,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
