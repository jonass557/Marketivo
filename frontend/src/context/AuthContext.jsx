import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rafraîchir les données utilisateur depuis le serveur
  const refreshUser = async () => {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      try {
        const response = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${userData.token}` }
        });
        const updatedUser = { ...response.data, token: userData.token };
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch (error) {
        console.error('Erreur de rafraîchissement:', error);
      }
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // Rafraîchir les données utilisateur au chargement
      refreshUser();
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
