import React, { useState } from 'react';
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

interface NavItem {
  name: string;
  icon: React.ReactNode;
  href: string;
}

interface TeamItem {
  name: string;
  initial: string;
  href: string;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', icon: <Home size={20} />, href: '/dashboard' },
  { name: 'Team', icon: <Users size={20} />, href: '/team' },
  { name: 'Projects', icon: <FolderOpen size={20} />, href: '/projects' },
  { name: 'Calendar', icon: <Calendar size={20} />, href: '/calendar' },
  { name: 'Documents', icon: <FileText size={20} />, href: '/documents' },
  { name: 'Reports', icon: <BarChart size={20} />, href: '/reports' },
];

const teamItems: TeamItem[] = [
  { name: 'Heroicons', initial: 'H', href: '/teams/heroicons' },
  { name: 'Tailwind Labs', initial: 'T', href: '/teams/tailwind-labs' },
  { name: 'Workcation', initial: 'W', href: '/teams/workcation' },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={`relative flex min-h-screen flex-col bg-indigo-600 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
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
          <div className="h-8 w-8 rounded-lg bg-white/10 p-1">
            <div className="h-full w-full rounded-md bg-white/90" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {mainNavItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-white hover:bg-white/10"
            title={isCollapsed ? item.name : undefined}
          >
            <div className="flex items-center">
              {item.icon}
              <span className={`ml-3 transition-opacity duration-300 ${
                isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
              }`}>
                {item.name}
              </span>
            </div>
          </a>
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
                href={team.href}
                className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-white hover:bg-white/10"
                title={isCollapsed ? team.name : undefined}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-sm font-medium">
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
      <div className="border-t border-white/10 p-2">
        <a
          href="/settings"
          className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-white hover:bg-white/10"
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5" />
          <span className={`ml-3 transition-opacity duration-300 ${
            isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
          }`}>
            Settings
          </span>
        </a>
      </div>
    </div>
  );
};

export default Sidebar;