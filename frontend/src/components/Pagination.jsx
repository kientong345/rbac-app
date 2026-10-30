export default function Pagination({ meta, limit, onPageChange, onLimitChange }) {
  const { page, totalPages, totalItems } = meta;
  return (
    <div className="toolbar pagination">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ‹ Trước
      </button>
      <span className="muted">
        Trang {page}/{totalPages} · {totalItems} bản ghi
      </span>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Sau ›
      </button>
      <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
        {[5, 10, 20].map((n) => (
          <option key={n} value={n}>
            {n} dòng/trang
          </option>
        ))}
      </select>
    </div>
  );
}
