import { useState } from 'react';
import { api } from '../../lib/api.js';
import { exceedsMe, sameId } from '../../lib/rbac.js';
import Modal from '../Modal.jsx';

// Mục 3.9
export default function RoleAssignModal({ user, roles, me, notify, onClose, onSaved }) {
  const initial = user.roles.map((r) => r.id);
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isSelf = sameId(user.id, me.id);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const roleName = (id) => roles.find((r) => r.id === id)?.name ?? id;

  const handleSave = async () => {
    const toAdd = selected.filter((id) => !initial.includes(id));
    const toRemove = initial.filter((id) => !selected.includes(id));
    if (!toAdd.length && !toRemove.length) return onClose();

    setSaving(true);
    const ids = [...toAdd, ...toRemove];
    const results = await Promise.allSettled([
      ...toAdd.map((id) => api.put(`/users/${user.id}/roles/${id}`)),
      ...toRemove.map((id) => api.delete(`/users/${user.id}/roles/${id}`)),
    ]);
    setSaving(false);

    const failed = results.flatMap((r, i) => (r.status === 'rejected' ? [`${roleName(ids[i])}: ${r.reason.message}`] : []));
    onSaved(); // luôn tải lại vì có thể thành công một phần
    if (failed.length) return notify('error', `Không lưu được: ${failed.join('; ')}`);
    notify('success', `Đã cập nhật vai trò của ${user.fullName}.`);
    onClose();
  };

  return (
    <Modal title={`Vai trò của ${user.fullName}`} onClose={onClose}>
      {roles.map((r) => {
        const exceeds = exceedsMe(me, r.permissions);
        const lockedSelf = isSelf && initial.includes(r.id);
        return (
          <label key={r.id} className="check">
            <input type="checkbox" checked={selected.includes(r.id)} disabled={exceeds || lockedSelf} onChange={() => toggle(r.id)} />
            <span>
              {r.name} <span className="muted">({r.code})</span>
              {exceeds && <span className="muted"> — vượt quyền của bạn</span>}
              {lockedSelf && <span className="muted"> — không thể tự gỡ</span>}
            </span>
          </label>
        );
      })}
      <div className="toolbar">
        <button onClick={onClose}>Hủy</button>
        <button className="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </Modal>
  );
}
