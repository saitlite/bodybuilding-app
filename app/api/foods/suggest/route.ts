import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const q = (url.searchParams.get("q") || "").trim();

  let rows: any[] = [];

  if (q) {
    rows = db
      .prepare(
        `SELECT food_name, COUNT(*) AS cnt, MAX(created_at) AS last_at
         FROM food_logs
         WHERE food_name LIKE ?
         GROUP BY food_name
         ORDER BY last_at DESC, cnt DESC
         LIMIT 10`
      )
      .all(`%${q}%`) as any[];
  } else {
    rows = db
      .prepare(
        `SELECT food_name, COUNT(*) AS cnt, MAX(created_at) AS last_at
         FROM food_logs
         GROUP BY food_name
         ORDER BY last_at DESC, cnt DESC
         LIMIT 10`
      )
      .all() as any[];
  }

  const suggestions = rows.map((r) => r.food_name);
  return NextResponse.json({ suggestions });
}
