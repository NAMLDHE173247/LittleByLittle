import { Vocabulary } from "../db/models";
import dbConnect from "../db/connection";

export class VocabularyService {
  static async getMetadata() {
    await dbConnect();
    const totalWords = await Vocabulary.countDocuments({ type: "word" });
    const totalPhrases = await Vocabulary.countDocuments({ type: "phrase" });
    const total = totalWords + totalPhrases;
    const uniqueTopics = await Vocabulary.distinct("topic");
    const uniqueLevels = await Vocabulary.distinct("level");
    const uniquePartsOfSpeech = await Vocabulary.distinct("partOfSpeech");

    return {
      total,
      totalWords,
      totalPhrases,
      uniqueTopics: uniqueTopics.filter(Boolean),
      uniqueLevels: uniqueLevels.filter(Boolean),
      uniquePartsOfSpeech: uniquePartsOfSpeech.filter(Boolean),
    };
  }

  static async getPaginated(queryArgs: any) {
    await dbConnect();
    const {
      page = "1", limit = "10", search = "", type = "",
      level = "", topic = "", pos = "", deck = "",
      sortBy = "word", sortDir = "asc",
    } = queryArgs;

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
    if (deck) query.deckIds = deck;

    const sortOptions: any = {};
    if (sortBy) sortOptions[sortBy] = sortDir === "desc" ? -1 : 1;

    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;

    const vocabularies = await Vocabulary.find(query).sort(sortOptions).skip(skip).limit(limitNum);
    const total = await Vocabulary.countDocuments(query);

    return {
      data: vocabularies,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  static async create(data: any) {
    await dbConnect();
    const vocabulary = await Vocabulary.create(data);
    return vocabulary;
  }

  static async update(id: string, data: any) {
    await dbConnect();
    const vocabulary = await Vocabulary.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!vocabulary) throw new Error("Vocabulary not found");
    return vocabulary;
  }

  static async deleteOne(id: string) {
    await dbConnect();
    const vocabulary = await Vocabulary.findByIdAndDelete(id);
    if (!vocabulary) throw new Error("Vocabulary not found");
    return vocabulary;
  }

  static async deleteMany(ids: string[]) {
    await dbConnect();
    if (!ids || !ids.length) throw new Error("No IDs provided");
    const result = await Vocabulary.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  static async bulkImport(words: any[]) {
    await dbConnect();
    if (!words || words.length === 0) throw new Error("Mảng từ vựng rỗng");
    if (words.length > 200) throw new Error("Tối đa 200 từ vựng mỗi lần import");

    const errors: string[] = [];
    const validWords: any[] = [];
    const skippedDuplicates: string[] = [];

    const existingWordTexts = words.map((w: any) => w.word?.trim?.()?.toLowerCase()).filter(Boolean);
    const existingDocs = await Vocabulary.find({
      word: { $regex: new RegExp(`^(${existingWordTexts.map((w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') }
    }).select('word');
    const existingSet = new Set(existingDocs.map((d: any) => d.word.toLowerCase()));

    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      if (!item.word || !item.word.trim()) {
        errors.push(`Từ #${i + 1}: Thiếu trường "word"`);
        continue;
      }
      if (!item.meanings || !Array.isArray(item.meanings) || item.meanings.length === 0) {
        if (typeof item.meanings === 'string' && item.meanings.trim()) {
          item.meanings = [item.meanings.trim()];
        } else {
          errors.push(`Từ #${i + 1} ("${item.word}"): Thiếu trường "meanings"`);
          continue;
        }
      }

      const wordLower = item.word.trim().toLowerCase();
      if (existingSet.has(wordLower)) {
        skippedDuplicates.push(item.word);
        continue;
      }

      const sanitized = {
        word: item.word.trim(),
        type: ['word', 'phrase'].includes(item.type) ? item.type : 'word',
        pronunciation: item.pronunciation?.trim?.() || '',
        meanings: item.meanings.map((m: any) => String(m).trim()).filter(Boolean),
        partOfSpeech: item.partOfSpeech?.trim?.() || '',
        examples: Array.isArray(item.examples)
          ? item.examples.filter((ex: any) => ex && (ex.en || ex.vi)).map((ex: any) => ({ en: String(ex.en || '').trim(), vi: String(ex.vi || '').trim() }))
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

    return {
      inserted: insertedCount,
      skipped: skippedDuplicates.length,
      skippedWords: skippedDuplicates,
      errors: errors,
      total: words.length,
    };
  }
}
