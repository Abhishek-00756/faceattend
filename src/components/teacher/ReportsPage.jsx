import { useState, useEffect } from 'react'
import Layout from '../common/Layout'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { studentStore, attendanceStore, sessionStore, classStore } from '../../services/storage'
import {
    formatDate,
    formatTime,
    getTodayDate,
    getCurrentMonthDates,
    exportToCSV,
    calculateAttendancePercentage
} from '../../utils/helpers'

function ReportsPage() {
    const { user } = useAuth()
    const { success, error: showError } = useToast()

    const [students, setStudents] = useState([])
    const [sessions, setSessions] = useState([])
    const [attendance, setAttendance] = useState([])
    const [classes, setClasses] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: getTodayDate()
    })
    const [selectedClass, setSelectedClass] = useState('')
    const [viewMode, setViewMode] = useState('summary') // summary, detailed, calendar

    useEffect(() => {
        loadData()
    }, [user, dateRange])

    const loadData = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const [teacherStudents, teacherSessions, allAttendance, teacherClasses] = await Promise.all([
                studentStore.getByTeacher(user.id),
                sessionStore.getByTeacher(user.id),
                attendanceStore.getAll(),
                classStore.getByTeacher(user.id)
            ])

            setStudents(teacherStudents)
            setSessions(teacherSessions)
            setClasses(teacherClasses)

            // Filter attendance by date range
            const filteredAttendance = allAttendance.filter(a => {
                const date = a.date
                return date >= dateRange.start && date <= dateRange.end
            })

            setAttendance(filteredAttendance)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Filter students by selected class
    const filteredStudents = selectedClass
        ? students.filter(s => s.classId === selectedClass)
        : students

    // Calculate stats for each student
    const studentStats = filteredStudents.map(student => {
        const studentAttendance = attendance.filter(a => a.studentId === student.id)
        const totalSessions = sessions.filter(s =>
            s.date >= dateRange.start &&
            s.date <= dateRange.end &&
            (!selectedClass || s.classId === selectedClass || s.classId === 'all')
        ).length

        const presentCount = studentAttendance.length
        const percentage = totalSessions > 0
            ? Math.round((presentCount / totalSessions) * 100)
            : 0

        return {
            ...student,
            presentCount,
            totalSessions: totalSessions || sessions.length,
            percentage,
            lastAttendance: studentAttendance.length > 0
                ? studentAttendance.sort((a, b) => new Date(b.time) - new Date(a.time))[0]
                : null
        }
    })

    // Overall stats
    const overallStats = {
        totalStudents: filteredStudents.length,
        totalSessions: sessions.filter(s =>
            s.date >= dateRange.start && s.date <= dateRange.end
        ).length,
        totalAttendance: attendance.length,
        averageAttendance: studentStats.length > 0
            ? Math.round(studentStats.reduce((acc, s) => acc + s.percentage, 0) / studentStats.length)
            : 0
    }

    const handleExport = () => {
        const data = studentStats.map(s => ({
            'Name': s.name,
            'Roll No': s.rollNo,
            'Class': s.className || '-',
            'Present Days': s.presentCount,
            'Total Sessions': s.totalSessions,
            'Attendance %': s.percentage + '%',
            'Last Present': s.lastAttendance ? formatDate(s.lastAttendance.date) : '-'
        }))

        const filename = `attendance_report_${dateRange.start}_to_${dateRange.end}`
        exportToCSV(data, filename)
        success('Report exported successfully!')
    }

    return (
        <Layout
            title="Attendance Reports"
            subtitle="View and analyze attendance data"
        >
            {/* Filters */}
            <div className="glass-card p-lg mb-lg">
                <div className="flex items-end justify-between flex-wrap gap-lg">
                    <div className="flex items-end gap-md flex-wrap">
                        {/* Date Range */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">From</label>
                            <input
                                type="date"
                                className="form-input"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">To</label>
                            <input
                                type="date"
                                className="form-input"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>

                        {/* Class Filter */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Class</label>
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
                    </div>

                    {/* Actions */}
                    <div className="flex gap-md">
                        <div className="flex gap-xs">
                            <button
                                className={`btn ${viewMode === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('summary')}
                            >
                                📊 Summary
                            </button>
                            <button
                                className={`btn ${viewMode === 'detailed' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('detailed')}
                            >
                                📋 Detailed
                            </button>
                        </div>

                        <button className="btn btn-secondary" onClick={handleExport}>
                            📥 Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-lg mb-lg">
                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(102, 126, 234, 0.15)', color: 'var(--primary-color)' }}>
                        👥
                    </div>
                    <div className="stat-value">{overallStats.totalStudents}</div>
                    <div className="stat-label">Total Students</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(23, 162, 184, 0.15)', color: 'var(--secondary-color)' }}>
                        📅
                    </div>
                    <div className="stat-value">{overallStats.totalSessions}</div>
                    <div className="stat-label">Sessions Held</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(40, 167, 69, 0.15)', color: 'var(--success-color)' }}>
                        ✅
                    </div>
                    <div className="stat-value">{overallStats.totalAttendance}</div>
                    <div className="stat-label">Total Check-ins</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{
                        background: overallStats.averageAttendance >= 75
                            ? 'rgba(40, 167, 69, 0.15)'
                            : overallStats.averageAttendance >= 50
                                ? 'rgba(255, 193, 7, 0.15)'
                                : 'rgba(220, 53, 69, 0.15)',
                        color: overallStats.averageAttendance >= 75
                            ? 'var(--success-color)'
                            : overallStats.averageAttendance >= 50
                                ? 'var(--warning-color)'
                                : 'var(--error-color)'
                    }}>
                        📊
                    </div>
                    <div className="stat-value">{overallStats.averageAttendance}%</div>
                    <div className="stat-label">Average Attendance</div>
                </div>
            </div>

            {/* Main Content */}
            {isLoading ? (
                <div className="glass-card flex items-center justify-center p-xl">
                    <div className="spinner"></div>
                </div>
            ) : viewMode === 'summary' ? (
                /* Summary View */
                <div className="glass-card p-lg">
                    <h3 className="mb-lg">📊 Student Attendance Summary</h3>

                    {studentStats.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Roll No</th>
                                        <th>Class</th>
                                        <th>Present</th>
                                        <th>Attendance</th>
                                        <th>Status</th>
                                        <th>Last Present</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentStats.sort((a, b) => b.percentage - a.percentage).map(student => (
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
                                                {student.presentCount} / {student.totalSessions}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <div
                                                        style={{
                                                            width: '60px',
                                                            height: '6px',
                                                            background: 'var(--border-color)',
                                                            borderRadius: '3px',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${student.percentage}%`,
                                                                height: '100%',
                                                                background: student.percentage >= 75
                                                                    ? 'var(--success-color)'
                                                                    : student.percentage >= 50
                                                                        ? 'var(--warning-color)'
                                                                        : 'var(--error-color)',
                                                                borderRadius: '3px'
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="font-medium">{student.percentage}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${student.percentage >= 75
                                                        ? 'badge-success'
                                                        : student.percentage >= 50
                                                            ? 'badge-warning'
                                                            : 'badge-danger'
                                                    }`}>
                                                    {student.percentage >= 75
                                                        ? 'Good'
                                                        : student.percentage >= 50
                                                            ? 'Low'
                                                            : 'Critical'}
                                                </span>
                                            </td>
                                            <td className="text-muted">
                                                {student.lastAttendance
                                                    ? formatDate(student.lastAttendance.date)
                                                    : 'Never'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="icon">📊</div>
                            <h4>No Data Available</h4>
                            <p>There's no attendance data for the selected date range and filters.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Detailed View */
                <div className="glass-card p-lg">
                    <h3 className="mb-lg">📋 Detailed Attendance Records</h3>

                    {attendance.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Student</th>
                                        <th>Roll No</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance
                                        .sort((a, b) => new Date(b.time) - new Date(a.time))
                                        .map(record => {
                                            const student = students.find(s => s.id === record.studentId)
                                            return (
                                                <tr key={record.id}>
                                                    <td>{formatDate(record.date)}</td>
                                                    <td>{formatTime(record.time)}</td>
                                                    <td>
                                                        <div className="flex items-center gap-sm">
                                                            <div className="avatar avatar-sm">
                                                                {student?.photo ? (
                                                                    <img src={student.photo} alt={student?.name} />
                                                                ) : (
                                                                    student?.name?.charAt(0) || '?'
                                                                )}
                                                            </div>
                                                            <span className="font-medium">
                                                                {student?.name || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>{student?.rollNo || '-'}</td>
                                                    <td>
                                                        <span className="badge badge-primary">
                                                            {record.method === 'face' ? '📸 Face Scan' : '✍️ Manual'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-success">Present</span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="icon">📋</div>
                            <h4>No Records Found</h4>
                            <p>There are no attendance records for the selected date range.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Low Attendance Alert */}
            {studentStats.filter(s => s.percentage < 75 && s.percentage > 0).length > 0 && (
                <div
                    className="mt-lg p-lg"
                    style={{
                        background: 'rgba(255, 193, 7, 0.1)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--warning-color)'
                    }}
                >
                    <h4 style={{ margin: '0 0 0.5rem', color: 'var(--warning-color)' }}>
                        ⚠️ Low Attendance Alert
                    </h4>
                    <p className="text-muted" style={{ margin: 0 }}>
                        {studentStats.filter(s => s.percentage < 75 && s.percentage > 0).length} student(s)
                        have attendance below 75%. Consider following up with them.
                    </p>
                    <div className="flex flex-wrap gap-sm mt-md">
                        {studentStats
                            .filter(s => s.percentage < 75 && s.percentage > 0)
                            .map(s => (
                                <span key={s.id} className="badge badge-warning">
                                    {s.name} ({s.percentage}%)
                                </span>
                            ))
                        }
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default ReportsPage
