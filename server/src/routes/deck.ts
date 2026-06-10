import { Router, Response } from "express";
import mongoose from "mongoose";
import Deck from "../models/Deck";
import Vocabulary from "../models/Vocabulary";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// All deck routes require authentication
router.use(authenticate as any);

// GET /api/decks - Lấy tất cả deck (kèm số lượng từ trong mỗi deck)
// User thấy: deck chung (admin tạo) + deck riêng của mình
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Lấy deck của user hiện tại + deck của admin (deck chung)
    const User = mongoose.model("User");
    const admins = await User.find({ role: "admin" }).select("_id");
    const adminIds = admins.map((a: any) => a._id);

    const filter: any = {
      $or: [
        { userId: new mongoose.Types.ObjectId(userId) }, // Deck của chính user
        { userId: { $in: adminIds } }, // Deck chung (admin tạo)
      ],
    };

    const decks = await Deck.find(filter).sort({ createdAt: -1 });

    // Count vocabularies for each deck
    const decksWithCount = await Promise.all(
      decks.map(async (deck) => {
        const wordCount = await Vocabulary.countDocuments({
          deckIds: deck._id,
        });
        return {
          ...deck.toObject(),
          wordCount,
          isOwner: deck.userId.toString() === userId,
        };
      })
    );

    res.json({ success: true, count: decksWithCount.length, data: decksWithCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// GET /api/decks/:id - Lấy 1 deck theo ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      res.status(404).json({ success: false, message: "Deck not found" });
      return;
    }

    const wordCount = await Vocabulary.countDocuments({ deckIds: deck._id });

    res.json({
      success: true,
      data: {
        ...deck.toObject(),
        wordCount,
        isOwner: deck.userId.toString() === req.user!.id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// POST /api/decks - Tạo deck mới
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const deck = await Deck.create({
      ...req.body,
      userId: req.user!.id,
    });
    res.status(201).json({ success: true, data: { ...deck.toObject(), wordCount: 0, isOwner: true } });
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

// PUT /api/decks/:id - Cập nhật deck (chỉ chủ deck hoặc admin)
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      res.status(404).json({ success: false, message: "Deck not found" });
      return;
    }

    // Check ownership or admin
    if (deck.userId.toString() !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa deck này",
      });
      return;
    }

    const updated = await Deck.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    const wordCount = await Vocabulary.countDocuments({ deckIds: updated!._id });

    res.json({
      success: true,
      data: {
        ...updated!.toObject(),
        wordCount,
        isOwner: updated!.userId.toString() === req.user!.id,
      },
    });
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

// DELETE /api/decks/:id - Xóa deck (chỉ chủ deck hoặc admin)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      res.status(404).json({ success: false, message: "Deck not found" });
      return;
    }

    // Check ownership or admin
    if (deck.userId.toString() !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa deck này",
      });
      return;
    }

    await Deck.findByIdAndDelete(req.params.id);

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
