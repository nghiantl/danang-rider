# Đà Nẵng Rider — Sprint 1 (Web 3D)

Prototype: nhân vật nam/nữ, xe xăng/điện, khu phố 3D procedural, điều khiển bàn phím/cảm ứng, camera theo xe, nhiệm vụ lấy/giao hàng, ví tiền mô phỏng, đồng hồ nhiên liệu, điện thoại đơn giản.

> **Quan trọng:** Đây là khu phố mẫu **chưa phải bản đồ Đà Nẵng thật**. Các tòa nhà, đường và điểm nhận/giao hàng đều là mô phỏng. Backend hiện chỉ có health/config; chưa có đăng nhập, lưu tiến trình, kiểm tra giao dịch hoặc kết nối frontend-backend. Nhiên liệu hiển thị nhưng chưa khóa động cơ khi hết. Không dùng như bản production.

## Yêu cầu
- Node.js >= 20
- npm >= 10
- Trình duyệt hỗ trợ WebGL2

## Chạy local
```bash
npm install
npm run dev
```
Mở http://localhost:5173

Chạy API trong terminal thứ hai:
```bash
npm run dev:api
```
Kiểm tra http://localhost:3001/health

## Build
```bash
npm run build
npm test
```
File web build tại `apps/web/dist`.

## Deploy Vercel
- Import repository GitHub vào Vercel
- Root Directory: `apps/web`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Deploy. API Node.js cần host riêng; frontend demo chưa gọi API.

## Điều khiển
- W/↑: ga; S/↓: phanh; A/←: rẽ trái; D/→: rẽ phải
- Tab: mở/đóng điện thoại
- Mobile: nút cảm ứng hai góc dưới
- Đến gần cột sáng vàng để nhận hàng, cột xanh để giao hàng

## Phạm vi Sprint 2
- Nhập dữ liệu OpenStreetMap thực (khu vực nhỏ được chọn), chiếu WGS84 sang tọa độ local, road mesh, routing, điểm giao hàng bám đường.
- Xây collision thực tế và road following, điều khiển xe chính xác hơn.
- Backend NestJS + Postgres/Supabase, tài khoản, xác thực, kiểm soát giao dịch, chống gian lận.
- Trạm xăng/sạc, xử lý hết nhiên liệu, garage, lưu tiến trình.

## Ghi chú
Không dùng Google Maps tiles để sao chép dựng game. Khi nhập OSM, phải tuân thủ giấy phép ODbL và ghi công OpenStreetMap.
