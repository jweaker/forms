/**
 * Efficient slug generation utilities
 * Generates unique slugs without infinite loops
 */

/**
 * Generate a base slug from text
 */
export function generateBaseSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 200); // Leave room for suffix
}

/**
 * Generate a unique slug suffix using timestamp and random string
 * This ensures uniqueness without database queries
 */
export function generateUniqueSlugSuffix(): string {
  const timestamp = Date.now().toString(36); // Base36 timestamp (shorter)
  const random = Math.random().toString(36).substring(2, 6); // 4 random chars
  return `${timestamp}-${random}`;
}

/**
 * Generate a guaranteed unique slug
 * Falls back to timestamp-based suffix if base slug is taken
 */
export function generateUniqueSlug(baseText: string): string {
  const baseSlug = generateBaseSlug(baseText);

  // If base slug is empty, use fallback
  if (!baseSlug || baseSlug.length === 0) {
    return `form-${generateUniqueSlugSuffix()}`;
  }

  return baseSlug;
}

/**
 * Check if slug exists and generate alternative if needed
 * @param baseSlug - The base slug to check
 * @param checkExists - Async function that checks if slug exists
 * @returns A unique slug
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  // First, try the base slug
  const slugExists = await checkExists(baseSlug);

  if (!slugExists) {
    return baseSlug;
  }

  // If taken, try with incrementing numbers (only 5 attempts)
  for (let i = 1; i <= 5; i++) {
    const candidateSlug = `${baseSlug}-${i}`;
    const exists = await checkExists(candidateSlug);

    if (!exists) {
      return candidateSlug;
    }
  }

  // After 5 attempts, use timestamp-based suffix for guaranteed uniqueness
  const uniqueSuffix = generateUniqueSlugSuffix();
  return `${baseSlug}-${uniqueSuffix}`;
}
