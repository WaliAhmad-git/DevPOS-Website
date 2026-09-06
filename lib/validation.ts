import { z } from "zod";

export const purchaseSelectSchema = z.object({
  tier: z.enum(["basic", "advanced"]),
});

export const trialEndSchema = z.object({
  reason: z.enum(["shutdown_button", "tab_closed", "timeout"]).default("tab_closed"),
  demoSessionToken: z.string().uuid().optional(),
});

export const licenseIssueSchema = z.object({
  purchaseId: z.string().uuid(),
});

/**
 * Parses `req.json()` against a schema. Returns { data } on success or
 * { errorResponse } to return immediately on failure — never throws, so
 * route handlers don't need their own try/catch just for this.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; errorResponse?: undefined } | { data?: undefined; errorResponse: Response }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return {
      errorResponse: new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: "invalid_body", details: result.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { data: result.data };
}
