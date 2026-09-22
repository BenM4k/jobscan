export function formatDateToInput(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDateInput(str: string): Date | undefined {
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export interface DateFilterBounds {
  endOfToday: Date;
  minAllowedDate: Date;
  currentYear: number;
}

export function getDateFilterBounds(): DateFilterBounds {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Jan 1 of current year
  const startOfCurrentYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);

  // End of today: future dates disabled
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  // Exactly 3 months ago from today
  const threeMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 3,
    now.getDate(),
    0,
    0,
    0,
    0
  );

  // Blocked to current year AND maximum 3 months back
  const minAllowedDate =
    threeMonthsAgo > startOfCurrentYear ? threeMonthsAgo : startOfCurrentYear;

  return { endOfToday, minAllowedDate, currentYear };
}
