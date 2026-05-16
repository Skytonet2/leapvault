import "server-only";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "leap_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function setSessionCookie(token: string) {
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readSessionCookie(): string | null {
  const v = cookies().get(SESSION_COOKIE)?.value;
  return v && v.length > 0 ? v : null;
}
