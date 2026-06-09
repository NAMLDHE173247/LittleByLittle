import { Router, Request, Response } from "express";
import Deck from "../models/Deck";
import Vocabulary from "../models/Vocabulary";

const router = Router();

// GET /api/decks - Lấy tất cả deck (kèm số lượng từ trong mỗi deck)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const decks = await Deck.find().sort({ createdAt: -1 });

    // Count vocabularies for each deck
    const decksWithCount = await Promise.all(
      decks.map(async (deck) => {
        const wordCount = await Vocabulary.countDocuments({
          deckIds: deck._id,
        });
        return {
          ...deck.toObject(),
          wordCount,
        };
      })
    );

    res.json({ success: true, count: decksWithCount.length, data: decksWithCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// GET /api/decks/:id - Lấy 1 deck theo ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      res.status(404).json({ success: false, message: "Deck not found" });
      return;
    }

    const wordCount = await Vocabulary.countDocuments({ deckIds: deck._id });

    res.json({
      success: true,
      data: { ...deck.toObject(), wordCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// POST /api/decks - Tạo deck mới
router.post("/", async (req: Request, res: Response) => {
  try {
    const deck = await Deck.create(req.body);
    res.status(201).json({ success: true, data: { ...deck.toObject(), wordCount: 0 } });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ success: false, message: messages.join(", ") });
      return;
    }
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: "Deck name already exists" });
      return;
    }
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// PUT /api/decks/:id - Cập nhật deck
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const deck = await Deck.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!deck) {
      res.status(404).json({ success: false, message: "Deck not found" });
      return;
    }

    const wordCount = await Vocabulary.countDocuments({ deckIds: deck._id });

    res.json({ success: true, data: { ...deck.toObject(), wordCount } });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ success: false, message: messages.join(", ") });
      return;
    }
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: "Deck name already exists" });
      return;
    }
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// DELETE /api/decks/:id - Xóa deck (remove deckId references from vocabulary)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deck = await Deck.findByIdAndDelete(req.params.id);
    if (!deck) {
      res.status(404).json({ success: false, message: "Deck not found" });
      return;
    }

    // Remove this deck reference from all vocabularies
    await Vocabulary.updateMany(
      { deckIds: req.params.id },
      { $pull: { deckIds: req.params.id } }
    );

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

export default router;
