import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AttendanceProvider } from './context/AttendanceContext'
import { ToastProvider } from './context/ToastContext'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import TeacherDashboard from './components/teacher/TeacherDashboard'
import StudentDashboard from './components/student/StudentDashboard'
import StudentRegistration from './components/teacher/StudentRegistration'
import AttendanceControl from './components/teacher/AttendanceControl'
import ClassManagement from './components/teacher/ClassManagement'
import ReportsPage from './components/teacher/ReportsPage'
import FaceScanner from './components/student/FaceScanner'
import AttendanceHistory from './components/student/AttendanceHistory'
import ProfilePage from './components/student/ProfilePage'

// Protected Route wrapper
function ProtectedRoute({ children, allowedRole }) {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (allowedRole && user.role !== allowedRole) {
        return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />
    }

    return children
}

// Public Route wrapper (redirects if logged in)
function PublicRoute({ children }) {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    if (user) {
        return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />
    }

    return children
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
                <PublicRoute>
                    <LoginPage />
                </PublicRoute>
            } />
            <Route path="/signup" element={
                <PublicRoute>
                    <SignupPage />
                </PublicRoute>
            } />

            {/* Teacher Routes */}
            <Route path="/teacher" element={
                <ProtectedRoute allowedRole="teacher">
                    <TeacherDashboard />
                </ProtectedRoute>
            } />
            <Route path="/teacher/register-student" element={
                <ProtectedRoute allowedRole="teacher">
                    <StudentRegistration />
                </ProtectedRoute>
            } />
            <Route path="/teacher/attendance" element={
                <ProtectedRoute allowedRole="teacher">
                    <AttendanceControl />
                </ProtectedRoute>
            } />
            <Route path="/teacher/classes" element={
                <ProtectedRoute allowedRole="teacher">
                    <ClassManagement />
                </ProtectedRoute>
            } />
            <Route path="/teacher/reports" element={
                <ProtectedRoute allowedRole="teacher">
                    <ReportsPage />
                </ProtectedRoute>
            } />

            {/* Student Routes */}
            <Route path="/student" element={
                <ProtectedRoute allowedRole="student">
                    <StudentDashboard />
                </ProtectedRoute>
            } />
            <Route path="/student/scan" element={
                <ProtectedRoute allowedRole="student">
                    <FaceScanner />
                </ProtectedRoute>
            } />
            <Route path="/student/history" element={
                <ProtectedRoute allowedRole="student">
                    <AttendanceHistory />
                </ProtectedRoute>
            } />
            <Route path="/student/profile" element={
                <ProtectedRoute allowedRole="student">
                    <ProfilePage />
                </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    )
}

function App() {
    return (
        <Router>
            <ToastProvider>
                <AuthProvider>
                    <AttendanceProvider>
                        <AppRoutes />
                    </AttendanceProvider>
                </AuthProvider>
            </ToastProvider>
        </Router>
    )
}

export default App
