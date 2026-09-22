"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { CreateResumeModal } from "./CreateResumeModal";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface CreatePersonaButtonProps {
  label?: string;
  className?: string;
}

export function CreatePersonaButton({
  label,
  className,
}: CreatePersonaButtonProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("resumes");

  const buttonText = label || t("addPersona");

  return (
    <>
      <button
        type="button"
        onClick={() => setCreateModalOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
        }
      >
        <Plus className="size-3.5" />
        <span>{buttonText}</span>
      </button>

      <CreateResumeModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={() => {
          router.refresh();
        }}
      />
    </>
  );
}
