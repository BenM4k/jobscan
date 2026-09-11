"use client";

import React, { useState } from "react";
import { MasterResumeSelect } from "@/services/db/schema";
import { ResumeCard } from "./ResumeCard";
import { CreateResumeModal } from "./CreateResumeModal";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import {
  setActiveResumeAction,
  deleteMasterResumeAction,
} from "@/actions/resume.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ResumesManagerProps {
  initialResumes: MasterResumeSelect[];
}

export function ResumesManager({ initialResumes }: ResumesManagerProps) {
  const [resumes, setResumes] = useState<MasterResumeSelect[]>(initialResumes);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const router = useRouter();

  const handleCreated = (newResume: MasterResumeSelect) => {
    setResumes((prev) => [
      newResume,
      ...prev.map((r) => ({ ...r, isActive: false })),
    ]);
    router.refresh();
  };

  const handleSetActive = async (id: string) => {
    const prev = [...resumes];
    setResumes((curr) =>
      curr.map((r) => ({
        ...r,
        isActive: r.id === id,
      }))
    );

    const res = await setActiveResumeAction(id);
    if (!res.success) {
      toast.error(res.error || "Failed to switch active persona");
      setResumes(prev);
    } else {
      toast.success("Active persona updated");
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    const target = resumes.find((r) => r.id === id);
    const prev = [...resumes];
    setResumes((curr) => curr.filter((r) => r.id !== id));

    const res = await deleteMasterResumeAction(id);
    if (!res.success) {
      toast.error(res.error || "Failed to delete persona");
      setResumes(prev);
    } else {
      toast.success(`Deleted persona "${target?.label || ""}"`);
      if (res.data?.fallbackActiveId) {
        setResumes((curr) =>
          curr.map((r) =>
            r.id === res.data?.fallbackActiveId
              ? { ...r, isActive: true }
              : r
          )
        );
      }
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-sans">
            {resumes.length === 1
              ? "1 resume persona configured"
              : `${resumes.length} resume personas configured`}
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          size="sm"
          className="gap-1.5 font-medium"
        >
          <Plus className="size-4" />
          <span>Add Persona</span>
        </Button>
      </div>

      {/* Persona Cards List */}
      {resumes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-muted/20">
          <FileText className="size-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No Resumes Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Create your first resume persona to enable AI scoring and tailored application generation.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="gap-1.5 mt-2"
          >
            <Plus className="size-4" />
            <span>Create First Persona</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              isOnlyResume={resumes.length <= 1}
              onSetActive={handleSetActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateResumeModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
