/** Whole-years age from a birthday (ISO date or YYYY-MM-DD). Null if unknown/invalid. */
export function ageFromBirthday(birthday?: string | null): number | null {
  if (!birthday) return null;
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
