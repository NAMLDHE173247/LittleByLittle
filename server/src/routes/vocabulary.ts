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

// POST /api/vocabulary/bulk - Import nhiều từ vựng cùng lúc
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    // Accept both array format and { words: [...] } format
    let words: any[] = [];
    if (Array.isArray(req.body)) {
      words = req.body;
    } else if (req.body.words && Array.isArray(req.body.words)) {
      words = req.body.words;
    } else {
      res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ. Cần truyền một mảng JSON hoặc { words: [...] }",
      });
      return;
    }

    if (words.length === 0) {
      res.status(400).json({
        success: false,
        message: "Mảng từ vựng rỗng",
      });
      return;
    }

    if (words.length > 200) {
      res.status(400).json({
        success: false,
        message: "Tối đa 200 từ vựng mỗi lần import",
      });
      return;
    }

    const errors: string[] = [];
    const validWords: any[] = [];
    const skippedDuplicates: string[] = [];

    // Check existing words in DB
    const existingWordTexts = words.map((w: any) => w.word?.trim?.()?.toLowerCase()).filter(Boolean);
    const existingDocs = await Vocabulary.find({
      word: { $regex: new RegExp(`^(${existingWordTexts.map((w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') }
    }).select('word');
    const existingSet = new Set(existingDocs.map((d: any) => d.word.toLowerCase()));

    for (let i = 0; i < words.length; i++) {
      const item = words[i];

      // Validate required fields
      if (!item.word || !item.word.trim()) {
        errors.push(`Từ #${i + 1}: Thiếu trường "word"`)
        continue;
      }
      if (!item.meanings || !Array.isArray(item.meanings) || item.meanings.length === 0) {
        // Try to convert string meanings to array
        if (typeof item.meanings === 'string' && item.meanings.trim()) {
          item.meanings = [item.meanings.trim()];
        } else {
          errors.push(`Từ #${i + 1} ("${item.word}"): Thiếu trường "meanings"`)
          continue;
        }
      }

      // Check duplicate
      const wordLower = item.word.trim().toLowerCase();
      if (existingSet.has(wordLower)) {
        skippedDuplicates.push(item.word);
        continue;
      }

      // Sanitize optional fields
      const sanitized = {
        word: item.word.trim(),
        type: ['word', 'phrase'].includes(item.type) ? item.type : 'word',
        pronunciation: item.pronunciation?.trim?.() || '',
        meanings: item.meanings.map((m: any) => String(m).trim()).filter(Boolean),
        partOfSpeech: item.partOfSpeech?.trim?.() || '',
        examples: Array.isArray(item.examples)
          ? item.examples
              .filter((ex: any) => ex && (ex.en || ex.vi))
              .map((ex: any) => ({ en: String(ex.en || '').trim(), vi: String(ex.vi || '').trim() }))
          : [],
        topic: item.topic?.trim?.() || 'general',
        level: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(item.level) ? item.level : 'A1',
        synonyms: Array.isArray(item.synonyms) ? item.synonyms.map((s: any) => String(s).trim()).filter(Boolean) : [],
        antonyms: Array.isArray(item.antonyms) ? item.antonyms.map((a: any) => String(a).trim()).filter(Boolean) : [],
        note: item.note?.trim?.() || '',
        imageUrl: item.imageUrl?.trim?.() || '',
        audioUrl: item.audioUrl?.trim?.() || '',
        deckIds: Array.isArray(item.deckIds) ? item.deckIds : [],
      };

      // Prevent duplicates within the same batch
      if (validWords.some(v => v.word.toLowerCase() === wordLower)) {
        skippedDuplicates.push(item.word);
        continue;
      }

      validWords.push(sanitized);
      existingSet.add(wordLower);
    }

    let insertedCount = 0;
    if (validWords.length > 0) {
      const result = await Vocabulary.insertMany(validWords, { ordered: false });
      insertedCount = result.length;
    }

    res.status(201).json({
      success: true,
      message: `Import thành công ${insertedCount} từ vựng`,
      data: {
        inserted: insertedCount,
        skipped: skippedDuplicates.length,
        skippedWords: skippedDuplicates,
        errors: errors,
        total: words.length,
      },
    });
  } catch (error: any) {
    if (error.name === "BulkWriteError" || error.code === 11000) {
      res.status(207).json({
        success: true,
        message: "Import hoàn tất với một số lỗi duplicate",
        data: {
          inserted: error.result?.nInserted || 0,
          errors: ["Một số từ bị trùng lặp trong cơ sở dữ liệu"],
        },
      });
      return;
    }
    res.status(500).json({ success: false, message: "Lỗi server: " + (error.message || "Unknown"), error });
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
