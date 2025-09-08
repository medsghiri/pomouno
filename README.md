# PomoUno 🍅

A free, beautiful Pomodoro timer application built with Next.js and Firebase to boost your productivity and focus using the proven 25-minute work technique.

## ✨ Features

### 🍅 Core Timer Functionality

- **Pomodoro Timer**: Customizable work (25min), short break (5min), and long break (15min) sessions
- **Auto-start Options**: Automatically start breaks or work sessions
- **Session Tracking**: Real-time daily session progress with goal visualization
- **Audio Support**: Customizable focus sounds, break sounds, and notification alerts with volume control
- **Offline-First**: Works completely offline with localStorage, syncs when authenticated

### 📋 Advanced Task Management

- **Task Creation & Tracking**: Create, organize, and track tasks with session estimation
- **Task Categories**: Organize tasks with custom categories, colors, and icons
- **Progress Tracking**: Monitor sessions completed per task with visual progress indicators
- **Recurring Tasks**: Set up daily, weekly, monthly, or custom recurring tasks
- **Spaced Repetition**: Built-in spaced repetition system for learning tasks with difficulty-based intervals
- **Task Priorities**: High, medium, and low priority levels with visual indicators
- **Due Dates**: Set and track task deadlines with overdue notifications

### 🧘 Smart Break Reminders

- **Guided Break Activities**: Customizable reminders for hydration, movement, rest, and mindfulness
- **Custom Categories**: Create your own break reminder categories with icons and colors
- **Break Type Targeting**: Show reminders during all breaks, short breaks only, or long breaks only
- **Completion Tracking**: Track daily completion counts with increment/decrement controls
- **Habit Building**: Monitor healthy break habits and completion streaks

### 📊 Comprehensive Analytics

- **Real-time Statistics**: Daily, weekly, and monthly productivity insights
- **Task Analytics**: Completion rates, average sessions per task, category breakdowns
- **Break Reminder Stats**: Monitor healthy break habits and completion rates
- **Progress Visualization**: Interactive charts and calendar views showing productivity trends
- **Performance Optimization**: Efficient data caching with React Query for minimal Firebase usage

### 🎨 Premium User Experience

- **User Authentication**: Firebase-based authentication with Google sign-in support
- **Cross-device Sync**: Seamless data synchronization across all your devices
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Themes**: Automatic theme switching with system preference detection
- **Accessibility**: Built with WCAG guidelines and keyboard navigation support
- **Performance Optimized**: Advanced caching strategies for minimal data usage

## 🛠 Tech Stack

### Frontend

- **Next.js 15.4.5** - React framework with App Router and Server Components
- **React 19.1.1** - Latest React with concurrent features
- **TypeScript 5.2.2** - Full type safety throughout the application
- **Tailwind CSS 4.1.11** - Utility-first CSS with new @theme syntax

### UI & Components

- **shadcn/ui** - High-quality React components built on Radix UI
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React** - Beautiful icon library
- **next-themes** - Theme switching with system preference detection

### Backend & Database

- **Firebase** - Backend-as-a-Service platform
  - **Firestore** - NoSQL document database with real-time updates
  - **Firebase Auth** - Authentication with Google provider
  - **Firebase Storage** - File storage for audio assets
- **React Query (TanStack Query)** - Advanced data fetching and caching

### State Management & Performance

- **Custom Storage Layer** - Abstraction over localStorage with Firebase sync
- **React Query** - Server state management with optimistic updates
- **Advanced Caching** - Hierarchical query keys and intelligent cache invalidation

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **pnpm** - Fast, disk space efficient package manager (recommended)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/medsghiri/pomouno.git
cd pomouno
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
```

4. **Configure Firebase (Optional - for authentication and sync):**

   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database, Authentication (with Google provider), and Storage
   - Copy your Firebase configuration values to `.env`:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
     NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
     ```

5. **Run the development server:**

```bash
pnpm dev
```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to start using PomoUno!

> **Note:** The app works completely offline without Firebase configuration. Authentication and cross-device sync require Firebase setup.

## 📜 Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build optimized production bundle
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint for code quality checks

## 🏗 Project Structure

```
pomouno/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages (sign in/up)
│   ├── account/           # User account management
│   ├── legal/             # Legal pages (privacy, terms, etc.)
│   └── page.tsx           # Homepage with timer
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── homepage/          # Homepage and timer components
│   ├── layout/            # Layout components (header, footer)
│   ├── settings/          # Settings panel components
│   ├── stats/             # Statistics and analytics
│   ├── tasks/             # Task and break reminder management
│   ├── timer/             # Timer display and controls
│   └── ui/                # Reusable UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
│   └── use-app-data.ts    # Main data fetching and mutations
├── lib/                   # Core services and utilities
│   ├── auth-context.tsx   # Authentication context
│   ├── firebase.ts        # Firebase configuration
│   ├── storage.ts         # localStorage abstraction
│   ├── query-client.tsx   # React Query configuration
│   └── utils.ts           # Utility functions
└── public/                # Static assets
```

## 🔧 Configuration

### Firebase Setup (Optional)

1. **Create Firebase Project:**

   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Google Analytics (optional)

2. **Enable Services:**

   - **Firestore Database:** For data storage and sync
   - **Authentication:** Enable Google provider
   - **Storage:** For audio file uploads (if needed)

3. **Security Rules:**
   - Firestore rules are configured in `firestore.rules`
   - Storage rules are configured in `storage.rules`

### Environment Variables

All environment variables are optional. The app works offline without Firebase:

```env
# Firebase Configuration (Optional)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel:**

   ```bash
   npx vercel
   ```

2. **Set Environment Variables:**

   - Add your Firebase configuration in Vercel dashboard
   - All variables are optional for basic functionality

3. **Deploy:**
   ```bash
   npx vercel --prod
   ```

### Firebase Hosting

1. **Install Firebase CLI:**

   ```bash
   npm install -g firebase-tools
   ```

2. **Login and Initialize:**

   ```bash
   firebase login
   firebase init hosting
   ```

3. **Build and Deploy:**
   ```bash
   pnpm build
   firebase deploy
   ```

## 🔍 Key Features Deep Dive

### Offline-First Architecture

- **localStorage Primary:** All data stored locally first
- **Firebase Sync:** Background synchronization when authenticated
- **Optimistic Updates:** Immediate UI updates with server reconciliation
- **Performance Optimized:** React Query caching minimizes Firebase reads/writes

### Advanced Task Management

- **Spaced Repetition Algorithm:** Implements SM-2 algorithm for learning tasks
- **Recurring Task Engine:** Flexible patterns (daily, weekly, custom)
- **Progress Tracking:** Visual indicators and completion statistics
- **Category System:** Custom categories with icons and colors

### Smart Break Reminders

- **Habit Tracking:** Daily completion counters with increment/decrement
- **Contextual Display:** Show different reminders based on break type
- **Category Management:** Organize reminders by activity type
- **Completion Analytics:** Track habit formation over time

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests if applicable
4. **Commit your changes:** `git commit -m 'Add amazing feature'`
5. **Push to the branch:** `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use semantic color classes (see `.kiro/steering/color-classes.md`)
- Maintain accessibility standards
- Add proper error handling
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Pomodoro Technique** by Francesco Cirillo
- **UI Components** from [shadcn/ui](https://ui.shadcn.com)
- **Icons** from [Lucide](https://lucide.dev)
- **Charts** powered by [Recharts](https://recharts.org)
- **Date Utilities** from [date-fns](https://date-fns.org)

## 📚 Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - Comprehensive API reference for developers
- **[Deployment Guide](DEPLOYMENT.md)** - Platform-specific deployment instructions
- **[Changelog](CHANGELOG.md)** - Version history and release notes
- **[Firebase Optimization Report](FIREBASE_FINAL_OPTIMIZATION_REPORT.md)** - Performance optimization details
- **[Supabase Migration Plan](.kiro/specs/supabase-migration/)** - Future migration documentation

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/medsghiri/pomouno/issues)
- **Discussions:** [GitHub Discussions](https://github.com/medsghiri/pomouno/discussions)
- **Email:** [Contact Page](/legal/contact)
- **Documentation:** See links above for comprehensive guides

## 🔮 Roadmap

### Upcoming Features

- **Supabase Migration**: PostgreSQL-based backend for 80-90% cost reduction
- **Team Collaboration**: Shared workspaces and team productivity tracking
- **Advanced Analytics**: Machine learning insights and productivity recommendations
- **Mobile Apps**: Native iOS and Android applications
- **Integrations**: Calendar, task management, and productivity tool integrations

### Performance Goals

- **Sub-100ms Load Times**: Optimized caching and edge distribution
- **Offline-First**: Enhanced offline capabilities with background sync
- **Real-time Collaboration**: Live updates for team features
- **Advanced PWA**: Enhanced mobile web app experience

---

**Built with ❤️ for productivity enthusiasts worldwide**
