
import React from 'react';
import Logo from './Logo';
import { useApp } from '../App';

interface HeaderProps {
  stats?: {
    streak: number;
    gems: number;
    hearts: number;
  };
}

const Header: React.FC<HeaderProps> = ({ stats }) => {
  const { currentLanguage } = useApp();
  const displayStats = stats || { streak: 12, gems: 500, hearts: 5 };

  return (
    <header className="bg-white border-b border-[#e5e5e5] py-3 px-4 flex justify-between items-center z-50">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <img 
          src={`https://flagpedia.net/data/flags/h80/${currentLanguage.flag}.png`} 
          alt={currentLanguage.name} 
          className="h-4 w-6 rounded-sm shadow-sm" 
        />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-extrabold text-[#ff9600]">
          <i className="fa-solid fa-fire"></i>
          <span className="text-sm">{displayStats.streak}</span>
        </div>
        <div className="flex items-center gap-1.5 font-extrabold text-[#4ac0fd]">
          <i className="fa-solid fa-gem"></i>
          <span className="text-sm">{displayStats.gems}</span>
        </div>
        <div className="flex items-center gap-1.5 font-extrabold text-[#ff4b4b]">
          <i className="fa-solid fa-heart"></i>
          <span className="text-sm">{displayStats.hearts}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
