import { NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const response = await fetch(`${BACKEND_URL}/upload/artifacts`, {
      method: "POST",
      body: formData,
      cache: "no-store"
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const detail = await response.text();
    return NextResponse.json(
      { detail: detail.trim() || `Upload failed with status ${response.status}` },
      { status: response.status }
    );
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to upload model artifacts" },
      { status: 502 }
    );
  }
}
