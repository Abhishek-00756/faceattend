import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ROLES } from '../../utils/constants'

function LoginPage() {
    const navigate = useNavigate()
    const { login, isLoading, error, clearError } = useAuth()
    const { success, error: showError } = useToast()

    const [role, setRole] = useState(ROLES.TEACHER)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [formError, setFormError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setFormError('')
        clearError()

        // Validation
        if (!email.trim()) {
            setFormError('Please enter your email')
            return
        }
        if (!password) {
            setFormError('Please enter your password')
            return
        }

        try {
            await login(email, password, role)
            success('Welcome back! 🎉')
            navigate(role === ROLES.TEACHER ? '/teacher' : '/student')
        } catch (err) {
            showError(err.message)
            setFormError(err.message)
        }
    }

    return (
        <div className="auth-page">
            {/* Animated Background */}
            <div className="auth-bg"></div>

            {/* Login Card */}
            <div className="auth-card glass-card">
                {/* Logo */}
                <div className="logo">
                    <img src="/favicon.svg" alt="FaceAttend" />
                    <span className="text-gradient">FaceAttend</span>
                </div>

                <h2>Welcome Back</h2>
                <p className="subtitle">Sign in to continue to your dashboard</p>

                {/* Role Selector */}
                <div className="role-selector">
                    <button
                        type="button"
                        className={`role-btn ${role === ROLES.TEACHER ? 'active' : ''}`}
                        onClick={() => setRole(ROLES.TEACHER)}
                    >
                        <span className="role-icon">👨‍🏫</span>
                        <span className="role-label">Teacher</span>
                    </button>
                    <button
                        type="button"
                        className={`role-btn ${role === ROLES.STUDENT ? 'active' : ''}`}
                        onClick={() => setRole(ROLES.STUDENT)}
                    >
                        <span className="role-icon">👨‍🎓</span>
                        <span className="role-label">Student</span>
                    </button>
                </div>

                {/* Login Form */}
                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* Email Input */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <div className="input-with-icon">
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                id="email"
                                className={`form-input ${formError && !email ? 'error' : ''}`}
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <div className="input-with-icon">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                className={`form-input ${formError && !password ? 'error' : ''}`}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="input-action"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <a href="#" className="forgot-link">Forgot password?</a>

                    {/* Error Message */}
                    {formError && (
                        <div className="form-error" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            {formError}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner sm"></span>
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <span>→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                {role === ROLES.TEACHER && (
                    <div className="auth-footer">
                        Don't have an account?{' '}
                        <Link to="/signup">Create one</Link>
                    </div>
                )}

                {role === ROLES.STUDENT && (
                    <div className="auth-footer">
                        <span className="text-muted">
                            Student accounts are created by teachers.
                            <br />Contact your teacher for login credentials.
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LoginPage
