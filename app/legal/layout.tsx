"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useRouter } from "next/navigation";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <Header
        onAuthClick={() => router.push("/auth")}
        onSettingsClick={() => router.push("/")}
        onStatsClick={() => router.push("/")}
        onTasksClick={() => router.push("/")}
        onBreakRemindersClick={() => router.push("/")}
        onCalendarClick={() => router.push("/")}
      />
      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        {children}
      </main>
      <Footer />
    </div>
  );
}
