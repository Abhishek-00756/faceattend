# FaceAttend - Smart Attendance System 🎓

A modern, secure attendance management system using **facial recognition** technology with separate portals for teachers and students.

![FaceAttend](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![Face API](https://img.shields.io/badge/Face_API-1.7-green.svg)

## ✨ Features

### For Teachers
- 👥 **Student Registration** - Register students with name, roll number, and face photo
- 📸 **Face Enrollment** - Capture and store facial data for recognition
- 📋 **Attendance Sessions** - Start/stop attendance windows with live updates
- 📊 **Analytics Dashboard** - Visual stats and attendance trends
- 📚 **Class Management** - Organize students by class and section
- 📈 **Reports** - Export attendance data as CSV

### For Students
- 🔐 **Secure Login** - Personal account with teacher-assigned credentials
- 📸 **Face Scan Attendance** - Mark attendance by scanning face
- 📅 **Attendance History** - View past records in list or calendar view
- 👤 **Profile Management** - Update password and view profile

### Security Features
- 🛡️ **Anti-Spoofing** - Liveness detection to prevent photo attacks
- 📍 **Geolocation** (Optional) - Verify students are within campus
- 🔒 **Local Processing** - All face data processed on-device

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Modern browser with camera access

### Installation

```bash
# Navigate to project directory
cd antiattendance

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### First Time Setup

1. **Sign Up as Teacher**
   - Go to Login → Click "Create one"
   - Enter your name, email, and password

2. **Register Students**
   - Go to "Register Student" from dashboard
   - Fill in student details (name, roll number, email)
   - Capture student's face photo
   - Student will receive login credentials (password = roll number)

3. **Start Attendance Session**
   - Go to "Attendance" and click "Start Session"
   - Students can now mark attendance by scanning their face

4. **Student Login**
   - Students use email and roll number as password
   - Navigate to "Mark Attendance" and scan face

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | Frontend framework |
| Vite | Build tool |
| face-api.js | Facial recognition (TensorFlow.js) |
| IndexedDB | Local data storage |
| React Router | Navigation |
| CSS3 | Styling (Glassmorphism) |

## 📁 Project Structure

```
antiattendance/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── auth/          # Login, Signup
│   │   ├── common/        # Navbar, Sidebar, Modal
│   │   ├── teacher/       # Teacher portal pages
│   │   └── student/       # Student portal pages
│   ├── context/           # React contexts
│   ├── services/          # Core services
│   │   ├── storage.js     # IndexedDB operations
│   │   ├── faceRecognition.js
│   │   └── geolocation.js
│   ├── utils/             # Helpers & constants
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

## 🎨 UI Design

- **Glassmorphism** cards with backdrop blur
- **Modern gradients** (Purple → Lavender)
- **Smooth animations** and micro-interactions
- **Dark mode** support
- **Responsive** design for all devices
- **Inter** font family

## 📡 API Reference

### Storage Service

```javascript
import { studentStore, attendanceStore } from './services/storage'

// Add student
await studentStore.add({ id, name, rollNo, email, photo, teacherId })

// Get student's attendance
const records = await attendanceStore.getByStudent(studentId)
```

### Face Recognition Service

```javascript
import { loadModels, registerFace, matchFace } from './services/faceRecognition'

// Load models (required first)
await loadModels()

// Register face during enrollment
await registerFace(studentId, imageElement)

// Match face during attendance
const result = await matchFace(videoElement)
// { matched: true, studentId: '123', confidence: '95.5' }
```

## 🔒 Privacy & Security

- All facial data is processed **locally in the browser**
- No data is sent to external servers
- Face descriptors are stored in browser's IndexedDB
- Passwords are hashed using SHA-256

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use for educational purposes!

---

Built with ❤️ for modern classrooms
