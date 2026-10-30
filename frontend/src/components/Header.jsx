export default function Header({ me, onLogout }) {
  return (
    <div className="header">
      <div>
        <h2>Quản lý Người dùng &amp; Phân quyền</h2>
        <div className="muted">
          {me.fullName} ({me.email}) ·{' '}
          {me.roles.map((r) => (
            <span key={r.id} className="badge">
              {r.name}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onLogout}>Đăng xuất</button>
    </div>
  );
}
