// Các hàm kiểm tra dùng chung cho nhiều form. Mỗi hàm trả về câu báo lỗi, hoặc chuỗi rỗng nếu hợp lệ.
export const validateName = (v) => (v.trim() ? '' : 'Vui lòng nhập họ tên.');

export const validatePhone = (v) => {
  const digits = v.replace(/[\s.\-()]/g, '');
  if (!digits) return 'Vui lòng nhập số điện thoại.';
  return /^(0|\+84)\d{9}$/.test(digits) ? '' : 'Số điện thoại chưa đúng (VD: 0986 187 111).';
};
