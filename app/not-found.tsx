export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="text-center">
                <div className="text-8xl font-bold text-primary-600 mb-4">404</div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Page Not Found
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist.
                </p>
                <a
                    href="/"
                    className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                    Go Home
                </a>
            </div>
        </div>
    )
}
