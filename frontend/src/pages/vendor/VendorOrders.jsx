import React, { useState, useEffect, useContext } from 'react';
import { ShoppingCart, Clock, CheckCircle, Truck, XCircle, Eye } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const VendorOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => { fetchOrders(); }, [page, filter]);

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/vendors/me/orders?status=${filter}&page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setOrders(data.orders || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p) => new Intl.NumberFormat('fr-CM').format(p) + ' FCFA';
  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const statusConfig = {
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    CONFIRMED: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    PROCESSING: { label: 'En cours', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
    SHIPPED: { label: 'Expédiée', color: 'bg-purple-100 text-purple-700', icon: Truck },
    DELIVERED: { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const filters = [
    { value: '', label: 'Toutes' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'CONFIRMED', label: 'Confirmées' },
    { value: 'DELIVERED', label: 'Livrées' },
    { value: 'CANCELLED', label: 'Annulées' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Mes Commandes</h2>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600">Aucune commande</h3>
          <p className="text-gray-400 text-sm mt-1">Vos commandes apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const status = statusConfig[order.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            return (
              <div key={order._id || order.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.color}`}>
                      <StatusIcon size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        Commande #{(order._id || order.id)?.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.user?.fullName} • {formatDate(order.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {order.items?.map((item, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {item.product?.name || 'Produit'} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="font-bold text-sm text-gray-800">{formatPrice(order.totalAmount)}</span>
                    <button onClick={() => setSelectedOrder(selectedOrder === order._id ? null : order._id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <Eye size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Détails expandables */}
                {selectedOrder === (order._id || order.id) && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Client:</span>
                        <span className="ml-2 font-medium">{order.user?.fullName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Téléphone:</span>
                        <span className="ml-2 font-medium">{order.phone || order.user?.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Adresse:</span>
                        <span className="ml-2 font-medium">{order.shippingAddress}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Paiement:</span>
                        <span className="ml-2 font-medium">{order.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorOrders;
