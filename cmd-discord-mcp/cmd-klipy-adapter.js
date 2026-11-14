/**
 * KLIPY adapter for CMD Sphere.
 * NOT connected to production routes until KLIPY approves server-side integration.
 * Never cache or proxy media. Preserve returned media URLs unchanged.
 * See https://docs.klipy.com/ for integration requirements.
 */
const API_ORIGIN = "https://api.klipy.com";
export function klipyConfigured() {
  return Boolean(String(process.env.KLIPY_API_KEY || "").trim());
}
export async function searchKlipyGifs({ query, customerId, locale = "fr", page = 1 } = {}) {
  if (process.env.KLIPY_SERVER_APPROVED !== "true") {
    throw new Error("KLIPY server-side integration requires prior provider approval.");
  }
  const key = String(process.env.KLIPY_API_KEY || "").trim();
  if (!key) throw new Error("KLIPY_API_KEY is not configured");
  const q = String(query || "").trim().slice(0, 100);
  if (!q) return { data: [], source: "KLIPY" };
  const params = new URLSearchParams({
    q,
    page: String(Math.max(1, Math.floor(Number(page) || 1))),
    per_page: "24",
    customer_id: String(customerId || "anonymous").slice(0, 100),
    locale: String(locale || "fr").slice(0, 2).toLowerCase(),
    content_filter: "high",
    format_filter: "gif"
  });
  const endpoint = API_ORIGIN + "/api/v1/" + encodeURIComponent(key) + "/gifs/search?" + params;
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("KLIPY request failed: HTTP " + response.status);
  const payload = await response.json();
  return { ...payload, source: "KLIPY" };
}
