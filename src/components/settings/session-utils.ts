export interface SessionData {
  id: string;
  token: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
}

export function parseUserAgent(ua?: string | null) {
  if (!ua) return { device: "Unknown Device", browser: "Web Browser", isMobile: false };
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let device = "Desktop PC";
  if (/iPhone|iPad|iPod/i.test(ua)) device = "Apple Device";
  else if (/Android/i.test(ua)) device = "Android Device";
  else if (/Macintosh|Mac OS X/i.test(ua)) device = "macOS";
  else if (/Windows/i.test(ua)) device = "Windows";
  else if (/Linux/i.test(ua)) device = "Linux";

  let browser = "Browser";
  if (/Edg/i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";

  return { device, browser, isMobile };
}
