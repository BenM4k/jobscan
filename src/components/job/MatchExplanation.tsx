import React from "react";

interface MatchExplanationProps {
  explanation?: string | null;
}

/**
 * Step 13: Displays the 1-2 sentence "Why this matched" concrete rationale in italic style.
 */
export function MatchExplanation({ explanation }: MatchExplanationProps) {
  if (!explanation) return null;

  return (
    <p className="text-sm italic text-gray-600 dark:text-zinc-300 font-normal leading-relaxed">
      {explanation}
    </p>
  );
}
