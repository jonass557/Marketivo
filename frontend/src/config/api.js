// Configuration de l'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_BASE_URL = API_URL;
export const API_ENDPOINT = `${API_URL}/api`;

export default API_URL;
