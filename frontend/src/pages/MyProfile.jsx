export default function MyProfile({ me }) {
  return (
    <div>
      <h3>Hồ sơ của tôi</h3>
      <p>
        <b>Họ tên:</b> {me.fullName}
      </p>
      <p>
        <b>Email:</b> {me.email}
      </p>
      <p>
        <b>Số điện thoại:</b> {me.phone || '—'}
      </p>
      <p>
        <b>Vai trò:</b>{' '}
        {me.roles.map((r) => (
          <span key={r.id} className="badge">
            {r.name}
          </span>
        ))}
      </p>
      <p>
        <b>Quyền hiệu lực:</b> {me.permissions.length === 0 && <span className="muted">Không có quyền quản trị.</span>}
        {me.permissions.map((p) => (
          <span key={p} className="badge">
            {p}
          </span>
        ))}
      </p>
    </div>
  );
}
