import Link from 'next/link';

export const metadata = {
    title: 'Cookie Policy',
    description: 'PomoUno Cookie Policy - How we use cookies and local storage.',
};

export default function CookiesPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-4">
                    Cookie Policy
                </h1>
                <p className="text-muted-foreground">
                    Last updated: January 2025
                </p>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none">
                <h2>What Are Cookies?</h2>
                <p>
                    Cookies are small text files that are stored on your device when you visit a website. They help websites remember information about your visit, which can make your next visit easier and the site more useful to you.
                </p>

                <h2>How PomoUno Uses Cookies and Local Storage</h2>
                <p>
                    PomoUno is designed to work offline-first and respects your privacy. We use minimal cookies and primarily rely on browser local storage to provide our services.
                </p>

                <h3>Essential Cookies and Storage</h3>
                <p>These are necessary for PomoUno to function properly:</p>
                <ul>
                    <li><strong>Authentication cookies</strong> - To keep you logged in when you create an account</li>
                    <li><strong>Session storage</strong> - To maintain your timer state during your session</li>
                    <li><strong>Local storage</strong> - To save your tasks, settings, and session data locally on your device</li>
                </ul>

                <h3>Functional Storage</h3>
                <p>We use local storage to enhance your experience:</p>
                <ul>
                    <li><strong>User preferences</strong> - Your timer settings, theme preferences, and audio choices</li>
                    <li><strong>Task data</strong> - Your tasks, categories, and progress tracking</li>
                    <li><strong>Statistics</strong> - Your productivity statistics and session history</li>
                    <li><strong>Break reminders</strong> - Your custom break reminder settings and completion history</li>
                </ul>

                <h2>Third-Party Services</h2>
                <p>
                    PomoUno uses Firebase (Google) for authentication and data synchronization when you create an account. Firebase may set its own cookies for authentication purposes. You can learn more about Google&apos;s privacy practices at <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-400 hover:underline">Google Privacy Policy</a>.
                </p>

                <h2>Analytics and Tracking</h2>
                <p>
                    PomoUno does not use any analytics cookies, tracking pixels, or third-party advertising networks. We do not track your behavior across other websites.
                </p>

                <h2>Managing Cookies and Local Storage</h2>
                <p>You can control cookies and local storage through your browser settings:</p>

                <h3>Browser Controls</h3>
                <ul>
                    <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                    <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
                    <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                    <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
                </ul>

                <h3>What Happens When You Disable Storage</h3>
                <p>If you disable cookies and local storage:</p>
                <ul>
                    <li>PomoUno will still work for basic timer functionality</li>
                    <li>Your settings and tasks won&apos;t be saved between sessions</li>
                    <li>You won&apos;t be able to create an account or sync data</li>
                    <li>Statistics and progress tracking won&apos;t be available</li>
                </ul>

                <h2>Data Retention</h2>
                <p>
                    Local storage data remains on your device until you clear it manually or uninstall your browser. If you create an account, your data is also stored on our secure servers and you can delete it at any time through your account settings.
                </p>

                <h2>Updates to This Policy</h2>
                <p>
                    We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.
                </p>

                <h2>Contact Us</h2>
                <p>
                    If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
                </p>
                <ul>
                    <li>Email: privacy@pomouno.com</li>
                    <li>GitHub: <a href="https://github.com/pomouno/pomouno" target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-400 hover:underline">github.com/pomouno/pomouno</a></li>
                </ul>
            </div>

            <div className="pt-8 border-t border-accent">
                <Link
                    href="/"
                    className="inline-flex items-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                    ← Back to PomoUno
                </Link>
            </div>
        </div>
    );
}