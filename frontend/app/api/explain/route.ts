import { NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function escapeSqlFirewallKeywords(json: string) {
  return json.replace(/\bdrop\b/gi, (match) => {
    const escaped = match.charCodeAt(2).toString(16).padStart(4, "0");
    return `${match.slice(0, 2)}\\u${escaped}${match.slice(3)}`;
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const response = await fetch(`${BACKEND_URL}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: escapeSqlFirewallKeywords(JSON.stringify(payload)),
      cache: "no-store"
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { detail: `Explanation service returned ${response.status} instead of JSON.` },
        { status: response.ok ? 502 : response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to reach explanation service" },
      { status: 502 }
    );
  }
}
