// Nội dung của trang, giữ nguyên chữ trong thiết kế (kể cả lỗi chính tả như "Wecome", "Expects").
// href trỏ tới id của từng section nên địa chỉ trên thanh URL có dạng /#events
export const NAV = [
  { label: 'Menu', href: '#dishes' },
  { label: 'Events', href: '#events' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
export const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt';
export const LOREM_CARD = 'Lorem ipsum dolor sit , consectetur adipiscing elit, sed do eiusmod tempor';

// Đường dẫn ảnh trong public/images (BASE_URL để đúng cả khi trang nằm trong thư mục con).
export const img = (name) => `${import.meta.env.BASE_URL}images/${name}`;

export const DISHES = [
  { name: 'Lumpia with Suace', price: '$12', image: 'dish-lumpia.webp', alt: 'Fried spring rolls and fresh rolls in a bamboo basket' },
  { name: 'Fish and Veggie', price: '$12', image: 'dish-fish.webp', alt: 'Grilled fish fillet with carrot, lime and herbs on a white plate' },
  { name: 'Tofu Chili', price: '$12', image: 'dish-tofu.webp', alt: 'Fried tofu with chili and peanuts in a black bowl' },
  { name: 'Egg and Cocumber', price: '$12', image: 'dish-egg.webp', alt: 'Minced meat with basil, a fried egg and cucumber slices' },
];

const REVIEW = 'Lorem ipsum dolor sit amet consectetur. Tortor massa nisl quam sit. Vitae congue ultrices neque penatibus mi in quisque. Leo in cursus enim magnis ante. Proin iaculis platea ipsum sagittis ac eu aliquam quis. Ornare tincidunt tempus semper';

export const REVIEWS = [
  { name: 'Ama Ampomah', role: 'CEO & Founder Inc', text: REVIEW, avatar: 'avatar-2.webp' },
  { name: 'Kweku Annan', role: 'CEO & Founder Inc', text: REVIEW, avatar: 'avatar-1.webp' },
  // Ba thẻ sau dùng ảnh tạm (bản sao), thay bằng ảnh thật khi có
  { name: 'Nana Mensah', role: 'CEO & Founder Inc', text: REVIEW, avatar: 'avatar-3.webp' },
  { name: 'Efua Sarpong', role: 'CEO & Founder Inc', text: REVIEW, avatar: 'avatar-4.webp' },
  { name: 'Akosua Boateng', role: 'CEO & Founder Inc', text: REVIEW, avatar: 'avatar-5.webp' },
  { name: 'Abena Owusu', role: 'CEO & Founder Inc', text: REVIEW, avatar: 'avatar-6.webp' },
];

export const FOOTER = {
  navigation: [
    { label: 'Menu', href: '#dishes' },
    { label: 'About us', href: '#about' },
    { label: 'Contact us', href: '#contact' },
    { label: 'Main dishes', href: '#dishes' },
  ],
  dishes: ['Fish & Viggies', 'Tofu Chili', 'Egg & Cocumber', 'Lumpia w/Suace'],
  hours: [
    ['Monday - Friday', '8:00 am to 9:00 pm'],
    ['Saturday', '8:00 am to 9:00 pm'],
    ['Sunday', 'CLOSED'],
  ],
};
