// Nút theo thiết kế: chữ serif 21px nét thường (đo từ thiết kế: chữ "Book a table" rộng 104px), bóng đổ màu xám (cả hai nút dùng bóng xám).
// Bo góc không đều: trên-trái và dưới-phải bo 15px, hai góc còn lại gần như vuông (2px).
// Thứ tự trong border-radius: trên-trái, trên-phải, dưới-phải, dưới-trái.
const STYLES = {
  dark: 'min-w-[120px] bg-ink text-white shadow-[0_16px_30px_-8px_rgba(16,26,36,0.3)]',
  orange: 'min-w-[167px] bg-orange text-white shadow-[0_16px_30px_-8px_rgba(16,26,36,0.25)]',
};

export default function Button({ variant = 'orange', className = '', children, ...props }) {
  return (
    <a
      href="#"
      className={`inline-flex h-[54px] items-center justify-center rounded-[15px_2px_15px_2px] px-[31px] font-serif text-[21px] font-normal transition hover:-translate-y-0.5 hover:brightness-110 ${STYLES[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
