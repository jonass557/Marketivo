import React, { useState, useEffect, useContext } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Package, ShoppingCart, DollarSign, TrendingUp, Star, Eye, CreditCard, MessageCircle, ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const VendorDashboard = () => {
  const { user } = useContext(AuthContext);
  const { vendorData } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/vendors/me/stats`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setStats(data);
    } catch (err) {
      console.error('Erreur stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('fr-CM').format(amount || 0) + ' FCFA';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Produits', value: stats?.totalProducts || 0, icon: Package, color: 'blue', link: '/vendor/dashboard/products' },
    { label: 'Commandes', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'green', link: '/vendor/dashboard/orders' },
    { label: 'Revenus nets', value: formatPrice(stats?.netRevenue), icon: DollarSign, color: 'orange', link: null },
    { label: 'Note moyenne', value: (stats?.rating || 0).toFixed(1), icon: Star, color: 'yellow', link: null },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="space-y-6">
      {/* Alerte statut */}
      {vendorData?.status === 'PENDING' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <Eye size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-800">Boutique en attente de validation</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Votre boutique est en cours de vérification par notre équipe. Vous serez notifié dès qu'elle sera approuvée.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const content = (
            <div className="bg-white rounded-xl p-4 sm:p-5 border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                  <Icon size={20} />
                </div>
                {card.link && <ArrowUpRight size={16} className="text-gray-400" />}
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
          return card.link ? (
            <Link key={i} to={card.link}>{content}</Link>
          ) : (
            <div key={i}>{content}</div>
          );
        })}
      </div>

      {/* Abonnement + Actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abonnement actuel */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-600" /> Abonnement
            </h3>
            <Link to="/vendor/dashboard/subscription" className="text-blue-600 text-sm font-medium hover:underline">
              Gérer
            </Link>
          </div>
          {stats?.subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Plan actuel</span>
                <span className="font-semibold text-sm">{stats.subscription.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Commission</span>
                <span className="font-semibold text-sm">{stats.subscription.commission}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Produits max</span>
                <span className="font-semibold text-sm">
                  {stats.subscription.maxProducts === 0 ? 'Illimité' : stats.subscription.maxProducts}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Expire le</span>
                <span className="font-semibold text-sm">
                  {new Date(stats.subscription.endDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucun abonnement actif</p>
          )}
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-gray-800 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/vendor/dashboard/products/new"
              className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <Package size={24} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Ajouter produit</span>
            </Link>
            <Link to="/vendor/dashboard/orders"
              className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
              <ShoppingCart size={24} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">Voir commandes</span>
            </Link>
            <Link to="/vendor/dashboard/messages"
              className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
              <MessageCircle size={24} className="text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Messages</span>
            </Link>
            <Link to="/vendor/dashboard/subscription"
              className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
              <TrendingUp size={24} className="text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Upgrade plan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Résumé commandes */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-bold text-gray-800 mb-4">Résumé des commandes</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-yellow-50 rounded-xl">
            <p className="text-2xl font-bold text-yellow-600">{stats?.pendingOrders || 0}</p>
            <p className="text-xs text-yellow-700 mt-1">En attente</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{stats?.deliveredOrders || 0}</p>
            <p className="text-xs text-green-700 mt-1">Livrées</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">{formatPrice(stats?.totalCommission)}</p>
            <p className="text-xs text-red-700 mt-1">Commission totale</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
