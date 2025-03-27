// contexts/UserContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '@/types/auth';

export type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const API = process.env.REACT_APP_API_BASE_URL;

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        try {
          const decoded: { 
            id: number;
            name: string;
            email: string;
            username: string;
            role: string;
          } = jwtDecode(token);
          
          setUser({
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role,
          });
        } catch (error) {
          console.error('Invalid token:', error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  // Add automatic token refresh
    useEffect(() => {
        const checkTokenExpiration = () => {
          const token = sessionStorage.getItem('accessToken');
          if (token) {
            try {
              const decoded: JwtPayload = jwtDecode(token);
              if (decoded.exp * 1000 < Date.now()) {
                logout();
              }
            } catch {
              logout();
            }
          }
        };
    
        // Check every minute
        const interval = setInterval(checkTokenExpiration, 60000);
        return () => clearInterval(interval);
    }, []);

  const logout = async () => {
    try {
      await fetch(`${API}/users/logout/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '',
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      sessionStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);