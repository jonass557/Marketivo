import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Eye, ChevronLeft, ChevronRight, Download, Loader, CheckCircle, XCircle, Truck, Package, Clock } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import { useToast } from '../../context/ToastContext';
import AuthContext from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const Orders = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    delivered: 0
  });

  // Mapping des statuts API vers affichage
  const statusMap = {
    'PENDING': 'En attente',
    'CONFIRMED': 'Confirmé',
    'DELIVERED': 'Livré',
    'CANCELLED': 'Annulé'
  };

  const statusMapReverse = {
    'En attente': 'PENDING',
    'Confirmé': 'CONFIRMED',
    'Livré': 'DELIVERED',
    'Annulé': 'CANCELLED'
  };

  const statuses = ['Tous', 'En attente', 'Confirmé', 'Livré', 'Annulé'];

  const location = useLocation();

  // Charger les commandes (aussi lors de la navigation)
  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, location.key]);

  // Écouter les mises à jour en temps réel via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (updatedOrder) => {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
        )
      );
      
      // Mettre à jour la commande sélectionnée si ouverte
      if (selectedOrder?.id === updatedOrder.id) {
        setSelectedOrder(prev => ({ ...prev, ...updatedOrder }));
      }
    };

    const handleNewOrder = (newOrder) => {
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      toast.success(`🛒 Nouvelle commande reçue !`);
    };

    socket.on('orderUpdated', handleOrderUpdate);
    socket.on('newOrder', handleNewOrder);

    return () => {
      socket.off('orderUpdated', handleOrderUpdate);
      socket.off('newOrder', handleNewOrder);
    };
  }, [socket, selectedOrder, toast]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', 15);
      if (statusFilter && statusFilter !== 'Tous') {
        params.append('status', statusMapReverse[statusFilter]);
      }

      const { data } = await axios.get(`${API_URL}/api/orders?${params}`, config);
      setOrders(data.orders || []);
      setTotalPages(data.pages || 1);
      
      // Calculer les stats
      const allOrders = data.orders || [];
      setStats({
        total: data.total || allOrders.length,
        pending: allOrders.filter(o => o.status === 'PENDING').length,
        processing: allOrders.filter(o => o.status === 'PROCESSING' || o.status === 'CONFIRMED').length,
        delivered: allOrders.filter(o => o.status === 'DELIVERED').length
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: updatedOrder } = await axios.put(`${API_URL}/api/orders/${orderId}/status`, {
        status: statusMapReverse[newStatus]
      }, config);
      
      toast.success(`Commande ${newStatus.toLowerCase()} avec succès !`);
      
      // Mettre à jour la liste des commandes SANS rafraîchir la page
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: statusMapReverse[newStatus] }
            : order
        )
      );
      
      // Mettre à jour la commande sélectionnée si elle est ouverte
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: statusMapReverse[newStatus] }));
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-CM').format(price) + ' XAF';
  };

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
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getOrderNumber = (id) => {
    return `CMD-${id.slice(-6).toUpperCase()}`;
  };

  const filteredOrders = orders.filter(order => {
    const orderNum = getOrderNumber(order.id);
    const customerName = order.user?.fullName || '';
    const matchesSearch = orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Export orders to CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/orders?limit=1000`, config);
      const allOrders = data.orders || [];

      if (allOrders.length === 0) {
        toast.error('Aucune commande \u00e0 exporter');
        return;
      }

      // Create CSV content
      const headers = ['N\u00b0 Commande', 'Date', 'Client', 'Email', 'T\u00e9l\u00e9phone', 'Adresse', 'Total', 'Statut', 'Produits'];
      const csvContent = [
        headers.join(';'),
        ...allOrders.map(o => {
          const products = o.items?.map(i => `${i.product?.name || 'Produit'} x${i.quantity}`).join(', ') || '';
          return [
            getOrderNumber(o.id),
            new Date(o.createdAt).toLocaleDateString('fr-FR'),
            `"${o.user?.fullName || 'Client'}"`,
            o.user?.email || '',
            o.user?.phone || '',
            `"${(o.shippingAddress || '').replace(/"/g, '""')}"`,
            o.totalAmount || 0,
            statusMap[o.status] || o.status,
            `"${products.replace(/"/g, '""')}"`
          ].join(';');
        })
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${allOrders.length} commandes export\u00e9es avec succ\u00e8s`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Commandes</h1>
          <p className="text-gray-500">Gérez toutes les commandes de votre boutique</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${exporting ? 'opacity-50' : ''}`}
        >
          <Download size={18} className={exporting ? 'animate-spin' : ''} />
          {exporting ? 'Export...' : 'Exporter'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Package size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Confirmées</p>
              <p className="text-2xl font-bold text-blue-600">
                {orders.filter(o => o.status === 'CONFIRMED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Livrées</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'DELIVERED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par N° de commande ou client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status === 'Tous' ? '' : status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  (status === 'Tous' && !statusFilter) || statusFilter === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-6 py-4">N° Commande</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Produits</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Paiement</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const dateInfo = formatDate(order.createdAt);
                  return (
                    <tr key={order.id} className={`border-t hover:bg-gray-50 ${order.status === 'PENDING' ? 'bg-yellow-50' : ''}`}>
                      <td className="px-6 py-4 font-medium text-orange-600">{getOrderNumber(order.id)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{order.user?.fullName || 'Client'}</p>
                          <p className="text-sm text-gray-500">{order.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {order.items?.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-gray-600">
                              {item.product?.name || 'Produit'} x{item.quantity}
                              <span className="text-xs text-gray-400 ml-1">
                                ({item.product?.category?.name || 'N/A'})
                              </span>
                            </div>
                          ))}
                          {order.items?.length > 2 && (
                            <span className="text-xs text-gray-400">+{order.items.length - 2} autre(s)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{formatPrice(order.totalAmount)}</td>
                      <td className="px-6 py-4 text-sm">
                        {order.paymentMethod === 'cod' && '💵 Livraison'}
                        {order.paymentMethod === 'momo' && '📱 MoMo'}
                        {order.paymentMethod === 'om' && '🟠 OM'}
                        {order.paymentMethod === 'stripe' && '💳 Stripe'}
                        {order.paymentMethod === 'paypal' && '🅿️ PayPal'}
                        {order.paymentMethod === 'cinetpay' && '🌍 CinetPay'}
                        {!order.paymentMethod && '💵 Livraison'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {statusMap[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {dateInfo.date}<br />{dateInfo.time}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'Confirmé')}
                              className="p-2 hover:bg-green-50 rounded text-green-600"
                              title="Confirmer la commande"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 hover:bg-gray-100 rounded text-gray-600"
                            title="Voir détails"
                          >
                            <Eye size={18} />
                          </button>
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'Annulé')}
                              className="p-2 hover:bg-red-50 rounded text-red-600"
                              title="Annuler"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Affichage de {filteredOrders.length} commande(s)
          </p>
          <div className="flex items-center gap-2">
            <button className="p-2 border rounded hover:bg-gray-50" disabled>
              <ChevronLeft size={18} />
            </button>
            <button className="px-3 py-1 bg-orange-500 text-white rounded">1</button>
            <button className="p-2 border rounded hover:bg-gray-50">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{getOrderNumber(selectedOrder.id)}</h2>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {statusMap[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">
                    {formatDate(selectedOrder.createdAt).date} à {formatDate(selectedOrder.createdAt).time}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2 text-gray-700">👤 Client</h3>
                  <p className="font-medium">{selectedOrder.user?.fullName || 'Client'}</p>
                  <p className="text-gray-500 text-sm">{selectedOrder.user?.email}</p>
                  <p className="text-gray-500 text-sm">{selectedOrder.user?.phone || 'Téléphone non renseigné'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2 text-gray-700">📍 Adresse de livraison</h3>
                  <p className="text-gray-600">{selectedOrder.shippingAddress}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-medium mb-3">📦 Articles commandés</h3>
                <div className="border rounded-lg overflow-hidden">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border-b last:border-0">
                      <img 
                        src={item.product?.images?.[0] || 'https://via.placeholder.com/60x60?text=Produit'}
                        alt={item.product?.name}
                        className="w-14 h-14 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name || 'Produit'}</p>
                        <p className="text-sm text-gray-500">
                          Catégorie: <span className="text-orange-500">{item.product?.category?.name || 'N/A'}</span>
                        </p>
                        <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-gray-500 text-sm">Mode de paiement</p>
                  <p className="font-medium">
                    {selectedOrder.paymentMethod === 'cod' && '💵 Paiement à la livraison'}
                    {selectedOrder.paymentMethod === 'momo' && '📱 MTN Mobile Money'}
                    {selectedOrder.paymentMethod === 'om' && '🟠 Orange Money'}
                    {selectedOrder.paymentMethod === 'stripe' && '💳 Carte bancaire (Stripe)'}
                    {selectedOrder.paymentMethod === 'paypal' && '🅿️ PayPal'}
                    {selectedOrder.paymentMethod === 'cinetpay' && '🌍 CinetPay'}
                    {!selectedOrder.paymentMethod && '💵 Paiement à la livraison'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-sm">Total</p>
                  <p className="text-2xl font-bold text-orange-500">{formatPrice(selectedOrder.totalAmount)}</p>
                </div>
              </div>

              {/* Status Update Actions */}
              <div>
                <h3 className="font-medium mb-3">Mettre à jour le statut</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'Confirmé')}
                        className="flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        <CheckCircle size={16} />
                        Confirmer
                      </button>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'Annulé')}
                        className="flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <XCircle size={16} />
                        Annuler
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'Livré')}
                        className="flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <CheckCircle size={16} />
                        Marquer comme livré
                      </button>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'Annulé')}
                        className="flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <XCircle size={16} />
                        Annuler
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'DELIVERED' && (
                    <p className="col-span-full text-center text-green-600 font-medium py-2">
                      ✓ Cette commande a été livrée avec succès
                    </p>
                  )}
                  {selectedOrder.status === 'CANCELLED' && (
                    <p className="col-span-full text-center text-red-600 font-medium py-2">
                      ✗ Cette commande a été annulée
                    </p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2 border rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
