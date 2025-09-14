import Link from "next/link";
import {
  Mail,
  Github,
  MessageCircle,
  Bug,
  Lightbulb,
  Heart,
} from "lucide-react";

export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the PomoUno team - support, feedback, and contributions.",
};

export default function ContactPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Get in Touch
        </h1>
        <p className="text-lg text-muted-foreground">
          We&apos;d love to hear from you! Whether you have questions, feedback,
          or want to contribute.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Support */}
        <div className="rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Support</h2>
          </div>
          <p className="text-muted-foreground">
            Need help with PomoUno? Have a question about features or your
            account?
          </p>
          <a
            href="mailto:support@pomouno.com"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <Mail className="w-4 h-4" />
            support@pomouno.com
          </a>
        </div>

        {/* Bug Reports */}
        <div className="rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full">
              <Bug className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Bug Reports
            </h2>
          </div>
          <p className="text-muted-foreground">
            Found a bug? Help us improve PomoUno by reporting issues on GitHub.
          </p>
          <a
            href="https://github.com/medsghiri/pomounoissues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            <Bug className="w-4 h-4" />
            Report on GitHub
          </a>
        </div>

        {/* Feature Requests */}
        <div className="rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full">
              <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Feature Requests
            </h2>
          </div>
          <p className="text-muted-foreground">
            Have an idea for a new feature? Share your suggestions with our
            community.
          </p>
          <a
            href="https://github.com/medsghiri/pomouno/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            Share Ideas
          </a>
        </div>

        {/* Community */}
        <div className="rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full">
              <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Community</h2>
          </div>
          <p className="text-muted-foreground">
            Join our community discussions, share tips, and connect with other
            users.
          </p>
          <a
            href="https://github.com/medsghiri/pomouno/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Join Discussion
          </a>
        </div>
      </div>

      {/* Open Source */}
      <div className="rounded-xl p-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-full">
            <Github className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Open Source</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          PomoUno is completely open source! We welcome contributions from
          developers, designers, and anyone who wants to help make productivity
          tools better for everyone.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/medsghiri/pomouno"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
        </div>
      </div>

      {/* Response Time */}
      <div className="rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Response Time
        </h3>
        <p className="text-muted-foreground">
          We typically respond to support emails within 24-48 hours. For urgent
          issues, please use GitHub issues for faster community support.
        </p>
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
