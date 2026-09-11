import { JobSourceAdapter, SupportedJobSource } from "./types";
import { GreenhouseAdapter } from "./greenhouse.adapter";
import { RemoteOKAdapter } from "./remoteok.adapter";
import { LeverAdapter } from "./lever.adapter";
import { AshbyAdapter } from "./ashby.adapter";
import { CongoJobAdapter } from "./congojob.adapter";
import { EmploiCdAdapter } from "./emploicd.adapter";
import { FecRdcAdapter } from "./fecrdc.adapter";
import { UnJobsAdapter } from "./unjobs.adapter";

export function getJobSourceAdapter(sourceId: string): JobSourceAdapter {
  const normalizedId = sourceId.replace(/-/g, "_") as SupportedJobSource;
  switch (normalizedId) {
    case "greenhouse":
      return new GreenhouseAdapter() as unknown as JobSourceAdapter;
    case "remoteok":
      return new RemoteOKAdapter() as unknown as JobSourceAdapter;
    case "lever":
      return new LeverAdapter() as unknown as JobSourceAdapter;
    case "ashby":
      return new AshbyAdapter() as unknown as JobSourceAdapter;
    case "congojob":
      return new CongoJobAdapter() as unknown as JobSourceAdapter;
    case "emploi_cd":
      return new EmploiCdAdapter() as unknown as JobSourceAdapter;
    case "fecrdc":
      return new FecRdcAdapter() as unknown as JobSourceAdapter;
    case "unjobs":
      return new UnJobsAdapter() as unknown as JobSourceAdapter;
    default:
      throw new Error(`Unsupported job source adapter: ${sourceId}`);
  }
}

