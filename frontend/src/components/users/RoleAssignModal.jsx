import { useState } from 'react';
import { sameId } from '../../lib/rbac.js';
import Modal from '../Modal.jsx';

// TODO (3.9): tính toAdd/toRemove, chạy PUT/DELETE song song bằng Promise.allSettled
export default function RoleAssignModal({ user, roles, me, notify, onClose, onSaved }) {
    const initial = user.roles.map((r) => r.id);
    const [selected, setSelected] = useState(initial);
    const [saving] = useState(false);
    const isSelf = sameId(user.id, me.id);
    void notify, onSaved;

    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    return (
        <Modal title={`Vai trò của ${user.fullName}`} onClose={onClose}>
            {roles.map((r) => {
                const exceeds = r.permissions.some((p) => !me.permissions.includes(p));
                const lockedSelf = isSelf && initial.includes(r.id);
                return (
                    <label key={r.id} className="check">
                        <input
                            type="checkbox"
                            checked={selected.includes(r.id)}
                            disabled={exceeds || lockedSelf}
                            onChange={() => toggle(r.id)}
                        />
                        <span>
                            {r.name} <span className="muted">({r.code})</span>
                            {exceeds && <span className="muted"> — vượt quyền của bạn</span>}
                        </span>
                    </label>
                );
            })}
            <div className="toolbar">
                <button onClick={onClose}>Hủy</button>
                <button className="primary" disabled={saving}>
                    Lưu
                </button>
            </div>
        </Modal>
    );
}
