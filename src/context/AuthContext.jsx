import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { userStore, initDB, generateId } from '../services/storage'
import { hashPassword } from '../utils/helpers'
import { STORAGE_KEYS, ROLES } from '../utils/constants'
import { db } from '../services/firebaseClient'
import { doc, updateDoc, getDoc } from 'firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    // Initialize database and check for stored session
    useEffect(() => {
        const initAuth = async () => {
            try {
                await initDB()

                // Check for stored user session
                const storedUser = localStorage.getItem(STORAGE_KEYS.USER)
                if (storedUser) {
                    const userData = JSON.parse(storedUser)
                    // Verify user still exists in database
                    const dbUser = await userStore.get(userData.id)
                    if (dbUser) {
                        setUser(userData)
                    } else {
                        localStorage.removeItem(STORAGE_KEYS.USER)
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err)
                setError('Failed to initialize authentication')
            } finally {
                setIsLoading(false)
            }
        }

        initAuth()
    }, [])

    // Login function
    const login = useCallback(async (email, password, role) => {
        setError(null)
        setIsLoading(true)

        try {
            const hashedPassword = await hashPassword(password)
            const normalizedEmail = email.toLowerCase().trim()
            const existingUser = await userStore.getByEmail(normalizedEmail)

            if (!existingUser) {
                throw new Error('User not found. Please check your email.')
            }

            if (existingUser.password !== hashedPassword) {
                throw new Error('Invalid password. Please try again.')
            }

            if (existingUser.role !== role) {
                throw new Error(`This account is registered as a ${existingUser.role}. Please select the correct role.`)
            }

            // Create session data (exclude password)
            const sessionData = {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                role: existingUser.role,
                photo: existingUser.photo,
                studentId: existingUser.studentId // For students
            }

            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionData))
            setUser(sessionData)

            return sessionData
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Signup function (for teachers only, students are created by teachers)
    const signup = useCallback(async (name, email, password) => {
        setError(null)
        setIsLoading(true)

        try {
            const normalizedEmail = email.toLowerCase().trim()

            // Check if email already exists
            const existingUser = await userStore.getByEmail(normalizedEmail)
            if (existingUser) {
                throw new Error('An account with this email already exists.')
            }

            const hashedPassword = await hashPassword(password)

            const newUser = {
                id: generateId(),
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role: ROLES.TEACHER,
                createdAt: new Date().toISOString()
            }

            await userStore.add(newUser)

            // Auto login after signup
            const sessionData = {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role
            }

            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionData))
            setUser(sessionData)

            return sessionData
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Create student account (called by teacher)
    const createStudentAccount = useCallback(async (studentId, name, email, password) => {
        try {
            const normalizedEmail = email.toLowerCase().trim()
            const hashedPassword = await hashPassword(password)

            // Check if email already exists
            const existingUser = await userStore.getByEmail(normalizedEmail)
            if (existingUser) {
                throw new Error('An account with this email already exists.')
            }

            const newUser = {
                id: generateId(),
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role: ROLES.STUDENT,
                studentId, // Link to student profile
                createdAt: new Date().toISOString()
            }

            await userStore.add(newUser)

            return newUser
        } catch (err) {
            throw err
        }
    }, [])

    // Logout function
    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEYS.USER)
        setUser(null)
        setError(null)
    }, [])

    // Update user profile
    const updateProfile = useCallback(async (updates) => {
        if (!user) return

        try {
            const currentUser = await userStore.get(user.id)
            const updatedUser = { ...currentUser, ...updates }
            await userStore.update(updatedUser)

            // Update session
            const sessionData = {
                ...user,
                ...updates
            }
            delete sessionData.password

            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionData))
            setUser(sessionData)

            return sessionData
        } catch (err) {
            setError(err.message)
            throw err
        }
    }, [user])

    // Change password
    const changePassword = useCallback(async (currentPassword, newPassword) => {
        if (!user) return

        try {
            const currentUser = await userStore.get(user.id)
            const hashedCurrentPassword = await hashPassword(currentPassword)

            if (currentUser.password !== hashedCurrentPassword) {
                throw new Error('Current password is incorrect')
            }

            const hashedNewPassword = await hashPassword(newPassword)
            currentUser.password = hashedNewPassword

            await userStore.update(currentUser)

            return true
        } catch (err) {
            setError(err.message)
            throw err
        }
    }, [user])

    // Save fingerprint credential ID to Firebase for this user
    const saveCredentialId = useCallback(async (credentialId) => {
        if (!user) return
        await updateDoc(doc(db, 'users', user.id), { credentialId })
    }, [user])

    // Get fingerprint credential ID from Firebase for a given userId
    const getCredentialId = useCallback(async (userId) => {
        const snap = await getDoc(doc(db, 'users', userId))
        return snap.exists() ? (snap.data().credentialId || null) : null
    }, [])

    // Clear error
    const clearError = useCallback(() => {
        setError(null)
    }, [])

    const value = {
        user,
        isLoading,
        error,
        login,
        signup,
        logout,
        createStudentAccount,
        updateProfile,
        changePassword,
        clearError,
        saveCredentialId,
        getCredentialId,
        isAuthenticated: !!user,
        isTeacher: user?.role === ROLES.TEACHER,
        isStudent: user?.role === ROLES.STUDENT
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext
