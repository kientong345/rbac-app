import { useState } from 'react';

// TODO (3.5): POST /auth/tokens → setToken → GET /me → onLoggedIn(me)
export default function LoginPage({ onLoggedIn }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            void onLoggedIn;
            throw new Error('Chưa nối API (bước 3.3–3.5).');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container login">
            <h2>Đăng nhập</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                    Mật khẩu
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>
                {error && <div className="error">{error}</div>}
                <button className="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
            </form>
        </div>
    );
}
