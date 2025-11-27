import api from './api.js';

// Signup new user
export const signup = async (userData) => {
  const response = await api.post('/api/auth/signup', userData);
  return response.data;
};

// Login user
export const login = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials);
  
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response.data;
};

// Logout user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Get current user info
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

// Check if user is logged in
export const isLoggedIn = () => {
  return !!localStorage.getItem('token');
};

// Get user profile from server
export const getProfile = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};