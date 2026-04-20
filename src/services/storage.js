import { db } from './firebaseClient'
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, updateDoc } from 'firebase/firestore'

// Keep DB_NAME around if there are any rogue references, though not used anymore
const DB_NAME = 'FaceAttendDB'

export async function initDB() {
    return Promise.resolve(true)
}

// User operations
export const userStore = {
    add: async (user) => {
        await setDoc(doc(db, 'users', user.id), user)
        return user
    },
    get: async (id) => {
        const snap = await getDoc(doc(db, 'users', id))
        return snap.exists() ? snap.data() : null
    },
    getByEmail: async (email) => {
        const q = query(collection(db, 'users'), where('email', '==', email))
        const snapshot = await getDocs(q)
        return snapshot.empty ? null : snapshot.docs[0].data()
    },
    getAll: async () => {
        const snapshot = await getDocs(collection(db, 'users'))
        return snapshot.docs.map(doc => doc.data())
    },
    update: async (user) => {
        await updateDoc(doc(db, 'users', user.id), user)
        return user
    },
    delete: async (id) => {
        await deleteDoc(doc(db, 'users', id))
        return true
    }
}

// Student operations
export const studentStore = {
    add: async (student) => {
        await setDoc(doc(db, 'students', student.id), student)
        return student
    },
    get: async (id) => {
        const snap = await getDoc(doc(db, 'students', id))
        return snap.exists() ? snap.data() : null
    },
    getByRollNo: async (rollNo) => {
        const q = query(collection(db, 'students'), where('rollNo', '==', rollNo))
        const snapshot = await getDocs(q)
        return snapshot.empty ? null : snapshot.docs[0].data()
    },
    getByClass: async (classId) => {
        const q = query(collection(db, 'students'), where('classId', '==', classId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getByTeacher: async (teacherId) => {
        const q = query(collection(db, 'students'), where('teacherId', '==', teacherId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getAll: async () => {
        const snapshot = await getDocs(collection(db, 'students'))
        return snapshot.docs.map(doc => doc.data())
    },
    update: async (student) => {
        await updateDoc(doc(db, 'students', student.id), student)
        return student
    },
    delete: async (id) => {
        await deleteDoc(doc(db, 'students', id))
        return true
    }
}

// Class operations
export const classStore = {
    add: async (classData) => {
        await setDoc(doc(db, 'classes', classData.id), classData)
        return classData
    },
    get: async (id) => {
        const snap = await getDoc(doc(db, 'classes', id))
        return snap.exists() ? snap.data() : null
    },
    getByTeacher: async (teacherId) => {
        const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getAll: async () => {
        const snapshot = await getDocs(collection(db, 'classes'))
        return snapshot.docs.map(doc => doc.data())
    },
    update: async (classData) => {
        await updateDoc(doc(db, 'classes', classData.id), classData)
        return classData
    },
    delete: async (id) => {
        await deleteDoc(doc(db, 'classes', id))
        return true
    }
}

// Attendance operations
export const attendanceStore = {
    add: async (record) => {
        await setDoc(doc(db, 'attendance', record.id), record)
        return record
    },
    get: async (id) => {
        const snap = await getDoc(doc(db, 'attendance', id))
        return snap.exists() ? snap.data() : null
    },
    getByStudent: async (studentId) => {
        const q = query(collection(db, 'attendance'), where('studentId', '==', studentId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getBySession: async (sessionId) => {
        const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getByDate: async (date) => {
        const q = query(collection(db, 'attendance'), where('date', '==', date))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getAll: async () => {
        const snapshot = await getDocs(collection(db, 'attendance'))
        return snapshot.docs.map(doc => doc.data())
    },
    update: async (record) => {
        await updateDoc(doc(db, 'attendance', record.id), record)
        return record
    },
    delete: async (id) => {
        await deleteDoc(doc(db, 'attendance', id))
        return true
    }
}

// Session operations
export const sessionStore = {
    add: async (session) => {
        await setDoc(doc(db, 'sessions', session.id), session)
        return session
    },
    get: async (id) => {
        const snap = await getDoc(doc(db, 'sessions', id))
        return snap.exists() ? snap.data() : null
    },
    getByTeacher: async (teacherId) => {
        const q = query(collection(db, 'sessions'), where('teacherId', '==', teacherId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getByClass: async (classId) => {
        const q = query(collection(db, 'sessions'), where('classId', '==', classId))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getActive: async () => {
        const q = query(collection(db, 'sessions'), where('status', '==', 'active'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => doc.data())
    },
    getAll: async () => {
        const snapshot = await getDocs(collection(db, 'sessions'))
        return snapshot.docs.map(doc => doc.data())
    },
    update: async (session) => {
        await updateDoc(doc(db, 'sessions', session.id), session)
        return session
    },
    delete: async (id) => {
        await deleteDoc(doc(db, 'sessions', id))
        return true
    }
}

// Face descriptor operations
export const faceStore = {
    add: async (faceData) => {
        const payload = {
            studentId: faceData.studentId,
            descriptor: Array.from(faceData.descriptor)
        }
        await setDoc(doc(db, 'face_descriptors', faceData.studentId), payload)
        return faceData
    },
    get: async (studentId) => {
        const snap = await getDoc(doc(db, 'face_descriptors', studentId))
        if (snap.exists() && snap.data().descriptor) {
            return {
                studentId: snap.data().studentId,
                descriptor: new Float32Array(snap.data().descriptor)
            }
        }
        return null
    },
    getAll: async () => {
        const snapshot = await getDocs(collection(db, 'face_descriptors'))
        return snapshot.docs.map(doc => ({
             studentId: doc.data().studentId,
             descriptor: new Float32Array(doc.data().descriptor)
        }))
    },
    update: async (faceData) => {
        const payload = {
            studentId: faceData.studentId,
            descriptor: Array.from(faceData.descriptor)
        }
        await updateDoc(doc(db, 'face_descriptors', faceData.studentId), payload)
        return faceData
    },
    delete: async (studentId) => {
        await deleteDoc(doc(db, 'face_descriptors', studentId))
        return true
    }
}

// Generate unique ID
export function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get today's date string (YYYY-MM-DD)
export function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

// Format date for display
export function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Format time for display
export function formatTime(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    })
}
