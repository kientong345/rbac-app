import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { can } from '../lib/rbac.js';
import RoleModal from '../components/roles/RoleModal.jsx';

export default function RolesPage({ me, notify, reloadMe }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const canReadPerms = can(me, 'permissions:read');

  const fetchAll = useCallback(async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles', { params: { limit: 100 } }),
        canReadPerms ? api.get('/permissions') : null,
      ]);
      setRoles(rolesRes.data.data);
      if (permsRes) setPermissions(permsRes.data.data);
    } catch (err) {
      notify('error', err.message);
    }
  }, [canReadPerms, notify]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const remove = async (r) => {
    if (!window.confirm(`Xóa vai trò "${r.name}"?`)) return;
    try {
      await api.delete(`/roles/${r.id}`);
      notify('success', `Đã xóa vai trò ${r.name}.`);
      fetchAll();
    } catch (err) {
      notify('error', err.message);
    }
  };

  return (
    <div>
      <div className="toolbar">
        {can(me, 'roles:create') && (
          <button className="primary" onClick={() => setEditing(null)}>
            + Thêm vai trò
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên / Mô tả</th>
              <th>Quyền</th>
              <th>Số người dùng</th>
              <th>Loại</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.code}</td>
                <td>
                  {r.name}
                  {r.description && <div className="muted">{r.description}</div>}
                </td>
                <td>
                  {r.permissions.length === 0 && <span className="muted">—</span>}
                  {r.permissions.map((p) => (
                    <span key={p} className="badge">
                      {p}
                    </span>
                  ))}
                </td>
                <td>{r.userCount}</td>
                <td>{r.isSystem ? <span className="badge system">Hệ thống</span> : 'Tùy chỉnh'}</td>
                <td className="actions">
                  {can(me, 'roles:update') && <button onClick={() => setEditing(r)}>Sửa</button>}
                  {can(me, 'roles:delete') && !r.isSystem && (
                    <button className="danger" onClick={() => remove(r)}>
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <RoleModal
          role={editing}
          permissions={permissions}
          me={me}
          notify={notify}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            fetchAll();
            reloadMe();
          }}
        />
      )}
    </div>
  );
}
