// Storage Service - IndexedDB wrapper for persistent data storage

const DB_NAME = 'FaceAttendDB'
const DB_VERSION = 1

// Database stores
const STORES = {
    USERS: 'users',
    STUDENTS: 'students',
    CLASSES: 'classes',
    ATTENDANCE: 'attendance',
    SESSIONS: 'sessions',
    FACE_DESCRIPTORS: 'faceDescriptors'
}

let db = null

// Initialize the database
export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
            db = request.result
            resolve(db)
        }

        request.onupgradeneeded = (event) => {
            const database = event.target.result

            // Users store (teachers and students login info)
            if (!database.objectStoreNames.contains(STORES.USERS)) {
                const usersStore = database.createObjectStore(STORES.USERS, { keyPath: 'id' })
                usersStore.createIndex('email', 'email', { unique: true })
                usersStore.createIndex('role', 'role', { unique: false })
            }

            // Students store (student profiles)
            if (!database.objectStoreNames.contains(STORES.STUDENTS)) {
                const studentsStore = database.createObjectStore(STORES.STUDENTS, { keyPath: 'id' })
                studentsStore.createIndex('rollNo', 'rollNo', { unique: true })
                studentsStore.createIndex('classId', 'classId', { unique: false })
                studentsStore.createIndex('teacherId', 'teacherId', { unique: false })
            }

            // Classes store
            if (!database.objectStoreNames.contains(STORES.CLASSES)) {
                const classesStore = database.createObjectStore(STORES.CLASSES, { keyPath: 'id' })
                classesStore.createIndex('teacherId', 'teacherId', { unique: false })
            }

            // Attendance records store
            if (!database.objectStoreNames.contains(STORES.ATTENDANCE)) {
                const attendanceStore = database.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id' })
                attendanceStore.createIndex('studentId', 'studentId', { unique: false })
                attendanceStore.createIndex('sessionId', 'sessionId', { unique: false })
                attendanceStore.createIndex('date', 'date', { unique: false })
            }

            // Attendance sessions store
            if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
                const sessionsStore = database.createObjectStore(STORES.SESSIONS, { keyPath: 'id' })
                sessionsStore.createIndex('teacherId', 'teacherId', { unique: false })
                sessionsStore.createIndex('classId', 'classId', { unique: false })
                sessionsStore.createIndex('status', 'status', { unique: false })
            }

            // Face descriptors store
            if (!database.objectStoreNames.contains(STORES.FACE_DESCRIPTORS)) {
                const faceStore = database.createObjectStore(STORES.FACE_DESCRIPTORS, { keyPath: 'studentId' })
            }
        }
    })
}

// Get database instance
async function getDB() {
    if (!db) {
        await initDB()
    }
    return db
}

// Generic CRUD operations
async function add(storeName, data) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.add(data)
        request.onsuccess = () => resolve(data)
        request.onerror = () => reject(request.error)
    })
}

async function get(storeName, id) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function getAll(storeName) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function getByIndex(storeName, indexName, value) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const index = store.index(indexName)
        const request = index.getAll(value)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function getOneByIndex(storeName, indexName, value) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const index = store.index(indexName)
        const request = index.get(value)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function update(storeName, data) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.put(data)
        request.onsuccess = () => resolve(data)
        request.onerror = () => reject(request.error)
    })
}

async function remove(storeName, id) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(id)
        request.onsuccess = () => resolve(true)
        request.onerror = () => reject(request.error)
    })
}

// User operations
export const userStore = {
    add: (user) => add(STORES.USERS, user),
    get: (id) => get(STORES.USERS, id),
    getByEmail: (email) => getOneByIndex(STORES.USERS, 'email', email),
    getAll: () => getAll(STORES.USERS),
    update: (user) => update(STORES.USERS, user),
    delete: (id) => remove(STORES.USERS, id)
}

// Student operations
export const studentStore = {
    add: (student) => add(STORES.STUDENTS, student),
    get: (id) => get(STORES.STUDENTS, id),
    getByRollNo: (rollNo) => getOneByIndex(STORES.STUDENTS, 'rollNo', rollNo),
    getByClass: (classId) => getByIndex(STORES.STUDENTS, 'classId', classId),
    getByTeacher: (teacherId) => getByIndex(STORES.STUDENTS, 'teacherId', teacherId),
    getAll: () => getAll(STORES.STUDENTS),
    update: (student) => update(STORES.STUDENTS, student),
    delete: (id) => remove(STORES.STUDENTS, id)
}

// Class operations
export const classStore = {
    add: (classData) => add(STORES.CLASSES, classData),
    get: (id) => get(STORES.CLASSES, id),
    getByTeacher: (teacherId) => getByIndex(STORES.CLASSES, 'teacherId', teacherId),
    getAll: () => getAll(STORES.CLASSES),
    update: (classData) => update(STORES.CLASSES, classData),
    delete: (id) => remove(STORES.CLASSES, id)
}

// Attendance operations
export const attendanceStore = {
    add: (record) => add(STORES.ATTENDANCE, record),
    get: (id) => get(STORES.ATTENDANCE, id),
    getByStudent: (studentId) => getByIndex(STORES.ATTENDANCE, 'studentId', studentId),
    getBySession: (sessionId) => getByIndex(STORES.ATTENDANCE, 'sessionId', sessionId),
    getByDate: (date) => getByIndex(STORES.ATTENDANCE, 'date', date),
    getAll: () => getAll(STORES.ATTENDANCE),
    update: (record) => update(STORES.ATTENDANCE, record),
    delete: (id) => remove(STORES.ATTENDANCE, id)
}

// Session operations
export const sessionStore = {
    add: (session) => add(STORES.SESSIONS, session),
    get: (id) => get(STORES.SESSIONS, id),
    getByTeacher: (teacherId) => getByIndex(STORES.SESSIONS, 'teacherId', teacherId),
    getByClass: (classId) => getByIndex(STORES.SESSIONS, 'classId', classId),
    getActive: () => getByIndex(STORES.SESSIONS, 'status', 'active'),
    getAll: () => getAll(STORES.SESSIONS),
    update: (session) => update(STORES.SESSIONS, session),
    delete: (id) => remove(STORES.SESSIONS, id)
}

// Face descriptor operations
export const faceStore = {
    add: (data) => add(STORES.FACE_DESCRIPTORS, data),
    get: (studentId) => get(STORES.FACE_DESCRIPTORS, studentId),
    getAll: () => getAll(STORES.FACE_DESCRIPTORS),
    update: (data) => update(STORES.FACE_DESCRIPTORS, data),
    delete: (studentId) => remove(STORES.FACE_DESCRIPTORS, studentId)
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// Get today's date string (YYYY-MM-DD)
export function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

// Format date for display
export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Format time for display
export function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    })
}
