import "server-only";
import { ZodError } from "zod";
import { HttpError } from "./session";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with consistent JSON error responses. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return Response.json(
          { error: err.issues[0]?.message ?? "Invalid input", issues: err.issues },
          { status: 400 },
        );
      }
      console.error(err);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
