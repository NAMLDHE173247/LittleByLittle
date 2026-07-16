import { Vocabulary, Deck } from "../db/models";
import dbConnect from "../db/connection";
import mongoose, { SortOrder } from "mongoose";

type VocabularyQueryArgs = Partial<Record<"page" | "limit" | "search" | "type" | "level" | "topic" | "pos" | "deck" | "sortBy" | "sortDir", string>>;

export class VocabularyService {
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly DEFAULT_PAGE_SIZE = 10;
  private static readonly MAX_SEARCH_LENGTH = 80;
  private static readonly LIST_FIELDS = "word type pronunciation meanings partOfSpeech examples topic level synonyms antonyms note imageUrl audioUrl deckIds createdAt updatedAt";
  private static readonly EXPORT_FIELDS = "word type pronunciation meanings partOfSpeech examples topic level synonyms antonyms note imageUrl audioUrl";
  private static readonly SORT_FIELDS = new Set(["word", "type", "level", "topic", "partOfSpeech", "createdAt", "updatedAt"]);

  private static escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static normalizePage(value: unknown) {
    const page = Number(value);
    return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  }

  private static normalizeLimit(value: unknown) {
    const limit = Number(value);
    if (!Number.isFinite(limit)) return this.DEFAULT_PAGE_SIZE;
    return Math.min(this.MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)));
  }

  private static buildQuery(queryArgs: VocabularyQueryArgs) {
    const {
      search = "",
      type = "",
      level = "",
      topic = "",
      pos = "",
      deck = "",
    } = queryArgs;

    const query: Record<string, unknown> = {};
    const normalizedSearch = String(search || "").trim().slice(0, this.MAX_SEARCH_LENGTH);

    if (normalizedSearch) {
      const escapedSearch = this.escapeRegex(normalizedSearch);
      query.$or = [
        { word: { $regex: escapedSearch, $options: "i" } },
        { meanings: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (type) query.type = type;
    if (level) query.level = level;
    if (topic) query.topic = topic;
    if (pos) query.partOfSpeech = pos;
    if (deck) query.deckIds = deck;

    return query;
  }

  private static buildSort(sortBy = "word", sortDir = "asc"): Record<string, SortOrder> {
    const field = this.SORT_FIELDS.has(sortBy) ? sortBy : "word";
    const direction: SortOrder = sortDir === "desc" ? -1 : 1;
    return { [field]: direction, _id: direction };
  }

  static async getMetadata() {
    await dbConnect();
    const [totalWords, totalPhrases, uniqueTopics, uniqueLevels, uniquePartsOfSpeech] = await Promise.all([
      Vocabulary.countDocuments({ type: "word" }),
      Vocabulary.countDocuments({ type: "phrase" }),
      Vocabulary.distinct("topic"),
      Vocabulary.distinct("level"),
      Vocabulary.distinct("partOfSpeech"),
    ]);
    const total = totalWords + totalPhrases;

    return {
      total,
      totalWords,
      totalPhrases,
      uniqueTopics: uniqueTopics.filter(Boolean),
      uniqueLevels: uniqueLevels.filter(Boolean),
      uniquePartsOfSpeech: uniquePartsOfSpeech.filter(Boolean),
    };
  }

  static async getPaginated(queryArgs: VocabularyQueryArgs) {
    await dbConnect();
    const {
      page = "1", limit = "10",
      sortBy = "word", sortDir = "asc",
    } = queryArgs;

    const query = this.buildQuery(queryArgs);
    const sortOptions = this.buildSort(sortBy, sortDir);
    const limitNum = this.normalizeLimit(limit);
    const pageNum = this.normalizePage(page);
    const skip = (pageNum - 1) * limitNum;

    const [vocabularies, total] = await Promise.all([
      Vocabulary.find(query)
        .select(this.LIST_FIELDS)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Vocabulary.countDocuments(query),
    ]);

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

  static async getExportData(queryArgs: VocabularyQueryArgs = {}) {
    await dbConnect();
    const query = this.buildQuery(queryArgs);
    const sortOptions = this.buildSort("word", "asc");

    return Vocabulary.find(query)
      .select(this.EXPORT_FIELDS)
      .sort(sortOptions)
      .lean();
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

  static async deleteAll() {
    await dbConnect();
    const result = await Vocabulary.deleteMany({});
    return result.deletedCount;
  }

  static async bulkImport(words: any[], deckIds: string[] = [], authUserId: string) {
    await dbConnect();
    if (!words || words.length === 0) throw new Error("Mảng từ vựng rỗng");
    if (words.length > 200) throw new Error("Tối đa 200 từ vựng mỗi lần import");

    // 1. Validate Deck IDs
    if (deckIds.length > 50) throw new Error("Tối đa 50 bộ thẻ mỗi lần import");
    
    // Validate ObjectId and deduplicate
    const uniqueDeckIds = [...new Set(deckIds)];
    const validDeckIds: string[] = [];
    for (const id of uniqueDeckIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID bộ thẻ không hợp lệ: ${id}`);
      }
      validDeckIds.push(id);
    }

    // Verify ownership
    if (validDeckIds.length > 0) {
      const ownedDecksCount = await Deck.countDocuments({
        _id: { $in: validDeckIds },
        userId: authUserId
      });
      if (ownedDecksCount !== validDeckIds.length) {
        throw new Error("Một hoặc nhiều bộ thẻ không tồn tại hoặc không thuộc quyền sở hữu của bạn");
      }
    }

    // 2. Prepare and Deduplicate request words
    const errors: string[] = [];
    const validWords: any[] = [];
    let duplicateInRequestCount = 0;
    let invalidCount = 0;
    const seenInRequest = new Set<string>();

    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      if (!item.word || !item.word.trim()) {
        errors.push(`Từ #${i + 1}: Thiếu trường "word"`);
        invalidCount++;
        continue;
      }
      if (!item.meanings || !Array.isArray(item.meanings) || item.meanings.length === 0) {
        if (typeof item.meanings === 'string' && item.meanings.trim()) {
          item.meanings = [item.meanings.trim()];
        } else {
          errors.push(`Từ #${i + 1} ("${item.word}"): Thiếu trường "meanings"`);
          invalidCount++;
          continue;
        }
      }

      const wordLower = item.word.trim().toLowerCase();
      
      // Deduplicate inside request JSON
      if (seenInRequest.has(wordLower)) {
        duplicateInRequestCount++;
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
        imageUrl: (() => {
          const url = item.imageUrl?.trim?.() || '';
          return url.toLowerCase() === 'invalid' ? '' : url;
        })(),
        audioUrl: item.audioUrl?.trim?.() || '',
        deckIds: validDeckIds, // Assign verified deckIds
      };

      validWords.push(sanitized);
      seenInRequest.add(wordLower);
    }

    // 3. Find existing words in DB
    const existingWordTexts = validWords.map((w: any) => w.word.toLowerCase());
    let existingMap = new Map<string, string>();
    
    if (existingWordTexts.length > 0) {
      // Create a regex to match all words case-insensitively
      const regexPattern = `^(${existingWordTexts.map((w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`;
      const existingDocs = await Vocabulary.find({
        word: { $regex: new RegExp(regexPattern, 'i') }
      }).select('_id word');

      for (const doc of existingDocs) {
        existingMap.set(doc.word.toLowerCase(), doc._id.toString());
      }
    }

    // 4. Split into new and existing
    const newWordsToInsert: any[] = [];
    const existingDocsIds: string[] = [];

    for (const w of validWords) {
      const wLower = w.word.toLowerCase();
      if (existingMap.has(wLower)) {
        existingDocsIds.push(existingMap.get(wLower)!);
      } else {
        newWordsToInsert.push(w);
      }
    }

    // 5. Execute DB operations
    let createdCount = 0;
    if (newWordsToInsert.length > 0) {
      const result = await Vocabulary.insertMany(newWordsToInsert, { ordered: false });
      createdCount = result.length;
    }

    let updatedVocabularyCount = 0;
    if (existingDocsIds.length > 0 && validDeckIds.length > 0) {
      const result = await Vocabulary.updateMany(
        { _id: { $in: existingDocsIds } },
        { $addToSet: { deckIds: { $each: validDeckIds } } }
      );
      updatedVocabularyCount = result.modifiedCount;
    }

    return {
      createdCount,
      existingCount: existingDocsIds.length,
      duplicateInRequestCount,
      invalidCount,
      updatedVocabularyCount,
      selectedDeckCount: validDeckIds.length,
      errors: errors,
    };
  }
}
