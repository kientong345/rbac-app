import { useCallback, useRef, useState } from 'react';
import { can } from './lib/rbac.js';
import LoginPage from './pages/LoginPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import MyProfile from './pages/MyProfile.jsx';
import Header from './components/Header.jsx';
import Tabs from './components/Tabs.jsx';
import Toast from './components/Toast.jsx';

// App (me, toast, tab) — mục 3.2
export default function App() {
    const [me, setMe] = useState(null);
    const [tab, setTab] = useState('me');
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    const notify = useCallback((type, message) => {
        clearTimeout(toastTimer.current);
        setToast({ type, message });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    }, []);

    // TODO (3.4): loadMe() gọi GET /me, lắng nghe 'auth:expired'
    const handleLoggedIn = (profile) => {
        setMe(profile);
        setTab(can(profile, 'users:read') ? 'users' : 'me');
    };
    const handleLogout = () => setMe(null);

    if (!me) return <LoginPage onLoggedIn={handleLoggedIn} />;

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
            {activeTab === 'users' && <UsersPage me={me} notify={notify} />}
            {activeTab === 'roles' && <RolesPage me={me} notify={notify} />}
            {activeTab === 'me' && <MyProfile me={me} />}
            <Toast toast={toast} />
        </div>
    );
}
