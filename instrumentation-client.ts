import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

const isDev = process.env.NODE_ENV === "development";
const isLocalHost = (host: string) =>
  host.startsWith("http://localhost") || host.startsWith("http://127.0.0.1");

if (!posthogKey || !posthogHost) {
  if (isDev) {
    const missingVariable = !posthogKey
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else if (
  !posthogHost.startsWith("https://") &&
  !posthogHost.startsWith("/") &&
  (!isDev || !isLocalHost(posthogHost))
) {
  if (isDev) {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_HOST must use HTTPS in production, start with '/' for reverse proxy, or use HTTP on localhost in development.",
    );
  }
} else {
  const uiHost = posthogHost.includes("eu")
    ? "https://eu.posthog.com"
    : "https://us.posthog.com";

  posthog.init(posthogKey, {
    api_host: posthogHost,
    ui_host: uiHost,
    defaults: "2026-01-30",
    capture_exceptions: false,
    debug: isDev,
    capture_pageview: true,
  });
}
