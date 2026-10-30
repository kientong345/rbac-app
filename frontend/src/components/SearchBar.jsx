import { useEffect, useState } from 'react';

// Debounce 400ms trước khi báo lên cha
export default function SearchBar({ value, onChange, placeholder = 'Tìm theo tên hoặc email (≥ 2 ký tự)' }) {
  const [text, setText] = useState(value);

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text), 400);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return <input type="search" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />;
}
