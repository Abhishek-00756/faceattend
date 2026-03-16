import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

function Layout({ children, title, subtitle }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="app-wrapper">
            <Navbar />

            <div className="app-layout">
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <main className="main-content">
                    {/* Mobile Menu Button */}
                    <button
                        className="btn btn-icon btn-ghost mobile-menu-btn"
                        onClick={() => setSidebarOpen(true)}
                        style={{
                            display: 'none',
                            marginBottom: 'var(--spacing-md)'
                        }}
                    >
                        ☰
                    </button>

                    {/* Page Header */}
                    {(title || subtitle) && (
                        <div className="page-header">
                            {title && <h1>{title}</h1>}
                            {subtitle && <p className="text-muted">{subtitle}</p>}
                        </div>
                    )}

                    {/* Page Content */}
                    {children}
                </main>
            </div>

            <style>{`
        @media (max-width: 1024px) {
          .mobile-menu-btn {
            display: block !important;
          }
          .sidebar-overlay {
            display: block !important;
          }
        }
      `}</style>
        </div>
    )
}

export default Layout
