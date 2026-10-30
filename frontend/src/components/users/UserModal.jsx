import { useState } from 'react';
import Modal from '../Modal.jsx';

// TODO (3.8): validate client, POST /users hoặc PATCH /users/:id (chỉ trường đổi), hiển thị err.details theo field
export default function UserModal({ user, roles, me, notify, onClose, onSaved }) {
    const isNew = user === null;
    const [form, setForm] = useState({
        email: user?.email ?? '',
        fullName: user?.fullName ?? '',
        phone: user?.phone ?? '',
        password: '',
    });
    const [errors] = useState({});
    const [saving] = useState(false);
    void roles, me, notify, onSaved;

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <Modal title={isNew ? 'Thêm người dùng' : 'Sửa người dùng'} onClose={onClose}>
            <form onSubmit={(e) => e.preventDefault()}>
                <label>
                    Email
                    <input value={form.email} onChange={set('email')} />
                    {errors.email && <div className="error">{errors.email}</div>}
                </label>
                <label>
                    Họ tên
                    <input value={form.fullName} onChange={set('fullName')} />
                    {errors.fullName && <div className="error">{errors.fullName}</div>}
                </label>
                <label>
                    Số điện thoại
                    <input value={form.phone} placeholder="+84912345678" onChange={set('phone')} />
                    {errors.phone && <div className="error">{errors.phone}</div>}
                </label>
                {isNew && (
                    <label>
                        Mật khẩu
                        <input type="password" value={form.password} onChange={set('password')} />
                        {errors.password && <div className="error">{errors.password}</div>}
                    </label>
                )}
                {/* TODO (3.8): checkbox vai trò khi isNew && can(me, 'roles:assign') */}
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
