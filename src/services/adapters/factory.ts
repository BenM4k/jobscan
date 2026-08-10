import { JobSource } from "./types";
import { GreenhouseAdapter } from "./greenhouse.adapter";
import { RemoteOKAdapter } from "./remoteok.adapter";
import { LeverAdapter } from "./lever.adapter";
import { AshbyAdapter } from "./ashby.adapter";

export function getJobSourceAdapter(sourceId: string): JobSource {
  switch (sourceId) {
    case "greenhouse":
      return new GreenhouseAdapter();
    case "remoteok":
      return new RemoteOKAdapter();
    case "lever":
      return new LeverAdapter();
    case "ashby":
      return new AshbyAdapter();
    default:
      throw new Error(`Unsupported job source adapter: ${sourceId}`);
  }
}
