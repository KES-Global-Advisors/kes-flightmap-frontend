// PasswordUpdate.tsx
import { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ThemeContext } from '@/contexts/ThemeContext'; 
import axios from "axios";

const PasswordUpdate = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { uidb64, token } = useParams();
  const { themeColor } = useContext(ThemeContext);
  const navigate = useNavigate();

  const API = process.env.REACT_APP_API_BASE_URL;

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 12) errors.push("Minimum 12 characters");
    if (!/\d/.test(password)) errors.push("At least one number");
    if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API}/users/password-update/${uidb64}/${token}/`,
        { password },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setError(error.response.data?.error?.[0] || "Password update failed");
      } else {
        setError("Password update failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Update Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              required
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-${themeColor} focus:border-${themeColor}`}
            />
          </div>
          <div>
            <label 
              htmlFor="confirm-password" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-${themeColor} focus:border-${themeColor}`}
            />
          </div>
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-${themeColor} focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            style={{ backgroundColor: themeColor }}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PasswordUpdate;