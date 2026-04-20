import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../common/Layout'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAttendance } from '../../context/AttendanceContext'
import { loadModels, detectFace, matchFace, detectBlinks } from '../../services/faceRecognition'
import { verifyFingerprint } from '../../services/webauthn'
import { isWithinCampus, getCampusLocation } from '../../services/geolocation'

function FaceScanner() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { getCredentialId } = useAuth()
    const { success, error: showError, warning, info } = useToast()
    const { activeSession, markAttendance, hasMarkedToday, refresh } = useAttendance()

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    const [status, setStatus] = useState('loading') // loading, ready, blinking, scanning, success, error, no-session, out-of-range
    const [message, setMessage] = useState('Initializing camera...')
    const [modelsReady, setModelsReady] = useState(false)
    const [faceDetected, setFaceDetected] = useState(false)
    const [scanProgress, setScanProgress] = useState(0)
    const [attemptCount, setAttemptCount] = useState(0)
    const [locationInfo, setLocationInfo] = useState(null)
    const [blinkCount, setBlinkCount] = useState(0)
    const [blinkTimeLeft, setBlinkTimeLeft] = useState(7)

    // Check for active session
    useEffect(() => {
        if (!activeSession) {
            setStatus('no-session')
            setMessage('No active attendance session')
        } else if (hasMarkedToday(user?.studentId)) {
            setStatus('success')
            setMessage('Attendance already marked!')
        } else {
            initializeScanner()
        }

        return () => {
            stopCamera()
        }
    }, [activeSession])

    const initializeScanner = async () => {
        setStatus('loading')
        setMessage('Loading face recognition models...')

        try {
            await loadModels()
            setModelsReady(true)

            // Check geolocation - get the campus location saved by teacher
            const campusLocation = getCampusLocation()
            console.log('Campus location:', campusLocation)

            // Only check location if teacher set a valid location (radius < 10000m means it was intentionally set)
            if (campusLocation && campusLocation.radius < 10000) {
                setMessage('📍 Checking your location...')
                info('Verifying your location...')

                try {
                    const locationCheck = await isWithinCampus()
                    console.log('Location check result:', locationCheck)
                    setLocationInfo(locationCheck)

                    if (locationCheck.error) {
                        setStatus('error')
                        setMessage(`Location error: ${locationCheck.error}. Please enable location permissions.`)
                        showError(`Location error: ${locationCheck.error}`)
                        return
                    }

                    if (!locationCheck.isWithin) {
                        setStatus('out-of-range')
                        setMessage(`You are ${locationCheck.distance}m away from the classroom. You must be within ${locationCheck.allowedRadius}m to mark attendance.`)
                        showError(`You are too far from the classroom (${locationCheck.distance}m away)`)
                        return
                    }

                    success(`📍 Location verified! You are ${locationCheck.distance}m from classroom.`)
                } catch (locErr) {
                    console.error('Location check failed:', locErr)
                    setStatus('error')
                    setMessage(`Could not verify location: ${locErr.message}`)
                    return
                }
            } else {
                // No location verification required
                info('Location verification not required for this session.')
            }

            setMessage('Starting camera...')
            await startCamera()

            setStatus('ready')
            setMessage('Position your face in the oval guide')

        } catch (error) {
            console.error('Initialization error:', error)
            setStatus('error')
            setMessage(error.message || 'Failed to initialize face scanner')
        }
    }

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

            // Start detection loop
            startDetectionLoop()

        } catch (error) {
            throw new Error('Could not access camera. Please allow camera permissions.')
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
    }

    const startDetectionLoop = useCallback(() => {
        if (!videoRef.current || !modelsReady) return

        const video = videoRef.current
        let animationId

        const detect = async () => {
            if (!streamRef.current || status === 'success' || status === 'error') return

            try {
                const detection = await detectFace(video)
                setFaceDetected(!!detection)
            } catch (err) {
                // Ignore detection errors
            }

            if (streamRef.current) {
                animationId = requestAnimationFrame(detect)
            }
        }

        detect()

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
        }
    }, [modelsReady, status])

    const handleScan = async () => {
        if (!faceDetected || !modelsReady || status !== 'ready') return

        // --- Step 1: Blink Challenge ---
        setStatus('blinking')
        setBlinkCount(0)
        setBlinkTimeLeft(7)
        setMessage('👁️ Please blink naturally 2 times...')

        const REQUIRED_BLINKS = 2
        const BLINK_DURATION_MS = 7000

        // Countdown timer
        const timerInterval = setInterval(() => {
            setBlinkTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timerInterval); return 0 }
                return prev - 1
            })
        }, 1000)

        let detectedBlinks = 0
        try {
            detectedBlinks = await detectBlinks(
                videoRef.current,
                BLINK_DURATION_MS,
                (count) => setBlinkCount(count)
            )
        } catch (e) {
            detectedBlinks = 0
        }
        clearInterval(timerInterval)

        if (detectedBlinks < REQUIRED_BLINKS) {
            setStatus('ready')
            setBlinkCount(0)
            setMessage(`Liveness check failed — only detected ${detectedBlinks} blink(s). Please blink naturally and try again.`)
            showError('Anti-spoofing check failed. Please blink naturally.')
            return
        }

        // --- Step 2: Face Match ---
        setStatus('scanning')
        setMessage('Verifying identity...')
        setScanProgress(20)

        try {
            const video = videoRef.current

            setScanProgress(60)
            const matchResult = await matchFace(video)
            setScanProgress(90)

            if (!matchResult.matched) {
                setAttemptCount(prev => prev + 1)

                if (matchResult.reason === 'NO_FACE_DETECTED') {
                    throw new Error('No face detected. Please position your face properly.')
                } else if (matchResult.reason === 'FACE_NOT_RECOGNIZED') {
                    throw new Error('Face not recognized. Please ensure your face is registered correctly.')
                } else if (matchResult.reason === 'NO_REGISTERED_FACES') {
                    throw new Error('No registered face found for your account.')
                } else {
                    throw new Error('Face verification failed. Please try again.')
                }
            }

            // Verify matched student is current user
            if (matchResult.studentId !== user?.studentId) {
                throw new Error('Face does not match your registered profile.')
            }

            // --- Step 3: Fingerprint Verification ---
            setScanProgress(95)
            setMessage('👆 Please verify your fingerprint...')

            const credentialId = await getCredentialId(user.id)
            if (credentialId) {
                try {
                    await verifyFingerprint(credentialId)
                } catch (fpErr) {
                    if (fpErr.name === 'NotAllowedError') {
                        throw new Error('Fingerprint verification was cancelled. Please try again.')
                    }
                    throw new Error('Fingerprint verification failed. Please use your registered finger.')
                }
            } else {
                // No fingerprint registered — allow but warn
                warning('⚠️ No fingerprint registered. Visit your Profile to set it up for better security.')
            }

            setScanProgress(100)

            // Mark attendance
            await markAttendance(user.studentId, activeSession.id, 'face')

            setStatus('success')
            setMessage(`Attendance marked! Confidence: ${matchResult.confidence}%`)
            success('🎉 Attendance marked successfully!')

            stopCamera()
            refresh()

            setTimeout(() => { navigate('/student') }, 3000)

        } catch (error) {
            console.error('Scan error:', error)
            setStatus('ready')
            setMessage(error.message)
            showError(error.message)
            setScanProgress(0)

            if (attemptCount >= 3) {
                warning('Multiple failed attempts. Please contact your teacher for assistance.')
            }
        }
    }

    const handleRetry = () => {
        setStatus('ready')
        setMessage('Position your face in the oval guide')
        setScanProgress(0)
    }

    return (
        <Layout
            title="Mark Attendance"
            subtitle="Scan your face to mark attendance"
        >
            <div className="glass-card p-xl" style={{ maxWidth: '500px', margin: '0 auto' }}>
                {/* No Session State */}
                {status === 'no-session' && (
                    <div className="attendance-status">
                        <div className="status-icon waiting">⏳</div>
                        <h2>No Active Session</h2>
                        <p className="text-muted">
                            Your teacher hasn't started an attendance session yet.
                            Please wait for them to open attendance.
                        </p>
                        <button
                            className="btn btn-secondary mt-lg"
                            onClick={() => navigate('/student')}
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                )}

                {/* Success State */}
                {status === 'success' && !hasMarkedToday(user?.studentId) === false && (
                    <div className="attendance-status">
                        <div className="status-icon success">✓</div>
                        <h2>Attendance Marked!</h2>
                        <p className="text-muted">{message}</p>
                        <p className="text-sm text-muted mt-md">
                            Redirecting to dashboard...
                        </p>
                    </div>
                )}

                {/* Already Marked */}
                {hasMarkedToday(user?.studentId) && (
                    <div className="attendance-status">
                        <div className="status-icon success">✓</div>
                        <h2>Already Marked!</h2>
                        <p className="text-muted">
                            You have already marked your attendance for today's session.
                        </p>
                        <button
                            className="btn btn-primary mt-lg"
                            onClick={() => navigate('/student')}
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                )}

                {/* Out of Range State */}
                {status === 'out-of-range' && (
                    <div className="attendance-status">
                        <div className="status-icon error" style={{ fontSize: '3rem' }}>📍</div>
                        <h2>Out of Range</h2>
                        <p className="text-muted">
                            You are too far from the classroom to mark attendance.
                        </p>

                        {locationInfo && (
                            <div
                                className="mt-lg p-md"
                                style={{
                                    background: 'rgba(220, 53, 69, 0.1)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--error-color)'
                                }}
                            >
                                <p style={{ margin: 0 }}>
                                    <strong>Your distance:</strong> {locationInfo.distance}m
                                </p>
                                <p style={{ margin: '0.5rem 0 0' }}>
                                    <strong>Maximum allowed:</strong> {locationInfo.allowedRadius}m
                                </p>
                            </div>
                        )}

                        <p className="text-sm text-muted mt-md">
                            💡 Please move closer to the classroom and try again.
                        </p>

                        <div className="flex gap-md justify-center mt-lg">
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/student')}
                            >
                                ← Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={initializeScanner}
                            >
                                🔄 Check Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Camera & Scanning UI */}
                {(status === 'loading' || status === 'ready' || status === 'scanning') && !hasMarkedToday(user?.studentId) && (
                    <>
                        {/* Status Message */}
                        <div className="text-center mb-lg">
                            <span className={`badge ${
                                status === 'loading' ? 'badge-warning' :
                                status === 'blinking' ? 'badge-primary' :
                                status === 'scanning' ? 'badge-primary' :
                                faceDetected ? 'badge-success' : 'badge-warning'
                            }`}>
                                {status === 'loading' && '⏳ Loading...'}
                                {status === 'ready' && (faceDetected ? '✓ Face Detected — Ready' : '⏳ Looking for face...')}
                                {status === 'blinking' && `👁️ Blink ${blinkCount}/${2} detected — ${blinkTimeLeft}s left`}
                                {status === 'scanning' && '🔍 Verifying...'}
                            </span>
                        </div>

                        {/* Camera Container */}
                        <div className="camera-container" style={{ aspectRatio: '4/3' }}>
                            <video
                                ref={videoRef}
                                className="camera-video"
                                autoPlay
                                playsInline
                                muted
                            />

                            {/* Face Guide Overlay */}
                            <div className="camera-overlay">
                                <div className={`face-guide ${faceDetected ? 'detected' : ''
                                    } ${status === 'success' ? 'matched' : ''}`}></div>
                            </div>

                            {/* Loading Overlay */}
                            {status === 'loading' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.7)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}
                                >
                                    <div className="spinner" style={{ borderTopColor: 'white' }}></div>
                                    <p className="mt-md">{message}</p>
                                </div>
                            )}

                            {/* Scan Progress */}
                            {status === 'scanning' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '4px',
                                        background: 'rgba(255,255,255,0.3)'
                                    }}
                                >
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${scanProgress}%`,
                                            background: 'var(--primary-gradient)',
                                            transition: 'width 0.3s ease'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Hidden Canvas */}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Message */}
                        <p className="text-center text-muted mt-md" style={{ margin: '1rem 0' }}>
                            {message}
                        </p>

                        {/* Blink Challenge UI */}
                        {status === 'blinking' && (
                            <div className="text-center mt-lg p-md" style={{
                                background: 'rgba(102,126,234,0.1)',
                                borderRadius: 'var(--radius-lg)',
                                border: '2px solid var(--primary-color)'
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                                    {blinkCount >= 2 ? '✅' : blinkCount === 1 ? '😉' : '👀'}
                                </div>
                                <p className="font-semibold" style={{ margin: 0 }}>
                                    Blink naturally — {blinkCount} of 2 detected
                                </p>
                                <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0' }}>
                                    Time remaining: {blinkTimeLeft}s
                                </p>
                            </div>
                        )}

                        {/* Scan Button */}
                        <div className="flex justify-center mt-lg">
                            {status === 'ready' && (
                                <button
                                    className="btn btn-success btn-lg"
                                    onClick={handleScan}
                                    disabled={!faceDetected}
                                    style={{ minWidth: '200px' }}
                                >
                                    {faceDetected ? '📸 Scan & Mark Attendance' : '⏳ Position Your Face'}
                                </button>
                            )}

                            {(status === 'scanning' || status === 'blinking') && (
                                <button className="btn btn-primary btn-lg" disabled>
                                    <div className="spinner sm" style={{ marginRight: '0.5rem' }}></div>
                                    {status === 'blinking' ? 'Checking liveness...' : 'Verifying...'}
                                </button>
                            )}
                        </div>

                        {/* Attempt Counter */}
                        {attemptCount > 0 && (
                            <p className="text-center text-warning mt-md">
                                Failed attempts: {attemptCount}/3
                            </p>
                        )}
                    </>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div className="attendance-status">
                        <div className="status-icon error">✕</div>
                        <h2>Error</h2>
                        <p className="text-muted">{message}</p>
                        <div className="flex gap-md justify-center mt-lg">
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/student')}
                            >
                                ← Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={initializeScanner}
                            >
                                🔄 Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                {(status === 'ready' || status === 'scanning' || status === 'blinking') && (
                    <div
                        className="mt-lg p-md"
                        style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-lg)'
                        }}
                    >
                        <h4 style={{ margin: '0 0 0.5rem' }}>📌 Tips for better recognition:</h4>
                        <ul className="text-sm text-muted" style={{ margin: 0, paddingLeft: '1.25rem' }}>
                            <li>Ensure good lighting on your face</li>
                            <li>Remove glasses if having issues</li>
                            <li>Look directly at the camera</li>
                            <li>Blink naturally when prompted 👁️</li>
                        </ul>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default FaceScanner
