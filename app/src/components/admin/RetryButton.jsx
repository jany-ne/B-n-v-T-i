// Nút "Thử lại" hiện cạnh thông báo khi tải danh sách bị lỗi.
export default function RetryButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 rounded-md border border-primary px-3 py-1.5 text-primary"
    >
      Thử lại
    </button>
  );
}
