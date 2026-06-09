import { Router, Request, Response } from "express";
import Vocabulary from "../models/Vocabulary";

const router = Router();

// GET /api/vocabulary/metadata - Lấy siêu dữ liệu cho bộ lọc
router.get("/metadata", async (_req: Request, res: Response) => {
  try {
    const totalWords = await Vocabulary.countDocuments({ type: "word" });
    const totalPhrases = await Vocabulary.countDocuments({ type: "phrase" });
    const total = totalWords + totalPhrases;
    const uniqueTopics = await Vocabulary.distinct("topic");
    const uniqueLevels = await Vocabulary.distinct("level");
    const uniquePartsOfSpeech = await Vocabulary.distinct("partOfSpeech");

    res.json({
      success: true,
      data: {
        total,
        totalWords,
        totalPhrases,
        uniqueTopics: uniqueTopics.filter(Boolean),
        uniqueLevels: uniqueLevels.filter(Boolean),
        uniquePartsOfSpeech: uniquePartsOfSpeech.filter(Boolean),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// GET /api/vocabulary - Lấy từ vựng có phân trang và bộ lọc
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      type = "",
      level = "",
      topic = "",
      pos = "",
      deck = "",
      sortBy = "word",
      sortDir = "asc",
    } = req.query as any;

    const query: any = {};
    if (search) {
      query.$or = [
        { word: { $regex: search, $options: "i" } },
        { meanings: { $regex: search, $options: "i" } },
      ];
    }
    if (type) query.type = type;
    if (level) query.level = level;
    if (topic) query.topic = topic;
    if (pos) query.partOfSpeech = pos;
    if (deck) query.deck = deck;

    const sortOptions: any = {};
    if (sortBy) {
      sortOptions[sortBy] = sortDir === "desc" ? -1 : 1;
    }

    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;

    const vocabularies = await Vocabulary.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await Vocabulary.countDocuments(query);

    res.json({
      success: true,
      data: vocabularies,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// POST /api/vocabulary - Thêm 1 từ mới
router.post("/", async (req: Request, res: Response) => {
  try {
    const vocabulary = new Vocabulary(req.body);
    await vocabulary.save();
    res.status(201).json({ success: true, data: vocabulary });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ success: false, message: messages.join(", ") });
      return;
    }
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// PUT /api/vocabulary/:id - Cập nhật 1 từ vựng
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const vocabulary = await Vocabulary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!vocabulary) {
      res.status(404).json({ success: false, message: "Vocabulary not found" });
      return;
    }
    res.json({ success: true, data: vocabulary });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ success: false, message: messages.join(", ") });
      return;
    }
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// DELETE /api/vocabulary/:id - Xoá 1 từ vựng
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const vocabulary = await Vocabulary.findByIdAndDelete(req.params.id);
    if (!vocabulary) {
      res.status(404).json({ success: false, message: "Vocabulary not found" });
      return;
    }
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// DELETE /api/vocabulary - Xoá nhiều từ vựng
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: "No IDs provided" });
      return;
    }
    const result = await Vocabulary.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `Deleted ${result.deletedCount} items` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

export default router;
