// Kiểm tra "bộ não" của chatbot (hàm answer trong Edge Function chat.ts) mà không cần Supabase.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { test, expect } = require('@playwright/test');

const source = fs.readFileSync(path.join(__dirname, '../prompt3/supabase-function/chat.ts'), 'utf8');
// Chỉ lấy phần trước Deno.serve (phần chạy được ngoài Supabase)
const logic = source.slice(0, source.indexOf('Deno.serve'));
const js = esbuild.transformSync(logic, { loader: 'ts' }).code;
const answer = new Function(js + '\nreturn answer;')();

const ITEMS = [
  { name: 'Cà phê sữa', description: 'Đậm đà, béo nhẹ.', price: 35000 },
  { name: 'Trà đào', description: 'Thanh mát.', price: 40000 },
  { name: 'Trà xanh tươi mát', description: null, price: 45000 },
];

test('trả lời giờ mở cửa', () => {
  expect(answer('Quán mở cửa lúc mấy giờ?', ITEMS)).toContain('9:00 - 22:00');
});

test('trả lời địa chỉ', () => {
  expect(answer('Địa chỉ quán ở đâu', ITEMS)).toContain('Dương Bá Trạc');
});

test('trả lời số điện thoại và Zalo', () => {
  const r = answer('cho mình xin số điện thoại', ITEMS);
  expect(r).toContain('0986 187 111');
  expect(r).toContain('0986 187 186');
});

test('hướng dẫn đặt bàn', () => {
  expect(answer('Làm sao để đặt bàn?', ITEMS)).toContain('trang Đặt bàn');
});

test('liệt kê menu kèm giá', () => {
  const r = answer('menu có gì vậy', ITEMS);
  expect(r).toContain('Cà phê sữa: 35.000đ');
  expect(r).toContain('Trà đào: 40.000đ');
});

test('hỏi giá một món, gõ không dấu cũng hiểu', () => {
  expect(answer('gia ca phe sua bao nhieu', ITEMS)).toContain('35.000đ');
  expect(answer('Trà đào giá bao nhiêu?', ITEMS)).toBe('Trà đào: 40.000đ. Thanh mát.');
});

test('hỏi "trà xanh" thì chỉ ra món trà xanh, không lẫn trà đào', () => {
  const r = answer('trà xanh giá sao', ITEMS);
  expect(r).toContain('Trà xanh tươi mát');
  expect(r).not.toContain('Trà đào');
});

test('câu hỏi lạ thì xin lỗi và chỉ số điện thoại', () => {
  const r = answer('thời tiết hôm nay thế nào', ITEMS);
  expect(r).toContain('chưa hiểu');
  expect(r).toContain('0986 187 111');
});

test('không có menu vẫn trả lời được', () => {
  expect(answer('menu có gì', [])).toContain('chưa tải được menu');
  expect(answer('giờ mở cửa', [])).toContain('9:00');
});
