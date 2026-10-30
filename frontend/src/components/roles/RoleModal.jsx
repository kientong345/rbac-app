import { useState } from 'react';
import Modal from '../Modal.jsx';

// TODO (3.10): POST /roles hoặc PATCH /roles/:id + PUT /roles/:id/permissions, sau đó reloadMe()
export default function RoleModal({ role, permissions, me, notify, onClose, onSaved }) {
    const isNew = role === null;
    const [form, setForm] = useState({ code: role?.code ?? '', name: role?.name ?? '', description: role?.description ?? '' });
    const [selected, setSelected] = useState(role?.permissions ?? []);
    const [saving] = useState(false);
    void notify, onSaved;

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const toggle = (code) => setSelected((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));
    const groups = Object.groupBy(permissions, (p) => p.resource);

    return (
        <Modal title={isNew ? 'Thêm vai trò' : 'Sửa vai trò'} onClose={onClose}>
            <form onSubmit={(e) => e.preventDefault()}>
                <label>
                    Mã vai trò
                    <input value={form.code} disabled={!isNew} onChange={set('code')} />
                </label>
                <label>
                    Tên
                    <input value={form.name} onChange={set('name')} />
                </label>
                <label>
                    Mô tả
                    <input value={form.description} onChange={set('description')} />
                </label>
                {Object.entries(groups).map(([resource, perms]) => (
                    <fieldset key={resource}>
                        <legend>{resource}</legend>
                        {perms.map((p) => (
                            <label key={p.code} className="check">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(p.code)}
                                    disabled={role?.isSystem || !me.permissions.includes(p.code)}
                                    onChange={() => toggle(p.code)}
                                />
                                <span>
                                    {p.code} <span className="muted">{p.description}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>
                ))}
                <div className="toolbar">
                    <button type="button" onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="primary" disabled={saving}>
                        Lưu
                    </button>
                </div>
            </form>
        </Modal>
    );
}
