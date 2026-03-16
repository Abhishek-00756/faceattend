// Geolocation Service for campus verification

// Default campus location (set your campus coordinates)
const DEFAULT_CAMPUS = {
    latitude: 28.6139,  // Example: Delhi coordinates
    longitude: 77.2090,
    radius: 500 // meters
}

let campusLocation = { ...DEFAULT_CAMPUS }

// Set campus location
export function setCampusLocation(lat, lng, radiusMeters = 500) {
    campusLocation = {
        latitude: lat,
        longitude: lng,
        radius: radiusMeters
    }

    // Save to localStorage
    localStorage.setItem('campusLocation', JSON.stringify(campusLocation))
}

// Get campus location
export function getCampusLocation() {
    const saved = localStorage.getItem('campusLocation')
    if (saved) {
        campusLocation = JSON.parse(saved)
    }
    return campusLocation
}

// Get current position
export function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                })
            },
            (error) => {
                let message = 'Unable to get location'
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location permission denied'
                        break
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable'
                        break
                    case error.TIMEOUT:
                        message = 'Location request timed out'
                        break
                }
                reject(new Error(message))
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        )
    })
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
}

// Check if current location is within campus
export async function isWithinCampus() {
    try {
        const currentPosition = await getCurrentPosition()
        const campus = getCampusLocation()

        const distance = calculateDistance(
            currentPosition.latitude,
            currentPosition.longitude,
            campus.latitude,
            campus.longitude
        )

        return {
            isWithin: distance <= campus.radius,
            distance: Math.round(distance),
            allowedRadius: campus.radius,
            currentPosition
        }
    } catch (error) {
        return {
            isWithin: false,
            error: error.message
        }
    }
}

// Watch position for real-time updates
export function watchPosition(callback) {
    if (!navigator.geolocation) {
        callback({ error: 'Geolocation not supported' })
        return null
    }

    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            })
        },
        (error) => {
            callback({ error: error.message })
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        }
    )

    return watchId
}

// Stop watching position
export function clearWatch(watchId) {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
    }
}
