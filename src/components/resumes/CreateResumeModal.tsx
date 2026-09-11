"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createMasterResumeAction } from "@/actions/resume.actions";
import { MasterResumeSelect } from "@/services/db/schema";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";

interface CreateResumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newResume: MasterResumeSelect) => void;
}

export function CreateResumeModal({
  open,
  onOpenChange,
  onCreated,
}: CreateResumeModalProps) {
  const [label, setLabel] = useState("");
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Resume content cannot be empty");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createMasterResumeAction({
        label: label.trim() || "Untitled Persona",
        content: content.trim(),
        language,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to create resume persona");
        return;
      }

      toast.success(`Persona "${res.data.label}" created and set as active`);
      onCreated(res.data);
      onOpenChange(false);
      setLabel("");
      setContent("");
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <DialogTitle className="text-base font-semibold text-foreground">
              Add Resume Persona
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-normal leading-relaxed">
            Create a specialized persona (e.g. Frontend Specialist, Tech Lead, bilingual).
            New personas are automatically set as active.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="persona-label"
              className="text-xs font-medium text-foreground block"
            >
              Persona Label
            </label>
            <input
              id="persona-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Senior Fullstack Engineer"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="persona-language"
              className="text-xs font-medium text-foreground block"
            >
              Primary Language
            </label>
            <select
              id="persona-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "fr")}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="en">English (en)</option>
              <option value="fr">French (fr)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="persona-content"
              className="text-xs font-medium text-foreground block"
            >
              Resume Text Content
            </label>
            <textarea
              id="persona-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Paste your plain text resume or markdown here..."
              required
              className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono resize-y"
            />
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !content.trim()}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>{isSubmitting ? "Creating..." : "Create Persona"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
