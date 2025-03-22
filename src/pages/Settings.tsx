// SettingsPage.tsx
import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import axiosInstance from '@/hooks/axiosInstance';
import { SketchPicker, ColorResult } from 'react-color';
import { ThemeContext } from '@/contexts/ThemeContext'; 
import { Link } from 'react-router-dom';


// Types (User, Role, etc.) remain unchanged
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone_number: string;
  date_joined: string;
  last_login: string;
}

interface Role {
  key: string;
  label: string;
}

const Settings: React.FC = () => {
  // Data state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  // Get theme data from global context
  const { themeColor, setThemeColor } = useContext(ThemeContext);

  // Apply theme color to CSS variables
  const applyThemeColor = (color: string) => {
    document.documentElement.style.setProperty('--theme-color', color);
    document.documentElement.style.setProperty('--theme-color-light', `${color}33`);
    document.documentElement.style.setProperty('--theme-color-dark', adjustColorBrightness(color, -30));
  };

  // Helper to adjust color brightness
  const adjustColorBrightness = (hex: string, percent: number) => {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    // Convert 3 digit hex to 6 digits
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return '#' + 
      ((0|(1<<8) + r + (r * percent / 100)).toString(16)).substring(1) +
      ((0|(1<<8) + g + (g * percent / 100)).toString(16)).substring(1) +
      ((0|(1<<8) + b + (b * percent / 100)).toString(16)).substring(1);
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [currentUserRes, usersRes, rolesRes] = await Promise.all([
          axiosInstance.get('http://127.0.0.1:8000/users/me/'),
          axiosInstance.get('http://127.0.0.1:8000/users/'),
          axiosInstance.get('http://127.0.0.1:8000/users/roles/')
        ]);
        
        setCurrentUser(currentUserRes.data);
        setUsers(usersRes.data);
        setRoles(rolesRes.data);
        // Ensure the CSS variables are in sync with the current theme
        applyThemeColor(themeColor);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Run once on mount

  // Update the theme immediately as the user interacts
  const handleColorChange = (color: ColorResult) => {
    const newColor = color.hex;
    setThemeColor(newColor);
    applyThemeColor(newColor);
  };

  // When the user is done selecting a color, update the backend
  const handleColorChangeComplete = (color: ColorResult) => {
    const newColor = color.hex;
    axios
      .patch('http://127.0.0.1:8000/theme/', { theme_color: newColor })
      .then((response) => {
        console.log('Theme updated on the backend:', response.data);
      })
      .catch((error) => {
        console.error('Error updating theme:', error);
        alert('There was an error updating the theme.');
      });
  };

  // Start editing user profile
  const handleEditProfile = () => {
    if (!currentUser) return;
    
    setEditForm({
      username: currentUser.username,
      email: currentUser.email,
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
      phone_number: currentUser.phone_number,
    });
    
    setIsEditing(true);
  };

  // Handle form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    try {
      const res = await axiosInstance.patch(`http://127.0.0.1:8000/users/${currentUser.id}/update/`, editForm);
      setCurrentUser({ ...currentUser, ...res.data });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  // Handle role change
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await axiosInstance.patch(`http://127.0.0.1:8000/users/assign-role/${userId}/`, { role: newRole });
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      if (currentUser && currentUser.id === userId) {
        setCurrentUser({ ...currentUser, role: newRole });
      }
    } catch (err) {
      console.error('Error changing role:', err);
      toast.error('Failed to update user role. Please try again.');
    }
  };

  // Delete user confirmation
  const confirmDelete = (userId: number) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
  };

  // Delete user
  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await axiosInstance.delete(`http://127.0.0.1:8000/users/${userToDelete}/`);
      setUsers(users.filter(user => user.id !== userToDelete));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user. Please try again.');
    }
  };

  // Format date for display
  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   });
  // };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: themeColor }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{
      '--theme-color': themeColor,
      '--theme-color-light': `${themeColor}33`,
      '--theme-color-dark': adjustColorBrightness(themeColor, -30)
    } as React.CSSProperties}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold" style={{ color: themeColor }}>Settings</h1>
          <div className="flex flex-col md:flex-row gap-8 mt-6">
            {/* Left Column - User Profile */}
            <div className="w-full md:w-1/2">
              <div className="bg-white shadow rounded-lg p-6 h-full">
                <h2 className="text-xl font-semibold mb-6" style={{ color: themeColor }}>
                  {isEditing ? 'Edit Profile' : 'User Profile'}
                </h2>
                {currentUser && (
                  <div>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Username</label>
                          <input
                            type="text"
                            name="username"
                            value={editForm.username || ''}
                            onChange={handleFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={editForm.email || ''}
                            onChange={handleFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                            <input
                              type="text"
                              name="first_name"
                              value={editForm.first_name || ''}
                              onChange={handleFormChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input
                              type="text"
                              name="last_name"
                              value={editForm.last_name || ''}
                              onChange={handleFormChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <input
                            type="tel"
                            name="phone_number"
                            value={editForm.phone_number || ''}
                            onChange={handleFormChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                          />
                        </div>
                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white"
                            style={{ backgroundColor: themeColor }}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                              style={{ backgroundColor: themeColor }}>
                              {currentUser.first_name.charAt(0)}{currentUser.last_name.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-bold">{currentUser.first_name} {currentUser.last_name}</h3>
                              <p className="text-sm text-gray-500">@{currentUser.username}</p>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white mt-1"
                                style={{ backgroundColor: themeColor }}>
                                {currentUser.role}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={handleEditProfile}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Email</h4>
                            <p className="mt-1">{currentUser.email}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Phone</h4>
                            <p className="mt-1">{currentUser.phone_number || 'Not provided'}</p>
                          </div>
                          {/* <div>
                            <h4 className="text-sm font-medium text-gray-500">Member Since</h4>
                            <p className="mt-1">{formatDate(currentUser.date_joined)}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Last Login</h4>
                            <p className="mt-1">{formatDate(currentUser.last_login)}</p>
                          </div> */}
                        </div>
                        <div className="border-t border-gray-200 pt-6 mt-6">
                          <h3 className="text-lg font-medium mb-4">Security Settings</h3>
                          <Link
                            to="/reset-password"
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Change Password
                          </Link>
                          {/* <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Two-Factor Authentication</h4>
                            <div className="flex items-center">
                              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                                <input type="checkbox" id="toggle" className="opacity-0 absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                                <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                              </div>
                              <span className="text-sm text-gray-700">Disabled</span>
                            </div>
                          </div> */}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column - Theme Settings & User Management */}
            <div className="w-full md:w-1/2 mt-6 md:mt-0">
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4" style={{ color: themeColor }}>Theme Settings</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Color
                  </label>
                  <div>
                    <SketchPicker
                      color={themeColor}
                      onChange={handleColorChange}
                      onChangeComplete={handleColorChangeComplete}
                    />
                  </div>
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                    <div className="flex flex-wrap gap-3">
                      <button className="px-4 py-2 rounded text-white" style={{ backgroundColor: themeColor }}>
                        Primary Button
                      </button>
                      <div className="px-3 py-1 rounded-full text-white text-sm" style={{ backgroundColor: themeColor }}>
                        Badge
                      </div>
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: themeColor }}></div>
                      <div className="h-2 w-24 rounded" style={{ backgroundColor: themeColor }}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* User Management (Admin Only) */}
              {currentUser && currentUser.role === 'admin' && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4" style={{ color: themeColor }}>User Management</h2>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {users.map(user => (
                          <tr key={user.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-xs"
                                  style={{ backgroundColor: themeColor }}>
                                  {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                className="block w-full rounded-md border-gray-300 shadow-sm p-1 text-sm border"
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              >
                                {roles.map(role => (
                                  <option key={role.key} value={role.key}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => confirmDelete(user.id)}
                                className="text-red-600 hover:text-red-800"
                                disabled={user.id === currentUser?.id}
                              >
                                {user.id === currentUser?.id ? 'Current User' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative bg-white rounded-lg p-6 max-w-sm w-full mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom CSS for toggle switch */}
      <style>{`
        .toggle-label {
          transition: background-color 0.2s ease;
        }
        
        input:checked + .toggle-label {
          background-color: ${themeColor};
        }
        
        input:checked + .toggle-label:before {
          transform: translateX(1.5rem);
        }
      `}</style>
    </div>
  );
};

export default Settings;
