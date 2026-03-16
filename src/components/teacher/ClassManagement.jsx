import { useState, useEffect } from 'react'
import Layout from '../common/Layout'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { classStore, studentStore, generateId } from '../../services/storage'

function ClassManagement() {
    const { user } = useAuth()
    const { success, error: showError } = useToast()

    const [classes, setClasses] = useState([])
    const [students, setStudents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingClass, setEditingClass] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        section: '',
        subject: '',
        description: ''
    })

    const [errors, setErrors] = useState({})

    useEffect(() => {
        loadData()
    }, [user])

    const loadData = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const teacherClasses = await classStore.getByTeacher(user.id)
            const teacherStudents = await studentStore.getByTeacher(user.id)

            // Add student count to each class
            const classesWithCount = teacherClasses.map(c => ({
                ...c,
                studentCount: teacherStudents.filter(s => s.classId === c.id).length
            }))

            setClasses(classesWithCount)
            setStudents(teacherStudents)
        } catch (error) {
            console.error('Error loading classes:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setErrors(prev => ({ ...prev, [name]: '' }))
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.name.trim()) {
            newErrors.name = 'Class name is required'
        }
        if (!formData.section.trim()) {
            newErrors.section = 'Section is required'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        try {
            if (editingClass) {
                // Update existing class
                const updatedClass = {
                    ...editingClass,
                    name: formData.name.trim(),
                    section: formData.section.trim(),
                    subject: formData.subject.trim(),
                    description: formData.description.trim()
                }
                await classStore.update(updatedClass)
                success('Class updated successfully!')
            } else {
                // Create new class
                const newClass = {
                    id: generateId(),
                    name: formData.name.trim(),
                    section: formData.section.trim(),
                    subject: formData.subject.trim(),
                    description: formData.description.trim(),
                    teacherId: user.id,
                    createdAt: new Date().toISOString()
                }
                await classStore.add(newClass)
                success('Class created successfully!')
            }

            setShowModal(false)
            resetForm()
            loadData()
        } catch (error) {
            showError(error.message)
        }
    }

    const handleEdit = (classItem) => {
        setEditingClass(classItem)
        setFormData({
            name: classItem.name,
            section: classItem.section,
            subject: classItem.subject || '',
            description: classItem.description || ''
        })
        setShowModal(true)
    }

    const handleDelete = async (classItem) => {
        if (!confirm(`Are you sure you want to delete "${classItem.name} - ${classItem.section}"?`)) {
            return
        }

        try {
            await classStore.delete(classItem.id)
            success('Class deleted successfully!')
            loadData()
        } catch (error) {
            showError(error.message)
        }
    }

    const resetForm = () => {
        setFormData({ name: '', section: '', subject: '', description: '' })
        setEditingClass(null)
        setErrors({})
    }

    const openNewClassModal = () => {
        resetForm()
        setShowModal(true)
    }

    return (
        <Layout
            title="Class Management"
            subtitle="Organize students into classes and sections"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <p className="text-muted" style={{ margin: 0 }}>
                        {classes.length} {classes.length === 1 ? 'class' : 'classes'} • {students.length} total students
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openNewClassModal}>
                    ➕ Add New Class
                </button>
            </div>

            {/* Classes Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center p-xl">
                    <div className="spinner"></div>
                </div>
            ) : classes.length > 0 ? (
                <div className="grid grid-cols-3 gap-lg">
                    {classes.map(classItem => (
                        <div key={classItem.id} className="glass-card p-lg">
                            <div className="flex items-start justify-between mb-md">
                                <div>
                                    <h3 style={{ margin: 0 }}>{classItem.name}</h3>
                                    <span className="badge badge-primary mt-sm">Section {classItem.section}</span>
                                </div>

                                <div className="flex gap-xs">
                                    <button
                                        className="btn btn-icon btn-ghost"
                                        onClick={() => handleEdit(classItem)}
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn btn-icon btn-ghost"
                                        onClick={() => handleDelete(classItem)}
                                        title="Delete"
                                        style={{ color: 'var(--error-color)' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {classItem.subject && (
                                <p className="text-muted text-sm" style={{ margin: '0 0 0.5rem' }}>
                                    📚 {classItem.subject}
                                </p>
                            )}

                            {classItem.description && (
                                <p className="text-muted text-sm" style={{ margin: '0 0 1rem' }}>
                                    {classItem.description}
                                </p>
                            )}

                            <div
                                className="flex items-center gap-md p-md mt-md"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-lg)'
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>👥</span>
                                <div>
                                    <p className="font-bold" style={{ margin: 0 }}>{classItem.studentCount}</p>
                                    <p className="text-sm text-muted" style={{ margin: 0 }}>Students</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card">
                    <div className="empty-state">
                        <div className="icon">📚</div>
                        <h3>No Classes Yet</h3>
                        <p>Create classes to organize your students by grade, section, or subject.</p>
                        <button className="btn btn-primary" onClick={openNewClassModal}>
                            ➕ Create First Class
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Class Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false)
                    resetForm()
                }}
                title={editingClass ? 'Edit Class' : 'Add New Class'}
                footer={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowModal(false)
                                resetForm()
                            }}
                        >
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingClass ? 'Update Class' : 'Create Class'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Class Name *</label>
                        <input
                            type="text"
                            name="name"
                            className={`form-input ${errors.name ? 'error' : ''}`}
                            placeholder="e.g., 10th Grade, Computer Science 101"
                            value={formData.name}
                            onChange={handleChange}
                        />
                        {errors.name && <span className="form-error">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Section *</label>
                        <input
                            type="text"
                            name="section"
                            className={`form-input ${errors.section ? 'error' : ''}`}
                            placeholder="e.g., A, B, Morning Batch"
                            value={formData.section}
                            onChange={handleChange}
                        />
                        {errors.section && <span className="form-error">{errors.section}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subject (Optional)</label>
                        <input
                            type="text"
                            name="subject"
                            className="form-input"
                            placeholder="e.g., Mathematics, Physics"
                            value={formData.subject}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description (Optional)</label>
                        <textarea
                            name="description"
                            className="form-input"
                            placeholder="Add any notes about this class..."
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </form>
            </Modal>
        </Layout>
    )
}

export default ClassManagement
