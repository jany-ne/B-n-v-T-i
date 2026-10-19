import { Link } from 'react-router-dom';

// Một liên kết điều hướng. Nếu có "section" thì về trang chủ rồi cuộn tới phần đó
// (Layout sẽ đọc "state" để cuộn), nếu có "to" thì sang trang khác.
export default function NavItemLink({ item, children, ...props }) {
  return (
    <Link to={item.to ?? '/'} state={item.section ? { section: item.section } : undefined} {...props}>
      {children ?? item.label}
    </Link>
  );
}
