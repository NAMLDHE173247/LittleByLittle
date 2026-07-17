# User-Scoped Vocabulary (Private Mode)

Bản cập nhật để đảm bảo dữ liệu Vocabulary thuộc quyền sở hữu độc lập của từng User đã hoàn thành.

## Những thay đổi chính

1. **Schema & Indexing (`Vocabulary.ts`)**
   - Đã thêm trường `userId` và `normalizedWord`. Cả 2 đều bắt buộc (`required: true`).
   - Đã tạo Unique Compound Index `{ userId: 1, normalizedWord: 1 }` để ngăn một user lưu trùng một từ, trong khi các user khác nhau vẫn có thể lưu từ giống nhau thoải mái.

2. **Tiện ích chuẩn hóa (`vocabularyUtils.ts`)**
   - Hàm `normalizeVocabularyWord` tự động đưa text về lower-case theo chuẩn locale `en-US`, chuẩn Unicode (NFKC) và xóa khoảng trắng dư thừa để chuẩn hóa deduplication.

3. **Data Migration (`migrate_vocab_owner.ts`)**
   - Đã chạy tự động kịch bản migration và gán **72 từ vựng cũ** về tài khoản `namle173247@gmail.com`.
   - Không phát sinh từ nào bị trùng lặp trong dữ liệu cũ.

4. **Owner-Isolation trong Service & API**
   - Mọi CRUD API, kể cả Bulk Import, Export hay Clear All giờ đây đều lấy `authUser.id` từ token làm filter cố định.
   - Khi xóa từ vựng (Delete One / Delete Many / Clear All), hệ thống sẽ **tự động xóa (Cascade Delete)** toàn bộ dữ liệu UserWordProgress (tiến độ học) tương ứng để làm sạch DB.
   - Hàm Bulk Import đã được viết lại, có kiểm tra xem `deckIds` mà người dùng truyền vào có thực sự thuộc sở hữu của họ hay không.

## Xác nhận
Đã chạy `npm run build` và TypeScript compiled thành công 100%, đảm bảo không vướng bất kỳ lỗi type hay thiếu liên kết module nào.
Bạn có thể khởi động lại server (`npm run dev`) để trải nghiệm Vocabulary độc lập cho từng user.
