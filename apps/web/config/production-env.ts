export function validateWebProductionEnvironment(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.NODE_ENV !== "production") {
    return;
  }

  if (!hasValue(env.NEXT_PUBLIC_API_BASE_URL)) {
    throw new Error(
      "Invalid production web configuration: NEXT_PUBLIC_API_BASE_URL is required.",
    );
  }
}

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
