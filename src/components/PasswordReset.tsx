import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from '@/contexts/ThemeContext'; 
import axios from "axios";

const PasswordReset = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { themeColor } = useContext(ThemeContext);
  const navigate = useNavigate();

  const API = process.env.REACT_APP_API_BASE_URL;

  const getCsrfToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    
    try {
      await axios.get(`${API}/users/csrf/`, {
        withCredentials: true
      });
      
      const response = await axios.post(
        `${API}/users/password-reset/`,
        { email },
        {
          headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setError(error.response.data?.email?.[0] || "Failed to send reset email");
      } else {
        setError("Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-${themeColor} focus:border-${themeColor}`}
            />
          </div>
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-2 px-4 rounded-md  focus:outline-none focus:ring-2 focus:ring-${themeColor} focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            style={{ backgroundColor: themeColor }}
          >
            {loading ? "Sending..." : "Send Password Reset Email"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PasswordReset;