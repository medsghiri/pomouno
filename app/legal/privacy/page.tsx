import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy',
    description: 'PomoUno Privacy Policy - How we protect and handle your data.',
};

export default function PrivacyPage() {
    return (
        <main className="space-y-8" role="main" aria-labelledby="privacy-heading">
            <header>
                <h1 id="privacy-heading" className="text-3xl font-bold text-foreground mb-4">
                    Privacy Policy
                </h1>
                <p className="text-muted-foreground">
                    <time dateTime="2025-01">Last updated: January 2025</time>
                </p>
            </header>

            <article className="prose prose-gray dark:prose-invert max-w-none">
                <section aria-labelledby="introduction-heading">
                    <h2 id="introduction-heading">Introduction</h2>
                    <p>
                        At PomoUno, we believe your privacy is fundamental. This Privacy Policy explains how we collect, use, and protect your information when you use our Pomodoro timer application.
                    </p>
                </section>

                <section aria-labelledby="collection-heading">
                    <h2 id="collection-heading">Information We Collect</h2>

                    <h3>Information You Provide</h3>
                    <p>When you create an account, we collect:</p>
                    <ul>
                        <li><strong>Email address</strong> - For account creation and authentication</li>
                        <li><strong>Display name</strong> - Optional, for personalization</li>
                        <li><strong>Tasks and productivity data</strong> - Your tasks, session history, and settings</li>
                        <li><strong>Break reminders</strong> - Your custom break reminder preferences</li>
                    </ul>

                    <h3>Automatically Collected Information</h3>
                    <p>We automatically collect minimal technical information:</p>
                    <ul>
                        <li><strong>Device information</strong> - Browser type and version for compatibility</li>
                        <li><strong>Usage data</strong> - Session timestamps and duration (stored locally first)</li>
                        <li><strong>Error logs</strong> - Technical errors to improve the service</li>
                    </ul>

                    <h3>Information We Don&apos;t Collect</h3>
                    <p>We explicitly do not collect:</p>
                    <ul>
                        <li>Personal identification beyond email</li>
                        <li>Location data</li>
                        <li>Browsing history from other websites</li>
                        <li>Social media profiles or contacts</li>
                        <li>Payment information (PomoUno is free)</li>
                    </ul>
                </section>

                <section aria-labelledby="usage-heading">
                    <h2 id="usage-heading">How We Use Your Information</h2>
                    <p>We use your information solely to:</p>
                    <ul>
                        <li><strong>Provide the service</strong> - Timer functionality, task management, and statistics</li>
                        <li><strong>Sync your data</strong> - Across your devices when you&apos;re signed in</li>
                        <li><strong>Improve the app</strong> - Fix bugs and add features based on usage patterns</li>
                        <li><strong>Communicate with you</strong> - Respond to support requests and important updates</li>
                    </ul>
                </section>

                <section aria-labelledby="storage-heading">
                    <h2 id="storage-heading">Data Storage and Security</h2>

                <h3>Local-First Approach</h3>
                <p>
                    PomoUno is designed with a &ldquo;local-first&rdquo; philosophy. Your data is primarily stored on your device using browser local storage. This means:
                </p>
                <ul>
                    <li>Your data remains on your device even if our servers are down</li>
                    <li>You maintain control over your productivity data</li>
                </ul>

                <h3>Cloud Backup (Optional)</h3>
                <p>
                    When you create an account, we securely store a copy of your data using Firebase (Google Cloud Platform) to:
                </p>
                <ul>
                    <li>Sync data across your devices</li>
                    <li>Provide backup in case you lose your device</li>
                    <li>Allow you to access your data from anywhere</li>
                </ul>

                <h3>Security Measures</h3>
                <p>We protect your data through:</p>
                <ul>
                    <li><strong>Encryption</strong> - All data is encrypted in transit and at rest</li>
                    <li><strong>Authentication</strong> - Secure Firebase Authentication</li>
                    <li><strong>Access controls</strong> - Only you can access your data</li>
                    <li><strong>Regular updates</strong> - We keep our security measures current</li>
                </ul>
                </section>

                <section aria-labelledby="sharing-heading">
                    <h2 id="sharing-heading">Data Sharing and Third Parties</h2>
                    <p>
                        We do not sell, trade, or rent your personal information to third parties. We only share data in these limited circumstances:
                    </p>
                    <ul>
                        <li><strong>Firebase/Google</strong> - For authentication and data storage (covered by Google&apos;s privacy policy)</li>
                        <li><strong>Legal requirements</strong> - If required by law or to protect our rights</li>
                        <li><strong>Service providers</strong> - Only if necessary for core functionality, under strict privacy agreements</li>
                    </ul>
                </section>

                <section aria-labelledby="rights-heading">
                    <h2 id="rights-heading">Your Rights and Choices</h2>

                    <h3>Account Control</h3>
                    <p>You have complete control over your account:</p>
                    <ul>
                        <li><strong>Access</strong> - View all your stored data anytime</li>
                        <li><strong>Update</strong> - Modify your information and settings</li>
                        <li><strong>Export</strong> - Download your data in a portable format</li>
                        <li><strong>Delete</strong> - Permanently remove your account and all data</li>
                    </ul>

                    <h3>Data Portability</h3>
                    <p>
                        Your data is stored in standard formats and can be exported at any time. Since PomoUno is open-source, you can even run your own instance if desired.
                    </p>
                </section>

                <section aria-labelledby="cookies-heading">
                    <h2 id="cookies-heading">Cookies and Local Storage</h2>
                    <p>
                        We use minimal cookies and primarily rely on browser local storage. See our <Link href="/legal/cookies" className="text-red-600 dark:text-red-400 hover:underline">Cookie Policy</Link> for detailed information.
                    </p>
                </section>

                <section aria-labelledby="children-heading">
                    <h2 id="children-heading">Children&apos;s Privacy</h2>
                    <p>
                        PomoUno is suitable for users of all ages, including students. We do not knowingly collect personal information from children under 13 without parental consent. If you believe we have collected such information, please contact us immediately.
                    </p>
                </section>

                <section aria-labelledby="international-heading">
                    <h2 id="international-heading">International Users</h2>
                    <p>
                        PomoUno is available worldwide. Your data may be stored and processed in the United States or other countries where our service providers operate. We ensure appropriate safeguards are in place for international data transfers.
                    </p>
                </section>

                <section aria-labelledby="changes-heading">
                    <h2 id="changes-heading">Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of any material changes by:
                    </p>
                    <ul>
                        <li>Posting the updated policy on this page</li>
                        <li>Updating the &ldquo;Last updated&rdquo; date</li>
                        <li>Sending an email notification for significant changes (if you have an account)</li>
                    </ul>

                    <h3>Open Source Transparency</h3>
                    <p>
                        PomoUno is completely open source. You can review our code, data handling practices, and privacy implementations at <a href="https://github.com/pomouno/pomouno" target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-400 hover:underline">github.com/pomouno/pomouno</a>.
                    </p>
                </section>

                <section aria-labelledby="contact-heading">
                    <h2 id="contact-heading">Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy or how we handle your data, please contact us:
                    </p>
                    <ul>
                        <li>Email: privacy@pomouno.com</li>
                        <li>GitHub Issues: <a href="https://github.com/pomouno/pomouno/issues" target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-400 hover:underline">Report privacy concerns</a></li>
                    </ul>

                    <h3>Data Protection Officer</h3>
                    <p>
                        For privacy-related inquiries, you can reach our Data Protection Officer at: dpo@pomouno.com
                    </p>
                </section>
            </article>

            <nav className="pt-8 border-t border-accent">
                <Link
                    href="/"
                    className="inline-flex items-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                    ← Back to PomoUno
                </Link>
            </nav>
        </main>
    );
}