import { useState, useEffect } from 'react'
import Layout from '../common/Layout'
import { useAuth } from '../../context/AuthContext'
import { attendanceStore } from '../../services/storage'
import { formatDate, formatTime, getDayName, getCurrentMonthDates, getTodayDate } from '../../utils/helpers'

function AttendanceHistory() {
    const { user } = useAuth()

    const [attendance, setAttendance] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState('list') // list, calendar
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    useEffect(() => {
        if (user?.studentId) {
            loadAttendance()
        }
    }, [user])

    const loadAttendance = async () => {
        setIsLoading(true)
        try {
            const records = await attendanceStore.getByStudent(user.studentId)
            setAttendance(records.sort((a, b) => new Date(b.time) - new Date(a.time)))
        } catch (error) {
            console.error('Error loading attendance:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Get calendar data for selected month
    const getCalendarDays = () => {
        const firstDay = new Date(selectedYear, selectedMonth, 1)
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startDayOfWeek = firstDay.getDay()

        const days = []

        // Empty cells for days before the first of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ empty: true })
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasAttendance = attendance.some(a => a.date === dateStr)
            const isToday = dateStr === getTodayDate()
            const isFuture = new Date(dateStr) > new Date()

            days.push({
                day,
                date: dateStr,
                hasAttendance,
                isToday,
                isFuture
            })
        }

        return days
    }

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const changeMonth = (delta) => {
        let newMonth = selectedMonth + delta
        let newYear = selectedYear

        if (newMonth < 0) {
            newMonth = 11
            newYear--
        } else if (newMonth > 11) {
            newMonth = 0
            newYear++
        }

        setSelectedMonth(newMonth)
        setSelectedYear(newYear)
    }

    // Stats
    const totalDays = attendance.length
    const thisMonthRecords = attendance.filter(a => {
        const date = new Date(a.date)
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    })

    return (
        <Layout
            title="Attendance History"
            subtitle="View your past attendance records"
        >
            {/* Stats */}
            <div className="grid grid-cols-3 gap-lg mb-lg">
                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(40, 167, 69, 0.15)', color: 'var(--success-color)' }}>
                        ✅
                    </div>
                    <div className="stat-value">{totalDays}</div>
                    <div className="stat-label">Total Present Days</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(102, 126, 234, 0.15)', color: 'var(--primary-color)' }}>
                        📅
                    </div>
                    <div className="stat-value">{thisMonthRecords.length}</div>
                    <div className="stat-label">Present This Month</div>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(23, 162, 184, 0.15)', color: 'var(--secondary-color)' }}>
                        🔥
                    </div>
                    <div className="stat-value">
                        {attendance.length > 0
                            ? Math.min(attendance.length, 7) // Simplified streak
                            : 0}
                    </div>
                    <div className="stat-label">Day Streak</div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center justify-between mb-lg">
                <div className="flex gap-xs">
                    <button
                        className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('list')}
                    >
                        📋 List View
                    </button>
                    <button
                        className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('calendar')}
                    >
                        📅 Calendar View
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="glass-card flex items-center justify-center p-xl">
                    <div className="spinner"></div>
                </div>
            ) : viewMode === 'list' ? (
                /* List View */
                <div className="glass-card p-lg">
                    {attendance.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Day</th>
                                        <th>Time</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.map(record => (
                                        <tr key={record.id}>
                                            <td className="font-medium">{formatDate(record.date)}</td>
                                            <td className="text-muted">{getDayName(record.date)}</td>
                                            <td>{formatTime(record.time)}</td>
                                            <td>
                                                <span className="badge badge-primary">
                                                    {record.method === 'face' ? '📸 Face Scan' : '✍️ Manual'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge badge-success">Present</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="icon">📭</div>
                            <h3>No Attendance Records</h3>
                            <p>You haven't marked any attendance yet. Start by scanning your face when your teacher opens a session.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Calendar View */
                <div className="glass-card p-lg">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-lg">
                        <button
                            className="btn btn-ghost"
                            onClick={() => changeMonth(-1)}
                        >
                            ← Previous
                        </button>

                        <h3 style={{ margin: 0 }}>
                            {monthNames[selectedMonth]} {selectedYear}
                        </h3>

                        <button
                            className="btn btn-ghost"
                            onClick={() => changeMonth(1)}
                        >
                            Next →
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '0.5rem'
                        }}
                    >
                        {/* Day Headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div
                                key={day}
                                className="text-center text-muted text-sm font-medium p-sm"
                            >
                                {day}
                            </div>
                        ))}

                        {/* Calendar Days */}
                        {getCalendarDays().map((item, index) => (
                            <div
                                key={index}
                                className="text-center p-sm"
                                style={{
                                    aspectRatio: '1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 'var(--radius-md)',
                                    background: item.empty
                                        ? 'transparent'
                                        : item.isToday
                                            ? 'var(--primary-gradient)'
                                            : item.hasAttendance
                                                ? 'rgba(40, 167, 69, 0.2)'
                                                : item.isFuture
                                                    ? 'transparent'
                                                    : 'rgba(220, 53, 69, 0.1)',
                                    color: item.isToday
                                        ? 'white'
                                        : item.isFuture
                                            ? 'var(--text-muted)'
                                            : 'var(--text-primary)',
                                    border: item.isToday
                                        ? 'none'
                                        : item.hasAttendance
                                            ? '1px solid var(--success-color)'
                                            : '1px solid var(--border-color)',
                                    fontWeight: item.isToday ? '600' : '400'
                                }}
                            >
                                {!item.empty && (
                                    <span>
                                        {item.day}
                                        {item.hasAttendance && !item.isToday && (
                                            <span style={{ position: 'absolute', fontSize: '0.6rem', marginTop: '-0.5rem' }}>✓</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-lg mt-lg pt-lg" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <div className="flex items-center gap-sm">
                            <div
                                style={{
                                    width: '1rem',
                                    height: '1rem',
                                    background: 'rgba(40, 167, 69, 0.2)',
                                    border: '1px solid var(--success-color)',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            />
                            <span className="text-sm text-muted">Present</span>
                        </div>

                        <div className="flex items-center gap-sm">
                            <div
                                style={{
                                    width: '1rem',
                                    height: '1rem',
                                    background: 'rgba(220, 53, 69, 0.1)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            />
                            <span className="text-sm text-muted">Absent</span>
                        </div>

                        <div className="flex items-center gap-sm">
                            <div
                                style={{
                                    width: '1rem',
                                    height: '1rem',
                                    background: 'var(--primary-gradient)',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            />
                            <span className="text-sm text-muted">Today</span>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default AttendanceHistory
