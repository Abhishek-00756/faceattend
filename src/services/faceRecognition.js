// Face Recognition Service using face-api.js
import * as faceapi from '@vladmandic/face-api'
import { faceStore } from './storage'

let modelsLoaded = false
let labeledDescriptors = null

// Model URLs (using CDN)
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model'

// Load all required models
export async function loadModels() {
    if (modelsLoaded) return true

    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ])

        modelsLoaded = true
        console.log('Face-api models loaded successfully')
        return true
    } catch (error) {
        console.error('Error loading face-api models:', error)
        throw new Error('Failed to load face recognition models')
    }
}

// Detect faces in an image/video element
export async function detectFace(input) {
    if (!modelsLoaded) {
        await loadModels()
    }

    const detection = await faceapi
        .detectSingleFace(input)
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withFaceExpressions()

    return detection
}

// Detect all faces in an image
export async function detectAllFaces(input) {
    if (!modelsLoaded) {
        await loadModels()
    }

    const detections = await faceapi
        .detectAllFaces(input)
        .withFaceLandmarks()
        .withFaceDescriptors()

    return detections
}

// Extract face descriptor from an image
export async function getFaceDescriptor(input) {
    const detection = await detectFace(input)

    if (!detection) {
        throw new Error('No face detected in the image')
    }

    return detection.descriptor
}

// Register a student's face
export async function registerFace(studentId, imageElement) {
    try {
        const descriptor = await getFaceDescriptor(imageElement)

        // Convert Float32Array to regular array for storage
        const descriptorArray = Array.from(descriptor)

        await faceStore.update({
            studentId,
            descriptor: descriptorArray,
            registeredAt: new Date().toISOString()
        })

        // Invalidate cached descriptors
        labeledDescriptors = null

        return true
    } catch (error) {
        console.error('Error registering face:', error)
        throw error
    }
}

// Load all registered face descriptors
export async function loadRegisteredFaces() {
    const allFaces = await faceStore.getAll()

    if (allFaces.length === 0) {
        return []
    }

    const labeledDescriptors = allFaces.map(face => {
        const descriptor = new Float32Array(face.descriptor)
        return new faceapi.LabeledFaceDescriptors(face.studentId, [descriptor])
    })

    return labeledDescriptors
}

// Match a face against registered faces
export async function matchFace(imageElement, threshold = 0.6) {
    try {
        // Get current face descriptor
        const detection = await detectFace(imageElement)

        if (!detection) {
            return { matched: false, reason: 'NO_FACE_DETECTED' }
        }

        // Load registered faces if not cached
        if (!labeledDescriptors) {
            labeledDescriptors = await loadRegisteredFaces()
        }

        if (labeledDescriptors.length === 0) {
            return { matched: false, reason: 'NO_REGISTERED_FACES' }
        }

        // Create face matcher
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold)

        // Find best match
        const match = faceMatcher.findBestMatch(detection.descriptor)

        if (match.label === 'unknown') {
            return {
                matched: false,
                reason: 'FACE_NOT_RECOGNIZED',
                distance: match.distance
            }
        }

        return {
            matched: true,
            studentId: match.label,
            distance: match.distance,
            confidence: ((1 - match.distance) * 100).toFixed(1)
        }
    } catch (error) {
        console.error('Error matching face:', error)
        return { matched: false, reason: 'ERROR', message: error.message }
    }
}


// Draw face detection overlay on canvas
export function drawFaceDetection(canvas, detection, options = {}) {
    const { showLandmarks = false, showExpressions = false } = options

    const displaySize = {
        width: canvas.width,
        height: canvas.height
    }

    faceapi.matchDimensions(canvas, displaySize)

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!detection) return

    const resizedDetection = faceapi.resizeResults(detection, displaySize)

    // Draw detection box
    faceapi.draw.drawDetections(canvas, resizedDetection)

    if (showLandmarks) {
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetection)
    }

    if (showExpressions) {
        faceapi.draw.drawFaceExpressions(canvas, resizedDetection)
    }
}

// Check if models are loaded
export function areModelsLoaded() {
    return modelsLoaded
}

// Clear cached labeled descriptors (call when new face is registered)
export function clearCache() {
    labeledDescriptors = null
}
