"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { addManualJobAction } from "@/actions/job.actions";
import { AddJobHeader } from "@/components/AddJobHeader";
import {
  AddJobFormFields,
  type AddJobFormValues,
} from "@/components/add-job/AddJobFormFields";
import { QuickImportPanel } from "@/components/add-job/QuickImportPanel";
import type { ExtractedJobResult } from "@/services/job-import/schema";
import posthog from "posthog-js";

const INITIAL_VALUES: AddJobFormValues = {
  title: "",
  company: "",
  location: "",
  workplaceType: "",
  url: "",
  salary: "",
  language: "en",
  description: "",
};

function normalizeImportedUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Orchestrates Quick Import pre-fill and manual job submission on `/dashboard/add-job`. */
export function AddJobForm() {
  const router = useRouter();
  const t = useTranslations("addJob");

  const [values, setValues] = useState<AddJobFormValues>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editedSinceImportStartRef = useRef<Set<keyof AddJobFormValues>>(new Set());

  const handleFieldChange = <K extends keyof AddJobFormValues>(
    field: K,
    value: AddJobFormValues[K]
  ) => {
    editedSinceImportStartRef.current.add(field);
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleImportStart = () => {
    editedSinceImportStartRef.current = new Set();
  };

  const handleImported = ({ fields, method, creditsUsed }: ExtractedJobResult) => {
    const edited = editedSinceImportStartRef.current;
    const normalizedUrl = fields.url ? normalizeImportedUrl(fields.url) : "";

    setValues((prev) => ({
      title: !edited.has("title") && fields.title ? fields.title : prev.title,
      company:
        !edited.has("company") && fields.company ? fields.company : prev.company,
      location:
        !edited.has("location") && fields.location
          ? fields.location
          : prev.location,
      workplaceType:
        !edited.has("workplaceType") && fields.workplaceType
          ? fields.workplaceType
          : prev.workplaceType,
      url: !edited.has("url") && normalizedUrl ? normalizedUrl : prev.url,
      salary:
        !edited.has("salary") && fields.rawSalaryText
          ? fields.rawSalaryText
          : prev.salary,
      language:
        !edited.has("language") && fields.language
          ? fields.language
          : prev.language,
      description:
        !edited.has("description") && fields.description
          ? fields.description
          : prev.description,
    }));
    posthog.capture("job_imported", { method, creditsUsed });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("company", values.company);
    formData.append("location", values.location);
    formData.append("workplaceType", values.workplaceType);
    formData.append("url", values.url);
    formData.append("salary", values.salary);
    formData.append("language", values.language);
    formData.append("description", values.description);

    try {
      const res = await addManualJobAction(formData);
      if (!res.success) {
        toast.error(res.error || t("createdError"));
        return;
      }

      posthog.capture("job_created", { source: "manual" });
      toast.success(t("createdSuccess"));
      router.push("/dashboard?source=manual");
      router.refresh();
    } catch {
      toast.error(t("createdError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full font-sans">
      <AddJobHeader />
      <QuickImportPanel
        onImportStart={handleImportStart}
        onImported={handleImported}
      />
      <AddJobFormFields
        values={values}
        isSubmitting={isSubmitting}
        onChange={handleFieldChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
