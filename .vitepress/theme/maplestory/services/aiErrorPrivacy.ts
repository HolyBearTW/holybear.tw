/** Remove the current credentials before provider errors reach the UI or console. */
export const redactAiSecrets = (
  message: string,
  secrets: readonly (string | null | undefined)[],
): string => {
  const variants = new Set<string>();
  for (const secret of secrets) {
    if (!secret) continue;
    variants.add(secret);
    try {
      variants.add(encodeURIComponent(secret));
    } catch {
      // A malformed pasted credential must not interrupt error handling.
    }
    variants.add(JSON.stringify(secret).slice(1, -1));
  }

  return [...variants]
    .sort((left, right) => right.length - left.length)
    .reduce((text, secret) => text.split(secret).join('[REDACTED]'), message);
};
