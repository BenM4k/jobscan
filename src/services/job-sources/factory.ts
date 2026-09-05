import { JobSourceAdapter } from "./types";
import { GreenhouseAdapter } from "./greenhouse.adapter";
import { RemoteOKAdapter } from "./remoteok.adapter";
import { LeverAdapter } from "./lever.adapter";
import { AshbyAdapter } from "./ashby.adapter";

export function getJobSourceAdapter(sourceId: string): JobSourceAdapter {
  switch (sourceId) {
    case "greenhouse":
      return new GreenhouseAdapter() as unknown as JobSourceAdapter;
    case "remoteok":
      return new RemoteOKAdapter() as unknown as JobSourceAdapter;
    case "lever":
      return new LeverAdapter() as unknown as JobSourceAdapter;
    case "ashby":
      return new AshbyAdapter() as unknown as JobSourceAdapter;
    default:
      throw new Error(`Unsupported job source adapter: ${sourceId}`);
  }
}
