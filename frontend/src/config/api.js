import axios from 'axios';

// Détermination intelligente et résiliente de l'URL de l'API
const getApiUrl = () => {
  // 1. Variable d'environnement VITE_API_URL configurée (ex: Vercel)
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // 2. Détection de l'environnement client
  if (typeof window !== 'undefined') {
    // Si l'utilisateur a spécifié une URL manuelle en cache
    const storedUrl = localStorage.getItem('marketivo_api_url');
    if (storedUrl && storedUrl.trim() !== '') {
      return storedUrl.replace(/\/$/, '');
    }

    const host = window.location.hostname;
    // Si le client visite en local sur sa machine
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return 'http://localhost:5000';
    }
  }

  // 3. Fallback automatique pour Vercel et production distante
  return 'https://marketivo-api.onrender.com';
};

const API_URL = getApiUrl();

// Configuration globale Axios pour connexions à faible débit
axios.defaults.timeout = 25000; // 25 secondes max

export const API_BASE_URL = API_URL;
export const API_ENDPOINT = `${API_URL}/api`;

export default API_URL;
