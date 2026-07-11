import { Deck, Vocabulary } from "../db/models";
import dbConnect from "../db/connection";

export class DeckService {
  static async getAll(userId: string) {
    await dbConnect();
    const decks = await Deck.find({ userId }).sort({ createdAt: -1 }).lean();
    
    const counts = await Vocabulary.aggregate([
      { $match: { userId } },
      { $unwind: "$deckIds" },
      { $group: { _id: "$deckIds", count: { $sum: 1 } } }
    ]);

    const countMap = new Map();
    counts.forEach((c: any) => {
      if (c._id) countMap.set(c._id.toString(), c.count);
    });

    return decks.map((d: any) => ({
      ...d,
      wordCount: countMap.get(d._id.toString()) || 0
    }));
  }

  static async create(userId: string, data: any) {
    await dbConnect();
    const { name, description, color } = data;
    if (!name) throw new Error("Deck name is required");

    const newDeck = await Deck.create({
      name: name.trim(),
      description: description?.trim() || "",
      color: color?.trim() || "#3B82F6",
      userId,
    });
    return newDeck;
  }

  static async update(userId: string, deckId: string, data: any) {
    await dbConnect();
    const { name, description, color } = data;
    
    const deck = await Deck.findOneAndUpdate(
      { _id: deckId, userId },
      { name: name?.trim(), description: description?.trim(), color: color?.trim() },
      { new: true }
    );
    if (!deck) throw new Error("Deck not found");
    return deck;
  }

  static async delete(userId: string, deckId: string) {
    await dbConnect();
    const deck = await Deck.findOneAndDelete({ _id: deckId, userId });
    if (!deck) throw new Error("Deck not found");
    return deck;
  }
}
