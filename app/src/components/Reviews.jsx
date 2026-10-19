// Dữ liệu đánh giá để riêng thành một danh sách; giao diện chỉ việc lặp qua danh sách này.
const REVIEWS = [
  { id: 1, name: 'Minh Anh', stars: 5, text: 'Cà phê sữa đậm đà đúng vị mình thích. Quán yên tĩnh, rất hợp để ngồi làm việc cả buổi sáng.' },
  { id: 2, name: 'Quốc Bảo', stars: 5, text: 'Cold brew ủ rất êm, không bị chát. Nhân viên thân thiện, lên đồ uống nhanh.' },
  { id: 3, name: 'Thu Hà', stars: 4, text: 'Không gian ấm cúng, trà đào thơm mát. Mình sẽ rủ bạn bè quay lại cuối tuần này.' },
];

// Component nhỏ nhận "props" (dữ liệu truyền vào) và vẽ ra các ngôi sao.
function Stars({ value }) {
  return (
    <span role="img" aria-label={`${value} trên 5 sao`} className="ml-2 text-accent">
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

export default function Reviews() {
  return (
    <section id="danh-gia" className="bg-bg-alt py-12 md:py-16">
      <div className="page-container">
        <h2 className="mb-7 text-center text-2xl font-bold lg:text-3xl">Đánh giá khách hàng</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure key={r.id} className="m-0 rounded-lg bg-surface p-5 shadow">
              <blockquote className="m-0 mb-3">
                <p>{r.text}</p>
              </blockquote>
              <figcaption className="font-bold text-primary">
                {r.name}
                <Stars value={r.stars} />
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
