// Helper utility functions

// Generate a unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

// Format date for display
export function formatDate(dateString, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    }
    return new Date(dateString).toLocaleDateString('en-US', defaultOptions)
}

// Format time for display
export function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Format date and time together
export function formatDateTime(dateString) {
    return `${formatDate(dateString)} at ${formatTime(dateString)}`
}

// Calculate attendance percentage
export function calculateAttendancePercentage(present, total) {
    if (total === 0) return 0
    return Math.round((present / total) * 100)
}

// Get initials from name
export function getInitials(name) {
    if (!name) return '?'
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// Capitalize first letter
export function capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
}

// Validate email format
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Validate roll number (alphanumeric)
export function isValidRollNo(rollNo) {
    const rollNoRegex = /^[A-Za-z0-9]+$/
    return rollNoRegex.test(rollNo)
}

// Get relative time string
export function getRelativeTime(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
}

// Get day name from date
export function getDayName(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' })
}

// Get month name from date
export function getMonthName(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long' })
}

// Check if date is today
export function isToday(dateString) {
    return dateString === getTodayDate()
}

// Get dates for the current week
export function getCurrentWeekDates() {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const dates = []

    for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() - dayOfWeek + i)
        dates.push(date.toISOString().split('T')[0])
    }

    return dates
}

// Get dates for the current month
export function getCurrentMonthDates() {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dates = []

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i)
        dates.push(date.toISOString().split('T')[0])
    }

    return dates
}

// Simple hash function for passwords (for demo only - use bcrypt in production)
export async function hashPassword(password) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Debounce function
export function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

// Export data to CSV
export function exportToCSV(data, filename) {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                let cell = row[header]
                // Escape special characters
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                    cell = `"${cell.replace(/"/g, '""')}"`
                }
                return cell
            }).join(',')
        )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
}

// Deep clone an object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
}

// Check if object is empty
export function isEmpty(obj) {
    if (!obj) return true
    if (Array.isArray(obj)) return obj.length === 0
    return Object.keys(obj).length === 0
}

// Group array by key
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key]
        if (!result[groupKey]) {
            result[groupKey] = []
        }
        result[groupKey].push(item)
        return result
    }, {})
}

// Sort array by key
export function sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
        if (order === 'asc') {
            return a[key] > b[key] ? 1 : -1
        }
        return a[key] < b[key] ? 1 : -1
    })
}

// Convert image/canvas to base64
export function toBase64(element) {
    if (element instanceof HTMLCanvasElement) {
        return element.toDataURL('image/jpeg', 0.8)
    }

    const canvas = document.createElement('canvas')
    canvas.width = element.width || element.videoWidth
    canvas.height = element.height || element.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(element, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
}

// Convert base64 to blob
export function base64ToBlob(base64, mimeType = 'image/jpeg') {
    const byteCharacters = atob(base64.split(',')[1])
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
}
