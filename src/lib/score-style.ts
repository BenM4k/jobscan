export interface ScoreBadgeStyle {
  barColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export function getScoreBadgeStyle(score: number): ScoreBadgeStyle {
  if (score < 50) {
    return {
      barColor: "bg-rose-500",
      textColor: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      borderColor: "border-rose-200 dark:border-rose-800",
    };
  }
  if (score <= 65) {
    return {
      barColor: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-200 dark:border-amber-800",
    };
  }
  return {
    barColor: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  };
}
