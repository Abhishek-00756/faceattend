import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
    sessionStore,
    attendanceStore,
    studentStore,
    classStore,
    generateId
} from '../services/storage'
import { useAuth } from './AuthContext'
import { getTodayDate } from '../utils/helpers'
import { SESSION_STATUS, ATTENDANCE_STATUS } from '../utils/constants'

const AttendanceContext = createContext(null)

export function AttendanceProvider({ children }) {
    const { user, isTeacher, isStudent } = useAuth()
    const [activeSession, setActiveSession] = useState(null)
    const [todayAttendance, setTodayAttendance] = useState([])
    const [students, setStudents] = useState([])
    const [classes, setClasses] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    // Load data when user changes
    useEffect(() => {
        if (user) {
            loadData()
        } else {
            setActiveSession(null)
            setTodayAttendance([])
            setStudents([])
            setClasses([])
        }
    }, [user])

    // Poll for active sessions periodically (for students to see when teacher starts session)
    useEffect(() => {
        if (!user || !isStudent) return

        const pollInterval = setInterval(() => {
            // Check for active sessions
            loadData()
        }, 15000) // Every 15 seconds

        return () => clearInterval(pollInterval)
    }, [user, isStudent])

    // Load all relevant data
    const loadData = async () => {
        setIsLoading(true)
        try {
            // Check for active session
            const activeSessions = await sessionStore.getActive()
            console.log('Active sessions found:', activeSessions.length)

            if (activeSessions.length > 0) {
                // Get the most recent active session
                const sortedSessions = activeSessions.sort(
                    (a, b) => new Date(b.startTime) - new Date(a.startTime)
                )

                if (isStudent) {
                    // Student: Get ANY active session from their teacher
                    const student = await studentStore.get(user.studentId)
                    if (student) {
                        // First try to find a session for their class
                        let relevantSession = sortedSessions.find(
                            s => s.classId === student.classId || s.classId === 'all' || !s.classId
                        )
                        // If no class-specific session, take any active session from their teacher
                        if (!relevantSession) {
                            relevantSession = sortedSessions.find(s => s.teacherId === student.teacherId)
                        }
                        // If still no session, just take the first active one (for simplicity in single-teacher setups)
                        if (!relevantSession && sortedSessions.length > 0) {
                            relevantSession = sortedSessions[0]
                        }
                        console.log('Student session:', relevantSession ? 'FOUND' : 'NOT FOUND')
                        setActiveSession(relevantSession || null)
                    } else {
                        console.log('Student profile not found for studentId:', user.studentId)
                        setActiveSession(null)
                    }
                } else {
                    // For teacher, get their active session
                    const teacherSession = sortedSessions.find(s => s.teacherId === user.id)
                    console.log('Teacher session:', teacherSession ? 'FOUND' : 'NOT FOUND')
                    setActiveSession(teacherSession || null)
                }
            } else {
                console.log('No active sessions')
                setActiveSession(null)
            }

            // Load students (for teacher)
            if (isTeacher) {
                const teacherStudents = await studentStore.getByTeacher(user.id)
                setStudents(teacherStudents)

                const teacherClasses = await classStore.getByTeacher(user.id)
                setClasses(teacherClasses)
            }

            // Load today's attendance
            await loadTodayAttendance()
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Load today's attendance records
    const loadTodayAttendance = async () => {
        try {
            const today = getTodayDate()
            const allAttendance = await attendanceStore.getAll()
            const todaysRecords = allAttendance.filter(a => a.date === today)
            setTodayAttendance(todaysRecords)
        } catch (error) {
            console.error('Error loading attendance:', error)
        }
    }

    // Start attendance session (teacher only)
    const startSession = useCallback(async (classId, duration = 30) => {
        if (!user || !isTeacher) return null

        try {
            // End any existing active session first
            if (activeSession) {
                await endSession()
            }

            const session = {
                id: generateId(),
                teacherId: user.id,
                classId,
                status: SESSION_STATUS.ACTIVE,
                startTime: new Date().toISOString(),
                duration, // in minutes
                date: getTodayDate()
            }

            await sessionStore.add(session)
            setActiveSession(session)

            return session
        } catch (error) {
            console.error('Error starting session:', error)
            throw error
        }
    }, [user, isTeacher, activeSession])

    // End attendance session (teacher only)
    const endSession = useCallback(async (sessionToEnd = null) => {
        // Get current session - either passed in or from active sessions
        let currentSession = sessionToEnd || activeSession

        console.log('Ending session, passed session:', sessionToEnd)
        console.log('Ending session, activeSession from state:', activeSession)

        // If no session available from state, try to fetch directly from store
        if (!currentSession) {
            console.log('No session in state, fetching from store...')
            try {
                const activeSessions = await sessionStore.getActive()
                if (activeSessions.length > 0) {
                    // Get the most recent active session for this teacher
                    currentSession = activeSessions.find(s => s.teacherId === user?.id) || activeSessions[0]
                    console.log('Found session from store:', currentSession)
                }
            } catch (err) {
                console.error('Error fetching active sessions:', err)
            }
        }

        if (!currentSession) {
            console.log('No active session to end')
            return
        }

        try {
            const updatedSession = {
                ...currentSession,
                status: SESSION_STATUS.ENDED,
                endTime: new Date().toISOString()
            }

            console.log('Updating session to:', updatedSession)
            await sessionStore.update(updatedSession)
            setActiveSession(null)
            console.log('Session ended successfully')

            return updatedSession
        } catch (error) {
            console.error('Error ending session:', error)
            throw error
        }
    }, [activeSession, user])

    // Mark attendance (student only)
    const markAttendance = useCallback(async (studentId, sessionId, method = 'face') => {
        try {
            const today = getTodayDate()

            // Check if already marked
            const existing = todayAttendance.find(
                a => a.studentId === studentId && a.sessionId === sessionId
            )

            if (existing) {
                throw new Error('Attendance already marked for this session')
            }

            const record = {
                id: generateId(),
                studentId,
                sessionId,
                date: today,
                time: new Date().toISOString(),
                status: ATTENDANCE_STATUS.PRESENT,
                method
            }

            await attendanceStore.add(record)

            // Update local state
            setTodayAttendance(prev => [...prev, record])

            return record
        } catch (error) {
            console.error('Error marking attendance:', error)
            throw error
        }
    }, [todayAttendance])

    // Check if student has marked attendance today
    const hasMarkedToday = useCallback((studentId) => {
        if (!activeSession) return false
        return todayAttendance.some(
            a => a.studentId === studentId && a.sessionId === activeSession.id
        )
    }, [todayAttendance, activeSession])

    // Get attendance statistics for a student
    const getStudentStats = useCallback(async (studentId) => {
        try {
            const records = await attendanceStore.getByStudent(studentId)
            const total = records.length
            const present = records.filter(r => r.status === ATTENDANCE_STATUS.PRESENT).length
            const late = records.filter(r => r.status === ATTENDANCE_STATUS.LATE).length
            const absent = total - present - late

            return {
                total,
                present,
                late,
                absent,
                percentage: total > 0 ? Math.round((present / total) * 100) : 0
            }
        } catch (error) {
            console.error('Error getting student stats:', error)
            return { total: 0, present: 0, late: 0, absent: 0, percentage: 0 }
        }
    }, [])

    // Get attendance for a session
    const getSessionAttendance = useCallback(async (sessionId) => {
        try {
            const records = await attendanceStore.getBySession(sessionId)
            return records
        } catch (error) {
            console.error('Error getting session attendance:', error)
            return []
        }
    }, [])

    // Get all sessions for teacher
    const getTeacherSessions = useCallback(async () => {
        if (!user || !isTeacher) return []

        try {
            const sessions = await sessionStore.getByTeacher(user.id)
            return sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        } catch (error) {
            console.error('Error getting sessions:', error)
            return []
        }
    }, [user, isTeacher])

    // Get attendance report for a date range
    const getAttendanceReport = useCallback(async (startDate, endDate, classId = null) => {
        try {
            const allAttendance = await attendanceStore.getAll()

            let filtered = allAttendance.filter(a => {
                const date = a.date
                return date >= startDate && date <= endDate
            })

            // If classId specified, filter by class
            if (classId) {
                const classStudents = await studentStore.getByClass(classId)
                const studentIds = classStudents.map(s => s.id)
                filtered = filtered.filter(a => studentIds.includes(a.studentId))
            }

            return filtered
        } catch (error) {
            console.error('Error getting report:', error)
            return []
        }
    }, [])

    // Refresh data
    const refresh = useCallback(() => {
        if (user) {
            loadData()
        }
    }, [user])

    const value = {
        activeSession,
        todayAttendance,
        students,
        classes,
        isLoading,
        startSession,
        endSession,
        markAttendance,
        hasMarkedToday,
        getStudentStats,
        getSessionAttendance,
        getTeacherSessions,
        getAttendanceReport,
        refresh,
        loadTodayAttendance
    }

    return (
        <AttendanceContext.Provider value={value}>
            {children}
        </AttendanceContext.Provider>
    )
}

export function useAttendance() {
    const context = useContext(AttendanceContext)
    if (!context) {
        throw new Error('useAttendance must be used within an AttendanceProvider')
    }
    return context
}

export default AttendanceContext
