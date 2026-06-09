import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const sampleData = [
  {
    word: "accomplish",
    type: "word",
    pronunciation: "/əˈkɑːm.plɪʃ/",
    meanings: ["hoàn thành", "đạt được"],
    partOfSpeech: "verb",
    examples: [
      {
        en: "She accomplished her goal of running a marathon.",
        vi: "Cô ấy đã hoàn thành mục tiêu chạy marathon.",
      },
      {
        en: "What do you hope to accomplish today?",
        vi: "Hôm nay bạn hy vọng đạt được điều gì?",
      },
    ],
    topic: "daily life",
    level: "B1",
    synonyms: ["achieve", "complete", "fulfill"],
    antonyms: ["fail", "abandon"],
    note: "Thường dùng trong ngữ cảnh trang trọng hơn 'finish'.",
  },
  {
    word: "break the ice",
    type: "phrase",
    pronunciation: "/breɪk ðə aɪs/",
    meanings: ["phá vỡ sự ngại ngùng", "bắt đầu cuộc trò chuyện"],
    partOfSpeech: "idiom",
    examples: [
      {
        en: "He told a joke to break the ice at the meeting.",
        vi: "Anh ấy kể một câu chuyện cười để phá vỡ sự ngại ngùng trong cuộc họp.",
      },
    ],
    topic: "communication",
    level: "B2",
    synonyms: ["start a conversation", "warm up"],
    antonyms: [],
    note: "Idiom rất phổ biến trong giao tiếp hàng ngày.",
  },
  {
    word: "look forward to",
    type: "phrase",
    pronunciation: "/lʊk ˈfɔːr.wərd tuː/",
    meanings: ["mong chờ", "trông đợi"],
    partOfSpeech: "phrasal verb",
    examples: [
      {
        en: "I'm looking forward to meeting you.",
        vi: "Tôi rất mong được gặp bạn.",
      },
      {
        en: "We look forward to hearing from you soon.",
        vi: "Chúng tôi mong sớm nhận được hồi âm từ bạn.",
      },
    ],
    topic: "communication",
    level: "A2",
    synonyms: ["anticipate", "await"],
    antonyms: ["dread"],
    note: "Sau 'look forward to' luôn dùng V-ing hoặc danh từ.",
  },
  {
    word: "ubiquitous",
    type: "word",
    pronunciation: "/juːˈbɪk.wə.t̬əs/",
    meanings: ["có mặt ở khắp nơi", "phổ biến"],
    partOfSpeech: "adjective",
    examples: [
      {
        en: "Smartphones have become ubiquitous in modern life.",
        vi: "Điện thoại thông minh đã trở nên phổ biến trong cuộc sống hiện đại.",
      },
    ],
    topic: "technology",
    level: "C1",
    synonyms: ["omnipresent", "widespread", "pervasive"],
    antonyms: ["rare", "scarce"],
    note: "Từ academic, hay dùng trong IELTS Writing.",
  },
  {
    word: "get along with",
    type: "phrase",
    pronunciation: "/ɡet əˈlɔːŋ wɪð/",
    meanings: ["hoà hợp với", "có quan hệ tốt với"],
    partOfSpeech: "phrasal verb",
    examples: [
      {
        en: "Do you get along with your colleagues?",
        vi: "Bạn có hoà hợp với đồng nghiệp không?",
      },
    ],
    topic: "relationships",
    level: "A2",
    synonyms: ["get on with", "be on good terms with"],
    antonyms: ["fall out with", "clash with"],
    note: "Cụm từ rất thông dụng, thường gặp trong đề thi IELTS Speaking.",
  },
];

async function seed() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`\n🔗 Connected to: ${conn.connection.name}`);

    // Xoá dữ liệu cũ (nếu có)
    await Vocabulary.deleteMany({});
    console.log("🗑️  Cleared old vocabulary data.");

    // Thêm dữ liệu mẫu
    const result = await Vocabulary.insertMany(sampleData);
    console.log(`✅ Inserted ${result.length} vocabulary items.\n`);

    // Hiện dữ liệu vừa thêm
    for (const item of result) {
      console.log(`  📝 ${item.word} (${item.type} · ${item.level}) → ${item.meanings.join(", ")}`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Done.\n");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

seed();
