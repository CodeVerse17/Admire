
import React from 'react';
import { useApp, LANGUAGES } from '../App';
import { ProficiencyLevel } from '../types';

const Profile: React.FC = () => {
  const { stats, fromLanguage, setFromLanguage, proficiencyLevel, setProficiencyLevel } = useApp();
  
  const levels: ProficiencyLevel[] = ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced'];

  const achievements = [
    { name: 'Friendly', icon: 'fa-hand-peace', color: 'text-orange-500', bg: 'bg-orange-50', progress: 80 },
    { name: 'Wildfire', icon: 'fa-fire', color: 'text-red-500', bg: 'bg-red-50', progress: 40 },
    { name: 'Sage', icon: 'fa-brain', color: 'text-purple-500', bg: 'bg-purple-50', progress: 95 },
    { name: 'Scholar', icon: 'fa-graduation-cap', color: 'text-blue-500', bg: 'bg-blue-50', progress: 60 },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-8 p-8 border-b pb-12">
        <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-extrabold shadow-xl ring-8 ring-blue-50 relative">
          SD
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-[#1a2b4b]">Foydalanuvchi</h1>
            <span className="bg-blue-100 text-blue-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Premium</span>
          </div>
          <p className="text-gray-500 font-bold mb-6 italic">
            English Learner ({proficiencyLevel || 'Daraja tanlanmagan'})
          </p>
          <div className="flex justify-center md:justify-start gap-4">
            <button className="px-8 py-2.5 bg-[#1a2b4b] text-white rounded-2xl font-extrabold text-xs uppercase hover:bg-[#253961] transition-all shadow-md active:scale-95">
              Tahrirlash
            </button>
            <button className="px-8 py-2.5 border-2 border-gray-100 rounded-2xl font-extrabold text-gray-400 text-xs uppercase hover:bg-gray-50 transition-all active:scale-95">
              Sozlamalar
            </button>
          </div>
        </div>
      </div>

      <section className="bg-white p-8 rounded-[40px] premium-shadow border border-gray-100">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-extrabold text-[#1a2b4b]">Ingliz tili darajasi</h2>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dars qiyinligini o'zgartirish</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setProficiencyLevel(level)}
              className={`flex flex-col items-center justify-center p-4 rounded-[24px] border-2 transition-all text-center ${
                proficiencyLevel === level 
                ? 'bg-[#ddf4ff] border-blue-400 shadow-inner' 
                : 'border-gray-50 bg-gray-50/30 hover:bg-white hover:border-gray-200'
              }`}
            >
              <p className={`text-xs font-extrabold ${proficiencyLevel === level ? 'text-blue-600' : 'text-[#4b4b4b]'}`}>
                {level}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-[#1a2b4b] mb-6">O'rganish faolligi</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Kunlik seriya', value: stats.streak, icon: 'fa-fire', color: 'text-orange-500' },
            { label: 'Jami XP', value: stats.xp, icon: 'fa-bolt', color: 'text-yellow-500' },
            { label: 'Liga', value: 'Brilliant', icon: 'fa-gem', color: 'text-blue-500' },
            { label: 'Yuraklar', value: stats.hearts, icon: 'fa-heart', color: 'text-red-500' },
          ].map((stat, idx) => (
            <div key={idx} className="p-6 border-2 border-gray-50 rounded-[32px] flex flex-col items-center md:items-start gap-3 bg-white hover:border-blue-100 hover:shadow-lg transition-all group cursor-default">
              <i className={`fa-solid ${stat.icon} text-3xl ${stat.color} group-hover:scale-110 transition-transform`}></i>
              <div>
                <p className="text-2xl font-extrabold text-[#1a2b4b]">{stat.value}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-[0.2em]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Profile;
