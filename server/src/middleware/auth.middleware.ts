import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthedRequest extends Request {
  userId?: string;
}

// Reads the "Authorization: Bearer <token>" header, verifies it, and
// attaches the user id to the request. Anything wrong with the token
// (missing, malformed, expired) results in a clean 401 rather than a
// crash - a signed-out visitor must never reach a protected route.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid session" } });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError ? "Session has expired, please log in again" : "Invalid session";
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message } });
  }
}
