
import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { AppRoute } from '../types';

interface SidebarProps {
  isMobile?: boolean;
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile, activeRoute, onNavigate }) => {
  const menuItems = [
    { id: AppRoute.LEARN, label: "O'RGANISH", icon: 'fa-house', path: `/${AppRoute.LEARN}`, activeColor: 'text-[#58cc02]' },
    { id: AppRoute.SPEAK_ZONE, label: 'SPEAKZONE', icon: 'fa-microphone-lines', path: `/${AppRoute.SPEAK_ZONE}`, activeColor: 'text-blue-500' },
    { id: AppRoute.PROFILE, label: 'PROFIL', icon: 'fa-user', path: `/${AppRoute.PROFILE}`, activeColor: 'text-gray-600' },
  ];

  if (isMobile) {
    return (
      <>
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center px-4 transition-all duration-300 ${
              activeRoute === item.id ? item.activeColor : 'text-[#afafaf]'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-2xl`}></i>
          </Link>
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="mb-8 px-4 flex items-center">
        <Logo size="sm" />
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all border-2 border-transparent ${
              activeRoute === item.id 
              ? `bg-[#ddf4ff] border-[#84d8ff] ${item.activeColor}` 
              : 'text-[#777777] hover:bg-[#f7f7f7]'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-xl w-8 text-center`}></i>
            <span className="text-sm tracking-widest uppercase font-extrabold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
