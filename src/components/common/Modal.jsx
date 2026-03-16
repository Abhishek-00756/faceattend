function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
    if (!isOpen) return null

    const sizeStyles = {
        sm: { maxWidth: '400px' },
        md: { maxWidth: '500px' },
        lg: { maxWidth: '700px' },
        xl: { maxWidth: '900px' }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                style={sizeStyles[size]}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button
                        className="btn btn-icon btn-ghost"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Modal
