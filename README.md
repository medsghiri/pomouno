# PomoUno 🍅

A free, beautiful Pomodoro timer application built with Next.js and Firebase to boost your productivity and focus using the proven 25-minute work technique.

## Features

### Core Timer Functionality
- **Pomodoro Timer**: Customizable work (25min), short break (5min), and long break (15min) sessions
- **Auto-start Options**: Automatically start breaks or work sessions
- **Session Tracking**: Track daily sessions with goal progress visualization
- **Audio Support**: Customizable focus sounds, break sounds, and notification alerts

### Task Management
- **Task Creation & Tracking**: Create, organize, and track tasks with session estimation
- **Task Categories**: Organize tasks with custom categories and colors
- **Progress Tracking**: Monitor sessions completed per task with auto-completion
- **Recurring Tasks**: Set up daily, weekly, or custom recurring tasks
- **Spaced Repetition**: Built-in spaced repetition system for learning tasks

### Break Reminders
- **Guided Break Activities**: Customizable reminders for hydration, movement, and rest
- **Custom Categories**: Create your own break reminder categories
- **Flexible Scheduling**: Set frequency from every break to custom intervals
- **Completion Tracking**: Track break reminder completion rates

### Statistics & Analytics
- **Comprehensive Dashboard**: Daily, weekly, and monthly productivity insights
- **Task Analytics**: Completion rates, average sessions per task, category breakdowns
- **Break Reminder Stats**: Monitor healthy break habits and completion rates
- **Progress Visualization**: Charts and graphs showing productivity trends

### User Experience
- **User Authentication**: Firebase-based auth with seamless data sync across devices
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Themes**: Multiple theme options including focus-optimized themes
- **Offline-First**: Works offline with localStorage, syncs when online
- **Accessibility**: Built with accessibility best practices

## Tech Stack

- **Frontend**: Next.js 15.4.4, React 19.1.0, TypeScript 5.2.2
- **Styling**: Tailwind CSS 4.1.11 with new @theme syntax, shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Storage)
- **State Management**: Custom localStorage abstraction with Firebase sync
- **Audio**: Custom AudioService with Web Audio API integration
- **UI Components**: Radix UI primitives with shadcn/ui styling

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/medsghiri/pomouno.git
cd pomouno
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore, Authentication, and Storage
   - Copy your Firebase config values to `.env`

5. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the Pomodoro Technique by Francesco Cirillo
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)