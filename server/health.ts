/** Readiness probe: no session, metadata, credentials or error details are returned. */
export async function databaseHealth(query: () => Promise<unknown>, timeoutMs = 2500): Promise<200 | 503> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Health timeout')), timeoutMs);
    });
    await Promise.race([Promise.resolve().then(query), timeout]);
    return 200;
  } catch {
    return 503;
  } finally {
    clearTimeout(timer);
  }
}
