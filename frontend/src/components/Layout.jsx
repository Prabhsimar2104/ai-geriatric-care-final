import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth';
import {
    LayoutDashboard,
    Pill,
    MessageSquare,
    AlertTriangle,
    LogOut,
    User,
    Activity,
    ExternalLink
} from 'lucide-react';
import './Layout.css';

function Layout({ children, title: propTitle }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
    }, []);

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    const getPageTitle = (pathname) => {
        switch (pathname) {
            case '/dashboard': return { title: 'Dashboard', subtitle: 'Overview of your health and activities' };
            case '/reminders': return { title: 'Reminders', subtitle: 'Manage your medications and appointments' };
            case '/chat': return { title: 'AI Assistant', subtitle: 'Chat with your health assistant' };
            case '/fall-alerts': return { title: 'Fall Alerts', subtitle: 'Emergency monitoring and history' };
            // If you ever add an internal route for fall-detection, this helps show title.
            case '/fall-detection': return { title: 'Fall Detection', subtitle: 'Open real-time fall detection system' };
            default: return { title: 'AI Geriatric Care', subtitle: 'Welcome back' };
        }
    };

    const { title: autoTitle, subtitle } = getPageTitle(location.pathname);
    const displayTitle = propTitle || autoTitle;

    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <div className="sidebar-header">
                    <div className="app-logo">🏥</div>
                    <div className="app-name">
                        <span>AI Geriatric</span>
                        <br />
                        <span>Care System</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                    >
                        <LayoutDashboard size={20} className="nav-icon" />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/reminders"
                        className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                    >
                        <Pill size={20} className="nav-icon" />
                        <span>Reminders</span>
                    </NavLink>

                    <NavLink
                        to="/chat"
                        className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                    >
                        <MessageSquare size={20} className="nav-icon" />
                        <span>AI Chat</span>
                    </NavLink>

                    <NavLink
                        to="/fall-alerts"
                        className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                    >
                        <AlertTriangle size={20} className="nav-icon" />
                        <span>Fall Alerts</span>
                    </NavLink>

                    {/* External Fall Detection link (opens Streamlit app in new tab) */}
                    <a
                        href="https://fall-detection-final-hhfcbskbhyappcxen8dapzr.streamlit.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nav-item"
                        aria-label="Open Fall Detection (external)"
                    >
                        <Activity size={20} className="nav-icon" />
                        <span>Fall Detection</span>
                        <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.85 }} />
                    </a>
                </nav>

                <div className="sidebar-footer">
                    {user && (
                        <div className="user-mini-card">
                            <div className="user-avatar">
                                {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                            <div className="user-meta">
                                <div className="user-name">{user.name}</div>
                                <div className="user-email">{user.role}</div>
                            </div>
                        </div>
                    )}

                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="app-main">
                <header className="app-header">
                    <h1 className="page-title">{displayTitle}</h1>
                    <p className="page-subtitle">{subtitle}</p>
                </header>

                <div className="app-content">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
}

export default Layout;
