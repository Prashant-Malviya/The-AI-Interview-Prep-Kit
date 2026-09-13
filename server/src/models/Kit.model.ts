import { Schema, model, Document, Types } from "mongoose";
import { Kit } from "../types/kit.types";

// Generation status - lets the frontend show progress/failure states and
// lets us persist a kit even while it's mid-generation (so a page refresh
// doesn't lose it).
export type KitStatus = "pending" | "generating" | "ready" | "failed";

// "Pinned" state: an id (question or flashcard) the user hand-wrote or
// edited. Regeneration of a category/section must never overwrite these.
// See README section "How generated/edited/pinned state is represented".
export interface KitDoc extends Document {
  owner: Types.ObjectId;
  status: KitStatus;
  failureReason?: string;
  inputJd: string;
  inputCompanyUrl: string;
  inputDays: number;
  dedupeKey: string; // hash of jd+companyUrl+days, used to detect duplicate submissions
  kit: Kit | null;
  pinnedQuestionIds: string[];
  pinnedFlashcardIds: string[];
  // Practice-mode progress: flashcard id -> how confident the user felt
  // last time they saw it, plus when. Used to order the next session by
  // what they were least confident about (see README: Practice Mode).
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
