import { Schema, model, Document, Types } from "mongoose";
import { Kit } from "../types/kit.types";


export type KitStatus = "pending" | "generating" | "ready" | "failed";


export interface KitDoc extends Document {
  owner: Types.ObjectId;
  status: KitStatus;
  failureReason?: string;
  inputJd: string;
  inputCompanyUrl: string;
  inputDays: number;
  dedupeKey: string; 
  kit: Kit | null;
  pinnedQuestionIds: string[];
  pinnedFlashcardIds: string[];
  
  practiceProgress: Record<string, { confidence: number; lastReviewedAt: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const kitSchema = new Schema<KitDoc>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "generating", "ready", "failed"], default: "pending" },
    failureReason: { type: String },
    inputJd: { type: String, required: true },
    inputCompanyUrl: { type: String, required: true },
    inputDays: { type: Number, required: true },
    dedupeKey: { type: String, required: true, index: true },
    kit: { type: Schema.Types.Mixed, default: null },
    pinnedQuestionIds: { type: [String], default: [] },
    pinnedFlashcardIds: { type: [String], default: [] },
    practiceProgress: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const KitModel = model<KitDoc>("Kit", kitSchema);
