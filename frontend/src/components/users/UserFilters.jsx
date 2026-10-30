// Bộ lọc trạng thái / vai trò
export default function UserFilters({ status, onStatusChange, roleId, onRoleChange, roles, showRoleFilter }) {
    return (
        <>
            <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
                <option value="">Mọi trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="locked">Đã khóa</option>
            </select>
            {showRoleFilter && (
                <select value={roleId} onChange={(e) => onRoleChange(e.target.value)}>
                    <option value="">Mọi vai trò</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.name}
                        </option>
                    ))}
                </select>
            )}
        </>
    );
}
