import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TEACHER_NAV, STUDENT_NAV } from '../../utils/constants'

function Sidebar({ isOpen, onClose }) {
    const { isTeacher } = useAuth()
    const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 40,
                        display: 'none'
                    }}
                />
            )}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            end={item.path === '/teacher' || item.path === '/student'}
                            onClick={onClose}
                        >
                            <span className="icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div style={{ marginTop: 'auto', padding: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)' }}>
                    <div className="glass-card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
                        <p className="text-sm text-muted" style={{ margin: 0 }}>
                            📸 FaceAttend v1.0
                        </p>
                        <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0' }}>
                            Smart Attendance System
                        </p>
                    </div>
                </div>
            </aside>
        </>
    )
}

export default Sidebar
