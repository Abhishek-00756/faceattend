// WebAuthn (Fingerprint / Face ID / Biometric) Service
// Uses the browser's built-in Web Authentication API (WebAuthn)
// No external library needed — supported on all modern phones

// --- Helpers ---
function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    const binary = atob(padded)
    const buffer = new ArrayBuffer(binary.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return buffer
}

function generateChallenge() {
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    return challenge
}

// --- Public API ---

// Check if this browser/device supports WebAuthn biometrics
export function isWebAuthnSupported() {
    return !!(
        navigator.credentials &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential === 'function'
    )
}

// Check if the device has a platform authenticator (fingerprint sensor / Face ID)
export async function isBiometricAvailable() {
    if (!isWebAuthnSupported()) return false
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
        return false
    }
}

// Register a new fingerprint credential for the student
// Returns the credentialId (a string) to store in Firebase
export async function registerFingerprint(userId, userName) {
    if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported on this browser.')
    }

    const available = await isBiometricAvailable()
    if (!available) {
        throw new Error('No fingerprint sensor or biometric authenticator detected on this device.')
    }

    const challenge = generateChallenge()

    const credential = await navigator.credentials.create({
        publicKey: {
            challenge,
            rp: {
                name: 'FaceAttend',
                id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
            },
            user: {
                id: new TextEncoder().encode(userId),
                name: userName,
                displayName: userName
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' },   // ES256 (most common)
                { alg: -257, type: 'public-key' }   // RS256 (Windows Hello)
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',  // On-device only (fingerprint/Face ID)
                userVerification: 'required',          // Biometric MUST be verified
                residentKey: 'preferred'
            },
            timeout: 60000,
            attestation: 'none'
        }
    })

    // Return the credential ID as a base64url string to store in Firebase
    return bufferToBase64url(credential.rawId)
}

// Verify fingerprint during attendance
// credentialId must be the value stored in Firebase for this student
export async function verifyFingerprint(credentialId) {
    if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported on this browser.')
    }

    const challenge = generateChallenge()

    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: [
                {
                    id: base64urlToBuffer(credentialId),
                    type: 'public-key',
                    transports: ['internal']  // internal = on-device biometric
                }
            ],
            userVerification: 'required',  // Biometric MUST pass
            timeout: 60000
        }
    })

    // If we reach here without an exception, biometric passed
    return !!assertion
}
