import dotenv from "dotenv";
dotenv.config();


export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",

  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/interview-prep-kit",

  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",

  browserbaseApiKey: process.env.BROWSERBASE_API_KEY || "",
  browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID || "",
};

export const isProduction = env.nodeEnv === "production";
