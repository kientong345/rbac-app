import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken } from './lib/api.js';
import { can } from './lib/rbac.js';
import LoginPage from './pages/LoginPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import MyProfile from './pages/MyProfile.jsx';
import Header from './components/Header.jsx';
import Tabs from './components/Tabs.jsx';
import Toast from './components/Toast.jsx';

// App (me, toast, tab) — mục 3.4
export default function App() {
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(() => !!getToken()); // có token → đang xác minh bằng GET /me
  const [tab, setTab] = useState('me');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((type, message) => {
    clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/me');
      setMe(data);
      return data;
    } catch (err) {
      if (err.status !== 401) notify('error', err.message); // 401 → listener 'auth:expired' tự đăng xuất
      return null;
    } finally {
      setChecking(false);
    }
  }, [notify]);

  useEffect(() => {
    if (getToken()) loadMe();
    const onExpired = () => {
      setMe(null);
      notify('error', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [loadMe, notify]);

  const handleLoggedIn = async () => {
    const profile = await loadMe();
    if (profile) setTab(can(profile, 'users:read') ? 'users' : 'me');
  };

  const handleLogout = () => {
    setToken(null);
    setMe(null);
  };

  if (checking) return <div className="container muted">Đang tải...</div>;
  if (!me)
    return (
      <>
        <LoginPage onLoggedIn={handleLoggedIn} />
        <Toast toast={toast} />
      </>
    );

  const tabs = [
    can(me, 'users:read') && { key: 'users', label: 'Người dùng' },
    can(me, 'roles:read') && { key: 'roles', label: 'Vai trò' },
    { key: 'me', label: 'Hồ sơ của tôi' },
  ].filter(Boolean);
  const activeTab = tabs.some((t) => t.key === tab) ? tab : 'me';

  return (
    <div className="container">
      <Header me={me} onLogout={handleLogout} />
      <Tabs tabs={tabs} active={activeTab} onChange={setTab} />
      {activeTab === 'users' && <UsersPage me={me} notify={notify} reloadMe={loadMe} />}
      {activeTab === 'roles' && <RolesPage me={me} notify={notify} reloadMe={loadMe} />}
      {activeTab === 'me' && <MyProfile me={me} />}
      <Toast toast={toast} />
    </div>
  );
}
