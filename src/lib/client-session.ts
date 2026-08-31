"use client";

import { SESSION_HEADER } from "./session-header";

const STORAGE_KEY = "kt_session_token";

/**
 * WebView Android pada APK tidak menyimpan cookie sesi, jadi navigasi
 * berikutnya kehilangan identitas. Token sesi dari render pertama disimpan di
 * sessionStorage dan dikirim sebagai header pada setiap panggilan API.
 */
export function rememberSessionToken(token: string | null | undefined) {
  if (!token) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* penyimpanan diblokir; cookie tetap dicoba */
  }
}

export function sessionToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function apiFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = sessionToken();
  if (token) headers.set(SESSION_HEADER, token);
  return fetch(url, { ...init, headers, credentials: "include" });
}
