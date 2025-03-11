import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/UserContext';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '@/contexts/ThemeContext';
import Notifications from './Notifications/Notifications'; 

const Header = () => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Use the theme from the ThemeContext
  const { themeColor } = useContext(ThemeContext);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    navigate('/login');
  };

  const handleNavigation = () => {
    setShowUserMenu(false);
  };

  if (!user) return null;

  // Generate initials from the user's name
  const initials = user.name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex h-16 items-center justify-end px-4 sm:px-6 lg:px-8">      
        <div className="flex items-center gap-4">
          {/* Notifications remain unchanged */}
          <Notifications />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className={`flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-${themeColor} focus:ring-offset-2`}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {/* Display user initials with the theme background */}
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: themeColor }}
              >
                {initials}
              </div>
              <span className="hidden md:flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </span>
            </button>
  
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-gray-500 truncate">{user.email}</p>
                </div>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handleNavigation}
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
