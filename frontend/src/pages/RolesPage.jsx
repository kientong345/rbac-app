import { useState } from 'react';
import { can } from '../lib/rbac.js';
import RoleModal from '../components/roles/RoleModal.jsx';

// TODO (3.10): tải song song GET /roles và GET /permissions
export default function RolesPage({ me, notify }) {
    const [roles] = useState([]);
    const [permissions] = useState([]);
    const [editing, setEditing] = useState(undefined); // undefined: đóng, null: thêm, object: sửa
    const reload = () => {};

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
                            <th>Tên</th>
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
                                <td>{r.name}</td>
                                <td>
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
                                    {can(me, 'roles:delete') && !r.isSystem && <button className="danger">Xóa</button>}
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
                    onSaved={reload}
                />
            )}
        </div>
    );
}
