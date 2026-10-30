import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { can, sameId } from '../lib/rbac.js';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';
import UserFilters from '../components/users/UserFilters.jsx';
import UserTable from '../components/users/UserTable.jsx';
import UserModal from '../components/users/UserModal.jsx';
import RoleAssignModal from '../components/users/RoleAssignModal.jsx';

export default function UsersPage({ me, notify, reloadMe }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 5, totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [roleId, setRoleId] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [assigning, setAssigning] = useState(null);

  const fetchUsers = useCallback(async () => {
    const params = { page, limit };
    if (search.trim().length >= 2) params.q = search.trim();
    if (status) params.status = status;
    if (roleId) params.roleId = roleId;
    try {
      const { data } = await api.get('/users', { params });
      if (page > data.meta.totalPages) return setPage(data.meta.totalPages);
      setUsers(data.data);
      setMeta(data.meta);
    } catch (err) {
      notify('error', err.message);
    }
  }, [page, limit, search, status, roleId, notify]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!can(me, 'roles:read')) return;
    (async () => {
      try {
        const { data } = await api.get('/roles', { params: { limit: 100 } });
        setRoles(data.data);
      } catch (err) {
        notify('error', err.message);
      }
    })();
  }, [me, notify]);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const afterSave = (target) => {
    fetchUsers();
    if (target && sameId(target.id, me.id)) reloadMe();
  };

  const toggleLock = async (u) => {
    const next = u.status === 'active' ? 'locked' : 'active';
    try {
      await api.patch(`/users/${u.id}`, { status: next });
      notify('success', next === 'locked' ? `Đã khóa ${u.fullName}.` : `Đã mở khóa ${u.fullName}.`);
      fetchUsers();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Xóa người dùng "${u.fullName}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      notify('success', `Đã xóa ${u.fullName}.`);
      fetchUsers();
    } catch (err) {
      notify('error', err.message);
    }
  };

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
        onToggleLock={toggleLock}
        onDelete={remove}
      />
      <Pagination meta={meta} limit={limit} onPageChange={setPage} onLimitChange={resetPage(setLimit)} />

      {editing !== undefined && (
        <UserModal
          user={editing}
          roles={roles}
          me={me}
          notify={notify}
          onClose={() => setEditing(undefined)}
          onSaved={() => afterSave(editing)}
        />
      )}
      {assigning && (
        <RoleAssignModal
          user={assigning}
          roles={roles}
          me={me}
          notify={notify}
          onClose={() => setAssigning(null)}
          onSaved={() => afterSave(assigning)}
        />
      )}
    </div>
  );
}
