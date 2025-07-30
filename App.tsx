
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import QuizPage from './pages/QuizPage';
import DashboardPage from './pages/DashboardPage';
import { UploadedContentProvider } from './contexts/UploadedContentContext';
import { AmeenaLogoIcon, HomeIcon, BookOpenIcon, ClipboardListIcon, BarChartIcon, MoonIcon, SunIcon } from './components/icons/Icons';
import Button from './components/common/Button';

const App: React.FC = () => {
  return (
    <UploadedContentProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/study/:contentId" element={<StudyPage />} />
              <Route path="/quiz/:contentId" element={<QuizPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </UploadedContentProvider>
  );
};

const ThemeToggleButton: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme" className="px-2">
      <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
};

const Header: React.FC = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Home', icon: <HomeIcon className="w-4 h-4" /> },
    { path: '/dashboard', label: 'Dashboard', icon: <BarChartIcon className="w-4 h-4" /> },
  ];

  const contentPathRegex = /^\/(study|quiz)\/\w+$/;
  const showDynamicLinks = contentPathRegex.test(location.pathname);
  const contentId = showDynamicLinks ? location.pathname.split('/')[2] : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-14 items-center">
        <Link to="/" className="flex items-center mr-6 text-lg font-bold group text-foreground">
          <AmeenaLogoIcon className="w-7 h-7 mr-2 text-primary transition-transform group-hover:rotate-[-10deg]" />
          Ameena AI
        </Link>
        <div className="flex items-center gap-x-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          {showDynamicLinks && contentId && (
            <>
              <NavLink
                  to={`/study/${contentId}`}
                  className={({ isActive }) =>
                    `flex items-center gap-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive && location.pathname.startsWith('/study/')
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                    }`
                  }
              >
                  <BookOpenIcon className="w-4 h-4" />
                  Study
              </NavLink>
              <NavLink
                  to={`/quiz/${contentId}`}
                  className={({ isActive }) =>
                    `flex items-center gap-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive && location.pathname.startsWith('/quiz/')
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                    }`
                  }
              >
                  <ClipboardListIcon className="w-4 h-4" />
                  Quiz
              </NavLink>
            </>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end">
            <ThemeToggleButton />
        </div>
      </nav>
    </header>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/40">
      <div className="container flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Ameena AI. Your Personalized Study Companion.</p>
      </div>
    </footer>
  );
};

export default App;