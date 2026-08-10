/**
 * Checks whether a given date is older than 1 month (30 days) ago.
 * Returns true if the date is strictly older than 1 month ago.
 */
export function isOlderThanOneMonth(date?: Date | string | number | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  return d.getTime() < oneMonthAgo.getTime();
}
