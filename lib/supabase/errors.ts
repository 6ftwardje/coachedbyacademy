type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export function isMissingSupabaseTableError(
  error: SupabaseLikeError | null | undefined,
  tableName: string
): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    (message.includes("could not find the table") &&
      message.includes(tableName.toLowerCase()))
  );
}
