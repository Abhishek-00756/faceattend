import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { isValidEmail } from '../../utils/helpers'

function SignupPage() {
    const navigate = useNavigate()
    const { signup, isLoading } = useAuth()
    const { success, error: showError } = useToast()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState({})

    const validate = () => {
        const newErrors = {}

        if (!name.trim()) {
            newErrors.name = 'Name is required'
        } else if (name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters'
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required'
        } else if (!isValidEmail(email)) {
            newErrors.email = 'Please enter a valid email'
        }

        if (!password) {
            newErrors.password = 'Password is required'
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validate()) return

        try {
            await signup(name.trim(), email.trim(), password)
            success('Account created successfully! 🎉')
            navigate('/teacher')
        } catch (err) {
            showError(err.message)
            setErrors({ form: err.message })
        }
    }

    return (
        <div className="auth-page">
            {/* Animated Background */}
            <div className="auth-bg"></div>

            {/* Signup Card */}
            <div className="auth-card glass-card">
                {/* Logo */}
                <div className="logo">
                    <img src="/favicon.svg" alt="FaceAttend" />
                    <span className="text-gradient">FaceAttend</span>
                </div>

                <h2>Create Account</h2>
                <p className="subtitle">Sign up as a teacher to get started</p>

                {/* Signup Form */}
                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* Name Input */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Full Name</label>
                        <div className="input-with-icon">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                id="name"
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="name"
                            />
                        </div>
                        {errors.name && <span className="form-error">{errors.name}</span>}
                    </div>

                    {/* Email Input */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <div className="input-with-icon">
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                id="email"
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && <span className="form-error">{errors.email}</span>}
                    </div>

                    {/* Password Input */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <div className="input-with-icon">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
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
                        {errors.password && <span className="form-error">{errors.password}</span>}
                    </div>

                    {/* Confirm Password Input */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                        <div className="input-with-icon">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                        {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                    </div>

                    {/* General Error */}
                    {errors.form && (
                        <div className="form-error" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            {errors.form}
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
                                Creating account...
                            </>
                        ) : (
                            <>
                                Create Account
                                <span>→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    )
}

export default SignupPage
