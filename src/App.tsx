import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import { AuthProvider, useAuth } from '@/contexts/UserContext';

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
  const noLayoutPaths = ['/login', '/register']

  if (noLayoutPaths.includes(location.pathname)) {
    return <div className="h-screen">{children}</div>
  }
  
  return <Layout>{children}</Layout>
}

function App() {
  return (
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
  )
}

export default App