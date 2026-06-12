export async function timeAsync<T>(
  label: string,
  fn: () => PromiseLike<T>
): Promise<T> {
  const startedAt = Date.now();

  try {
    return await fn();
  } finally {
    console.info(`${label} ${Date.now() - startedAt}ms`);
  }
}
