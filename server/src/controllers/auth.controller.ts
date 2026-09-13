import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model";
import { env } from "../config/env";
import { registerSchema, loginSchema } from "../services/validation.service";
import { AppError, ErrorCodes } from "../utils/AppError";
import { AuthedRequest } from "../middleware/auth.middleware";

function signToken(userId: string): string {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export async function register(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, parsed.error.issues[0].message, 400);
    }
    const { email, password } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) throw new AppError(ErrorCodes.VALIDATION_FAILED, "An account with this email already exists", 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    const token = signToken(user.id);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, parsed.error.issues[0].message, 400);
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) throw new AppError(ErrorCodes.UNAUTHORIZED, "Invalid email or password", 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(ErrorCodes.UNAUTHORIZED, "Invalid email or password", 401);

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new AppError(ErrorCodes.UNAUTHORIZED, "Session no longer valid", 401);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
}
