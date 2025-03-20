import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom';
import { getCookie } from '@/utils/getCookie';


interface Errors {
  username?: string;
  password?: string;
  api?: string;
}

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const validateForm = () => {
    const newErrors: Errors = {};
    if (!username) newErrors.username = 'username is required';
    if (!password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 12) errors.push("Minimum 12 characters");
    if (!/\d/.test(password)) errors.push("At least one number");
    return errors;
  };

  const handleLoginSuccess = (accessToken: string) => {
    sessionStorage.setItem('accessToken', accessToken);
    const decoded = jwtDecode<{ exp?: number }>(accessToken);
    const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now();
    const timeout = expiresAt - Date.now() - 60000;

    setTimeout(() => {
      handleLogout();
      window.location.reload();
    }, timeout);
  };

  const handleLogout = async () => {
    try {
      const cookieToken = getCookie('csrftoken')
      await fetch('http://127.0.0.1:8000/users/logout/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': cookieToken,
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      // Clear frontend storage
      sessionStorage.removeItem('accessToken');
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshToken = async () => {
    try {
      const cookieToken = getCookie('csrftoken')
      const response = await fetch('http://127.0.0.1:8000/users/refresh/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': cookieToken,
        },
      });
      
      if (response.ok) {
        const { access } = await response.json();
        handleLoginSuccess(access);
      }
    } catch {
      handleLogout();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm();
    const passwordErrors = validatePassword(password);
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    if (passwordErrors.length > 0) {
      setErrors({ password: passwordErrors.join(', ') });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const cookieToken = getCookie('csrftoken')
      const response = await fetch('http://127.0.0.1:8000/users/login/', {
        method: 'POST',
        // Update handleSubmit headers:
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': cookieToken,
          'X-Requested-With': 'XMLHttpRequest'  // Add this header
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          
          if (attempts >= 3) {
            setErrors({ api: 'Account locked. Please reset your password.' });
            return;
          }
        }
        
        setErrors({ api: data.detail || 'Invalid credentials' });
        return;
      }

      handleLoginSuccess(data.access);
      window.location.href = '/dashboard';

    } catch {
      setErrors({ api: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const accessToken = sessionStorage.getItem('accessToken');
      if (!accessToken) await refreshToken();
      else {
        const decoded = jwtDecode<{ exp?: number }>(accessToken);
        const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now();
        if (expiresAt - Date.now() < 300000) { // Refresh if expires in 5 minutes
          await refreshToken();
        }
      }
    };
    
    checkSession();
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Company Logo"
          src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=600"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl font-bold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username 
            </label>
            <div className="mt-1">
              <input
                id="username"
                type="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
              />
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? '👁️' : '👁️🗨️'}
              </button>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <Link
                to="/reset-password"
                className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>
          </div>

          {errors.api && <p className="text-sm text-red-600">{errors.api}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;