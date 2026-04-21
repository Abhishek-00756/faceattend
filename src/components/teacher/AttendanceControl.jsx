import { useState, useEffect } from 'react'
import Layout from '../common/Layout'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAttendance } from '../../context/AttendanceContext'
import { studentStore, classStore, attendanceStore } from '../../services/storage'
import { formatTime, formatDate, getRelativeTime } from '../../utils/helpers'

function AttendanceControl() {
    const { user } = useAuth()
    const { success, error: showError, info } = useToast()
    const {
        activeSession,
        startSession,
        endSession,
        students,
        todayAttendance,
        refresh,
        loadTodayAttendance
    } = useAttendance()

    const [isLoading, setIsLoading] = useState(false)
    const [classes, setClasses] = useState([])
    const [selectedClass, setSelectedClass] = useState('')
    const [sessionDuration, setSessionDuration] = useState(30)
    const [sessionTime, setSessionTime] = useState(0)
    const [liveAttendance, setLiveAttendance] = useState([])


    // Load classes
    useEffect(() => {
        loadClasses()
    }, [user])

    // Session timer
    useEffect(() => {
        let interval
        if (activeSession) {
            const startTime = new Date(activeSession.startTime).getTime()

            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000)
                setSessionTime(elapsed)
            }, 1000)
        } else {
            setSessionTime(0)
        }

        return () => clearInterval(interval)
    }, [activeSession])

    // Live attendance updates
    useEffect(() => {
        if (activeSession) {
            const interval = setInterval(() => {
                loadTodayAttendance()
            }, 5000) // Refresh every 5 seconds

            return () => clearInterval(interval)
        }
    }, [activeSession])

    // Update live attendance when today's attendance changes
    useEffect(() => {
        if (activeSession) {
            const sessionAttendance = todayAttendance.filter(a => a.sessionId === activeSession.id)
            const attendanceWithStudents = sessionAttendance.map(a => {
                const student = students.find(s => s.id === a.studentId)
                return { ...a, student }
            }).sort((a, b) => new Date(b.time) - new Date(a.time))

            setLiveAttendance(attendanceWithStudents)
        } else {
            setLiveAttendance([])
        }
    }, [todayAttendance, activeSession, students])

    const loadClasses = async () => {
        if (!user) return
        const teacherClasses = await classStore.getByTeacher(user.id)
        setClasses(teacherClasses)
    }

    const formatSessionTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const handleStartSession = async () => {
        setIsLoading(true)

        try {
            await startSession(selectedClass || 'all', sessionDuration)
            success('Attendance session started! 🟢 Students can now mark attendance.')
        } catch (err) {
            showError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleEndSession = async () => {
        console.log('handleEndSession called')
        console.log('Current activeSession:', activeSession)

        // Remove confirm for now to debug
        // if (!confirm('Are you sure you want to end this session?')) return

        setIsLoading(true)
        try {
            console.log('Calling endSession with activeSession:', activeSession)
            const result = await endSession(activeSession)
            console.log('endSession result:', result)
            success('Attendance session ended! 🔴')
            refresh()
        } catch (err) {
            console.error('Error in handleEndSession:', err)
            showError(err.message || 'Failed to end session')
        } finally {
            setIsLoading(false)
        }
    }

    const presentCount = liveAttendance.length
    const totalStudents = students.length
    const absentCount = totalStudents - presentCount
    const attendancePercentage = totalStudents > 0
        ? Math.round((presentCount / totalStudents) * 100)
        : 0

    return (
        <Layout
            title="Attendance Control"
            subtitle="Start and manage attendance sessions"
        >
            {/* Session Status Card */}
            <div className="glass-card p-xl mb-lg">
                <div className="flex items-center justify-between flex-wrap gap-lg">
                    <div>
                        <h2 className="mb-sm">
                            {activeSession ? '🟢 Session Active' : '🔴 No Active Session'}
                        </h2>

                        {activeSession && (
                            <p className="text-muted" style={{ margin: 0 }}>
                                Started at {formatTime(activeSession.startTime)} •
                                Running for {formatSessionTime(sessionTime)}
                            </p>
                        )}

                        {!activeSession && (
                            <p className="text-muted" style={{ margin: 0 }}>
                                Start a session to allow students to mark attendance via face scan
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-md">
                        {activeSession ? (
                            <>
                                <div className="session-timer">
                                    <span className="timer-dot"></span>
                                    {formatSessionTime(sessionTime)}
                                </div>

                                <button
                                    className="btn btn-danger btn-lg"
                                    onClick={handleEndSession}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Ending...' : '⏹ End Session'}
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-success btn-lg"
                                onClick={handleStartSession}
                                disabled={isLoading || students.length === 0}
                            >
                                {isLoading ? 'Starting...' : '▶ Start Session'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Session Settings (when no session active) */}
                {!activeSession && (
                    <div className="mt-lg pt-lg" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <h4 className="mb-md">Session Settings</h4>

                        <div className="grid grid-cols-2 gap-md" style={{ maxWidth: '400px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Class (Optional)</label>
                                <select
                                    className="form-input form-select"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    <option value="">All Classes</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} - {c.section}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Duration (minutes)</label>
                                <select
                                    className="form-input form-select"
                                    value={sessionDuration}
                                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                    <option value={120}>2 hours</option>
                                </select>
                            </div>
                        </div>



                        {students.length === 0 && (
                            <div
                                className="mt-lg p-md"
                                style={{
                                    background: 'rgba(255, 193, 7, 0.1)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--warning-color)'
                                }}
                            >
                                <p className="text-warning" style={{ margin: 0 }}>
                                    ⚠️ You haven't registered any students yet.
                                    <a href="/teacher/register-student" style={{ marginLeft: '0.5rem' }}>Register students first</a>
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Live Stats & Attendance */}
            {activeSession && (
                <div className="grid grid-cols-3 gap-lg">
                    {/* Stats */}
                    <div className="glass-card p-lg">
                        <h3 className="mb-lg">📊 Live Statistics</h3>

                        {/* Attendance Progress Ring */}
                        <div className="flex justify-center mb-lg">
                            <div className="progress-ring">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#667eea" />
                                            <stop offset="100%" stopColor="#764ba2" />
                                        </linearGradient>
                                    </defs>
                                    <circle className="bg" cx="60" cy="60" r="52" />
                                    <circle
                                        className="progress"
                                        cx="60"
                                        cy="60"
                                        r="52"
                                        strokeDasharray={`${2 * Math.PI * 52}`}
                                        strokeDashoffset={`${2 * Math.PI * 52 * (1 - attendancePercentage / 100)}`}
                                    />
                                </svg>
                                <div className="value">
                                    <span className="percentage">{attendancePercentage}%</span>
                                    <span className="label">Attendance</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="flex flex-col gap-md">
                            <div
                                className="flex items-center justify-between p-md"
                                style={{ background: 'rgba(40, 167, 69, 0.1)', borderRadius: 'var(--radius-lg)' }}
                            >
                                <span>✅ Present</span>
                                <span className="font-bold text-success">{presentCount}</span>
                            </div>

                            <div
                                className="flex items-center justify-between p-md"
                                style={{ background: 'rgba(220, 53, 69, 0.1)', borderRadius: 'var(--radius-lg)' }}
                            >
                                <span>❌ Absent</span>
                                <span className="font-bold text-error">{absentCount}</span>
                            </div>

                            <div
                                className="flex items-center justify-between p-md"
                                style={{ background: 'rgba(102, 126, 234, 0.1)', borderRadius: 'var(--radius-lg)' }}
                            >
                                <span>👥 Total</span>
                                <span className="font-bold">{totalStudents}</span>
                            </div>
                        </div>
                    </div>

                    {/* Live Feed */}
                    <div className="glass-card p-lg" style={{ gridColumn: 'span 2' }}>
                        <div className="flex items-center justify-between mb-lg">
                            <h3>🔴 Live Attendance Feed</h3>
                            <span className="badge badge-success">
                                <span className="timer-dot" style={{ marginRight: '0.5rem' }}></span>
                                Updating live
                            </span>
                        </div>

                        {liveAttendance.length > 0 ? (
                            <div className="flex flex-col gap-sm" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {liveAttendance.map((record, index) => (
                                    <div
                                        key={record.id}
                                        className="flex items-center gap-md p-md"
                                        style={{
                                            background: index === 0 ? 'rgba(40, 167, 69, 0.1)' : 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-lg)',
                                            animation: index === 0 ? 'slideUp 0.3s ease' : 'none'
                                        }}
                                    >
                                        <div className="avatar avatar-md">
                                            {record.student?.photo ? (
                                                <img src={record.student.photo} alt={record.student?.name} />
                                            ) : (
                                                record.student?.name?.charAt(0) || '?'
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <p className="font-medium" style={{ margin: 0 }}>
                                                {record.student?.name || 'Unknown Student'}
                                            </p>
                                            <p className="text-sm text-muted" style={{ margin: 0 }}>
                                                {record.student?.rollNo} • {record.method === 'face' ? '📸 Face Scan' : '✍️ Manual'}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <span className="badge badge-success">Present</span>
                                            <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0' }}>
                                                {formatTime(record.time)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="icon">⏳</div>
                                <h4>Waiting for students...</h4>
                                <p>Students can now mark their attendance by scanning their face on their devices.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* All Students List (when no session) */}
            {!activeSession && students.length > 0 && (
                <div className="glass-card p-lg">
                    <h3 className="mb-lg">👥 Registered Students ({students.length})</h3>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll No</th>
                                    <th>Class</th>
                                    <th>Email</th>
                                    <th>Registered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
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
                                        <td className="text-muted">{student.email}</td>
                                        <td className="text-muted">{getRelativeTime(student.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default AttendanceControl
