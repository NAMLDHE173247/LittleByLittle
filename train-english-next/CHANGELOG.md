# Nhật ký Tối ưu hóa - 17/06/2026

## 🛠 Giai đoạn 1: Refactor Progress API
- [x] **Hoạt động:** Thay thế `MockResponse` và tách `[[...path]]/route.ts` thành các endpoint độc lập.
- [x] **File thay đổi:** 
  - `src/lib/services/progress.service.ts`
  - `src/app/api/progress/...`
- [x] **Kết quả:** Các API đã dùng chuẩn `NextResponse`. Postman test trả về JSON chính xác. Không còn cảnh báo tương thích Express.

## ⚡ Giai đoạn 2: Tích hợp SWR & Tối ưu Client State
- [x] **Hoạt động:** Sửa lại các điểm gọi API ở Client khớp với URL mới. Cài đặt `swr` và áp dụng cho trang Dashboard/Thống kê.
- [x] **File thay đổi:** 
  - `src/hooks/useProgress.ts` (Tạo mới)
  - `src/app/(dashboard)/statistics/page.tsx` (Hoặc component tương ứng)
- [x] **Kết quả:** Xóa bỏ hoàn toàn `useEffect` để fetch data ở Dashboard. UI có trạng thái `isLoading` mượt mà, tự động cập nhật dữ liệu khi chuyển tab mà không cần F5.

## 🚀 Giai đoạn 3 (Tuỳ chọn): Optimistic Update cho Flashcard
- [x] **Hoạt động:** Thêm `mutate` vào logic trả lời Flashcard và Quiz.
- [x] **File thay đổi:** 
  - `src/app/(dashboard)/flashcards/page.tsx`
  - `src/app/(dashboard)/quiz/page.tsx`
- [x] **Kết quả:** User bấm trả lời, điểm nhảy lập tức, trải nghiệm mượt 100% không độ trễ.
