import { useState } from 'react';
import { api } from '../../lib/api.js';
import { fieldErrors } from '../../lib/rbac.js';
import Modal from '../Modal.jsx';

const CODE_RE = /^[a-z][a-z0-9-]{2,49}$/;

export default function RoleModal({ role, permissions, me, notify, onClose, onSaved }) {
  const isNew = role === null;
  const [form, setForm] = useState({ code: role?.code ?? '', name: role?.name ?? '', description: role?.description ?? '' });
  const [selected, setSelected] = useState(role?.permissions ?? []);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (code) => setSelected((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));
  const groups = Object.groupBy(permissions, (p) => p.resource);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const description = form.description.trim() || null;
    const clientErrors = {};
    if (isNew && !CODE_RE.test(form.code.trim())) clientErrors.code = 'Mã: chữ thường, số, gạch nối; 3–50 ký tự; bắt đầu bằng chữ.';
    if (name.length < 2) clientErrors.name = 'Tên tối thiểu 2 ký tự.';
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSaving(true);
    try {
      if (isNew) {
        await api.post('/roles', { code: form.code.trim(), name, description, permissions: selected });
      } else {
        const info = {};
        if (name !== role.name) info.name = name;
        if (description !== (role.description ?? null)) info.description = description;
        const permsChanged = new Set(selected).symmetricDifference(new Set(role.permissions)).size > 0;
        if (Object.keys(info).length) await api.patch(`/roles/${role.id}`, info);
        if (permsChanged) await api.put(`/roles/${role.id}/permissions`, { permissions: selected });
      }
      notify('success', isNew ? 'Đã thêm vai trò.' : 'Đã cập nhật vai trò.');
      onSaved();
      onClose();
    } catch (err) {
      if (err.code === 'ROLE_CODE_EXISTS') setErrors({ code: err.message });
      else if (err.details.length) setErrors(fieldErrors(err));
      else notify('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? 'Thêm vai trò' : 'Sửa vai trò'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label>
          Mã vai trò
          <input value={form.code} disabled={!isNew} onChange={set('code')} placeholder="vd: content-editor" />
          {errors.code && <div className="error">{errors.code}</div>}
        </label>
        <label>
          Tên
          <input value={form.name} onChange={set('name')} />
          {errors.name && <div className="error">{errors.name}</div>}
        </label>
        <label>
          Mô tả
          <input value={form.description} onChange={set('description')} />
        </label>
        {role?.isSystem && <div className="muted">Vai trò hệ thống: không thể đổi bộ quyền.</div>}
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
        {errors.permissions && <div className="error">{errors.permissions}</div>}
        <div className="toolbar">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
