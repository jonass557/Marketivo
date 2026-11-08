import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Filter, Grid, List, ChevronDown, X, Loader, ChevronLeft, ChevronRight,
  ArrowLeft, Star, MapPin, Check, Zap, Box, BookOpen, Video, Calendar, Key, Plane
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import ProductCard from '../components/ProductCard';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from '../data/defaultData';

const Shop = () => {
  const [searchParams] = useSearchParams();
  const { formatPrice } = useSettings();

  // Initialisation instantanée (0ms)
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('marketivo_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PRODUCTS;
  });

  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('marketivo_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ['Tous', ...parsed.map(c => c.name)];
        }
      }
    } catch (e) {}
    return ['Tous', ...DEFAULT_CATEGORIES.map(c => c.name)];
  });

  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState([0, 2000000]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedType, setSelectedType] = useState((searchParams.get('type') || 'ALL').toUpperCase());
  const [selectedCity, setSelectedCity] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const location = useLocation();

  // Charger les données depuis l'API en arrière-plan
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          axios.get(`${API_URL}/api/products`),
          axios.get(`${API_URL}/api/categories`)
        ]);

        if (!isMounted) return;

        if (results[0].status === 'fulfilled') {
          const list = results[0].value?.data?.products || results[0].value?.data;
          if (Array.isArray(list) && list.length > 0) {
            setProducts(list);
            try { localStorage.setItem('marketivo_products', JSON.stringify(list)); } catch (e) {}
          }
        }

        if (results[1].status === 'fulfilled' && Array.isArray(results[1].value?.data) && results[1].value.data.length > 0) {
          setCategories(['Tous', ...results[1].value.data.map(cat => cat.name)]);
          try { localStorage.setItem('marketivo_categories', JSON.stringify(results[1].value.data)); } catch (e) {}
        }
      } catch (error) {
        console.warn('Erreur chargement shop:', error);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [location.key]);

  // Synchroniser avec les query params
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedCategory(searchParams.get('category') || '');
    if (searchParams.get('type')) {
      setSelectedType(searchParams.get('type').toUpperCase());
    }
  }, [searchParams]);

  const cities = ['Toutes', 'Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Maroua', 'Bamenda', 'Kribi'];

  // Filtrer les produits côté client
  const filteredProducts = products.filter(product => {
    const productCategory = product.category?.name || '';
    const productName = product.name?.toLowerCase() || '';
    const productDescription = product.description?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch = !searchQuery || productName.includes(query) || productDescription.includes(query);
    const matchesCategory = !selectedCategory || selectedCategory === 'Tous' || productCategory === selectedCategory;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];

    // Filtre type de produit
    const isDigital = product.productType === 'DIGITAL';
    const digitalKind = product.digitalType || 'EBOOK';
    let matchesType = true;
    if (selectedType === 'PHYSICAL') matchesType = !isDigital;
    else if (selectedType === 'DIGITAL') matchesType = isDigital;
    else if (selectedType === 'COURSE') matchesType = isDigital && digitalKind === 'COURSE';
    else if (selectedType === 'COACHING') matchesType = isDigital && digitalKind === 'COACHING';
    else if (selectedType === 'EXTERNAL') matchesType = isDigital && digitalKind === 'EXTERNAL';
    else if (selectedType === 'INTERNATIONAL') matchesType = (!isDigital && product.originCountry && product.originCountry !== 'Cameroun') || product.requiresForwarder;

    // Filtre ville
    const matchesCity = !selectedCity || selectedCity === 'Toutes' ||
      (product.vendor?.city && product.vendor.city.toLowerCase().includes(selectedCity.toLowerCase()));

    // Filtre stock
    const matchesStock = !onlyInStock || isDigital || product.stock > 0;

    // Filtre note
    const rating = product.rating || 0;
    const matchesRating = minRating === 0 || rating >= minRating;

    return matchesSearch && matchesCategory && matchesPrice && matchesType && matchesCity && matchesStock && matchesRating;
  });

  // Tri
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'popular':
      default:
        return (b.visibilityScore || 0) - (a.visibilityScore || 0) || ((b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    }
  });

  const totalPages = Math.ceil(sortedProducts.length / productsPerPage) || 1;
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + productsPerPage);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedType('ALL');
    setSelectedCity('');
    setOnlyInStock(false);
    setMinRating(0);
    setPriceRange([0, 2000000]);
    setSortBy('popular');
  };

  return (
    <div className="bg-gray-50 min-h-screen py-4 sm:py-6">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Barre supérieure / Breadcrumb */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {searchQuery ? `Résultats pour "${searchQuery}"` : selectedCategory || 'Catalogue Hybride'}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {sortedProducts.length} produit{sortedProducts.length > 1 ? 's' : ''} disponible{sortedProducts.length > 1 ? 's' : ''} (Chariow + Jumia)
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm"
            >
              <Filter size={16} /> Filtres
            </button>

            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-sm"
            >
              <option value="popular">Plus populaires</option>
              <option value="newest">Nouveautés</option>
              <option value="price-low">Prix croissant</option>
              <option value="price-high">Prix décroissant</option>
              <option value="rating">Mieux notés</option>
            </select>
          </div>
        </div>

        {/* Onglets rapides Type de produit (Cahier des charges 4.3 & 4.4) */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {[
            { id: 'ALL', label: 'Tous les produits', icon: null },
            { id: 'DIGITAL', label: '⚡ Produits Digitaux', icon: Zap },
            { id: 'PHYSICAL', label: '📦 Produits Physiques', icon: Box },
            { id: 'INTERNATIONAL', label: '✈️ Import Chine & Fret', icon: Plane },
            { id: 'COURSE', label: '🎓 Formations en ligne', icon: Video },
            { id: 'COACHING', label: '📅 Coaching & Consultations', icon: Calendar },
            { id: 'EXTERNAL', label: '🔑 Licences & Logiciels', icon: Key }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setSelectedType(tab.id); setCurrentPage(1); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm ${
                  isSelected
                    ? tab.id === 'ALL'
                      ? 'bg-gray-900 text-white'
                      : tab.id === 'PHYSICAL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border hover:bg-gray-50'
                }`}
              >
                {Icon && <Icon size={14} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-6 items-start">
          {/* SIDEBAR FILTRES (Desktop) */}
          <aside className="hidden lg:block w-64 bg-white rounded-2xl border border-gray-200 p-5 space-y-6 shadow-sm sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Filter size={16} className="text-orange-500" /> Filtres avancés
              </h3>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-orange-600 hover:underline font-semibold"
              >
                Réinitialiser
              </button>
            </div>

            {/* Catégories */}
            <div>
              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2.5">Catégories</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-xs">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat === 'Tous' ? '' : cat); setCurrentPage(1); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                      (selectedCategory === cat || (!selectedCategory && cat === 'Tous'))
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {(selectedCategory === cat || (!selectedCategory && cat === 'Tous')) && <Check size={13} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Prix */}
            <div>
              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2">Prix maximum</h4>
              <input
                type="range"
                min="0"
                max="2000000"
                step="5000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 FCFA</span>
                <span className="font-bold text-orange-600">{formatPrice(priceRange[1])}</span>
              </div>
            </div>

            {/* Localisation du vendeur (Ville) */}
            <div>
              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin size={13} className="text-blue-500" /> Ville du vendeur
              </h4>
              <select
                value={selectedCity}
                onChange={(e) => { setSelectedCity(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3 py-2 border rounded-xl bg-white text-gray-700 font-medium"
              >
                {cities.map(c => <option key={c} value={c === 'Toutes' ? '' : c}>{c}</option>)}
              </select>
            </div>

            {/* Disponibilité en stock */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded text-orange-500 focus:ring-orange-500"
                />
                En stock uniquement
              </label>
            </div>

            {/* Avis & Notes */}
            <div>
              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2">Note minimum</h4>
              <div className="space-y-1">
                {[
                  { stars: 0, label: 'Toutes les notes' },
                  { stars: 4, label: '4 étoiles et +' },
                  { stars: 3, label: '3 étoiles et +' }
                ].map(r => (
                  <button
                    key={r.stars}
                    onClick={() => { setMinRating(r.stars); setCurrentPage(1); }}
                    className={`w-full text-left px-2 py-1 rounded-lg text-xs flex items-center gap-2 ${
                      minRating === r.stars ? 'bg-amber-50 text-amber-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Star size={13} className={r.stars > 0 ? 'text-amber-500 fill-amber-500' : 'text-gray-400'} />
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Grille de produits */}
          <main className="flex-1 min-w-0">
            {paginatedProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                <Box size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-800 text-base mb-1">Aucun produit ne correspond à vos critères</h3>
                <p className="text-xs text-gray-500 mb-5">Essayez de modifier ou de réinitialiser vos filtres.</p>
                <button
                  onClick={handleResetFilters}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow"
                >
                  Réinitialiser tous les filtres
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id || product._id} product={product} formatPrice={formatPrice} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-500">
                  Affichage {startIndex + 1}-{Math.min(startIndex + productsPerPage, sortedProducts.length)} sur {sortedProducts.length} produits
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border rounded-xl hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold ${
                          currentPage === pageNum ? 'bg-orange-500 text-white shadow' : 'border hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border rounded-xl hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal Filtres Mobile */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">Filtres</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Type */}
            <div>
              <h4 className="font-bold text-xs text-gray-700 mb-2">Type de produit</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'ALL', label: 'Tous' },
                  { id: 'DIGITAL', label: '⚡ Digitaux' },
                  { id: 'PHYSICAL', label: '📦 Physiques' },
                  { id: 'COURSE', label: '🎓 Formations' },
                  { id: 'COACHING', label: '📅 Coaching' },
                  { id: 'EXTERNAL', label: '🔑 Licences' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    className={`py-2 px-3 rounded-xl border font-bold ${
                      selectedType === t.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ville */}
            <div>
              <h4 className="font-bold text-xs text-gray-700 mb-1.5">Ville du vendeur</h4>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-xl bg-white"
              >
                {cities.map(c => <option key={c} value={c === 'Toutes' ? '' : c}>{c}</option>)}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-3 border rounded-xl text-xs font-bold text-gray-700"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-xs font-bold"
              >
                Appliquer ({sortedProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
