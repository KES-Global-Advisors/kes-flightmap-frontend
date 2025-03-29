import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { ReactNode, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import PasswordReset from './components/PasswordReset'
import PasswordUpdate from './components/PasswordUpdate'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import FormStepper from './pages/FormStepper'
import FlightmapListing from './pages/FlightmapListing'
import { AuthProvider, useAuth } from '@/contexts/UserContext';
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { ToastContainer } from 'react-toastify';

// Auth components and types
interface ProtectedRouteProps {
  children: ReactNode
  // requiredRole?: string
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AuthRedirect = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Layout components
const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation()
  const noLayoutPaths = ['/login', '/register', '/reset-password']

  if (noLayoutPaths.includes(location.pathname)) {
    return <div className="h-screen">{children}</div>
  }
  
  return <Layout>{children}</Layout>
}

const API = import.meta.env.VITE_API_BASE_URL;

function App() {
    // Fetch the CSRF cookie once on mount
    useEffect(() => {
      fetch(`${API}/users/csrf/`, {
        method: 'GET',
        credentials: 'include', // lets Django set csrftoken cookie
      })
        .then(res => res.json())
        .then(data => {
          // Persist token client‑side so getCookie() finds it
          localStorage.setItem('csrftoken', data.csrfToken);
    
          // Also set the cookie for Django’s validation (Secure & cross‑site)
          document.cookie = `csrftoken=${data.csrfToken}; Path=/; Secure; SameSite=None`;
        })
        .catch(err => console.error('Failed to get CSRF cookie:', err));
    }, []);
  
  return (
    <>
    <ToastContainer 
      position="top-right"
      autoClose={2000}  // auto close after 2 seconds
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/login" element={
                <AuthRedirect>
                  <LoginForm />
                </AuthRedirect>
              } />
              <Route path="/register" element={
                <AuthRedirect>
                  <RegisterForm />
                </AuthRedirect>
              } />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/reset-password/:uidb64/:token/" element={<PasswordUpdate />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              } />
              <Route path="/flightmaps" element={
                <ProtectedRoute>
                  <FlightmapListing />
                </ProtectedRoute>
              } />
              <Route path="/create-flightmap" element={
                <ProtectedRoute>
                  <FormStepper />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </>
  )
}

export default App