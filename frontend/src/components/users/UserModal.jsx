import { useState } from 'react';
import { api } from '../../lib/api.js';
import { can, exceedsMe, fieldErrors } from '../../lib/rbac.js';
import Modal from '../Modal.jsx';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function validate(form, isNew) {
  const e = {};
  if (!EMAIL_RE.test(form.email.trim())) e.email = 'Email không hợp lệ.';
  if (form.fullName.trim().length < 2) e.fullName = 'Họ tên tối thiểu 2 ký tự.';
  if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) e.phone = 'SĐT theo định dạng E.164, ví dụ +84912345678.';
  if (isNew && !PASSWORD_RE.test(form.password)) e.password = 'Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ số và ký tự đặc biệt.';
  return e;
}

// Mục 3.8
export default function UserModal({ user, roles, me, notify, onClose, onSaved }) {
  const isNew = user === null;
  const [form, setForm] = useState({
    email: user?.email ?? '',
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    password: '',
  });
  const [roleIds, setRoleIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleRole = (id) => setRoleIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form, isNew);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    const clean = { email: form.email.trim(), fullName: form.fullName.trim(), phone: form.phone.trim() || null };
    setSaving(true);
    try {
      if (isNew) {
        await api.post('/users', { ...clean, password: form.password, ...(roleIds.length && { roleIds }) });
      } else {
        // Chỉ gửi trường đã thay đổi
        const changed = Object.fromEntries(Object.entries(clean).filter(([k, v]) => v !== (user[k] ?? null)));
        if (!Object.keys(changed).length) return onClose();
        await api.patch(`/users/${user.id}`, changed);
      }
      notify('success', isNew ? 'Đã thêm người dùng.' : 'Đã cập nhật người dùng.');
      onSaved();
      onClose();
    } catch (err) {
      if (err.code === 'EMAIL_ALREADY_EXISTS') setErrors({ email: err.message });
      else if (err.details.length) setErrors(fieldErrors(err));
      else notify('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (k, label, props = {}) => (
    <label>
      {label}
      <input value={form[k]} onChange={set(k)} {...props} />
      {errors[k] && <div className="error">{errors[k]}</div>}
    </label>
  );

  return (
    <Modal title={isNew ? 'Thêm người dùng' : 'Sửa người dùng'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {field('email', 'Email', { type: 'email' })}
        {field('fullName', 'Họ tên')}
        {field('phone', 'Số điện thoại', { placeholder: '+84912345678' })}
        {isNew && field('password', 'Mật khẩu', { type: 'password' })}

        {isNew && can(me, 'roles:assign') && (
          <fieldset>
            <legend>Vai trò (bỏ trống → member)</legend>
            {roles.map((r) => {
              const exceeds = exceedsMe(me, r.permissions);
              return (
                <label key={r.id} className="check">
                  <input type="checkbox" checked={roleIds.includes(r.id)} disabled={exceeds} onChange={() => toggleRole(r.id)} />
                  <span>
                    {r.name}
                    {exceeds && <span className="muted"> — vượt quyền của bạn</span>}
                  </span>
                </label>
              );
            })}
            {errors.roleIds && <div className="error">{errors.roleIds}</div>}
          </fieldset>
        )}

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
