
import React, { useState, useMemo } from 'react';
import { useApp, LANGUAGES } from '../App';
import { Language } from '../types';

interface RightSidebarProps {
  stats: {
    streak: number;
    gems: number;
    hearts: number;
  };
}

const RightSidebar: React.FC<RightSidebarProps> = ({ stats }) => {
  const { currentLanguage, fromLanguage, setFromLanguage, proficiencyLevel } = useApp();
  const [showLangModal, setShowLangModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    return LANGUAGES.filter(lang => 
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Stats */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-1.5 font-extrabold text-[#777] p-2 rounded-lg border border-transparent group relative">
          <img 
            src={`https://flagpedia.net/data/flags/h80/us.png`} 
            alt="English" 
            className="h-5 w-7 object-cover rounded-sm shadow-sm" 
          />
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-[#4b4b4b] text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Teaching English
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-extrabold text-[#afafaf] cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors">
           <i className="fa-solid fa-fire text-[#ff9600]"></i>
           <span>{stats.streak}</span>
        </div>
        <div className="flex items-center gap-1.5 font-extrabold text-[#4ac0fd] cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors">
           <i className="fa-solid fa-gem"></i>
           <span>{stats.gems}</span>
        </div>
        <div className="flex items-center gap-1.5 font-extrabold text-[#ff4b4b] cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors">
           <i className="fa-solid fa-heart"></i>
           <span>{stats.hearts}</span>
        </div>
      </div>

      {/* Language Selector Modal (Native Language Only) */}
      {showLangModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowLangModal(false)}></div>
          <div className="bg-white rounded-[32px] p-0 max-w-2xl w-full h-[80vh] relative z-10 shadow-2xl animate-bounce-in overflow-hidden flex flex-col">
            <div className="p-8 pb-4 border-b border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-extrabold text-[#4b4b4b]">
                  My native language is...
                </h3>
                <button onClick={() => setShowLangModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text"
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-blue-300 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setFromLanguage(lang);
                      setShowLangModal(false);
                    }}
                    className={`flex flex-col items-center p-4 rounded-2xl transition-all border-2 group ${
                      fromLanguage.id === lang.id
                      ? 'bg-[#ddf4ff] border-[#84d8ff]' 
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-16 h-12 rounded-lg shadow-sm overflow-hidden mb-3 border border-gray-100 group-hover:scale-110 transition-transform">
                      <img 
                        src={`https://flagpedia.net/data/flags/h80/${lang.flag}.png`} 
                        alt={lang.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <span className="text-sm font-extrabold text-[#4b4b4b] truncate w-full text-center">{lang.name}</span>
                    <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center">{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Level Info */}
      {proficiencyLevel && (
        <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 bg-blue-50/50 border-blue-100">
          <h3 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest mb-1">Target Path</h3>
          <p className="text-xl font-extrabold text-[#1a2b4b]">{proficiencyLevel} English</p>
        </div>
      )}

      {/* Leaderboard Card */}
      <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 bg-white shadow-sm">
        <h3 className="text-lg font-extrabold text-[#4b4b4b] mb-4">Unlock Leaderboards!</h3>
        <div className="flex gap-4 items-center">
           <div className="w-16 h-16 bg-[#f7f7f7] rounded-xl flex items-center justify-center text-[#afafaf] border-2 border-[#e5e5e5]">
              <i className="fa-solid fa-shield-halved text-3xl"></i>
           </div>
           <p className="text-[#777] text-sm font-bold leading-snug">
              Complete 10 more English lessons to enter the next contest.
           </p>
        </div>
      </div>

      {/* From Language Setting */}
      <div onClick={() => setShowLangModal(true)} className="p-4 border-2 border-dashed border-[#e5e5e5] rounded-2xl text-center cursor-pointer hover:bg-gray-50 transition-colors group">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-blue-400">Native Language</p>
        <div className="flex items-center justify-center gap-2">
          <img 
            src={`https://flagpedia.net/data/flags/h80/${fromLanguage.flag}.png`} 
            alt={fromLanguage.name} 
            className="h-3 w-4.5 rounded-sm object-cover" 
          />
          <span className="text-xs font-bold text-[#777]">{fromLanguage.name}</span>
        </div>
      </div>

      {/* Promo card */}
      <div className="bg-[#1a2b4b] rounded-2xl p-8 text-white relative overflow-hidden group cursor-pointer hover:brightness-110 transition-all">
         <h3 className="text-3xl font-extrabold leading-tight mb-4 relative z-10">
           Fluent in English
         </h3>
         <p className="text-white/60 text-sm font-bold mb-8 relative z-10">A world of opportunity awaits.</p>
         <div className="bg-[#4ac0fd] w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
           <i className="fa-solid fa-chevron-right text-white"></i>
         </div>
      </div>
    </div>
  );
};

export default RightSidebar;
