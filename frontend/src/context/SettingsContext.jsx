import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    storeName: 'MyShop',
    storeLogo: '',
    currency: 'XAF',
    currencySymbol: 'FCFA',
    currencyPosition: 'after',
    primaryColor: '#f97316',
    secondaryColor: '#1f2937',
    accentColor: '#f97316',
  });
  const [loading, setLoading] = useState(true);

  // Charger les paramètres au démarrage
  useEffect(() => {
    fetchSettings();
  }, []);

  // Fonction pour assombrir une couleur hex
  const darkenColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  };

  // Appliquer le thème aux variables CSS
  const applyTheme = (primaryColor, secondaryColor, accentColor) => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', primaryColor);
      document.documentElement.style.setProperty('--theme-primary-hover', darkenColor(primaryColor, 15));
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--theme-secondary', secondaryColor);
    }
    if (accentColor) {
      document.documentElement.style.setProperty('--theme-accent', accentColor);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/settings`);
      setSettings(prev => ({ ...prev, ...data }));
      
      // Appliquer les couleurs du thème
      applyTheme(data.primaryColor, data.secondaryColor, data.accentColor);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour formater les prix avec la devise
  const formatPrice = (price) => {
    if (price === null || price === undefined) return '';
    
    const numPrice = Number(price);
    if (isNaN(numPrice)) return price;

    // Formater le nombre avec séparateurs de milliers
    const formattedNumber = numPrice.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    // Appliquer la position du symbole
    if (settings.currencyPosition === 'before') {
      return `${settings.currencySymbol} ${formattedNumber}`;
    } else {
      return `${formattedNumber} ${settings.currencySymbol}`;
    }
  };

  // Rafraîchir les paramètres (appelé après une mise à jour)
  const refreshSettings = () => {
    fetchSettings();
  };

  const value = {
    settings,
    loading,
    formatPrice,
    refreshSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
