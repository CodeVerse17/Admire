
import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LearnDashboard from './components/LearnDashboard';
import SpeakZone from './components/SpeakZone';
import Profile from './components/Profile';
import Logo from './components/Logo';
import RightSidebar from './components/RightSidebar';
import { AppRoute, Language, ProficiencyLevel, UserPerformance, MistakeRecord } from './types';

export const LANGUAGES: Language[] = [
  { id: 'en', name: 'English', nativeName: 'English', flag: 'us', code: 'en-US' },
  { id: 'uz', name: 'Uzbek', nativeName: "O'zbekcha", flag: 'uz', code: 'uz-UZ' },
  { id: 'fr', name: 'French', nativeName: 'Français', flag: 'fr', code: 'fr-FR' },
  { id: 'de', name: 'German', nativeName: 'Deutsch', flag: 'de', code: 'de-DE' },
  { id: 'jp', name: 'Japanese', nativeName: '日本語', flag: 'jp', code: 'ja-JP' },
  { id: 'cn', name: 'Chinese', nativeName: '中文', flag: 'cn', code: 'zh-CN' },
  { id: 'ru', name: 'Russian', nativeName: 'Русский', flag: 'ru', code: 'ru-RU' },
  { id: 'it', name: 'Italian', nativeName: 'Italiano', flag: 'it', code: 'it-IT' },
  { id: 'pt', name: 'Portuguese', nativeName: 'Português', flag: 'br', code: 'pt-BR' },
  { id: 'kr', name: 'Korean', nativeName: '한국어', flag: 'kr', code: 'ko-KR' },
  { id: 'ar', name: 'Arabic', nativeName: 'العربية', flag: 'sa', code: 'ar-SA' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: 'in', code: 'hi-IN' },
  { id: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: 'tr', code: 'tr-TR' },
  { id: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: 'nl', code: 'nl-NL' },
  { id: 'se', name: 'Swedish', nativeName: 'Svenska', flag: 'se', code: 'sv-SE' },
  { id: 'pl', name: 'Polish', nativeName: 'Polski', flag: 'pl', code: 'pl-PL' },
  { id: 'vn', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: 'vn', code: 'vi-VN' },
  { id: 'gr', name: 'Greek', nativeName: 'Ελληνικά', flag: 'gr', code: 'el-GR' },
  { id: 'th', name: 'Thai', nativeName: 'ไทย', flag: 'th', code: 'th-TH' },
  { id: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: 'id', code: 'id-ID' },
  { id: 'he', name: 'Hebrew', nativeName: 'עבریت', flag: 'il', code: 'he-IL' },
  { id: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: 'no', code: 'no-NO' },
  { id: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: 'fi', code: 'fi-FI' },
  { id: 'dk', name: 'Danish', nativeName: 'Dansk', flag: 'dk', code: 'da-DK' },
  { id: 'ro', name: 'Romanian', nativeName: 'Română', flag: 'ro', code: 'ro-RO' },
  { id: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: 'hu', code: 'hu-HU' },
  { id: 'cz', name: 'Czech', nativeName: 'Čeština', flag: 'cz', code: 'cs-CZ' },
  { id: 'ua', name: 'Ukrainian', nativeName: 'Українська', flag: 'ua', code: 'uk-UA' },
];

interface AppState {
  stats: {
    streak: number;
    xp: number;
    gems: number;
    hearts: number;
  };
  currentLanguage: Language;
  fromLanguage: Language;
  proficiencyLevel: ProficiencyLevel | null;
  performance: UserPerformance;
  setLanguage: (lang: Language) => void;
  setFromLanguage: (lang: Language) => void;
  setProficiencyLevel: (level: ProficiencyLevel) => void;
  updatePerformance: (data: Partial<UserPerformance>, newMistakes?: MistakeRecord[]) => void;
  addXp: (amount: number) => void;
  addGems: (amount: number) => void;
  useHeart: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.LEARN);
  const [currentLanguage] = useState<Language>(LANGUAGES[0]); 
  const [fromLanguage, setFromLanguage] = useState<Language>(LANGUAGES[1]); 
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel | null>(null);
  const [performance, setPerformance] = useState<UserPerformance>({
    confidence: 0,
    pronunciation: 0,
    vocabUsage: 0,
    accuracy: 0,
    fluency: 0,
    sessionCount: 0,
    mistakes: []
  });
  const [stats, setStats] = useState({
    streak: 12,
    xp: 842,
    gems: 500,
    hearts: 5
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const addXp = (amount: number) => setStats(prev => ({ ...prev, xp: prev.xp + amount }));
  const addGems = (amount: number) => setStats(prev => ({ ...prev, gems: prev.gems + amount }));
  const useHeart = () => setStats(prev => ({ ...prev, hearts: Math.max(0, prev.hearts - 1) }));
  const handleSetFromLanguage = (lang: Language) => setFromLanguage(lang);
  
  const updatePerformance = (data: Partial<UserPerformance>, newMistakes?: MistakeRecord[]) => {
    setPerformance(prev => {
      let updatedMistakes = [...prev.mistakes];
      if (newMistakes) {
        newMistakes.forEach(m => {
          const existing = updatedMistakes.find(em => em.content.toLowerCase() === m.content.toLowerCase() && em.type === m.type);
          if (existing) {
            existing.count += 1;
            existing.lastSeen = Date.now();
          } else {
            updatedMistakes.push({ ...m, lastSeen: Date.now() });
          }
        });
      }

      const next = { ...prev, ...data, mistakes: updatedMistakes };
      
      if (proficiencyLevel) {
        const levels: ProficiencyLevel[] = ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced'];
        const currentIndex = levels.indexOf(proficiencyLevel);
        
        // Detailed progression rules: Accuracy, Fluency and Confidence all > 85
        const isMastered = next.accuracy > 85 && next.fluency > 85 && next.confidence > 85;
        if (isMastered && next.sessionCount >= 3 && currentIndex < levels.length - 1) {
          setProficiencyLevel(levels[currentIndex + 1]);
          return { ...next, sessionCount: 0, mistakes: [] }; // Reset mistakes when leveling up as focus shifts
        }
      }
      return next;
    });
  };

  const handleSetProficiencyLevel = (level: ProficiencyLevel) => {
    setProficiencyLevel(level);
    // Reset memory when manually changing levels
    setPerformance(prev => ({ ...prev, mistakes: [], sessionCount: 0 }));
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[1000]">
        <div className="relative">
          <div className="ripple-effect" style={{ animationDelay: '0s' }}></div>
          <div className="ripple-effect" style={{ animationDelay: '0.6s' }}></div>
          <div className="splash-logo">
            <Logo size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      stats, 
      currentLanguage, 
      fromLanguage, 
      proficiencyLevel, 
      performance,
      setLanguage: () => {}, 
      setFromLanguage: handleSetFromLanguage, 
      setProficiencyLevel: handleSetProficiencyLevel, 
      updatePerformance,
      addXp, 
      addGems, 
      useHeart 
    }}>
      <HashRouter>
        <div className="flex flex-col md:flex-row min-h-screen bg-white text-[#4b4b4b]">
          <div className="md:hidden sticky top-0 z-50">
            <Header stats={stats} />
          </div>

          <div className="hidden md:block w-[256px] border-r border-[#e5e5e5] h-screen sticky top-0 bg-white">
            <Sidebar activeRoute={activeRoute} onNavigate={setActiveRoute} />
          </div>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1024px] mx-auto flex flex-col lg:flex-row min-h-full">
              <div className="flex-1 px-4 lg:px-12 py-8">
                <Routes>
                  <Route path="/" element={<Navigate to={`/${AppRoute.LEARN}`} />} />
                  <Route path={`/${AppRoute.LEARN}`} element={<LearnDashboard />} />
                  <Route path={`/${AppRoute.SPEAK_ZONE}`} element={<SpeakZone />} />
                  <Route path={`/${AppRoute.PROFILE}`} element={<Profile />} />
                  <Route path="*" element={<Navigate to={`/${AppRoute.LEARN}`} />} />
                </Routes>
              </div>

              <div className="hidden lg:block w-[368px] p-8 border-l border-[#e5e5e5]">
                <RightSidebar stats={stats} />
              </div>
            </div>
          </main>

          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e5] flex justify-around py-3 z-50">
            <Sidebar isMobile activeRoute={activeRoute} onNavigate={setActiveRoute} />
          </div>
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
