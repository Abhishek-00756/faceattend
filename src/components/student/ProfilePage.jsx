import { useState, useEffect } from 'react'
import Layout from '../common/Layout'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { studentStore } from '../../services/storage'
import { formatDate } from '../../utils/helpers'
import { registerFingerprint, isWebAuthnSupported, isBiometricAvailable } from '../../services/webauthn'

function ProfilePage() {
    const { user, updateProfile, changePassword, logout, saveCredentialId, getCredentialId } = useAuth()
    const { success, error: showError } = useToast()

    const [student, setStudent] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [fingerprintRegistered, setFingerprintRegistered] = useState(false)
    const [fingerprintLoading, setFingerprintLoading] = useState(false)
    const [biometricSupported, setBiometricSupported] = useState(true)

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [passwordErrors, setPasswordErrors] = useState({})

    useEffect(() => {
        if (user?.studentId) {
            loadStudentProfile()
        }
        // Check biometric support
        isBiometricAvailable().then(available => setBiometricSupported(available))
        // Check if fingerprint already registered
        if (user?.id) {
            getCredentialId(user.id).then(id => setFingerprintRegistered(!!id))
        }
    }, [user])

    const loadStudentProfile = async () => {
        setIsLoading(true)
        try {
            const studentData = await studentStore.get(user.studentId)
            setStudent(studentData)
        } catch (error) {
            console.error('Error loading profile:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordChange = (e) => {
        const { name, value } = e.target
        setPasswordData(prev => ({ ...prev, [name]: value }))
        setPasswordErrors(prev => ({ ...prev, [name]: '' }))
    }

    const validatePassword = () => {
        const errors = {}

        if (!passwordData.currentPassword) {
            errors.currentPassword = 'Current password is required'
        }

        if (!passwordData.newPassword) {
            errors.newPassword = 'New password is required'
        } else if (passwordData.newPassword.length < 6) {
            errors.newPassword = 'Password must be at least 6 characters'
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match'
        }

        setPasswordErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()

        if (!validatePassword()) return

        try {
            await changePassword(passwordData.currentPassword, passwordData.newPassword)
            success('Password changed successfully!')
            setShowPasswordModal(false)
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error) {
            showError(error.message)
        }
    }

    const handleRegisterFingerprint = async () => {
        if (!isWebAuthnSupported()) {
            showError('Your browser does not support biometric authentication.')
            return
        }
        setFingerprintLoading(true)
        try {
            const credentialId = await registerFingerprint(user.id, user.name || user.email)
            await saveCredentialId(credentialId)
            setFingerprintRegistered(true)
            success('Fingerprint registered! 👍 Your attendance will now require fingerprint verification.')
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                showError('Fingerprint registration was cancelled. Please try again.')
            } else {
                showError(err.message || 'Failed to register fingerprint.')
            }
        } finally {
            setFingerprintLoading(false)
        }
    }

    if (isLoading) {
        return (
            <Layout title="Profile">
                <div className="flex items-center justify-center p-xl">
                    <div className="spinner"></div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout
            title="My Profile"
            subtitle="View and manage your profile information"
        >
            <div className="grid grid-cols-2 gap-lg">
                {/* Profile Card */}
                <div className="glass-card p-xl">
                    <div className="flex flex-col items-center text-center">
                        {/* Avatar */}
                        <div
                            className="avatar avatar-xl mb-lg"
                            style={{
                                width: '120px',
                                height: '120px',
                                fontSize: '3rem',
                                border: '4px solid var(--primary-color)'
                            }}
                        >
                            {student?.photo ? (
                                <img src={student.photo} alt={student.name} />
                            ) : (
                                student?.name?.charAt(0) || user?.name?.charAt(0)
                            )}
                        </div>

                        <h2 style={{ margin: '0 0 0.5rem' }}>{student?.name || user?.name}</h2>
                        <p className="text-muted" style={{ margin: '0 0 1rem' }}>{user?.email}</p>

                        <span className="badge badge-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                            👨‍🎓 Student
                        </span>
                    </div>

                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                    {/* Details */}
                    <div className="flex flex-col gap-md">
                        <div className="flex items-center justify-between">
                            <span className="text-muted">Roll Number</span>
                            <span className="font-medium">{student?.rollNo}</span>
                        </div>

                        {student?.className && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Class</span>
                                <span className="font-medium">
                                    {student.className} {student.section && `- Section ${student.section}`}
                                </span>
                            </div>
                        )}

                        {student?.phone && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Phone</span>
                                <span className="font-medium">{student.phone}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <span className="text-muted">Member Since</span>
                            <span className="font-medium">
                                {student?.createdAt ? formatDate(student.createdAt) : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Settings Card */}
                <div className="glass-card p-xl">
                    <h3 className="mb-lg">⚙️ Account Settings</h3>

                    <div className="flex flex-col gap-md">
                        {/* Change Password */}
                        <button
                            className="btn btn-secondary btn-lg w-full"
                            style={{ justifyContent: 'flex-start' }}
                            onClick={() => setShowPasswordModal(true)}
                        >
                            <span>🔐</span>
                            Change Password
                        </button>

                        {/* Fingerprint Registration */}
                        <button
                            className={`btn btn-lg w-full ${fingerprintRegistered ? 'btn-success' : 'btn-primary'}`}
                            style={{ justifyContent: 'flex-start' }}
                            onClick={handleRegisterFingerprint}
                            disabled={fingerprintLoading || !biometricSupported}
                        >
                            {fingerprintLoading ? (
                                <><div className="spinner sm" style={{ marginRight: '0.5rem' }}></div> Registering...</>
                            ) : fingerprintRegistered ? (
                                <><span>✅</span> Fingerprint Registered</>
                            ) : (
                                <><span>👆</span> Register Fingerprint</>
                            )}
                            {!biometricSupported && (
                                <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>Not Supported</span>
                            )}
                        </button>

                        {/* Theme Toggle Placeholder */}
                        <button
                            className="btn btn-secondary btn-lg w-full"
                            style={{ justifyContent: 'flex-start' }}
                            disabled
                        >
                            <span>🎨</span>
                            Theme Settings
                            <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>Coming Soon</span>
                        </button>

                        {/* Notification Settings Placeholder */}
                        <button
                            className="btn btn-secondary btn-lg w-full"
                            style={{ justifyContent: 'flex-start' }}
                            disabled
                        >
                            <span>🔔</span>
                            Notifications
                            <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>Coming Soon</span>
                        </button>
                    </div>

                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                    {/* Danger Zone */}
                    <div>
                        <h4 className="text-error mb-md">⚠️ Danger Zone</h4>
                        <button
                            className="btn btn-danger w-full"
                            onClick={() => {
                                if (confirm('Are you sure you want to log out?')) {
                                    logout()
                                }
                            }}
                        >
                            🚪 Log Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Face Recognition Info */}
            <div className="glass-card p-lg mt-lg">
                <div className="flex items-center gap-lg">
                    <div
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}
                    >
                        {student?.photo ? (
                            <img
                                src={student.photo}
                                alt="Registered face"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div
                                className="flex items-center justify-center"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: 'var(--bg-tertiary)'
                                }}
                            >
                                📸
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 style={{ margin: '0 0 0.25rem' }}>Registered Face</h4>
                        <p className="text-muted" style={{ margin: 0 }}>
                            Your face is registered for attendance verification.
                            {student?.photo
                                ? ' The system will recognize you when you scan.'
                                : ' Contact your teacher to register your face.'}
                        </p>
                    </div>

                    <span className={`badge ${student?.photo ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: 'auto' }}>
                        {student?.photo ? '✓ Registered' : '⚠ Not Registered'}
                    </span>
                </div>
            </div>

            {/* Change Password Modal */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setPasswordErrors({})
                }}
                title="Change Password"
                footer={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowPasswordModal(false)
                                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                setPasswordErrors({})
                            }}
                        >
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handlePasswordSubmit}>
                            Update Password
                        </button>
                    </>
                }
            >
                <form onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                        <label className="form-label">Current Password</label>
                        <input
                            type="password"
                            name="currentPassword"
                            className={`form-input ${passwordErrors.currentPassword ? 'error' : ''}`}
                            placeholder="Enter current password"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                        />
                        {passwordErrors.currentPassword && (
                            <span className="form-error">{passwordErrors.currentPassword}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            name="newPassword"
                            className={`form-input ${passwordErrors.newPassword ? 'error' : ''}`}
                            placeholder="Enter new password"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                        />
                        {passwordErrors.newPassword && (
                            <span className="form-error">{passwordErrors.newPassword}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className={`form-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
                            placeholder="Confirm new password"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                        />
                        {passwordErrors.confirmPassword && (
                            <span className="form-error">{passwordErrors.confirmPassword}</span>
                        )}
                    </div>
                </form>
            </Modal>
        </Layout>
    )
}

export default ProfilePage
