"use client";

import { getApiBaseUrl } from "./api";

export async function clearSession() {
  await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
