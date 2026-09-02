export type PostHogRegion = "us" | "eu";

export function getPostHogRegion(): PostHogRegion {
  const explicit = process.env.NEXT_PUBLIC_POSTHOG_REGION?.toLowerCase().trim();
  if (explicit === "eu" || explicit === "us") {
    return explicit;
  }
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (
    host &&
    (host.includes("eu.i.posthog.com") || host.includes("eu.posthog.com"))
  ) {
    return "eu";
  }
  return "us";
}

export function getPostHogConfig() {
  const region = getPostHogRegion();
  const isEu = region === "eu";
  const defaultApiHost = isEu
    ? "https://eu.i.posthog.com"
    : "https://us.i.posthog.com";
  const assetHost = isEu
    ? "https://eu-assets.i.posthog.com"
    : "https://us-assets.i.posthog.com";
  const uiHost = isEu ? "https://eu.posthog.com" : "https://us.posthog.com";

  return {
    region,
    defaultApiHost,
    assetHost,
    uiHost,
  };
}
