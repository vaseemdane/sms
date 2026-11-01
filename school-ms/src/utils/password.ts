/**
 * Utility to generate teacher default initial password:
 * Extracts the teacher's first name, strips non-alphanumeric characters,
 * capitalizes first letter, and formats as <FirstName>@Teacher
 *
 * Example:
 * 'sakshi' -> 'Sakshi@Teacher'
 * 'Sakshi Kotagi' -> 'Sakshi@Teacher'
 * 'vaseem' -> 'Vaseem@Teacher'
 */
export function generateTeacherPassword(teacherName: string): string {
  if (!teacherName || !teacherName.trim()) return "Teacher@Teacher";
  const firstWord = teacherName.trim().split(/\s+/)[0];
  const cleanFirst = firstWord.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleanFirst) return "Teacher@Teacher";
  const capitalized = cleanFirst.charAt(0).toUpperCase() + cleanFirst.slice(1).toLowerCase();
  return `${capitalized}@Teacher`;
}

/**
 * Normalizes Date of Birth to strict DDMMYYYY format.
 */
export function normalizeDobDDMMYYYY(dob: string): string {
  if (!dob) return "";
  const cleaned = dob.trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 8) {
    if ((digits.startsWith("19") || digits.startsWith("20")) && parseInt(digits.slice(4, 6)) <= 12 && parseInt(digits.slice(6, 8)) <= 31) {
      return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
    }
    return digits;
  }
  return digits;
}
