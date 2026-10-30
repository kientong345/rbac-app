import { can, sameId } from '../../lib/rbac.js';

// Nút hiển thị theo quyền (mục II.4.2 / 3.7)
export default function UserTable({ users, meta, me, onEdit, onAssign, onToggleLock, onDelete }) {
  const offset = (meta.page - 1) * meta.limit;
  const canUpdate = can(me, 'users:update');
  const canAssign = can(me, 'roles:assign') && can(me, 'roles:read');
  const canDelete = can(me, 'users:delete');

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Không có người dùng.
              </td>
            </tr>
          )}
          {users.map((u, i) => {
            const isSelf = sameId(u.id, me.id);
            return (
              <tr key={u.id}>
                <td>{offset + i + 1}</td>
                <td>
                  {u.fullName} {isSelf && <span className="muted">(bạn)</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  {u.roles.map((r) => (
                    <span key={r.id} className="badge">
                      {r.name}
                    </span>
                  ))}
                </td>
                <td>
                  <span className={`badge ${u.status}`}>{u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span>
                </td>
                <td className="actions">
                  {canUpdate && <button onClick={() => onEdit(u)}>Sửa</button>}
                  {canAssign && <button onClick={() => onAssign(u)}>Vai trò</button>}
                  {canUpdate && (
                    <button disabled={isSelf} onClick={() => onToggleLock(u)}>
                      {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                    </button>
                  )}
                  {canDelete && (
                    <button className="danger" disabled={isSelf} onClick={() => onDelete(u)}>
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
