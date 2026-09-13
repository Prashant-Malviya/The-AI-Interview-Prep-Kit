import { Response, NextFunction } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { KitModel, KitDoc } from "../models/Kit.model";
import { createKitSchema } from "../services/validation.service";
import { AppError, ErrorCodes } from "../utils/AppError";
import { hashString } from "../utils/idGen";
import { runKitPipeline, validateKitOrThrow } from "../services/kitPipeline.service";
import { crawlCompanySite, summariseHiringSignal } from "../services/research.service";
import { generateCompanyBrief, generateQuestionsForCategory, categoryForKind } from "../services/generation.service";
import { buildSchedule } from "../services/schedule.service";
import { findUncoveredMustHaveIds } from "../services/coverage.service";
import { Kit, Question, QuestionCategory } from "../types/kit.types";

function dedupeKeyFor(jd: string, companyUrl: string, days: number): string {
  return hashString(`${jd.trim()}::${companyUrl.trim().toLowerCase()}::${days}`);
}

//generation in background
async function processGeneration(kitId: string): Promise<void> {
  const doc = await KitModel.findById(kitId);
  if (!doc) return;

  try {
    doc.status = "generating";
    await doc.save();

    const kit = await runKitPipeline(
      { jd: doc.inputJd, companyUrl: doc.inputCompanyUrl, days: doc.inputDays },
      
      (step) => console.log(`[kit ${kitId}] ${step}`)
    );

    doc.kit = kit;
    doc.status = "ready";
    await doc.save();
  } catch (err) {
    doc.status = "failed";
    doc.failureReason = (err as Error).message;
    await doc.save();
  }
}

export async function createKit(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = createKitSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(ErrorCodes.VALIDATION_FAILED, parsed.error.issues[0].message, 400);
    const { jd, companyUrl, days } = parsed.data;

    const dedupeKey = dedupeKeyFor(jd, companyUrl, days);
    const existing = await KitModel.findOne({ owner: req.userId, dedupeKey });
    if (existing) {
      return res.status(200).json({ kit: existing, reused: true });
    }

    const doc = await KitModel.create({
      owner: req.userId,
      status: "pending",
      inputJd: jd,
      inputCompanyUrl: companyUrl,
      inputDays: days,
      dedupeKey,
    });

    processGeneration(doc.id).catch((err) => console.error("[kit generation]", err));

    res.status(202).json({ kit: doc });
  } catch (err) {
    next(err);
  }
}

// Bulk creation
export async function createKitsBulk(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Expected a non-empty array of { jd, companyUrl, days }", 400);
    }

    const results: Array<{ ok: boolean; kitId?: string; error?: string }> = [];
    for (const item of items) {
      const parsed = createKitSchema.safeParse(item);
      if (!parsed.success) {
        results.push({ ok: false, error: parsed.error.issues[0].message });
        continue;
      }
      const { jd, companyUrl, days } = parsed.data;
      const dedupeKey = dedupeKeyFor(jd, companyUrl, days);

      let doc = await KitModel.findOne({ owner: req.userId, dedupeKey });
      if (!doc) {
        doc = await KitModel.create({
          owner: req.userId,
          status: "pending",
          inputJd: jd,
          inputCompanyUrl: companyUrl,
          inputDays: days,
          dedupeKey,
        });
        processGeneration(doc.id).catch((err) => console.error("[kit generation]", err));
      }
      results.push({ ok: true, kitId: doc.id });
    }

    res.status(202).json({ results });
  } catch (err) {
    next(err);
  }
}

export async function listKits(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const kits = await KitModel.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json({ kits });
  } catch (err) {
    next(err);
  }
}

async function findOwnedKitOr404(kitId: string, userId: string): Promise<KitDoc> {
  const doc = await KitModel.findOne({ _id: kitId, owner: userId });
  if (!doc) throw new AppError(ErrorCodes.NOT_FOUND, "Kit not found", 404);
  return doc;
}

export async function getKit(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const doc = await findOwnedKitOr404(req.params.id, req.userId!);
    res.json({ kit: doc });
  } catch (err) {
    next(err);
  }
}

// Saves the user's edited draft
export async function updateKit(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const doc = await findOwnedKitOr404(req.params.id, req.userId!);
    if (doc.status !== "ready") {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Kit is not ready to edit yet", 409);
    }

    const { kit, pinnedQuestionIds, pinnedFlashcardIds } = req.body as {
      kit: Kit;
      pinnedQuestionIds?: string[];
      pinnedFlashcardIds?: string[];
    };

    validateKitOrThrow(kit); 

    doc.kit = kit;
    if (pinnedQuestionIds) doc.pinnedQuestionIds = pinnedQuestionIds;
    if (pinnedFlashcardIds) doc.pinnedFlashcardIds = pinnedFlashcardIds;
    await doc.save();

    res.json({ kit: doc });
  } catch (err) {
    next(err);
  }
}

type RegenerateSection = "company_brief" | QuestionCategory | "schedule";

// Regenerates only a section
export async function regenerateSection(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const doc = await findOwnedKitOr404(req.params.id, req.userId!);
    if (!doc.kit) throw new AppError(ErrorCodes.VALIDATION_FAILED, "Kit has no content to regenerate yet", 409);

    const section = req.body.section as RegenerateSection;
    const kit = doc.kit;

    if (section === "company_brief") {
      const crawl = await crawlCompanySite(kit.source.company_url);
      kit.company_brief = await generateCompanyBrief(kit.source.company, crawl.pagesUsed);
      kit.source.pages_used = Array.from(new Set([...kit.source.pages_used, ...crawl.pagesUsed.map((p) => p.url)]));
    } else if (section === "schedule") {
      kit.schedule = buildSchedule(kit.questions, kit.role.requirements, kit.schedule.days_available);
    } else {

      const category = section as QuestionCategory;
      const pinnedIds = new Set(doc.pinnedQuestionIds);

      const keptQuestions = kit.questions.filter((q) => q.category !== category || pinnedIds.has(q.id));
      const requirementsForCategory = kit.role.requirements.filter((r) => categoryForKind(r.kind) === category);

      const crawl = await crawlCompanySite(kit.source.company_url).catch(() => ({ hiringPages: [] as any[] }));
      const hiringSignal = await summariseHiringSignal(crawl.hiringPages as any);
      const freshQuestions: Question[] = await generateQuestionsForCategory(requirementsForCategory, category, hiringSignal.summary);

      kit.questions = [...keptQuestions, ...freshQuestions];


      const validQuestionIds = new Set(kit.questions.map((q) => q.id));
      for (const day of kit.schedule.days) {
        day.question_ids = day.question_ids.filter((id) => validQuestionIds.has(id));
      }
    }

    kit.coverage.uncovered_requirement_ids = findUncoveredMustHaveIds(kit.role.requirements, kit.questions);

    validateKitOrThrow(kit);
    doc.kit = kit;
    await doc.save();

    res.json({ kit: doc });
  } catch (err) {
    next(err);
  }
}


export async function recordPractice(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const doc = await findOwnedKitOr404(req.params.id, req.userId!);
    const { flashcardId, confidence } = req.body as { flashcardId: string; confidence: number };

    if (typeof confidence !== "number" || confidence < 1 || confidence > 5) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "confidence must be a number from 1 to 5", 400);
    }

    doc.practiceProgress = {
      ...doc.practiceProgress,
      [flashcardId]: { confidence, lastReviewedAt: new Date().toISOString() },
    };
    await doc.save();

    res.json({ practiceProgress: doc.practiceProgress });
  } catch (err) {
    next(err);
  }
}
