'use client';

import Navbar from './components/Navbar';
import { ThemeToggle } from './components/ThemeToggle';

export default function Home() {

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">

      {/* Header */}
      <Navbar />

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      </main>
    </div>
  );
}