# Tài liệu Hệ thống: Train English Next

Tài liệu này mô tả chi tiết về cấu trúc cơ sở dữ liệu, các thuật toán chính (đặc biệt là thuật toán Spaced Repetition) và danh sách các công nghệ được sử dụng trong dự án.

---

## 1. Cấu trúc Cơ sở dữ liệu (Database Schema)
Hệ thống sử dụng MongoDB kết hợp Mongoose, bao gồm 4 schema/models chính:

### a) Model `User` (Người dùng)
- **email**: `String` (bắt buộc, unique, format email).
- **password**: `String` (được mã hóa bằng bcrypt).
- **name**: `String` (độ dài tối đa 50 ký tự).
- **role**: `String` - Enum `["admin", "user"]` (mặc định "user").
- **status**: `String` - Enum `["pending", "active", "rejected"]` (mặc định "pending").
- **streak**: `Number` - Chuỗi ngày học liên tiếp.
- **lastStudyDate**: `Date` - Ngày học cuối cùng.

### b) Model `Deck` (Bộ từ vựng)
- **name**: `String` (bắt buộc).
- **description**: `String`.
- **color**: `String` (mặc định `#3B82F6`).
- **userId**: `ObjectId` (Ref: `User`).
*(Mỗi User không được tạo 2 Deck có trùng `name` - sử dụng compound unique index).*

### c) Model `Vocabulary` (Từ vựng)
- **word**: `String` (bắt buộc, index).
- **type**: `String` - Enum `["word", "phrase"]`.
- **pronunciation**: `String` (Phiên âm).
- **meanings**: `Array<String>` (Các nghĩa của từ).
- **partOfSpeech**: `String` (Từ loại: Noun, Verb, Adj,...).
- **examples**: `Array<{ en: String, vi: String }>` (Các ví dụ song ngữ).
- **topic**: `String` (Chủ đề từ vựng, mặc định `general`).
- **level**: `String` - Enum `["A1", "A2", "B1", "B2", "C1", "C2"]`.
- **synonyms**, **antonyms**: `Array<String>` (Từ đồng nghĩa, trái nghĩa).
- **note**, **imageUrl**, **audioUrl**: `String`.
- **deckIds**: `Array<ObjectId>` (Ref: `Deck`).
*(Hỗ trợ text index cho các field `word`, `meanings`, `topic` để tối ưu hóa việc tìm kiếm).*

### d) Model `UserWordProgress` (Tiến trình học của User đối với từng từ vựng)
- **userId**: `ObjectId` (Ref: `User`).
- **wordId**: `ObjectId` (Ref: `Vocabulary`).
- **skills**: Object chứa thông tin tiến độ cụ thể cho 4 kỹ năng riêng biệt: `recall`, `listening`, `writing`, `pronunciation`.
  - Mỗi kỹ năng bao gồm:
    - `points`: `Number` (Điểm số kỹ năng, từ 0 - 100).
    - `nextReview`: `Date` (Thời điểm cần ôn tập lại kỹ năng này).
*(Sử dụng compound unique index cho `userId` và `wordId` để đảm bảo mỗi User chỉ có 1 progress record cho 1 từ vựng).*

---

## 2. Mô tả thuật toán và chi tiết chức năng (Algorithms & Features)

Hệ thống sử dụng các thuật toán lõi liên quan đến **Đường cong quên lãng (Forgetting Curve)** và **Spaced Repetition System (Hệ thống lặp lại ngắt quãng)** để tối ưu hoá tiến trình ghi nhớ của người học.

### a) Thuật toán trừ điểm tự động theo thời gian (Decay Algorithm)
Khi người dùng để quá hạn thời gian ôn tập (`nextReview`), điểm số (`points`) sẽ bị giảm dần theo từng ngày.
- **Tốc độ quên (Decay Rate)** phụ thuộc vào thứ hạng (Tier) hiện tại của từ vựng:
  - **Mastered** (80-100 điểm): Nhớ lâu, quên chậm -> **Trừ 2 điểm / ngày** quá hạn.
  - **Familiar** (40-79 điểm): Khá quen, nhưng dễ quên -> **Trừ 4 điểm / ngày** quá hạn.
  - **Learning** (1-39 điểm): Mới học, quên rất nhanh -> **Trừ 5 điểm / ngày** quá hạn.

### b) Thuật toán tính toán chu kỳ ôn tập (Review Intervals)
Dựa vào số điểm đạt được sau mỗi lần trả lời câu hỏi, thời gian cho đợt ôn tập tiếp theo (`nextReview`) được gán tĩnh theo các cấp độ:
- `>= 80 điểm` (Mastered): Ôn lại sau **14 ngày**.
- `>= 60 điểm` (High Familiar): Ôn lại sau **7 ngày**.
- `>= 40 điểm` (Familiar): Ôn lại sau **3 ngày**.
- `>= 20 điểm` (Learning): Ôn lại sau **1 ngày**.
- `>= 1 điểm` (Just Started): Ôn lại sau **4 giờ**.
- `0 điểm`: Yêu cầu ôn tập ngay lập tức.

### c) Thuật toán tính điểm số sau khi trả lời (Answer Points Calculation)
Việc trả lời đúng / sai trong mỗi bài tập kỹ năng sẽ ảnh hưởng trực tiếp đến điểm số:
- **Trả lời đúng**: 
  - Cơ bản được cộng **+15 điểm**.
  - **Streak Bonus**: Nếu duy trì chuỗi học liên tục (streak) >= 3 ngày, người dùng được thưởng thêm **+5 điểm** (Tổng +20 điểm).
- **Trả lời sai (Penalty)**: Phạt nặng/nhẹ tùy thuộc vào mức độ thông thạo hiện tại để đẩy nhanh từ vựng về lại chu kỳ ôn tập ngắn hơn.
  - Đang ở mức Mastered (>= 80 điểm): Phạt **-40 điểm**.
  - Đang ở mức Familiar (>= 40 điểm): Phạt **-20 điểm**.
  - Đang ở mức Learning/Mới học (< 40 điểm): Phạt **-10 điểm**.
*(Điểm số luôn được giới hạn cứng trong khoảng từ 0 đến 100).*

### d) Chức năng Chọn lọc từ ôn tập (Practice / Due Words Logic)
- **Truy xuất Due Words**: Lọc toàn bộ record `UserWordProgress` có `nextReview <= Thời gian hiện tại` (Overdue) và điểm `> 0`. Sắp xếp ưu tiên các từ bị "quá hạn" lâu nhất lên đầu danh sách ôn.
- **Lọc tự do (Practice Filter)**: Người dùng có thể lấy từ để luyện tập dựa vào `Deck`, `Tier`, hoặc theo điểm số (Ưu tiên các từ có điểm trung bình cộng - `overall` thấp nhất đưa lên luyện tập trước).

### e) Chức năng duy trì chuỗi học (Streak Tracking)
- Mỗi khi thực hiện review 1 từ vựng, hệ thống kiểm tra `lastStudyDate` của người dùng:
  - Nếu khoảng cách với lần học cuối đúng bằng 1 ngày: `streak` = `streak` + 1.
  - Nếu khoảng cách lớn hơn 1 ngày: bị mất streak, reset `streak` về lại 1.

---

## 3. Các công nghệ đang được sử dụng (Tech Stack)

Dự án này là một ứng dụng Web dạng Fullstack.

**Core & Frameworks:**
- **Next.js** (Phiên bản `16.2.9`): Framework React hiện đại hỗ trợ Server Components (App Router) và tích hợp sẵn API Routes.
- **React** & **React DOM** (Phiên bản `19.2.4`): Thư viện Front-end để xây dựng giao diện UI (User Interface).
- **TypeScript**: Giúp định dạng kiểu dữ liệu chặt chẽ cho toàn bộ ứng dụng (Strict typing).

**Database & Backend Tools:**
- **MongoDB** thông qua **Mongoose** (Phiên bản `9.7.0`): ODM (Object Data Modeling) dành cho MongoDB dùng để định nghĩa schema và tương tác cơ sở dữ liệu.
- **Bcryptjs**: Dùng để băm (hashing) và kiểm tra bảo mật mật khẩu của người dùng.
- **JsonWebToken (JWT)**: Quản lý Authentication và phân quyền.

**Front-end Styling & UI Libraries:**
- **Tailwind CSS v4** (`@tailwindcss/postcss`): Utility-first CSS framework để style ứng dụng nhanh chóng.
- **Framer Motion**: Tạo các hiệu ứng chuyển động, animations động linh hoạt.
- **Recharts**: Dùng để vẽ các biểu đồ phân tích (dành cho phần báo cáo thống kê tiến trình học).
- **SWR**: Thư viện React Hooks của Vercel dùng để fetch data từ API nhanh chóng kèm cache.
- **Canvas-Confetti**: Tạo hiệu ứng pháo giấy ăn mừng khi user đạt các mục tiêu, chuỗi ngày học.
- **Sonner**: Cung cấp Toast Notifications (hiển thị thông báo góc màn hình) gọn nhẹ, hiện đại.
- **@heroicons/react**: Bộ SVG Icons được sử dụng làm thành phần icon trong UI.
