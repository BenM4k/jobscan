"use client";

import React, { useState } from "react";
import { ResumesViewSwitcher } from "./ResumesViewSwitcher";

interface ResumesViewContainerProps {
  countSingleText: string;
  countMultipleText: string;
  resumesCount: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function ResumesViewContainer({
  countSingleText,
  countMultipleText,
  resumesCount,
  actions,
  children,
}: ResumesViewContainerProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-sans">
            {resumesCount === 1 ? countSingleText : countMultipleText}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ResumesViewSwitcher viewMode={viewMode} onChange={setViewMode} />
          {actions}
        </div>
      </div>

      {/* Children rendered dynamically based on viewMode */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "space-y-3"
        }
      >
        {children}
      </div>
    </div>
  );
}
