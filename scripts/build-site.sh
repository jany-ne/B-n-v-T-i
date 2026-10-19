#!/usr/bin/env bash
# Ghép thư mục "site" sẽ được đưa lên mạng:
#   - bản React (app/dist) ở địa chỉ gốc
#   - các trang cũ (prompt1, prompt2, prompt3) vẫn ở địa chỉ riêng của chúng
# Cần build trước:  VITE_BASE=/B-n-v-T-i/ npm --prefix app run build
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f app/dist/index.html ] || { echo "Chưa có app/dist. Hãy chạy: npm --prefix app run build" >&2; exit 1; }

rm -rf site
mkdir site
cp -R prompt1 prompt2 prompt3 site/
cp -R app/dist/. site/   # bản React ghi đè index.html chuyển hướng cũ ở gốc
# GitHub Pages không có "chuyển hướng về index.html" cho địa chỉ như /dat-ban.
# Mẹo: nó hiện 404.html cho địa chỉ không có file, nên ta để 404.html giống hệt index.html.
cp site/index.html site/404.html
echo "Đã ghép xong thư mục site/"
