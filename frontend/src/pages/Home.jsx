import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Truck, Shield, Headphones, CreditCard, Zap, ChevronDown, Calendar, User, ArrowRight, Store, TrendingUp, Users, Package, Star, CheckCircle, Sparkles, Award, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/ProductCard';
import { useSettings } from '../context/SettingsContext';
import axios from 'axios';
import API_URL from '../config/api';
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, FALLBACK_IMAGE_SVG, FALLBACK_AVATAR_SVG } from '../data/defaultData';

const AnimatedCounter = ({ target, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = Math.ceil(target / (duration / 16));
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(start);
        }, 16);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString('fr-FR')}{suffix}</span>;
};

const Home = () => {
  const { t } = useTranslation();
  const { formatPrice, settings } = useSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [blogs, setBlogs] = useState([]);
  
  // Initialisation instantanée (0ms) depuis le cache local ou données par défaut fiables
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('marketivo_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_CATEGORIES;
  });

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

  const [partners, setPartners] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [heroVisible, setHeroVisible] = useState(false);
  const productsPerPage = 12;

  const location = useLocation();

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          axios.get(`${API_URL}/api/blogs?published=true`),
          axios.get(`${API_URL}/api/categories`),
          axios.get(`${API_URL}/api/products`),
          axios.get(`${API_URL}/api/partners`),
          axios.get(`${API_URL}/api/vendors/top?limit=8`)
        ]);

        if (!isMounted) return;

        // Blogs
        if (results[0].status === 'fulfilled' && Array.isArray(results[0].value?.data)) {
          setBlogs(results[0].value.data.slice(0, 3));
        }

        // Catégories
        if (results[1].status === 'fulfilled' && Array.isArray(results[1].value?.data) && results[1].value.data.length > 0) {
          setCategories(results[1].value.data);
          try { localStorage.setItem('marketivo_categories', JSON.stringify(results[1].value.data)); } catch (e) {}
        }

        // Produits
        if (results[2].status === 'fulfilled') {
          const list = results[2].value?.data?.products || results[2].value?.data;
          if (Array.isArray(list) && list.length > 0) {
            setProducts(list);
            try { localStorage.setItem('marketivo_products', JSON.stringify(list)); } catch (e) {}
          }
        }

        // Partenaires
        if (results[3].status === 'fulfilled' && Array.isArray(results[3].value?.data)) {
          setPartners(results[3].value.data);
        }

        // Top Vendeurs
        if (results[4].status === 'fulfilled' && Array.isArray(results[4].value?.data)) {
          setTopVendors(results[4].value.data);
        }
      } catch (error) {
        console.warn('Erreur chargement background:', error);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [location.key]);

  // Données de démonstration pour les bannières
  const banners = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop',
      title: 'Ventes Flash',
      subtitle: 'Jusqu\'à -50% sur l\'électronique',
      link: '/shop?sale=true'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
      title: 'Nouvelle Collection',
      subtitle: 'Découvrez les tendances 2024',
      link: '/shop?new=true'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop',
      title: 'Livraison Gratuite',
      subtitle: 'Sur toutes les commandes +50,000 XAF',
      link: '/shop'
    }
  ];

  // Séparer les produits populaires et les produits en promotion
  const flashProducts = products.filter(p => p.isPopular).slice(0, 6);
  const popularProducts = products.slice(0, 6);

  // Pagination pour tous les produits
  const totalPages = Math.ceil(products.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + productsPerPage);

  // Auto-slide pour le carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ========== HERO SECTION ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 animate-gradient-x">
        {/* Floating circles décoratives */}
        <div className="absolute top-10 right-10 w-40 h-40 bg-white/10 rounded-full animate-float" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/10 rounded-full animate-float-delay" />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/10 rounded-full animate-float" />

        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Left: text + CTA */}
            <div className={`flex-1 text-white transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <Sparkles size={14} /> Bienvenue sur MyShop
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                Achetez & Vendez<br />
                <span className="text-white/90">en toute confiance</span>
              </h1>
              <p className="text-lg text-white/85 mb-8 max-w-lg">
                Des milliers de produits livrés partout au Cameroun. Paiements sécurisés par Mobile Money, Orange Money et à la livraison.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/shop"
                  className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:scale-105 animate-pulse-glow">
                  <Package size={18} /> Explorer la boutique
                </Link>
                <Link to="/pricing"
                  className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition-all">
                  <Store size={18} /> Devenir Vendeur
                </Link>
              </div>
            </div>

            {/* Right: Slider */}
            <div className={`flex-1 w-full max-w-xl transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl h-56 sm:h-72">
                {banners.map((banner, index) => (
                  <Link key={banner.id} to={banner.link}
                    className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5">
                      <h2 className="text-xl font-bold text-white">{banner.title}</h2>
                      <p className="text-sm text-white/80">{banner.subtitle}</p>
                    </div>
                  </Link>
                ))}
                <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow transition-colors">
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {banners.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Store, label: 'Vendeurs actifs', target: 500, suffix: '+', color: 'text-orange-500' },
              { icon: Package, label: 'Produits disponibles', target: 10000, suffix: '+', color: 'text-orange-500' },
              { icon: Users, label: 'Clients satisfaits', target: 25000, suffix: '+', color: 'text-orange-500' },
              { icon: TrendingUp, label: 'Commandes livrées', target: 50000, suffix: '+', color: 'text-orange-500' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-1">
                    <Icon size={20} className={stat.color} />
                  </div>
                  <div className="text-2xl font-extrabold text-gray-800">
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== AVANTAGES ========== */}
      <section className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Truck, title: 'Livraison Rapide', sub: 'Partout au Cameroun' },
            { icon: Shield, title: 'Paiement Sécurisé', sub: '100% sécurisé' },
            { icon: Headphones, title: 'Support 24/7', sub: 'Assistance dédiée' },
            { icon: CreditCard, title: 'Paiement Livraison', sub: 'Cash ou Mobile Money' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-orange-50 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="bg-orange-100 p-2.5 rounded-xl flex-shrink-0">
                  <Icon className="text-orange-500 w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm truncate">{item.title}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">{item.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========== CATÉGORIES ========== */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" />
                Catégories populaires
              </h2>
              <Link to="/shop" className="text-orange-500 hover:underline text-sm font-medium">Voir tout →</Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {categories.slice(0, 8).map((cat) => (
                <Link key={cat.id || cat._id} to={`/shop?category=${cat.slug}`}
                  className="flex flex-col items-center gap-1.5 group">
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl overflow-hidden flex items-center justify-center group-hover:bg-orange-100 transition-colors border border-orange-100">
                    {cat.image
                      ? <img src={cat.image} alt={cat.name} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }} className="w-full h-full object-cover" />
                      : <span className="text-2xl">🛍️</span>}
                  </div>
                  <span className="text-[11px] text-center text-gray-600 group-hover:text-orange-500 transition-colors font-medium leading-tight">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== VENTES FLASH ========== */}
      {flashProducts.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b border-orange-50">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <Zap className="text-orange-500 w-5 h-5" />
                <h2 className="text-base sm:text-lg font-bold">{t('home.flashSales')}</h2>
                <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">-50%</span>
              </div>
              <Link to="/shop?sale=true" className="text-orange-500 hover:underline text-xs sm:text-sm font-medium">
                {t('home.viewAll')} →
              </Link>
            </div>
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                {flashProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========== PRODUITS POPULAIRES ========== */}
      {popularProducts.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <Star className="text-orange-500 w-5 h-5" />
                <h2 className="text-base sm:text-lg font-bold">{t('home.popularProducts')}</h2>
              </div>
              <Link to="/shop" className="text-orange-500 hover:underline text-xs sm:text-sm font-medium">
                {t('home.viewAll')} →
              </Link>
            </div>
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                {popularProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========== MEILLEURS VENDEURS ========== */}
      {topVendors.length > 0 && (
        <section className="container mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <Award className="text-orange-500 w-5 h-5" />
                <h2 className="text-base sm:text-lg font-bold">Meilleurs Vendeurs</h2>
              </div>
              <Link to="/vendors" className="text-orange-500 hover:underline text-xs sm:text-sm font-medium">
                Voir tout →
              </Link>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {topVendors.slice(0, 8).map((v) => (
                <Link key={v._id || v.id} to={`/vendor/${v.slug}`}
                  className="group flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all bg-gray-50/50">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center mb-3 overflow-hidden border-2 border-orange-200 group-hover:border-orange-400 transition-colors">
                    {v.logo
                      ? <img src={v.logo} alt={v.shopName} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR_SVG; }} className="w-full h-full object-cover rounded-full" />
                      : <Store size={24} className="text-orange-400" />}
                  </div>
                  <h3 className="font-semibold text-sm text-center text-gray-800 group-hover:text-orange-500 transition-colors truncate w-full">{v.shopName}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-500">{v.rating?.toFixed(1) || '5.0'}</span>
                    <span className="text-xs text-gray-300 mx-1">|</span>
                    <span className="text-xs text-gray-500">{v.productCount || 0} produits</span>
                  </div>
                  {v.city && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5"><MapPin size={9} />{v.city}</p>
                  )}
                  {v.badges && v.badges.includes('VERIFIED') && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle size={9} /> Vérifié
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== BECOME A VENDOR CTA ========== */}
      <section className="container mx-auto px-4 py-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-8">
            <div className="text-white text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm mb-3">
                <Store size={14} /> Rejoignez notre réseau de vendeurs
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Devenez Vendeur sur MyShop</h2>
              <p className="text-white/85 max-w-md">
                Créez votre boutique en ligne gratuitement et vendez à des milliers de clients en Afrique. Plan Standard gratuit — jusqu'à 8 produits sans frais.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  'Plan Gratuit disponible',
                  'Tableau de bord complet',
                  'Paiements intégrés',
                  'Support dédié'
                ].map((feat, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                    <CheckCircle size={11} /> {feat}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <Link to="/pricing"
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-xl hover:bg-orange-50 transition-all shadow-lg text-lg hover:scale-105 animate-pulse-glow whitespace-nowrap">
                <Store size={22} /> Créer ma boutique
              </Link>
              <Link to="/pricing" className="text-white/80 hover:text-white text-sm underline underline-offset-2">
                Voir les plans & tarifs →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TOUS LES PRODUITS ========== */}
      <section className="container mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-orange-500 rounded-full" />
              <h2 className="text-base sm:text-lg font-bold">Tous les Produits</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{products.length}</span>
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              {paginatedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  {startIndex + 1}–{Math.min(startIndex + productsPerPage, products.length)} sur {products.length}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pg = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                    return (
                      <button key={pg} onClick={() => setCurrentPage(pg)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === pg ? 'bg-orange-500 text-white' : 'border hover:bg-gray-50'}`}>
                        {pg}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========== SECTION PARTENAIRES (MARQUEE) ========== */}
      {partners.length > 0 && (
        <section className="py-10 bg-white border-y">
          <div className="container mx-auto px-4 mb-6 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">Ils nous font confiance</p>
            <h2 className="text-xl font-bold text-gray-800">Nos Partenaires</h2>
          </div>
          <div className="relative overflow-hidden">
            <div className="flex animate-marquee gap-16 items-center" style={{ width: 'max-content' }}>
              {[...partners, ...partners].map((p, i) => {
                const content = (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <img
                      src={p.logo}
                      alt={p.name}
                      className="max-h-10 max-w-[120px] object-contain"
                      onError={(e) => { e.target.style.display='none'; e.target.nextElementSibling && (e.target.nextElementSibling.style.display='flex'); }}
                    />
                    <span className="hidden items-center justify-center text-sm font-bold text-gray-400 bg-gray-100 rounded-lg px-4 py-2">{p.name}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{p.name}</span>
                  </div>
                );
                return (
                  <div key={i} className="flex-shrink-0 flex items-center justify-center w-36 h-16 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                    {p.website
                      ? <a href={p.website} target="_blank" rel="noopener noreferrer">{content}</a>
                      : content
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========== SECTION BLOG ========== */}
      {blogs.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <h2 className="text-lg font-bold">{t('blog.latestArticles')}</h2>
              </div>
              <Link to="/blog" className="text-orange-500 hover:underline text-sm font-medium flex items-center gap-1">
                Voir tout <ArrowRight size={14} />
              </Link>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-5">
              {blogs.map((blog) => (
                <Link key={blog.id} to={`/blog/${blog.slug}`} className="group">
                  <div className="bg-gray-100 rounded-xl overflow-hidden mb-3 h-44 relative">
                    {blog.imageUrl
                      ? <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.style.display='none'; }} />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">📝</div>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1"><Calendar size={11} />{new Date(blog.createdAt).toLocaleDateString('fr-FR')}</span>
                    <span className="flex items-center gap-1"><User size={11} />{blog.author}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-orange-500 transition-colors line-clamp-2 text-sm">{blog.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{blog.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== FOOTER CTA VENDEUR ========== */}
      <section className="container mx-auto px-4 pb-10">
        <div className="text-center py-10 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
          <Store size={40} className="text-orange-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Prêt à vendre vos produits ?</h2>
          <p className="text-gray-500 mb-5 max-w-md mx-auto">Rejoignez plus de 500 vendeurs et développez votre activité avec MyShop.</p>
          <Link to="/pricing"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:scale-105">
            Commencer gratuitement <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
