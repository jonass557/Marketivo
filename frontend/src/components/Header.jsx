import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, Search, X, ChevronDown, Heart, FileText, Package, Store, MessageCircle, Home, Zap, Tag, Plane } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import { useTranslation } from 'react-i18next';
import AuthContext from '../context/AuthContext';
import CartContext from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const { settings, formatPrice } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext);
  const navigate = useNavigate();
  const searchContainerRef = useRef(null);

  // Autocomplétion de recherche (Cahier des charges 4.4)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/products/search/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch (e) {
        // Ignorer en mode silencieux
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fermer les suggestions au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectSuggestion = (s) => {
    setShowSuggestions(false);
    setSearchQuery('');
    if (s.type === 'product') {
      navigate(`/product/${s.slug || s.id}`);
    } else if (s.type === 'category') {
      navigate(`/shop?category=${s.slug}`);
    }
  };

  const categories = [
    'Téléphones & Tablettes',
    'Électronique',
    'Mode Femme',
    'Mode Homme',
    'Maison & Bureau',
    'Informatique',
    'Santé & Beauté',
    'Alimentation',
    'Sports',
    'Jeux & Jouets'
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* Barre supérieure */}
      <div className="bg-gray-800 text-white text-[10px] sm:text-xs py-1">
        <div className="container mx-auto px-3 sm:px-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/pricing" className="hidden xs:inline hover:text-orange-400">Vendez sur MyShop</Link>
            <span className="hidden md:inline">|</span>
            <Link to="/vendors" className="hidden md:inline hover:text-orange-400 flex items-center gap-1"><Store size={12} /> Boutiques</Link>
            <span className="hidden md:inline">|</span>
            <Link to="/forwarders" className="hidden md:inline hover:text-orange-400 flex items-center gap-1"><Plane size={12} /> Fret & Transit</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/blog" className="flex items-center gap-1 hover:text-orange-400">
              <FileText size={14} />
              <span className="hidden sm:inline">Blog</span>
            </Link>
            <div className="border-l border-gray-600 pl-2 sm:pl-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Barre principale */}
      <div className="bg-theme-primary text-white py-2 sm:py-3">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              {settings.storeLogo ? (
                <img 
                  src={settings.storeLogo} 
                  alt={settings.storeName || 'Logo'} 
                  className="h-8 sm:h-10 w-auto max-w-[100px] sm:max-w-[150px] object-contain"
                />
              ) : (
                <h1 className="text-lg sm:text-2xl font-bold text-white">{settings.storeName || 'MyShop'}</h1>
              )}
            </Link>

            {/* Barre de recherche avec autocomplétion - Desktop (Cahier des charges 4.4) */}
            <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-2xl relative">
              <form onSubmit={handleSearch} className="flex w-full">
                <input
                  type="text"
                  placeholder="Rechercher des produits, formations, ebooks, marques..."
                  className="w-full px-4 py-2 text-gray-800 rounded-l focus:outline-none text-sm"
                  value={searchQuery}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-theme-primary-hover hover:opacity-90 px-6 py-2 rounded-r transition-colors flex items-center justify-center"
                >
                  <Search size={20} />
                </button>
              </form>

              {/* Menu déroulant des suggestions autocomplétées */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in max-h-96 overflow-y-auto">
                  <div className="p-2 border-b bg-gray-50 flex items-center justify-between text-xs text-gray-500 font-semibold px-3">
                    <span>Suggestions instantanées</span>
                    <span>{suggestions.length} résultat(s)</span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {suggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestion(s)}
                        className="p-3 hover:bg-orange-50 cursor-pointer transition-colors flex items-center gap-3"
                      >
                        {s.type === 'product' ? (
                          <>
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border flex items-center justify-center">
                              {s.image ? (
                                <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={18} className="text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-xs text-gray-900 truncate">{s.title}</p>
                                {s.productType === 'DIGITAL' ? (
                                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full flex-shrink-0">
                                    ⚡ Digital
                                  </span>
                                ) : (
                                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full flex-shrink-0">
                                    📦 Physique
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400">{s.categoryName || 'Boutique'}</p>
                            </div>
                            <span className="font-bold text-xs text-orange-600 flex-shrink-0">
                              {formatPrice(s.price)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="p-1.5 bg-gray-100 text-gray-600 rounded-lg"><Tag size={14} /></span>
                            <span className="text-xs font-semibold text-gray-800 flex-1">Catégorie : <strong>{s.title}</strong></span>
                            <span className="text-[11px] text-gray-400">Voir tout →</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="w-full text-center py-2.5 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-orange-600 border-t transition-colors"
                  >
                    Voir tous les résultats pour "{searchQuery}" →
                  </button>
                </div>
              )}
            </div>

            {/* Actions utilisateur */}
            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
              {/* Compte */}
              <div className="relative group">
                <Link
                  to={user ? '/profile' : '/login'}
                  className="flex items-center gap-1 px-3 py-2 hover:bg-orange-600 rounded transition-colors"
                >
                  <User size={20} />
                  <span className="hidden lg:block text-sm">
                    {user ? user.fullName?.split(' ')[0] : 'Compte'}
                  </span>
                  <ChevronDown size={16} className="hidden lg:block" />
                </Link>
                
                {/* Menu déroulant */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white text-gray-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {user ? (
                    <>
                      <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">Mon compte</Link>
                      <Link to="/orders" className="block px-4 py-2 hover:bg-gray-100">Mes commandes</Link>
                      <Link to="/orders" className="block px-4 py-2 hover:bg-purple-50 text-purple-700 font-semibold text-xs">⚡ Bibliothèque Digitale</Link>
                      <Link to="/my-shipments" className="block px-4 py-2 hover:bg-blue-50 text-blue-700 font-semibold text-xs">✈️ Mes Dossiers Transit</Link>
                      <Link to="/messages" className="block px-4 py-2 hover:bg-gray-100">Messages</Link>
                      {user.role === 'VENDOR' && (
                        <Link to="/vendor/dashboard" className="block px-4 py-2 hover:bg-gray-100 text-blue-600">Ma Boutique</Link>
                      )}
                      {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                        <Link to="/admin" className="block px-4 py-2 hover:bg-gray-100 text-orange-600">Dashboard Admin</Link>
                      )}
                      {user.role === 'USER' && (
                        <Link to="/pricing" className="block px-4 py-2 hover:bg-gray-100 text-orange-600">Devenir Vendeur</Link>
                      )}
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                      >
                        Déconnexion
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="block px-4 py-2 hover:bg-gray-100">Se connecter</Link>
                      <Link to="/register" className="block px-4 py-2 hover:bg-gray-100">Créer un compte</Link>
                      <Link to="/pricing" className="block px-4 py-2 hover:bg-gray-100 text-orange-600">Devenir Vendeur</Link>
                    </>
                  )}
                </div>
              </div>

              {/* Blog */}
              <Link
                to="/blog"
                className="hidden md:flex items-center gap-1 px-3 py-2 hover:bg-orange-600 rounded transition-colors"
              >
                <FileText size={20} />
                <span className="hidden lg:block text-sm">Blog</span>
              </Link>

              {/* Panier */}
              <Link
                to="/cart"
                className="flex items-center gap-1 px-2 sm:px-3 py-2 hover:bg-orange-600 rounded transition-colors relative"
              >
                <ShoppingCart size={20} />
                <span className="hidden lg:block text-sm">Panier</span>
                <span className="absolute -top-1 -right-1 bg-white text-orange-500 text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </Link>

              {/* Menu mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-orange-600 rounded"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Barre de recherche - Mobile */}
          <form onSubmit={handleSearch} className="md:hidden mt-2 sm:mt-3">
            <div className="flex">
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full px-3 sm:px-4 py-2 text-gray-800 rounded-l focus:outline-none text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 px-3 sm:px-4 py-2 rounded-r active:bg-orange-800"
              >
                <Search size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Navigation catégories - Desktop */}
      <nav className="hidden md:block bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-1 overflow-x-auto py-2 text-sm">
            <li>
              <Link
                to="/"
                className="whitespace-nowrap px-3 py-1.5 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors flex items-center gap-1 font-semibold text-orange-600"
              >
                <Home size={14} />
                Accueil
              </Link>
            </li>
            <li className="text-gray-200">|</li>
            {categories.map((cat, index) => (
              <li key={index}>
                <Link
                  to={`/shop?category=${encodeURIComponent(cat)}`}
                  className="whitespace-nowrap px-3 py-1 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                >
                  {cat}
                </Link>
              </li>
            ))}
            {/* Lien Blog */}
            <li>
              <Link
                to="/blog"
                className="whitespace-nowrap px-3 py-1 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors flex items-center gap-1 font-medium text-orange-600"
              >
                <FileText size={14} />
                Blog
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <>
          {/* Overlay pour fermer le menu en cliquant dehors */}
          <div 
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden bg-white border-b shadow-lg max-h-[70vh] overflow-y-auto relative z-50">
            {/* Bouton fermer */}
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <span className="font-semibold text-gray-800">Catégories</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fermer le menu"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
              <ul className="space-y-1">
              <li>
                <Link
                  to="/"
                  className="flex items-center gap-2 py-3 px-3 bg-orange-50 text-orange-600 rounded text-sm font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home size={16} />
                  Accueil
                </Link>
              </li>
              {categories.map((cat, index) => (
                <li key={index}>
                  <Link
                    to={`/shop?category=${encodeURIComponent(cat)}`}
                    className="block py-3 px-3 hover:bg-orange-50 hover:text-orange-500 rounded text-sm active:bg-orange-100 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {cat}
                  </Link>
                </li>
              ))}
              {/* Lien Blog - Mobile */}
              <li className="border-t pt-2 mt-2">
                <Link
                  to="/blog"
                  className="flex items-center gap-2 py-3 px-3 bg-orange-50 text-orange-600 rounded text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FileText size={16} />
                  Blog
                </Link>
              </li>
            </ul>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
