import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../common/Layout'
import { useAuth } from '../../context/AuthContext'
import { useAttendance } from '../../context/AttendanceContext'
import { studentStore, attendanceStore, sessionStore } from '../../services/storage'
import { getTodayDate, formatDate, formatTime, getRelativeTime } from '../../utils/helpers'
import { STAT_ICONS } from '../../utils/constants'

function TeacherDashboard() {
    const { user } = useAuth()
    const { activeSession, students, refresh } = useAttendance()
    const [stats, setStats] = useState({
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        totalSessions: 0
    })
    const [recentActivity, setRecentActivity] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadDashboardData()
    }, [user])

    const loadDashboardData = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            // Get students
            const teacherStudents = await studentStore.getByTeacher(user.id)

            // Get today's attendance
            const today = getTodayDate()
            const allAttendance = await attendanceStore.getAll()
            const todaysAttendance = allAttendance.filter(a => a.date === today)

            // Get student IDs who marked attendance today
            const presentStudentIds = new Set(todaysAttendance.map(a => a.studentId))
            const presentToday = teacherStudents.filter(s => presentStudentIds.has(s.id)).length

            // Get sessions
            const sessions = await sessionStore.getByTeacher(user.id)

            setStats({
                totalStudents: teacherStudents.length,
                presentToday,
                absentToday: teacherStudents.length - presentToday,
                totalSessions: sessions.length
            })

            // Build recent activity
            const activity = []

            // Add recent attendance marks
            const recentAttendance = todaysAttendance
                .sort((a, b) => new Date(b.time) - new Date(a.time))
                .slice(0, 5)

            for (const record of recentAttendance) {
                const student = teacherStudents.find(s => s.id === record.studentId)
                if (student) {
                    activity.push({
                        id: record.id,
                        type: 'attendance',
                        message: `${student.name} marked attendance`,
                        time: record.time,
                        icon: '✅'
                    })
                }
            }

            // Add recent sessions
            const recentSessions = sessions
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                .slice(0, 3)

            for (const session of recentSessions) {
                activity.push({
                    id: session.id,
                    type: 'session',
                    message: session.status === 'active'
                        ? 'Attendance session started'
                        : 'Attendance session ended',
                    time: session.startTime,
                    icon: session.status === 'active' ? '🟢' : '🔴'
                })
            }

            // Sort by time and take top 8
            activity.sort((a, b) => new Date(b.time) - new Date(a.time))
            setRecentActivity(activity.slice(0, 8))

        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Layout
            title={`Welcome back, ${user?.name?.split(' ')[0]}! 👋`}
            subtitle={`Here's what's happening with your attendance today - ${formatDate(new Date())}`}
        >
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-lg mb-xl">
                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(102, 126, 234, 0.15)', color: 'var(--primary-color)' }}>
                        {STAT_ICONS.STUDENTS}
                    </div>
                    <div className="stat-value">{stats.totalStudents}</div>
                    <div className="stat-label">Total Students</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(40, 167, 69, 0.15)', color: 'var(--success-color)' }}>
                        {STAT_ICONS.PRESENT}
                    </div>
                    <div className="stat-value">{stats.presentToday}</div>
                    <div className="stat-label">Present Today</div>
                    {stats.totalStudents > 0 && (
                        <div className="stat-change positive">
                            ↑ {Math.round((stats.presentToday / stats.totalStudents) * 100)}%
                        </div>
                    )}
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(220, 53, 69, 0.15)', color: 'var(--error-color)' }}>
                        {STAT_ICONS.ABSENT}
                    </div>
                    <div className="stat-value">{stats.absentToday}</div>
                    <div className="stat-label">Absent Today</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(255, 193, 7, 0.15)', color: 'var(--warning-color)' }}>
                        {STAT_ICONS.SESSIONS}
                    </div>
                    <div className="stat-value">{stats.totalSessions}</div>
                    <div className="stat-label">Total Sessions</div>
                </div>
            </div>

            {/* Quick Actions & Activity */}
            <div className="grid grid-cols-2 gap-lg">
                {/* Quick Actions */}
                <div className="glass-card p-lg">
                    <h3 className="mb-lg">⚡ Quick Actions</h3>

                    <div className="flex flex-col gap-md">
                        <Link to="/teacher/register-student" className="btn btn-primary btn-lg">
                            <span>➕</span>
                            Register New Student
                        </Link>

                        <Link to="/teacher/attendance" className="btn btn-success btn-lg">
                            <span>📋</span>
                            {activeSession ? 'Manage Attendance Session' : 'Start Attendance Session'}
                        </Link>

                        <Link to="/teacher/classes" className="btn btn-secondary btn-lg">
                            <span>📚</span>
                            Manage Classes
                        </Link>

                        <Link to="/teacher/reports" className="btn btn-secondary btn-lg">
                            <span>📊</span>
                            View Reports
                        </Link>
                    </div>

                    {/* Active Session Alert */}
                    {activeSession && (
                        <div
                            className="mt-lg p-md"
                            style={{
                                background: 'rgba(40, 167, 69, 0.1)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--success-color)'
                            }}
                        >
                            <div className="flex items-center gap-sm">
                                <span className="session-timer">
                                    <span className="timer-dot"></span>
                                    Session Active
                                </span>
                            </div>
                            <p className="text-sm mt-sm" style={{ margin: 0 }}>
                                Started at {formatTime(activeSession.startTime)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="glass-card p-lg">
                    <h3 className="mb-lg">📝 Recent Activity</h3>

                    {isLoading ? (
                        <div className="flex items-center justify-center p-xl">
                            <div className="spinner"></div>
                        </div>
                    ) : recentActivity.length > 0 ? (
                        <div className="flex flex-col gap-sm">
                            {recentActivity.map(activity => (
                                <div
                                    key={activity.id}
                                    className="flex items-center gap-md p-sm"
                                    style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        paddingBottom: 'var(--spacing-sm)'
                                    }}
                                >
                                    <span style={{ fontSize: '1.25rem' }}>{activity.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-medium" style={{ margin: 0, fontSize: '0.9rem' }}>
                                            {activity.message}
                                        </p>
                                        <p className="text-sm text-muted" style={{ margin: 0 }}>
                                            {getRelativeTime(activity.time)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="icon">📭</div>
                            <h4>No recent activity</h4>
                            <p>Start an attendance session or register students to see activity here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Today's Attendance Overview */}
            {students.length > 0 && (
                <div className="glass-card p-lg mt-lg">
                    <div className="flex items-center justify-between mb-lg">
                        <h3>👥 Today's Attendance Overview</h3>
                        <Link to="/teacher/reports" className="btn btn-sm btn-ghost">
                            View All →
                        </Link>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll No</th>
                                    <th>Class</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.slice(0, 5).map(student => {
                                    const attendance = recentActivity.find(a =>
                                        a.type === 'attendance' && a.message.includes(student.name)
                                    )
                                    const isPresent = !!attendance

                                    return (
                                        <tr key={student.id}>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <div className="avatar avatar-sm">
                                                        {student.photo ? (
                                                            <img src={student.photo} alt={student.name} />
                                                        ) : (
                                                            student.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="font-medium">{student.name}</span>
                                                </div>
                                            </td>
                                            <td>{student.rollNo}</td>
                                            <td>{student.className || '-'}</td>
                                            <td>
                                                <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>
                                                    {isPresent ? 'Present' : 'Absent'}
                                                </span>
                                            </td>
                                            <td className="text-muted">
                                                {attendance ? formatTime(attendance.time) : '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default TeacherDashboard
