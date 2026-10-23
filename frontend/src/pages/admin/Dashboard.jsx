import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import { FALLBACK_IMAGE_SVG, safeImage } from '../../data/defaultData';
import {
  DollarSign,
  ShoppingCart,
  Package,
  ArrowUpRight,
  Loader,
  Clock,
  Bell,
  Search,
  X,
  Trash2
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    ordersCount: 0,
    pendingOrders: 0,
    productsCount: 0
  });

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ orders: [], products: [], users: [] });
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  // Mapping des statuts
  const statusMap = {
    'PENDING': 'En attente',
    'CONFIRMED': 'Confirmé',
    'DELIVERED': 'Livré',
    'CANCELLED': 'Annulé'
  };

  const location = useLocation();

  // Charger les données (aussi lors de la navigation)
  useEffect(() => {
    if (user?.token) {
      fetchDashboardData();
      fetchNotifications();
    }
  }, [user, period, location.key]);

  // Écouter les nouvelles commandes en temps réel
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (order) => {
      toast.success(`🛒 Nouvelle commande de ${order.user?.fullName || 'Client'} !`);
      // Ajouter la commande en tête de liste
      setRecentOrders(prev => [order, ...prev.slice(0, 4)]);
      // Mettre à jour les stats
      setStats(prev => ({
        ...prev,
        ordersCount: prev.ordersCount + 1,
        pendingOrders: prev.pendingOrders + 1,
        totalRevenue: prev.totalRevenue + (order.totalAmount || 0)
      }));
      // Rafraîchir les notifications
      fetchNotifications();
    };

    const handleOrderUpdated = (order) => {
      setRecentOrders(prev => 
        prev.map(o => (o.id === order.id || o._id === order._id) ? order : o)
      );
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderUpdated', handleOrderUpdated);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderUpdated', handleOrderUpdated);
    };
  }, [socket, toast]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      const [statsRes, ordersRes, productsRes, chartRes] = await Promise.all([
        axios.get(`${API_URL}/api/stats?period=${period}`, config),
        axios.get(`${API_URL}/api/orders?limit=5`, config),
        axios.get(`${API_URL}/api/products?limit=10`),
        axios.get(`${API_URL}/api/stats/chart`, config)
      ]);

      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.orders || []);
      setTopProducts((productsRes.data.products || []).filter(p => p.isPopular).slice(0, 4));
      setChartData(chartRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/notifications`, config);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Erreur notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${API_URL}/api/notifications/${id}/read`, {}, config);
      fetchNotifications();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${API_URL}/api/notifications/read-all`, {}, config);
      fetchNotifications();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${API_URL}/api/notifications/${id}`, config);
      fetchNotifications();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Recherche
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          const { data } = await axios.get(`${API_URL}/api/stats/search?q=${searchQuery}`, config);
          setSearchResults(data);
          setShowSearch(true);
        } catch (error) {
          console.error('Erreur recherche:', error);
        }
      } else {
        setSearchResults({ orders: [], products: [], users: [] });
        setShowSearch(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, user]);

  const getStatusColor = (status) => {
    const statusDisplay = statusMap[status] || status;
    switch (statusDisplay) {
      case 'Livré': return 'bg-green-100 text-green-700';
      case 'Confirmé': return 'bg-blue-100 text-blue-700';
      case 'En attente': return 'bg-yellow-100 text-yellow-700';
      case 'Annulé': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return formatDate(dateString);
  };

  const getOrderNumber = (id) => `CMD-${id?.slice(-6).toUpperCase()}`;

  // Calculer le max pour le chart
  const maxChartValue = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.ventes || 0), 1) 
    : 1;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-CM').format(price || 0) + ' XAF';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec recherche et notifications */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm sm:text-base">Bienvenue dans votre espace d'administration</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Recherche */}
          <div className="relative flex-1 lg:w-64" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
            
            {/* Résultats de recherche */}
            {showSearch && (searchResults.orders.length > 0 || searchResults.products.length > 0 || searchResults.users.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
                {searchResults.orders.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 px-2 mb-1">COMMANDES</p>
                    {searchResults.orders.map(order => (
                      <Link
                        key={order.id}
                        to="/admin/orders"
                        onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <ShoppingCart size={16} className="text-orange-500" />
                        <div>
                          <p className="text-sm font-medium">{getOrderNumber(order.id)}</p>
                          <p className="text-xs text-gray-500">{order.user?.fullName}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.products.length > 0 && (
                  <div className="p-2 border-t">
                    <p className="text-xs font-medium text-gray-500 px-2 mb-1">PRODUITS</p>
                    {searchResults.products.map(product => (
                      <Link
                        key={product.id}
                        to={`/admin/products/${product.id}/edit`}
                        onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <img
                          src={safeImage(product.images?.[0])}
                          alt=""
                          loading="lazy"
                          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.category?.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.users.length > 0 && (
                  <div className="p-2 border-t">
                    <p className="text-xs font-medium text-gray-500 px-2 mb-1">UTILISATEURS</p>
                    {searchResults.users.map(u => (
                      <Link
                        key={u.id}
                        to="/admin/users"
                        onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {u.fullName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.fullName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 border rounded-lg bg-white hover:bg-gray-50"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Panel notifications */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
                <div className="p-3 border-b flex justify-between items-center">
                  <h3 className="font-medium">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-orange-500 hover:underline"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 text-sm">Aucune notification</p>
                  ) : (
                    notifications.slice(0, 10).map(notif => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b flex gap-3 hover:bg-gray-50 ${!notif.read ? 'bg-orange-50' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${!notif.read ? 'bg-orange-500' : 'bg-gray-300'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-gray-500">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notif.createdAt)}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              Lu
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtre période */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-green-500 p-2 sm:p-3 rounded-lg text-white">
              <DollarSign size={20} className="sm:w-6 sm:h-6" />
            </div>
          </div>
          <h3 className="text-gray-500 text-xs sm:text-sm">Revenus totaux</h3>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1 truncate">{formatPrice(stats.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-blue-500 p-2 sm:p-3 rounded-lg text-white">
              <ShoppingCart size={20} className="sm:w-6 sm:h-6" />
            </div>
          </div>
          <h3 className="text-gray-500 text-xs sm:text-sm">Commandes</h3>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1">{stats.ordersCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-yellow-500 p-2 sm:p-3 rounded-lg text-white">
              <Clock size={20} className="sm:w-6 sm:h-6" />
            </div>
            {stats.pendingOrders > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                Action
              </span>
            )}
          </div>
          <h3 className="text-gray-500 text-xs sm:text-sm">En attente</h3>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600 mt-1">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-orange-500 p-2 sm:p-3 rounded-lg text-white">
              <Package size={20} className="sm:w-6 sm:h-6" />
            </div>
          </div>
          <h3 className="text-gray-500 text-xs sm:text-sm">Produits</h3>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1">{stats.productsCount}</p>
        </div>
      </div>

      {/* Chart des ventes */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 sm:mb-6">
          <h2 className="font-bold text-base sm:text-lg">📊 Ventes {new Date().getFullYear()}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-500">Ventes (XAF)</span>
            </div>
          </div>
        </div>
        
        {/* Line Chart */}
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            Aucune donnée de vente disponible
          </div>
        ) : (
          <div className="h-64 relative">
            {/* SVG Line Chart */}
            <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#f3f4f6" strokeWidth="0.2" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="0.2" />
              <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#f3f4f6" strokeWidth="0.2" />
              
              {/* Area fill */}
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path
                d={`M 0,50 ${chartData.map((data, index) => {
                  const x = (index / (chartData.length - 1)) * 100;
                  const y = maxChartValue > 0 ? 50 - (data.ventes / maxChartValue) * 45 : 50;
                  return `L ${x},${y}`;
                }).join(' ')} L 100,50 Z`}
                fill="url(#areaGradient)"
              />
              
              {/* Line */}
              <path
                d={chartData.map((data, index) => {
                  const x = (index / (chartData.length - 1)) * 100;
                  const y = maxChartValue > 0 ? 50 - (data.ventes / maxChartValue) * 45 : 50;
                  return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#f97316"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {chartData.map((data, index) => {
                const x = (index / (chartData.length - 1)) * 100;
                const y = maxChartValue > 0 ? 50 - (data.ventes / maxChartValue) * 45 : 50;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="1"
                    fill="#f97316"
                    className="hover:r-2 cursor-pointer"
                  />
                );
              })}
            </svg>
            
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 transform translate-y-6">
              {chartData.map((data, index) => (
                <span key={index} className="text-xs text-gray-500 font-medium">{data.name}</span>
              ))}
            </div>
            
            {/* Hover tooltips overlay */}
            <div className="absolute inset-0 flex">
              {chartData.map((data, index) => (
                <div key={index} className="flex-1 group relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                    <div className="font-medium">{formatPrice(data.ventes)}</div>
                    <div className="text-gray-300">{data.commandes} commandes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Légende */}
        <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500">
          <span>Max: {formatPrice(maxChartValue)}</span>
          <span>Total: {formatPrice(chartData.reduce((sum, d) => sum + (d.ventes || 0), 0))}</span>
        </div>
      </div>

      {/* Charts & Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="p-4 sm:p-6 border-b flex justify-between items-center">
            <h2 className="font-bold text-base sm:text-lg">Commandes récentes</h2>
            <Link to="/admin/orders" className="text-orange-500 text-sm hover:underline flex items-center gap-1">
              Voir tout <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="px-6 py-4">N° Commande</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Produits</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      Aucune commande récente
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className={`border-b last:border-0 hover:bg-gray-50 ${order.status === 'PENDING' ? 'bg-yellow-50' : ''}`}>
                      <td className="px-6 py-4 font-medium text-orange-600">{getOrderNumber(order.id)}</td>
                      <td className="px-6 py-4">{order.user?.fullName || 'Client'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.items?.map((item, i) => (
                          <div key={i}>
                            {item.product?.name} 
                            <span className="text-xs text-orange-500 ml-1">({item.product?.category?.name || 'N/A'})</span>
                          </div>
                        )).slice(0, 2)}
                        {order.items?.length > 2 && <span className="text-xs">+{order.items.length - 2} autre(s)</span>}
                      </td>
                      <td className="px-6 py-4 font-medium">{formatPrice(order.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {statusMap[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 sm:p-6 border-b flex justify-between items-center">
            <h2 className="font-bold text-base sm:text-lg">Produits populaires</h2>
            <Link to="/admin/products" className="text-orange-500 text-sm hover:underline">
              Gérer
            </Link>
          </div>
          <div className="p-4 space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Aucun produit populaire
              </p>
            ) : (
              topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-4">
                  <img
                    src={safeImage(product.images?.[0])}
                    alt={product.name}
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                    <p className="text-xs text-orange-500">{product.category?.name || 'N/A'}</p>
                  </div>
                  <p className="text-sm font-medium text-green-600">
                    {formatPrice(product.price)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
