import { Request, Response, NextFunction } from "express";
import { AppError, ErrorCodes } from "../utils/AppError";

// Every controller in this app calls `next(err)` on failure instead of
// building its own error response, so all errors end up here and the
// frontend always gets the same { error: { code, message } } shape.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
  }

  console.error("[unhandled error]", err);
  return res.status(500).json({
    error: { code: ErrorCodes.UNKNOWN, message: "Something went wrong. Please try again." },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" } });
}
