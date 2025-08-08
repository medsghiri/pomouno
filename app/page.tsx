import { HomepageWithInteractions } from '@/components/homepage/homepage-with-interactions';
import { Footer } from '@/components/layout/footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PomoUno - Free Online Pomodoro Timer for Focus & Productivity',
  description: 'Boost productivity with our free online Pomodoro timer. Use the proven 25-minute focus technique with task tracking, break reminders, and productivity statistics. Start focusing now!',
  keywords: [
    'pomodoro timer online',
    'free pomodoro timer',
    'productivity app',
    'focus timer',
    'time management',
    'pomodoro technique',
    'work timer',
    'break timer',
    'productivity tracker',
    'focus app',
    'study timer',
    'concentration app',
    'work from home productivity',
    'time blocking'
  ],
  openGraph: {
    title: 'PomoUno - Free Online Pomodoro Timer for Focus & Productivity',
    description: 'Boost productivity with our free online Pomodoro timer. Track tasks, maintain focus, and build better work habits with the proven 25-minute technique.',
    type: 'website',
    url: 'https://pomouno.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PomoUno - Free Online Pomodoro Timer',
    description: 'Boost productivity with our free online Pomodoro timer. Track tasks and maintain focus with the proven 25-minute technique.',
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomepageWithInteractions />
      <Footer />
    </div>
  );
}