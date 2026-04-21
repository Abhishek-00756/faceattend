import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../common/Layout'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAttendance } from '../../context/AttendanceContext'
import { loadModels, detectFace, matchFace } from '../../services/faceRecognition'
import { verifyFingerprint } from '../../services/webauthn'

function FaceScanner() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { getCredentialId } = useAuth()
    const { success, error: showError, warning, info } = useToast()
    const { activeSession, markAttendance, hasMarkedToday, refresh } = useAttendance()

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    const [status, setStatus] = useState('loading') // loading, ready, blinking, scanning, success, error, no-session
    const [message, setMessage] = useState('Initializing camera...')
    const [modelsReady, setModelsReady] = useState(false)
    const [faceDetected, setFaceDetected] = useState(false)
    const [scanProgress, setScanProgress] = useState(0)
    const [attemptCount, setAttemptCount] = useState(0)

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

        // --- Step 1: Face Match ---
        setStatus('scanning')
        setMessage('Verifying identity...')
        setScanProgress(20)

        try {
            const video = videoRef.current
            let matchResult = null
            const MAX_ATTEMPTS = 8 // Try up to 8 frames across 4 seconds

            for (let i = 0; i < MAX_ATTEMPTS; i++) {
                setScanProgress(20 + (i * 10))
                // Pass threshold 0.65 (slightly lenient) since we follow up with fingerprint Auth
                matchResult = await matchFace(video, 0.65)
                
                if (matchResult.matched || matchResult.reason === 'NO_REGISTERED_FACES') {
                    break
                }
                
                // Wait 500ms before next frame attempt
                if (i < MAX_ATTEMPTS - 1) {
                    await new Promise(res => setTimeout(res, 500))
                }
            }

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



                {/* Camera & Scanning UI */}
                {(status === 'loading' || status === 'ready' || status === 'scanning') && !hasMarkedToday(user?.studentId) && (
                    <>
                        {/* Status Message */}
                        <div className="text-center mb-lg">
                            <span className={`badge ${
                                status === 'loading' ? 'badge-warning' :
                                status === 'scanning' ? 'badge-primary' :
                                faceDetected ? 'badge-success' : 'badge-warning'
                            }`}>
                                {status === 'loading' && '⏳ Loading...'}
                                {status === 'ready' && (faceDetected ? '✓ Face Detected — Ready' : '⏳ Looking for face...')}
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

                            {status === 'scanning' && (
                                <button className="btn btn-primary btn-lg" disabled>
                                    <div className="spinner sm" style={{ marginRight: '0.5rem' }}></div>
                                    Verifying...
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
                {(status === 'ready' || status === 'scanning') && (
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
                        </ul>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default FaceScanner
