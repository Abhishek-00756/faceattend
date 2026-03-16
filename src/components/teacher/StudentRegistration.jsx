import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../common/Layout'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAttendance } from '../../context/AttendanceContext'
import { studentStore, classStore, faceStore, generateId } from '../../services/storage'
import { loadModels, detectFace, registerFace } from '../../services/faceRecognition'
import { isValidRollNo, toBase64 } from '../../utils/helpers'

function StudentRegistration() {
    const navigate = useNavigate()
    const { user, createStudentAccount } = useAuth()
    const { success, error: showError, info } = useToast()
    const { refresh } = useAttendance()

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    const [step, setStep] = useState(1) // 1: Form, 2: Capture Photo, 3: Review
    const [isLoading, setIsLoading] = useState(false)
    const [modelsReady, setModelsReady] = useState(false)
    const [faceDetected, setFaceDetected] = useState(false)
    const [classes, setClasses] = useState([])

    const [formData, setFormData] = useState({
        name: '',
        rollNo: '',
        email: '',
        classId: '',
        className: '',
        section: '',
        phone: ''
    })

    const [photo, setPhoto] = useState(null)
    const [errors, setErrors] = useState({})

    // Load classes and models on mount
    useEffect(() => {
        loadClasses()
        initFaceModels()

        return () => {
            stopCamera()
        }
    }, [])

    const loadClasses = async () => {
        if (!user) return
        const teacherClasses = await classStore.getByTeacher(user.id)
        setClasses(teacherClasses)
    }

    const initFaceModels = async () => {
        try {
            info('Loading face recognition models...')
            await loadModels()
            setModelsReady(true)
            success('Face recognition ready!')
        } catch (err) {
            showError('Failed to load face recognition. Please refresh.')
        }
    }

    // Start camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            })

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }

            // Start face detection loop
            detectFaceLoop()

        } catch (err) {
            showError('Could not access camera. Please allow camera permissions.')
            console.error('Camera error:', err)
        }
    }

    // Stop camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
    }

    // Face detection loop
    const detectFaceLoop = useCallback(async () => {
        if (!videoRef.current || !modelsReady) return

        const video = videoRef.current

        const runDetection = async () => {
            if (!streamRef.current) return

            try {
                const detection = await detectFace(video)
                setFaceDetected(!!detection)
            } catch (err) {
                // Ignore errors during detection
            }

            if (streamRef.current) {
                requestAnimationFrame(runDetection)
            }
        }

        runDetection()
    }, [modelsReady])

    // Handle form changes
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Validate form
    const validateForm = () => {
        const newErrors = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required'
        }

        if (!formData.rollNo.trim()) {
            newErrors.rollNo = 'Roll number is required'
        } else if (!isValidRollNo(formData.rollNo)) {
            newErrors.rollNo = 'Roll number must be alphanumeric'
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required for student login'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Handle next step
    const handleNext = () => {
        if (step === 1) {
            if (validateForm()) {
                setStep(2)
                setTimeout(() => startCamera(), 100)
            }
        } else if (step === 2 && photo) {
            stopCamera()
            setStep(3)
        }
    }

    // Handle back
    const handleBack = () => {
        if (step === 2) {
            stopCamera()
            setPhoto(null)
            setStep(1)
        } else if (step === 3) {
            setStep(2)
            setTimeout(() => startCamera(), 100)
        }
    }

    // Capture photo
    const capturePhoto = () => {
        if (!videoRef.current || !faceDetected) return

        const video = videoRef.current
        const canvas = canvasRef.current

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        // Mirror the image
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0)

        const photoData = canvas.toDataURL('image/jpeg', 0.8)
        setPhoto(photoData)

        success('Photo captured! Looking good! 📸')
    }

    // Retake photo
    const retakePhoto = () => {
        setPhoto(null)
    }

    // Submit registration
    const handleSubmit = async () => {
        if (!photo) {
            showError('Please capture a photo first')
            return
        }

        setIsLoading(true)
        console.log('=== Starting Student Registration ===')

        try {
            // Check if roll number already exists
            console.log('Checking for existing student with roll:', formData.rollNo.trim().toUpperCase())
            const existing = await studentStore.getByRollNo(formData.rollNo.trim().toUpperCase())
            if (existing) {
                throw new Error('A student with this roll number already exists')
            }
            console.log('No existing student found, proceeding...')

            // Create student profile
            const studentId = generateId()
            const student = {
                id: studentId,
                name: formData.name.trim(),
                rollNo: formData.rollNo.trim().toUpperCase(),
                email: formData.email.trim().toLowerCase(),
                classId: formData.classId || null,
                className: formData.className || '',
                section: formData.section || '',
                phone: formData.phone || '',
                photo: photo,
                teacherId: user.id,
                createdAt: new Date().toISOString()
            }

            console.log('Adding student profile:', { id: studentId, email: student.email, rollNo: student.rollNo })
            await studentStore.add(student)
            console.log('Student profile added successfully')

            // Create student login account FIRST (so they can log in even if face fails)
            const defaultPassword = formData.rollNo.toLowerCase()
            console.log('Creating user account with email:', student.email.toLowerCase(), 'password:', defaultPassword)

            try {
                const userAccount = await createStudentAccount(studentId, student.name, student.email.toLowerCase(), defaultPassword)
                console.log('User account created successfully:', userAccount)
            } catch (userErr) {
                console.error('Failed to create user account:', userErr)
                throw userErr // Re-throw to show error to user
            }

            // Then try to register face descriptor (non-blocking)
            try {
                const img = new Image()
                img.src = photo
                await new Promise(resolve => img.onload = resolve)
                await registerFace(studentId, img)
                console.log('Face enrollment successful')
                info('Face enrolled successfully!')
            } catch (faceErr) {
                console.error('Face registration failed:', faceErr)
                // Don't block - student can still use system, just won't have face login
                showError('Face enrollment failed. Student can still login but may need to re-enroll face later.')
            }

            refresh()

            success(`Student "${student.name}" registered successfully! 🎉`)
            console.log('=== Registration Complete ===')

            // Show credentials modal
            alert(`Student registered!\n\nLogin credentials:\nEmail: ${student.email.toLowerCase()}\nPassword: ${defaultPassword}\n\nPlease share these credentials with the student.`)

            navigate('/teacher')

        } catch (err) {
            showError(err.message)
            console.error('Registration error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Layout
            title="Register New Student"
            subtitle="Add a student to your class with face enrollment"
        >
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-lg mb-xl">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-sm">
                        <div
                            className={`avatar avatar-sm ${step >= s ? '' : ''}`}
                            style={{
                                background: step >= s ? 'var(--primary-gradient)' : 'var(--bg-tertiary)',
                                color: step >= s ? 'white' : 'var(--text-muted)'
                            }}
                        >
                            {step > s ? '✓' : s}
                        </div>
                        <span className={step >= s ? 'font-medium' : 'text-muted'}>
                            {s === 1 ? 'Details' : s === 2 ? 'Photo' : 'Review'}
                        </span>
                        {s < 3 && (
                            <div
                                style={{
                                    width: '60px',
                                    height: '2px',
                                    background: step > s ? 'var(--primary-color)' : 'var(--border-color)',
                                    marginLeft: 'var(--spacing-sm)'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="glass-card p-xl" style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Step 1: Form */}
                {step === 1 && (
                    <div>
                        <h3 className="mb-lg">📝 Student Information</h3>

                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Enter student's full name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-md">
                            <div className="form-group">
                                <label className="form-label">Roll Number *</label>
                                <input
                                    type="text"
                                    name="rollNo"
                                    className={`form-input ${errors.rollNo ? 'error' : ''}`}
                                    placeholder="e.g., CS2024001"
                                    value={formData.rollNo}
                                    onChange={handleChange}
                                />
                                {errors.rollNo && <span className="form-error">{errors.rollNo}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    className={`form-input ${errors.email ? 'error' : ''}`}
                                    placeholder="student@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                                {errors.email && <span className="form-error">{errors.email}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-md">
                            <div className="form-group">
                                <label className="form-label">Class</label>
                                <input
                                    type="text"
                                    name="className"
                                    className="form-input"
                                    placeholder="e.g., 10th Grade"
                                    value={formData.className}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Section</label>
                                <input
                                    type="text"
                                    name="section"
                                    className="form-input"
                                    placeholder="e.g., A"
                                    value={formData.section}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number (Optional)</label>
                            <input
                                type="tel"
                                name="phone"
                                className="form-input"
                                placeholder="Enter phone number"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex justify-end mt-xl">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleNext}
                            >
                                Next: Capture Photo →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Capture Photo */}
                {step === 2 && (
                    <div>
                        <h3 className="mb-lg">📸 Capture Face Photo</h3>
                        <p className="text-muted mb-lg">
                            Position the student's face within the oval guide. Make sure there's good lighting.
                        </p>

                        <div className="camera-container">
                            <video
                                ref={videoRef}
                                className="camera-video"
                                autoPlay
                                playsInline
                                muted
                            />

                            <div className="camera-overlay">
                                <div className={`face-guide ${faceDetected ? 'detected' : ''}`}></div>
                            </div>

                            {!photo && (
                                <div className="camera-controls">
                                    <button
                                        className="capture-btn"
                                        onClick={capturePhoto}
                                        disabled={!faceDetected}
                                        title={faceDetected ? 'Capture photo' : 'Position face in the guide'}
                                    />
                                </div>
                            )}

                            {photo && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(0,0,0,0.8)'
                                    }}
                                >
                                    <img
                                        src={photo}
                                        alt="Captured"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            borderRadius: 'var(--radius-lg)'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Hidden canvas for capture */}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Status */}
                        <div className="text-center mt-lg">
                            {!photo && (
                                <span className={`badge ${faceDetected ? 'badge-success' : 'badge-warning'}`}>
                                    {faceDetected ? '✓ Face Detected' : '⏳ Looking for face...'}
                                </span>
                            )}

                            {photo && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={retakePhoto}
                                >
                                    🔄 Retake Photo
                                </button>
                            )}
                        </div>

                        <div className="flex justify-between mt-xl">
                            <button
                                className="btn btn-secondary"
                                onClick={handleBack}
                            >
                                ← Back
                            </button>

                            <button
                                className="btn btn-primary"
                                onClick={handleNext}
                                disabled={!photo}
                            >
                                Next: Review →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                    <div>
                        <h3 className="mb-lg">✅ Review & Confirm</h3>

                        <div className="flex gap-lg">
                            {/* Photo Preview */}
                            <div style={{ flexShrink: 0 }}>
                                <img
                                    src={photo}
                                    alt="Student"
                                    style={{
                                        width: '150px',
                                        height: '180px',
                                        objectFit: 'cover',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '3px solid var(--primary-color)'
                                    }}
                                />
                            </div>

                            {/* Details */}
                            <div className="flex-1">
                                <div className="mb-md">
                                    <span className="text-muted">Name</span>
                                    <p className="font-semibold" style={{ margin: 0 }}>{formData.name}</p>
                                </div>

                                <div className="mb-md">
                                    <span className="text-muted">Roll Number</span>
                                    <p className="font-semibold" style={{ margin: 0 }}>{formData.rollNo.toUpperCase()}</p>
                                </div>

                                <div className="mb-md">
                                    <span className="text-muted">Email</span>
                                    <p className="font-semibold" style={{ margin: 0 }}>{formData.email}</p>
                                </div>

                                {formData.className && (
                                    <div className="mb-md">
                                        <span className="text-muted">Class</span>
                                        <p className="font-semibold" style={{ margin: 0 }}>
                                            {formData.className} {formData.section && `- Section ${formData.section}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div
                            className="mt-lg p-md"
                            style={{
                                background: 'rgba(102, 126, 234, 0.1)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--primary-color)'
                            }}
                        >
                            <p className="text-sm" style={{ margin: 0 }}>
                                <strong>📌 Note:</strong> The student will receive login credentials:
                                <br />• Email: {formData.email}
                                <br />• Password: {formData.rollNo.toLowerCase()} (can be changed later)
                            </p>
                        </div>

                        <div className="flex justify-between mt-xl">
                            <button
                                className="btn btn-secondary"
                                onClick={handleBack}
                            >
                                ← Back
                            </button>

                            <button
                                className="btn btn-success btn-lg"
                                onClick={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner sm"></span>
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        ✓ Register Student
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default StudentRegistration
