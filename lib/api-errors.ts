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
      `You've used your ${limit.toLocaleString()} humanized words for this month on the ${plan} plan. Upgrade for more.`
    );
    this.name = "QuotaExceededError";
    this.plan = plan;
    this.limit = limit;
  }
}

export class MaxOutputWordsExceededError extends Error {
  plan: string;
  limit: number;

  constructor(plan: string, limit: number) {
    super(
      `This plan is capped at ${limit.toLocaleString()} words per request. Shorten the text or upgrade for a higher per-request limit.`
    );
    this.name = "MaxOutputWordsExceededError";
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
  if (err instanceof MaxOutputWordsExceededError) {
    return Response.json(
      { error: err.message, plan: err.plan, limit: err.limit },
      { status: 400 }
    );
  }
  const message =
    err instanceof MissingKeyError
      ? err.message
      : err instanceof Error
        ? `Request failed: ${err.message}`
        : "Request failed with an unknown error.";
  const status = err instanceof MissingKeyError ? 503 : 500;
  return Response.json({ error: message }, { status });
}
