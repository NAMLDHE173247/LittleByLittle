import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import Vocabulary from "../models/Vocabulary";

dotenv.config();
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const seedData = [
  {
    word: "resilient",
    type: "word",
    pronunciation: "/rɪˈzɪl.i.ənt/",
    meanings: ["kiên cường", "có sức chống chịu", "đàn hồi"],
    partOfSpeech: "adjective",
    examples: [
      { en: "She's a resilient woman who always bounces back from setbacks.", vi: "Cô ấy là người phụ nữ kiên cường luôn gượng dậy sau thất bại." },
      { en: "Children are often more resilient than adults think.", vi: "Trẻ em thường kiên cường hơn người lớn nghĩ." },
    ],
    topic: "personality",
    level: "B2",
    synonyms: ["tough", "strong", "hardy"],
    antonyms: ["fragile", "weak"],
    note: "Thường dùng khi nói về khả năng hồi phục sau khó khăn.",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600",
  },
  {
    word: "break the ice",
    type: "phrase",
    pronunciation: "/breɪk ðə aɪs/",
    meanings: ["phá vỡ sự ngại ngùng", "mở đầu câu chuyện"],
    partOfSpeech: "idiom",
    examples: [
      { en: "He told a joke to break the ice at the meeting.", vi: "Anh ấy kể chuyện cười để phá vỡ không khí ngại ngùng trong cuộc họp." },
      { en: "Playing games is a great way to break the ice.", vi: "Chơi trò chơi là cách tuyệt vời để phá vỡ sự e ngại." },
    ],
    topic: "communication",
    level: "B1",
    synonyms: ["start a conversation", "warm up"],
    antonyms: [],
    note: "Idiom rất phổ biến trong giao tiếp hàng ngày.",
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600",
  },
  {
    word: "procrastinate",
    type: "word",
    pronunciation: "/prəˈkræs.tɪ.neɪt/",
    meanings: ["trì hoãn", "chần chừ"],
    partOfSpeech: "verb",
    examples: [
      { en: "Stop procrastinating and start studying!", vi: "Đừng trì hoãn nữa và bắt đầu học đi!" },
      { en: "I tend to procrastinate when I have a big project.", vi: "Tôi thường trì hoãn khi có dự án lớn." },
    ],
    topic: "daily life",
    level: "B2",
    synonyms: ["delay", "postpone", "put off"],
    antonyms: ["expedite", "hurry"],
    note: "Noun form: procrastination. Rất hay dùng trong IELTS Writing.",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600",
  },
  {
    word: "get along with",
    type: "phrase",
    pronunciation: "/ɡet əˈlɒŋ wɪð/",
    meanings: ["hòa hợp với", "có mối quan hệ tốt với"],
    partOfSpeech: "phrasal verb",
    examples: [
      { en: "I get along well with my colleagues.", vi: "Tôi hòa hợp tốt với đồng nghiệp." },
      { en: "Do you get along with your neighbors?", vi: "Bạn có hòa hợp với hàng xóm không?" },
    ],
    topic: "relationships",
    level: "A2",
    synonyms: ["get on with", "be on good terms with"],
    antonyms: ["fall out with"],
    note: "Phrasal verb cơ bản nhưng rất quan trọng.",
    imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600",
  },
  {
    word: "ambitious",
    type: "word",
    pronunciation: "/æmˈbɪʃ.əs/",
    meanings: ["tham vọng", "có hoài bão"],
    partOfSpeech: "adjective",
    examples: [
      { en: "She is an ambitious young woman who wants to become a CEO.", vi: "Cô ấy là người phụ nữ trẻ đầy tham vọng muốn trở thành CEO." },
      { en: "The company has ambitious plans for expansion.", vi: "Công ty có kế hoạch mở rộng đầy tham vọng." },
    ],
    topic: "career",
    level: "B1",
    synonyms: ["aspiring", "driven", "determined"],
    antonyms: ["lazy", "unambitious"],
    note: "Có thể mang nghĩa tích cực hoặc tiêu cực tùy ngữ cảnh.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
  },
  {
    word: "sustainable",
    type: "word",
    pronunciation: "/səˈsteɪ.nə.bəl/",
    meanings: ["bền vững", "có thể duy trì được"],
    partOfSpeech: "adjective",
    examples: [
      { en: "We need to find sustainable sources of energy.", vi: "Chúng ta cần tìm các nguồn năng lượng bền vững." },
      { en: "Sustainable development is crucial for our future.", vi: "Phát triển bền vững rất quan trọng cho tương lai." },
    ],
    topic: "environment",
    level: "B2",
    synonyms: ["eco-friendly", "green", "viable"],
    antonyms: ["unsustainable", "wasteful"],
    note: "Từ vựng hot trong IELTS. Noun: sustainability.",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600",
  },
  {
    word: "take for granted",
    type: "phrase",
    pronunciation: "/teɪk fɔːr ˈɡræn.tɪd/",
    meanings: ["xem là hiển nhiên", "không trân trọng"],
    partOfSpeech: "idiom",
    examples: [
      { en: "Don't take your health for granted.", vi: "Đừng xem sức khỏe của bạn là hiển nhiên." },
      { en: "We often take clean water for granted.", vi: "Chúng ta thường xem nước sạch là hiển nhiên." },
    ],
    topic: "daily life",
    level: "B2",
    synonyms: ["undervalue", "overlook"],
    antonyms: ["appreciate", "cherish"],
    note: "Cấu trúc: take something/someone for granted.",
    imageUrl: "",
  },
  {
    word: "versatile",
    type: "word",
    pronunciation: "/ˈvɜː.sə.taɪl/",
    meanings: ["đa năng", "linh hoạt", "nhiều tài"],
    partOfSpeech: "adjective",
    examples: [
      { en: "She's a versatile actress who can play any role.", vi: "Cô ấy là diễn viên đa năng có thể đóng bất kỳ vai nào." },
      { en: "This is a versatile kitchen tool.", vi: "Đây là dụng cụ nhà bếp đa năng." },
    ],
    topic: "general",
    level: "C1",
    synonyms: ["adaptable", "flexible", "all-round"],
    antonyms: ["limited", "inflexible"],
    note: "Dùng cho cả người và vật. Noun: versatility.",
    imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600",
  },
  {
    word: "come up with",
    type: "phrase",
    pronunciation: "/kʌm ʌp wɪð/",
    meanings: ["nghĩ ra", "đưa ra (ý tưởng)"],
    partOfSpeech: "phrasal verb",
    examples: [
      { en: "Can you come up with a better solution?", vi: "Bạn có thể nghĩ ra giải pháp tốt hơn không?" },
      { en: "She came up with a brilliant idea.", vi: "Cô ấy đã nghĩ ra một ý tưởng tuyệt vời." },
    ],
    topic: "work",
    level: "B1",
    synonyms: ["think of", "devise", "create"],
    antonyms: [],
    note: "Phrasal verb rất phổ biến trong cả văn nói và văn viết.",
    imageUrl: "https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=600",
  },
  {
    word: "inevitable",
    type: "word",
    pronunciation: "/ɪˈnev.ɪ.tə.bəl/",
    meanings: ["không thể tránh khỏi", "tất yếu"],
    partOfSpeech: "adjective",
    examples: [
      { en: "Change is inevitable in any organization.", vi: "Thay đổi là điều không thể tránh khỏi ở bất kỳ tổ chức nào." },
      { en: "It was inevitable that the truth would come out.", vi: "Việc sự thật bị phơi bày là điều tất yếu." },
    ],
    topic: "general",
    level: "C1",
    synonyms: ["unavoidable", "inescapable", "certain"],
    antonyms: ["avoidable", "preventable"],
    note: "Adverb: inevitably. Noun: inevitability.",
    imageUrl: "",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    const result = await Vocabulary.insertMany(seedData);
    console.log(`🌱 Seeded ${result.length} vocabulary items:`);
    result.forEach((v) => console.log(`   - ${v.word} (${v.level})`));

    await mongoose.disconnect();
    console.log("✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
