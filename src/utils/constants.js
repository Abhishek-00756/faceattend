// Application Constants

// User roles
export const ROLES = {
    TEACHER: 'teacher',
    STUDENT: 'student'
}

// Session statuses
export const SESSION_STATUS = {
    ACTIVE: 'active',
    ENDED: 'ended',
    SCHEDULED: 'scheduled'
}

// Attendance statuses
export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late'
}

// Face recognition thresholds
export const FACE_CONFIG = {
    MATCH_THRESHOLD: 0.6, // Lower = stricter matching
    MIN_CONFIDENCE: 0.5,
    DETECTION_INTERVAL: 500 // ms between detections
}

// Geolocation config
export const GEO_CONFIG = {
    DEFAULT_RADIUS: 500, // meters
    ENABLE_LOCATION_CHECK: false // Set to true to enable location verification
}

// Default classes/sections
export const DEFAULT_CLASSES = [
    { name: 'Class 10', section: 'A' },
    { name: 'Class 10', section: 'B' },
    { name: 'Class 11', section: 'A' },
    { name: 'Class 11', section: 'B' },
    { name: 'Class 12', section: 'A' },
    { name: 'Class 12', section: 'B' }
]

// Dashboard stat icons
export const STAT_ICONS = {
    STUDENTS: '👨‍🎓',
    PRESENT: '✅',
    ABSENT: '❌',
    LATE: '⏰',
    CLASSES: '📚',
    SESSIONS: '📋',
    PERCENTAGE: '📊'
}

// Navigation items for teacher
export const TEACHER_NAV = [
    { path: '/teacher', label: 'Dashboard', icon: '🏠' },
    { path: '/teacher/register-student', label: 'Register Student', icon: '➕' },
    { path: '/teacher/attendance', label: 'Attendance', icon: '📋' },
    { path: '/teacher/classes', label: 'Classes', icon: '📚' },
    { path: '/teacher/reports', label: 'Reports', icon: '📊' }
]

// Navigation items for student
export const STUDENT_NAV = [
    { path: '/student', label: 'Dashboard', icon: '🏠' },
    { path: '/student/scan', label: 'Mark Attendance', icon: '📸' },
    { path: '/student/history', label: 'History', icon: '📅' },
    { path: '/student/profile', label: 'Profile', icon: '👤' }
]

// Theme colors for charts
export const CHART_COLORS = {
    primary: '#667eea',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8'
}

// Local storage keys
export const STORAGE_KEYS = {
    THEME: 'faceattend_theme',
    USER: 'faceattend_user',
    CAMPUS_LOCATION: 'campusLocation'
}
