import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  Home, 
  Users, 
  FolderOpen, 
  Calendar, 
  FileText, 
  BarChart,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { ThemeContext } from '@/contexts/ThemeContext'; // Adjust the import path as needed

interface NavItem {
  name: string;
  icon: React.ReactNode;
  url: string;
}

interface TeamItem {
  name: string;
  initial: string;
  url: string;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', icon: <Home size={20} />, url: '/dashboard' },
  { name: 'Team', icon: <Users size={20} />, url: '/team' },
  { name: 'Roadmaps', icon: <FolderOpen size={20} />, url: '/roadmaps' },
  { name: 'Create Roadmaps', icon: <FolderOpen size={20} />, url: '/create-roadmap' },
  { name: 'Calendar', icon: <Calendar size={20} />, url: '/calendar' },
  { name: 'Documents', icon: <FileText size={20} />, url: '/documents' },
  { name: 'Reports', icon: <BarChart size={20} />, url: '/reports' },
];

const teamItems: TeamItem[] = [
  { name: 'Heroicons', initial: 'H', url: '/teams/heroicons' },
  { name: 'Tailwind Labs', initial: 'T', url: '/teams/tailwind-labs' },
  { name: 'Workcation', initial: 'W', url: '/teams/workcation' },
];

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Get the current theme color from the global ThemeContext
  const { themeColor } = useContext(ThemeContext);

  // Helper functions for color manipulation
  const getLighterColor = (hexColor: string, opacity: number = 0.1): string => {
    return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };
  
  const getDarkerColor = (hex: string): string => {
    // Convert hex to RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    // Darken by reducing each component by 15%
    r = Math.max(0, Math.floor(r * 0.85));
    g = Math.max(0, Math.floor(g * 0.85));
    b = Math.max(0, Math.floor(b * 0.85));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Dynamic styles based on theme color
  const dynamicStyles = {
    sidebar: {
      backgroundColor: themeColor,
    },
    toggleButton: {
      backgroundColor: themeColor,
      hover: getDarkerColor(themeColor),
    },
    navItem: {
      hoverBg: getLighterColor(themeColor),
    },
    teamInitial: {
      backgroundColor: getLighterColor(themeColor),
    },
    border: {
      borderColor: getLighterColor(themeColor),
    }
  };

  return (
    <div 
      className={`relative flex min-h-screen flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      style={dynamicStyles.sidebar}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: dynamicStyles.toggleButton.backgroundColor }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = dynamicStyles.toggleButton.hover;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = dynamicStyles.toggleButton.backgroundColor;
        }}
      >
        {isCollapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronLeft size={14} />
        )}
      </button>

      {/* Logo */}
      <div className="flex h-16 items-center pl-4">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-lg p-1" style={{ backgroundColor: getLighterColor(themeColor) }}>
            <div className="h-full w-full rounded-md bg-white/90" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {mainNavItems.map((item) => (
          <Link
            key={item.name}
            to={item.url}
            className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-white"
            title={isCollapsed ? item.name : undefined}
            style={{ transition: 'background-color 0.2s ease-in-out' }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = dynamicStyles.navItem.hoverBg;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center">
              {item.icon}
              <span className={`ml-3 transition-opacity duration-300 ${
                isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
              }`}>
                {item.name}
              </span>
            </div>
          </Link>
        ))}

        {/* Teams Section */}
        <div className={`mt-8 transition-opacity duration-300 ${
          isCollapsed ? 'opacity-0' : 'opacity-100'
        }`}>
          <h3 className={`px-3 text-sm font-medium text-white/70 ${
            isCollapsed ? 'hidden' : 'block'
          }`}>
            Your teams
          </h3>
          <div className="mt-2 space-y-1">
            {teamItems.map((team) => (
              <a
                key={team.name}
                href={team.url}
                className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-white"
                title={isCollapsed ? team.name : undefined}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = dynamicStyles.navItem.hoverBg;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span 
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-sm font-medium"
                  style={{ backgroundColor: dynamicStyles.teamInitial.backgroundColor }}
                >
                  {team.initial}
                </span>
                <span className={`ml-3 transition-opacity duration-300 ${
                  isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                }`}>
                  {team.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Settings */}
      <div className="p-2" style={{ borderTop: `1px solid ${getLighterColor(themeColor)}` }}>
        <Link
          to="/settings"
          className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-white"
          title={isCollapsed ? 'Settings' : undefined}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = dynamicStyles.navItem.hoverBg;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Settings className="h-5 w-5" />
          <span className={`ml-3 transition-opacity duration-300 ${
            isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
          }`}>
            Settings
          </span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
