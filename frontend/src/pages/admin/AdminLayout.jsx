import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  Image,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  Store,
  FileText,
  MessageSquare,
  ShieldAlert,
  CreditCard,
  Handshake
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const { user, logout, refreshUser } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Vérifier les permissions à chaque changement de page et périodiquement
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.token) {
        navigate('/admin/login');
        return;
      }

      try {
        // Vérifier le rôle actuel depuis le serveur
        const { data } = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        
        if (data.role !== 'ADMIN' && data.role !== 'SUPER_ADMIN') {
          setIsAuthorized(false);
          // Mettre à jour les données locales
          if (refreshUser) refreshUser();
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Erreur vérification permissions:', error);
        if (error.response?.status === 401) {
          logout();
          navigate('/admin/login');
        }
      }
    };

    checkPermissions();
    
    // Vérifier les permissions toutes les 30 secondes
    const interval = setInterval(checkPermissions, 30000);
    return () => clearInterval(interval);
  }, [user, location.pathname, navigate, logout, refreshUser]);

  // Vérifier si l'utilisateur est admin - rediriger sinon
  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    } else if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      setIsAuthorized(false);
    }
  }, [user, navigate]);

  // Si l'utilisateur n'est pas admin, afficher un message d'accès refusé
  if (!user || !isAuthorized || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="text-red-500" size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Accès refusé</h1>
          <p className="text-gray-500 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder au dashboard administrateur.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/vendors', icon: Store, label: 'Vendeurs' },
    { path: '/admin/subscriptions', icon: CreditCard, label: 'Abonnements' },
    { path: '/admin/products', icon: Package, label: 'Produits' },
    { path: '/admin/categories', icon: FolderTree, label: 'Catégories' },
    { path: '/admin/orders', icon: ShoppingCart, label: 'Commandes' },
    { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { path: '/admin/reviews', icon: MessageSquare, label: 'Avis clients' },
    { path: '/admin/chat', icon: MessageSquare, label: 'Modération Chat' },
    { path: '/admin/partners', icon: Handshake, label: 'Partenaires' },
    { path: '/admin/banners', icon: Image, label: 'Bannières' },
    { path: '/admin/blogs', icon: FileText, label: 'Blog' },
    { path: '/admin/settings', icon: Settings, label: 'Paramètres' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-gray-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } hidden lg:block`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Store size={24} />
            </div>
            {sidebarOpen && <span className="font-bold text-xl">MyShop</span>}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Retour au site */}
        <div className="absolute bottom-4 left-4 right-4">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <Store size={20} />
            {sidebarOpen && <span>Voir le site</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 text-white">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
              <Link to="/admin" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Store size={24} />
                </div>
                <span className="font-bold text-xl">MyShop</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
            >
              <Menu size={24} />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="bg-transparent border-0 focus:outline-none ml-2 w-64"
              />
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                {user?.fullName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block">
                <p className="font-medium text-sm">{user?.fullName || 'Admin'}</p>
                <p className="text-xs text-gray-500">Administrateur</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded text-red-500"
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
