import { Vocabulary, Deck, UserWordProgress } from "../db/models";
import dbConnect from "../db/connection";
import mongoose, { SortOrder } from "mongoose";
import { normalizeVocabularyWord } from "../utils/vocabularyUtils";

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

  private static buildQuery(queryArgs: VocabularyQueryArgs, userId: string) {
    const {
      search = "",
      type = "",
      level = "",
      topic = "",
      pos = "",
      deck = "",
    } = queryArgs;

    const query: Record<string, unknown> = { userId }; // Lọc theo user
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

  private static async verifyDeckIds(deckIds: string[], userId: string): Promise<string[]> {
    if (!deckIds || deckIds.length === 0) return [];
    
    // Deduplicate and filter out invalid ObjectIds
    const uniqueDeckIds = [...new Set(deckIds.map(String))].filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (uniqueDeckIds.length === 0 && deckIds.length > 0) {
      throw new Error("ID bộ thẻ không hợp lệ");
    }

    if (uniqueDeckIds.length > 0) {
      const ownedDecksCount = await Deck.countDocuments({
        _id: { $in: uniqueDeckIds },
        userId
      });
      if (ownedDecksCount !== uniqueDeckIds.length) {
        throw new Error("Một hoặc nhiều bộ thẻ không tồn tại hoặc không thuộc quyền sở hữu của bạn");
      }
    }
    return uniqueDeckIds;
  }

  private static handleDuplicateError(error: any) {
    if (error.code === 11000) {
      throw new Error("Từ này đã tồn tại trong kho từ vựng của bạn.");
    }
    throw error;
  }

  static async getMetadata(userId: string) {
    await dbConnect();
    const [totalWords, totalPhrases, uniqueTopics, uniqueLevels, uniquePartsOfSpeech] = await Promise.all([
      Vocabulary.countDocuments({ type: "word", userId }),
      Vocabulary.countDocuments({ type: "phrase", userId }),
      Vocabulary.distinct("topic", { userId }),
      Vocabulary.distinct("level", { userId }),
      Vocabulary.distinct("partOfSpeech", { userId }),
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

  static async getPaginated(queryArgs: VocabularyQueryArgs, userId: string) {
    await dbConnect();
    const {
      page = "1", limit = "10",
      sortBy = "word", sortDir = "asc",
    } = queryArgs;

    const query = this.buildQuery(queryArgs, userId);
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

  static async getExportData(queryArgs: VocabularyQueryArgs = {}, userId: string) {
    await dbConnect();
    const query = this.buildQuery(queryArgs, userId);
    const sortOptions = this.buildSort("word", "asc");

    return Vocabulary.find(query)
      .select(this.EXPORT_FIELDS)
      .sort(sortOptions)
      .lean();
  }

  static async create(data: any, userId: string) {
    await dbConnect();
    
    const validDeckIds = await this.verifyDeckIds(data.deckIds, userId);
    
    try {
      const vocabulary = await Vocabulary.create({
        ...data,
        userId,
        normalizedWord: normalizeVocabularyWord(data.word),
        deckIds: validDeckIds
      });
      return vocabulary;
    } catch (error) {
      this.handleDuplicateError(error);
    }
  }

  static async update(id: string, data: any, userId: string) {
    await dbConnect();
    
    if (data.deckIds) {
      data.deckIds = await this.verifyDeckIds(data.deckIds, userId);
    }

    if (data.word) {
      data.normalizedWord = normalizeVocabularyWord(data.word);
    }

    try {
      const vocabulary = await Vocabulary.findOneAndUpdate(
        { _id: id, userId },
        data,
        { new: true, runValidators: true }
      );
      if (!vocabulary) throw new Error("Vocabulary not found");
      return vocabulary;
    } catch (error) {
      this.handleDuplicateError(error);
    }
  }

  static async deleteOne(id: string, userId: string) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const vocabulary = await Vocabulary.findOneAndDelete({ _id: id, userId }, { session });
      if (!vocabulary) throw new Error("Vocabulary not found");
      
      // Cascade delete progress
      await UserWordProgress.deleteMany({ wordId: vocabulary._id }, { session });
      
      await session.commitTransaction();
      return vocabulary;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async deleteMany(ids: string[], userId: string) {
    await dbConnect();
    if (!ids || !ids.length) throw new Error("No IDs provided");

    const validVocabs = await Vocabulary.find({ _id: { $in: ids }, userId }).select('_id');
    const validIds = validVocabs.map(v => v._id);

    if (validIds.length > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await UserWordProgress.deleteMany({ wordId: { $in: validIds } }, { session });
        const result = await Vocabulary.deleteMany({ _id: { $in: validIds }, userId }, { session });
        await session.commitTransaction();
        return result.deletedCount;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    }
    return 0;
  }

  static async deleteAll(userId: string) {
    await dbConnect();
    
    const allVocabs = await Vocabulary.find({ userId }).select('_id');
    const validIds = allVocabs.map(v => v._id);
    
    if (validIds.length > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await UserWordProgress.deleteMany({ wordId: { $in: validIds } }, { session });
        const result = await Vocabulary.deleteMany({ userId }, { session });
        await session.commitTransaction();
        return result.deletedCount;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    }
    return 0;
  }

  static async bulkImport(words: any[], requestDeckIds: string[] = [], userId: string) {
    await dbConnect();
    if (!words || words.length === 0) throw new Error("Mảng từ vựng rỗng");
    if (words.length > 200) throw new Error("Tối đa 200 từ vựng mỗi lần import");

    // 1. Validate Deck IDs
    if (requestDeckIds.length > 50) throw new Error("Tối đa 50 bộ thẻ mỗi lần import");
    const validDeckIds = await this.verifyDeckIds(requestDeckIds, userId);

    // 2. Prepare and Deduplicate request words (In-memory Deduplication)
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

      const normalizedWord = normalizeVocabularyWord(item.word);
      
      // Deduplicate inside request JSON
      if (seenInRequest.has(normalizedWord)) {
        duplicateInRequestCount++;
        continue;
      }

      const sanitized = {
        userId,
        normalizedWord,
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
        deckIds: validDeckIds,
      };

      validWords.push(sanitized);
      seenInRequest.add(normalizedWord);
    }

    // 3. Find existing words in DB
    const existingDocs = await Vocabulary.find({
      userId,
      normalizedWord: { $in: Array.from(seenInRequest) }
    }).select('_id normalizedWord');

    const existingMap = new Map<string, string>();
    for (const doc of existingDocs) {
      existingMap.set(doc.normalizedWord, doc._id.toString());
    }

    // 4. Split into new and existing
    const newWordsToInsert: any[] = [];
    const existingDocsIds: string[] = [];

    for (const w of validWords) {
      if (existingMap.has(w.normalizedWord)) {
        existingDocsIds.push(existingMap.get(w.normalizedWord)!);
      } else {
        newWordsToInsert.push(w);
      }
    }

    // 5. Execute DB operations
    let createdCount = 0;
    let failedCount = 0;

    if (newWordsToInsert.length > 0) {
      try {
        const result = await Vocabulary.insertMany(newWordsToInsert, { ordered: false });
        createdCount = result.length;
      } catch (err: any) {
        // If ordered: false is used, MongoDB throws a BulkWriteError containing insertedDocs
        if (err.insertedDocs) {
          createdCount = err.insertedDocs.length;
          failedCount = newWordsToInsert.length - createdCount;
        } else {
          throw err;
        }
      }
    }

    let updatedVocabularyCount = 0;
    if (existingDocsIds.length > 0 && validDeckIds.length > 0) {
      const result = await Vocabulary.updateMany(
        { _id: { $in: existingDocsIds }, userId },
        { $addToSet: { deckIds: { $each: validDeckIds } } }
      );
      updatedVocabularyCount = result.modifiedCount;
    }

    return {
      createdCount,
      failedCount,
      existingCount: existingDocsIds.length,
      duplicateInRequestCount,
      invalidCount,
      updatedVocabularyCount,
      selectedDeckCount: validDeckIds.length,
      errors: errors,
    };
  }
}
