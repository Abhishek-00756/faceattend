function LoadingSpinner({ size = 'md', message = '' }) {
    const sizeClass = size === 'sm' ? 'sm' : ''

    return (
        <div className="flex flex-col items-center justify-center gap-md p-xl">
            <div className={`spinner ${sizeClass}`}></div>
            {message && <p className="text-muted">{message}</p>}
        </div>
    )
}

export default LoadingSpinner
