import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Role } from "@/types";
import { getSession, roleCookieName } from "@/lib/session";

export async function GET() {
  return NextResponse.json(getSession());
}

export async function POST(req: NextRequest) {
  const { role } = (await req.json()) as { role: Role };
  cookies().set(roleCookieName(), role, { path: "/", httpOnly: false, sameSite: "lax" });
  return NextResponse.json({ ok: true, role });
}
