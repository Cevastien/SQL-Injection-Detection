import { NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/reload-model`, {
      method: "POST",
      cache: "no-store"
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to reload model artifacts" },
      { status: 502 }
    );
  }
}
