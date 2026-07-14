export async function timeAsync<T>(
  label: string,
  fn: () => PromiseLike<T>
): Promise<T> {
  const startedAt = performance.now();
  let outcome: "success" | "error" = "success";

  try {
    return await fn();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    const normalizedLabel = label.replace(/^\[perf\]\s*/, "");
    console.info(
      `[perf] ${JSON.stringify({
        metric: "server.duration",
        label: normalizedLabel,
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
        outcome,
      })}`
    );
  }
}
