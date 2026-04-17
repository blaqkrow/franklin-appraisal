import { cookies } from "next/headers";
import type { Role, Session } from "@/types";
import { ROLE_USER } from "./store";

const COOKIE = "franklin_role";
const DEFAULT_ROLE: Role = "admin";

export function getSession(): Session {
  const jar = cookies();
  const raw = jar.get(COOKIE)?.value as Role | undefined;
  const role = (raw ?? DEFAULT_ROLE) as Role;
  const u = ROLE_USER[role] ?? ROLE_USER.admin;
  return { role, userId: u.id, name: u.name, email: u.email };
}

export function roleCookieName(): string {
  return COOKIE;
}
