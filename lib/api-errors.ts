export class MissingKeyError extends Error {
  constructor(envVar: string) {
    super(
      `${envVar} is not set. Add it to .env.local (see .env.local.example) and restart the dev server.`
    );
    this.name = "MissingKeyError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in to use this feature.");
    this.name = "UnauthorizedError";
  }
}

export class QuotaExceededError extends Error {
  plan: string;
  limit: number;

  constructor(plan: string, limit: number) {
    super(
      `You've used your ${limit.toLocaleString()} credits for this month on the ${plan} plan. Upgrade for more.`
    );
    this.name = "QuotaExceededError";
    this.plan = plan;
    this.limit = limit;
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof QuotaExceededError) {
    return Response.json(
      { error: err.message, plan: err.plan, limit: err.limit },
      { status: 402 }
    );
  }
  if (err instanceof MissingKeyError) {
    console.error(err.message);
    return Response.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  console.error("API request failed:", err);
  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? `Request failed: ${err.message}`
      : "Request failed. Try again shortly.";
  const status = 500;
  return Response.json({ error: message }, { status });
}
