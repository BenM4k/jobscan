const SOURCE_NAME_MAP: Record<string, string> = {
  remoteok: "RemoteOK",
  greenhouse: "Greenhouse",
  reliefweb: "ReliefWeb",
  emploicd: "Emploi.cd",
  emploi_cd: "Emploi.cd",
  congojob: "CongoJob",
  unjobs: "UNJobs",
  ashby: "Ashby",
  lever: "Lever",
  manual: "Manual",
};

export function formatSourceName(source: string): string {
  if (!source) return "";
  const clean = source.toLowerCase();
  return (
    SOURCE_NAME_MAP[clean] ||
    source.charAt(0).toUpperCase() + source.slice(1)
  );
}
