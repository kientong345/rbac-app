import { useState } from 'react';
import { can } from '../lib/rbac.js';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';
import UserFilters from '../components/users/UserFilters.jsx';
import UserTable from '../components/users/UserTable.jsx';
import UserModal from '../components/users/UserModal.jsx';
import RoleAssignModal from '../components/users/RoleAssignModal.jsx';

// TODO (3.6): fetchUsers() GET /users theo page/limit/q/status/roleId; GET /roles cho bộ lọc
export default function UsersPage({ me, notify }) {
    const [users] = useState([]);
    const [roles] = useState([]);
    const [meta] = useState({ page: 1, limit: 5, totalItems: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(5);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [roleId, setRoleId] = useState('');
    const [editing, setEditing] = useState(undefined); // undefined: đóng, null: thêm, object: sửa
    const [assigning, setAssigning] = useState(null);

    // Đổi bộ lọc / tìm kiếm / limit → về trang 1
    const resetPage = (setter) => (value) => {
        setter(value);
        setPage(1);
    };
    const reload = () => {}; // TODO (3.6): gọi lại fetchUsers()

    return (
        <div>
            <div className="toolbar">
                <SearchBar value={search} onChange={resetPage(setSearch)} />
                <UserFilters
                    status={status}
                    onStatusChange={resetPage(setStatus)}
                    roleId={roleId}
                    onRoleChange={resetPage(setRoleId)}
                    roles={roles}
                    showRoleFilter={can(me, 'roles:read')}
                />
                {can(me, 'users:create') && (
                    <button className="primary" onClick={() => setEditing(null)}>
                        + Thêm người dùng
                    </button>
                )}
            </div>

            <UserTable
                users={users}
                meta={meta}
                me={me}
                onEdit={setEditing}
                onAssign={setAssigning}
                onToggleLock={reload}
                onDelete={reload}
            />
            <Pagination meta={{ ...meta, page }} limit={limit} onPageChange={setPage} onLimitChange={resetPage(setLimit)} />

            {editing !== undefined && (
                <UserModal
                    user={editing}
                    roles={roles}
                    me={me}
                    notify={notify}
                    onClose={() => setEditing(undefined)}
                    onSaved={reload}
                />
            )}
            {assigning && (
                <RoleAssignModal
                    user={assigning}
                    roles={roles}
                    me={me}
                    notify={notify}
                    onClose={() => setAssigning(null)}
                    onSaved={reload}
                />
            )}
        </div>
    );
}
