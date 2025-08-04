import Link from 'next/link';

export const metadata = {
    title: 'Terms of Service',
    description: 'PomoUno Terms of Service - Rules and guidelines for using our service.',
};

export default function TermsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-4">
                    Terms of Service
                </h1>
                <p className="text-muted-foreground">
                    Last updated: January 2025
                </p>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none">
                <h2>Agreement to Terms</h2>
                <p>
                    By accessing and using PomoUno, you accept and agree to be bound by the terms and provision of this agreement.
                </p>

                <h2>Description of Service</h2>
                <p>
                    PomoUno is a free, open-source Pomodoro timer application designed to help users improve their productivity and focus through time management techniques.
                </p>

                <h2>User Accounts</h2>
                <p>
                    To access certain features, you may need to create an account. You are responsible for:
                </p>
                <ul>
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Providing accurate and complete information</li>
                    <li>Promptly updating your account information</li>
                </ul>

                <h2>Acceptable Use</h2>
                <p>You agree not to:</p>
                <ul>
                    <li>Use the service for any unlawful purpose</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with or disrupt the service</li>
                    <li>Upload malicious code or content</li>
                    <li>Violate any applicable laws or regulations</li>
                </ul>

                <h2>Open Source License</h2>
                <p>
                    PomoUno is open-source software released under the MIT License. You are free to use, modify, and distribute the software in accordance with the license terms.
                </p>

                <h2>Privacy and Data</h2>
                <p>
                    Your privacy is important to us. Please review our <Link href="/legal/privacy" className="text-red-600 dark:text-red-400 hover:underline">Privacy Policy</Link>, which also governs your use of the service, to understand our practices.
                </p>

                <h2>Service Availability</h2>
                <p>
                    We strive to maintain high availability, but we do not guarantee that the service will be available at all times. We may temporarily suspend the service for maintenance or updates.
                </p>

                <h2>Limitation of Liability</h2>
                <p>
                    PomoUno is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
                </p>

                <h2>User Content</h2>
                <p>
                    You retain ownership of any content you create using PomoUno (tasks, notes, etc.). You grant us a limited license to store and sync this content to provide our services.
                </p>

                <h2>Termination</h2>
                <p>
                    You may terminate your account at any time. We may terminate or suspend your account if you violate these terms. Upon termination, your right to use the service ceases immediately.
                </p>

                <h2>Changes to Terms</h2>
                <p>
                    We reserve the right to modify these terms at any time. We will notify users of any material changes. Your continued use of the service after changes constitutes acceptance of the new terms.
                </p>

                <h2>Governing Law</h2>
                <p>
                    These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
                </p>

                <h2>Contact Information</h2>
                <p>
                    If you have any questions about these Terms of Service, please contact us at:
                </p>
                <ul>
                    <li>Email: legal@pomouno.com</li>
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