// Chọn bàn. Nhận danh sách bàn, bàn đã bị đặt, số người, và báo ra bàn được chọn.
// Component này không tự nhớ gì cả: mọi dữ liệu do trang cha đưa xuống qua props.
export default function TablePicker({ tables, taken, guests, ready, value, onChange, error, hint }) {
  return (
    <fieldset className="m-0 mb-4 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 font-bold">Chọn bàn</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
        {tables.map((t) => {
          const busy = taken.has(t.id);
          const small = t.seats < guests;
          const disabled = !ready || busy || small;
          const showSeats = !ready || (!busy && !small);
          return (
            <label
              key={t.id}
              className={`relative block rounded-lg border-2 bg-surface p-2.5 text-center has-[:checked]:border-primary has-[:checked]:bg-bg-alt has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                disabled ? 'cursor-not-allowed border-dashed border-muted opacity-50' : 'cursor-pointer border-muted'
              }`}
            >
              <input
                type="radio"
                name="table"
                value={t.id}
                checked={value === t.id}
                disabled={disabled}
                onChange={() => onChange(t.id)}
                className="absolute inset-0 m-0 cursor-[inherit] opacity-0"
              />
              <span className="font-bold">{t.name}: </span>
              <span className={showSeats ? 'font-bold text-orange-700 dark:text-orange-300' : 'text-sm text-muted'}>
                {showSeats ? `${t.seats} chỗ` : busy ? 'Đã có người đặt' : 'Không đủ chỗ'}
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-muted">{hint}</p>
      {error && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </fieldset>
  );
}
