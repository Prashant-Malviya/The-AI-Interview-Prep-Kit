import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import kitRoutes from "./routes/kit.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));


  const apiLimiter = rateLimit({ windowMs: 60_000, limit: 60 });
  app.use("/api", apiLimiter);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/kits", kitRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
