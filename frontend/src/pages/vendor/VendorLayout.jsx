import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, MessageCircle, BarChart3,
  CreditCard, Settings, LogOut, Menu, X, Bell, Store, Plus, ChevronDown, Home
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vendorData, setVendorData] = useState(null);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'VENDOR') {
      navigate('/vendor/register');
      return;
    }
    fetchVendorProfile();
  }, [user, navigate]);

  const fetchVendorProfile = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/vendors/me`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setVendorData(data);
    } catch (err) {
      console.error('Erreur chargement profil vendeur:', err);
    }
  };

  const menuItems = [
    { path: '/vendor/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
    { path: '/vendor/dashboard/products', icon: Package, label: 'Produits' },
    { path: '/vendor/dashboard/orders', icon: ShoppingCart, label: 'Commandes' },
    { path: '/vendor/dashboard/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/vendor/dashboard/subscription', icon: CreditCard, label: 'Abonnement' },
    { path: '/vendor/dashboard/settings', icon: Settings, label: 'Paramètres' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user || user.role !== 'VENDOR') return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      } hidden lg:block`}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link to="/vendor/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Store size={22} className="text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <span className="font-bold text-gray-800 text-sm block">{vendorData?.shopName || 'Ma Boutique'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  vendorData?.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  vendorData?.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {vendorData?.status === 'APPROVED' ? 'Actif' :
                   vendorData?.status === 'PENDING' ? 'En attente' : vendorData?.status}
                </span>
              </div>
            )}
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-100 rounded">
            <Menu size={20} className="text-gray-500" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                  active ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3 space-y-2">
          {vendorData?.slug && (
            <Link to={`/shop/${vendorData.slug}`} target="_blank"
              className="flex items-center gap-2 px-3 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl text-sm">
              <Home size={18} />
              {sidebarOpen && <span>Voir ma boutique</span>}
            </Link>
          )}
          <Link to="/"
            className="flex items-center gap-2 px-3 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl text-sm">
            <Store size={18} />
            {sidebarOpen && <span>Retour au site</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white">
            <div className="h-16 flex items-center justify-between px-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Store size={22} className="text-white" />
                </div>
                <span className="font-bold text-gray-800 text-sm">{vendorData?.shopName || 'Ma Boutique'}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                      active ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
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
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
              {menuItems.find(m => isActive(m.path, m.exact))?.label || 'Tableau de bord'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/vendor/dashboard/products/new"
              className="hidden sm:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus size={16} /> Ajouter produit
            </Link>
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell size={20} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.fullName?.charAt(0).toUpperCase()}
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded text-red-500" title="Déconnexion">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet context={{ vendorData, fetchVendorProfile }} />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
