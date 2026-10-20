# Bạn & Tôi

Trang web quán cà phê: trang chủ (`prompt2`), đặt bàn và quản lý (`prompt3`). Chạy trên GitHub Pages, dữ liệu lưu ở Supabase.

## Chạy kiểm thử tự động

Cần Node 18 trở lên (dự án dùng Node 20, xem `.nvmrc`).

```bash
nvm use            # chuyển sang Node 20 (nếu dùng nvm)
npm install        # cài các gói cần thiết (chỉ làm lần đầu)
npm install --prefix app   # cài các gói của bản React trong app/ (chỉ làm lần đầu)
npx playwright install chromium   # tải trình duyệt dùng để test (chỉ làm lần đầu)
npm test           # build bản React rồi chạy toàn bộ bài test
```

Các bài test nằm trong thư mục `tests/`. Chúng mở trang trong trình duyệt thật nhưng **giả lập** Supabase,
Turnstile và Formspree, nên không đụng vào dữ liệu thật và không cần mạng.

## Cấu hình Supabase

Các file SQL trong `prompt3/` (chạy trong SQL Editor, thay `ADMIN_EMAIL` bằng email quản lý, **không commit email thật**):
`supabase.sql`, `supabase-tables.sql`, `supabase-captcha.sql`, `supabase-menu.sql`, `supabase-storage.sql`, `supabase-orders.sql`, `supabase-menu-sizes.sql`.
Đơn mua món có nhiều món: bảng `orders` (người đặt) và `order_items` (từng dòng món). `supabase-orders.sql` chạy được cả khi đã có bảng `orders` kiểu cũ (mỗi đơn một món): đơn cũ được chuyển sang `order_items`. Sau khi chạy, deploy lại Edge Function `order`.
Mã Edge Function nằm ở `prompt3/supabase-function/` (`book`, `contact`, `chat`, `order`).

## Triển khai (GitHub Pages bằng GitHub Actions)

Mỗi lần push lên `main`, workflow `.github/workflows/test.yml` chạy test; nếu qua thì build bản React và đưa lên mạng:

- `/` là bản React (`app/`).
- `/prompt1/`, `/prompt2/`, `/prompt3/` là các trang cũ, vẫn giữ nguyên (xem `scripts/build-site.sh`).

Muốn chạy tay: tab **Actions** trên GitHub, chọn "Kiểm thử và triển khai", bấm **Run workflow**.

Quay về cách cũ (GitHub Pages tự lấy thư mục gốc của nhánh `main`, không build):

```bash
gh api -X PUT repos/jany-ne/ban-va-toi/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'
```
