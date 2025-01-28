import { useState } from 'react';
import { Bell, Search, ChevronDown } from 'lucide-react';

// interface User {
//   name: string;
//   email: string;
//   imageUrl: string;
// }


const Header = () => {

  const user = {
      name: 'Tim Cook',
      email: 'tom@example.com',
      imageUrl: '/api/placeholder/32/32'
    }

  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-4">

          <div className="flex-1 md:w-64">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="search"
                placeholder="Search..."
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              3
            </span>
            <Bell className="h-6 w-6" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <img
                src={user.imageUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
              <span className="hidden md:flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </span>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Your Profile
                </a>
                <a
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </a>
                <a
                  href="/logout"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
                >
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;