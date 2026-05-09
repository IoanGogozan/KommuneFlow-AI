"use client";

export function getAccessToken() {
  return localStorage.getItem("kommuneflow.accessToken");
}

export function clearSession() {
  localStorage.removeItem("kommuneflow.accessToken");
  localStorage.removeItem("kommuneflow.user");
}
