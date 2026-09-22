import React from "react";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CreatePersonaButton } from "./CreatePersonaButton";

export async function ResumesEmptyState() {
  const t = await getTranslations("resumes");

  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-muted/20">
      <FileText className="size-8 text-muted-foreground mx-auto" />
      <h3 className="text-sm font-semibold text-foreground">
        {t("noResumesFound")}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        {t("noResumesDescription")}
      </p>
      <div className="pt-2 flex justify-center">
        <CreatePersonaButton label={t("createFirstPersona")} />
      </div>
    </div>
  );
}
