import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates req.body / req.query / req.params against Zod schemas before
 * the request reaches the controller. On failure, throws a ZodError which
 * the global error handler turns into a 400 with field-level details.
 *
 * Usage:
 *   router.post("/posts", validate({ body: createPostSchema }), controller.create)
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query) as unknown as typeof req.query;
    if (schemas.params) req.params = schemas.params.parse(req.params) as unknown as typeof req.params;
    next();
  };
}
