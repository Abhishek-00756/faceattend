import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TEACHER_NAV, STUDENT_NAV, STORAGE_KEYS } from '../../utils/constants'
import { getInitials } from '../../utils/helpers'
import { useState, useEffect } from 'react'

function Navbar() {
    const { user, logout, isTeacher } = useAuth()
    const navigate = useNavigate()
    const [theme, setTheme] = useState('light')
    const [showDropdown, setShowDropdown] = useState(false)

    // Load theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light'
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
    }, [])

    // Toggle theme
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV

    return (
        <nav className="navbar">
            {/* Brand */}
            <div className="navbar-brand">
                <img src="/favicon.svg" alt="FaceAttend" />
                <span className="text-gradient">FaceAttend</span>
            </div>

            {/* Navigation Links - Desktop */}
            <div className="navbar-nav" style={{ display: 'none' }}>
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        end={item.path === '/teacher' || item.path === '/student'}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-md">
                {/* Theme Toggle */}
                <button
                    className="btn btn-icon btn-ghost"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>

                {/* User Menu */}
                <div className="user-menu" style={{ position: 'relative' }}>
                    <button
                        className="flex items-center gap-sm btn btn-ghost"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="avatar avatar-md">
                            {user?.photo ? (
                                <img src={user.photo} alt={user.name} />
                            ) : (
                                getInitials(user?.name)
                            )}
                        </div>
                        <span className="font-medium" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.name}
                        </span>
                        <span style={{ fontSize: '0.75rem' }}>▼</span>
                    </button>

                    {/* Dropdown */}
                    {showDropdown && (
                        <>
                            <div
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 50
                                }}
                                onClick={() => setShowDropdown(false)}
                            />
                            <div
                                className="glass-card"
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    minWidth: '180px',
                                    zIndex: 100
                                }}
                            >
                                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                                    <div className="font-semibold">{user?.name}</div>
                                    <div className="text-sm text-muted">{user?.email}</div>
                                    <span className="badge badge-primary" style={{ marginTop: '0.5rem' }}>
                                        {user?.role}
                                    </span>
                                </div>

                                <button
                                    className="btn btn-ghost w-full"
                                    style={{ justifyContent: 'flex-start' }}
                                    onClick={() => {
                                        setShowDropdown(false)
                                        navigate(isTeacher ? '/teacher' : '/student/profile')
                                    }}
                                >
                                    👤 Profile
                                </button>

                                <button
                                    className="btn btn-ghost w-full"
                                    style={{ justifyContent: 'flex-start', color: 'var(--error-color)' }}
                                    onClick={handleLogout}
                                >
                                    🚪 Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar
