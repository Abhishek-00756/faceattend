import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../common/Layout'
import { useAuth } from '../../context/AuthContext'
import { useAttendance } from '../../context/AttendanceContext'
import { studentStore, attendanceStore } from '../../services/storage'
import { formatDate, formatTime, getRelativeTime, calculateAttendancePercentage } from '../../utils/helpers'

function StudentDashboard() {
    const { user } = useAuth()
    const { activeSession, hasMarkedToday, todayAttendance } = useAttendance()

    const [student, setStudent] = useState(null)
    const [stats, setStats] = useState({
        totalDays: 0,
        presentDays: 0,
        percentage: 0
    })
    const [recentAttendance, setRecentAttendance] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (user?.studentId) {
            loadStudentData()
        }
    }, [user])

    // Periodically refresh to check for active sessions (every 10 seconds)
    useEffect(() => {
        if (!user?.studentId) return

        const interval = setInterval(() => {
            // Re-fetch active session status
            loadStudentData()
        }, 10000)

        return () => clearInterval(interval)
    }, [user])

    const loadStudentData = async () => {
        setIsLoading(true)
        try {
            // Get student profile
            const studentData = await studentStore.get(user.studentId)
            setStudent(studentData)

            // Get attendance records
            const records = await attendanceStore.getByStudent(user.studentId)

            // Calculate stats
            const presentDays = records.length
            // Assuming one session per day for simplicity
            const uniqueDates = [...new Set(records.map(r => r.date))]

            setStats({
                totalDays: Math.max(uniqueDates.length, presentDays),
                presentDays,
                percentage: presentDays > 0 ? Math.min(100, Math.round((presentDays / Math.max(1, presentDays)) * 100)) : 0
            })

            // Recent attendance
            const recent = records
                .sort((a, b) => new Date(b.time) - new Date(a.time))
                .slice(0, 7)
            setRecentAttendance(recent)

        } catch (error) {
            console.error('Error loading student data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const hasMarked = user?.studentId && hasMarkedToday(user.studentId)

    // Manual refresh to check for sessions
    const handleRefresh = () => {
        loadStudentData()
        // Also trigger context refresh
        if (window.location.reload) {
            window.location.reload()
        }
    }

    return (
        <Layout
            title={`Hello, ${student?.name?.split(' ')[0] || user?.name?.split(' ')[0]}! 👋`}
            subtitle={`Here's your attendance overview - ${formatDate(new Date())}`}
        >
            {/* Attendance Action Card */}
            <div
                className="glass-card p-xl mb-lg"
                style={{
                    background: activeSession
                        ? 'linear-gradient(135deg, rgba(40, 167, 69, 0.1), rgba(32, 201, 151, 0.1))'
                        : 'linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(232, 62, 140, 0.1))'
                }}
            >
                <div className="flex items-center justify-between flex-wrap gap-lg">
                    <div>
                        <div className="flex items-center gap-md mb-sm">
                            <span
                                className={`session-timer ${activeSession ? '' : 'inactive'}`}
                            >
                                <span className="timer-dot"></span>
                                {activeSession ? 'Attendance Open' : 'No Active Session'}
                            </span>
                        </div>

                        <h2 style={{ margin: '0 0 0.5rem' }}>
                            {activeSession
                                ? hasMarked
                                    ? '✅ Attendance Marked!'
                                    : '📸 Mark Your Attendance'
                                : '⏳ Waiting for Session'}
                        </h2>

                        <p className="text-muted" style={{ margin: 0 }}>
                            {activeSession
                                ? hasMarked
                                    ? 'You have successfully marked your attendance for today.'
                                    : 'Face scan your attendance before the session ends.'
                                : 'Your teacher will start an attendance session soon.'}
                        </p>
                    </div>

                    {activeSession && !hasMarked && (
                        <Link to="/student/scan" className="btn btn-success btn-lg">
                            📸 Scan Face Now
                        </Link>
                    )}

                    {!activeSession && (
                        <button onClick={handleRefresh} className="btn btn-secondary btn-lg">
                            🔄 Refresh
                        </button>
                    )}

                    {hasMarked && (
                        <div className="status-icon success" style={{ width: '80px', height: '80px', margin: 0 }}>
                            ✓
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-lg mb-lg">
                <div className="glass-card p-lg text-center">
                    <div className="flex justify-center mb-md">
                        {/* Attendance Gauge */}
                        <div className="progress-ring" style={{ width: '100px', height: '100px' }}>
                            <svg width="100" height="100" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#667eea" />
                                        <stop offset="100%" stopColor="#764ba2" />
                                    </linearGradient>
                                </defs>
                                <circle
                                    className="bg"
                                    cx="50" cy="50" r="42"
                                    fill="none"
                                    stroke="var(--border-color)"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="50" cy="50" r="42"
                                    fill="none"
                                    stroke="url(#progressGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 42}`}
                                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - stats.percentage / 100)}`}
                                    style={{
                                        transform: 'rotate(-90deg)',
                                        transformOrigin: '50% 50%',
                                        transition: 'stroke-dashoffset 0.5s ease'
                                    }}
                                />
                            </svg>
                            <div
                                className="value"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <span className="percentage" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                    {stats.percentage}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <h4 style={{ margin: '0 0 0.25rem' }}>Overall Attendance</h4>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                        {stats.percentage >= 75 ? 'Great job! 🌟' : stats.percentage >= 50 ? 'Can improve 💪' : 'Need attention ⚠️'}
                    </p>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(40, 167, 69, 0.15)', color: 'var(--success-color)' }}>
                        ✅
                    </div>
                    <div className="stat-value">{stats.presentDays}</div>
                    <div className="stat-label">Days Present</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(102, 126, 234, 0.15)', color: 'var(--primary-color)' }}>
                        📅
                    </div>
                    <div className="stat-value">{stats.totalDays}</div>
                    <div className="stat-label">Total Sessions</div>
                </div>
            </div>

            {/* Quick Actions & Recent */}
            <div className="grid grid-cols-2 gap-lg">
                {/* Quick Actions */}
                <div className="glass-card p-lg">
                    <h3 className="mb-lg">⚡ Quick Actions</h3>

                    <div className="flex flex-col gap-md">
                        <Link
                            to="/student/scan"
                            className={`btn btn-lg ${activeSession && !hasMarked ? 'btn-success' : 'btn-secondary'}`}
                        >
                            <span>📸</span>
                            Mark Attendance
                            {hasMarked && <span className="badge badge-success" style={{ marginLeft: 'auto' }}>Done</span>}
                        </Link>

                        <Link to="/student/history" className="btn btn-secondary btn-lg">
                            <span>📅</span>
                            View History
                        </Link>

                        <Link to="/student/profile" className="btn btn-secondary btn-lg">
                            <span>👤</span>
                            My Profile
                        </Link>
                    </div>
                </div>

                {/* Recent Attendance */}
                <div className="glass-card p-lg">
                    <div className="flex items-center justify-between mb-lg">
                        <h3 style={{ margin: 0 }}>📅 Recent Attendance</h3>
                        <Link to="/student/history" className="btn btn-sm btn-ghost">
                            View All →
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center p-lg">
                            <div className="spinner"></div>
                        </div>
                    ) : recentAttendance.length > 0 ? (
                        <div className="flex flex-col gap-sm">
                            {recentAttendance.map(record => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between p-sm"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                >
                                    <div className="flex items-center gap-md">
                                        <span className="badge badge-success">✓</span>
                                        <div>
                                            <p className="font-medium" style={{ margin: 0 }}>
                                                {formatDate(record.date)}
                                            </p>
                                            <p className="text-sm text-muted" style={{ margin: 0 }}>
                                                {formatTime(record.time)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted">{getRelativeTime(record.time)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 'var(--spacing-lg)' }}>
                            <div className="icon" style={{ fontSize: '2rem' }}>📭</div>
                            <p className="text-muted">No attendance records yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Student Info Card */}
            {student && (
                <div className="glass-card p-lg mt-lg">
                    <h3 className="mb-md">👤 Your Profile</h3>
                    <div className="flex items-center gap-lg">
                        <div className="avatar avatar-xl">
                            {student.photo ? (
                                <img src={student.photo} alt={student.name} />
                            ) : (
                                student.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 0.25rem' }}>{student.name}</h4>
                            <p className="text-muted" style={{ margin: '0 0 0.5rem' }}>
                                Roll No: {student.rollNo}
                            </p>
                            <div className="flex gap-sm">
                                {student.className && (
                                    <span className="badge badge-primary">
                                        {student.className} {student.section && `- ${student.section}`}
                                    </span>
                                )}
                                <span className="badge badge-success">Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default StudentDashboard
