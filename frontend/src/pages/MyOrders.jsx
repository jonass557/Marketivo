import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, ChevronRight, Calendar, Clock, CheckCircle, Truck, XCircle, Eye, Star, X, Loader } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

const MyOrders = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const { formatPrice } = useSettings();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState([]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      const { data } = await axios.get(`${API_URL}/api/orders/myorders`, config);
      setOrders(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchOrders();
  }, [user, location.key]);

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (updatedOrder) => {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
        )
      );
      
      // Notification toast pour le client
      const statusMessages = {
        CONFIRMED: '✅ Votre commande a été confirmée !',
        DELIVERED: '🎉 Votre commande a été livrée !',
        CANCELLED: '❌ Votre commande a été annulée.'
      };
      
      if (statusMessages[updatedOrder.status]) {
        toast.success(statusMessages[updatedOrder.status]);
      }
    };

    socket.on('orderUpdated', handleOrderUpdate);

    return () => {
      socket.off('orderUpdated', handleOrderUpdate);
    };
  }, [socket, toast]);

  const openReviewModal = (orderId, productId, productName) => {
    setReviewModal({ orderId, productId, productName });
    setReviewData({ rating: 5, comment: '' });
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    
    try {
      setReviewLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${API_URL}/api/reviews`, {
        productId: reviewModal.productId,
        orderId: reviewModal.orderId,
        rating: reviewData.rating,
        comment: reviewData.comment
      }, config);
      
      toast.success('Merci pour votre avis !');
      setReviewedProducts([...reviewedProducts, reviewModal.productId]);
      setReviewModal(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis');
    } finally {
      setReviewLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="text-yellow-500" size={20} />;
      case 'PROCESSING':
        return <Package className="text-blue-500" size={20} />;
      case 'SHIPPED':
        return <Truck className="text-purple-500" size={20} />;
      case 'DELIVERED':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'CANCELLED':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: 'En attente',
      PROCESSING: 'En traitement',
      SHIPPED: 'Expédié',
      DELIVERED: 'Livré',
      CANCELLED: 'Annulé'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Package size={80} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Connectez-vous</h1>
          <p className="text-gray-500 mb-6">Pour voir vos commandes</p>
          <Link
            to="/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-medium"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="text-orange-500 hover:underline">Mon compte</Link>
          <ChevronRight size={16} className="text-gray-400" />
          <span className="text-gray-800 font-medium">Mes commandes</span>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-800">Mes commandes</h1>
            <p className="text-gray-500 mt-1">Historique de toutes vos commandes</p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Chargement...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={80} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune commande</h2>
              <p className="text-gray-500 mb-6">Vous n'avez pas encore passé de commande</p>
              <Link
                to="/shop"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-medium"
              >
                Découvrir nos produits
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Infos commande */}
                    <div className="flex items-start gap-4">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="font-semibold text-gray-800">
                          Commande #{order.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar size={14} />
                          {formatDate(order.createdAt)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {order.items?.length || 0} article(s)
                        </p>
                      </div>
                    </div>

                    {/* Total et statut */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-800">{formatPrice(order.total)}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Eye size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Détails de la commande */}
                  {selectedOrder?.id === order.id && (
                    <div className="mt-6 pt-6 border-t bg-gray-50 -mx-6 px-6 pb-2">
                      <h3 className="font-semibold mb-4">Détails de la commande</h3>
                      
                      {/* Articles */}
                      <div className="space-y-3 mb-4">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex items-center gap-4 bg-white p-3 rounded-lg">
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                              {item.product?.images?.[0] ? (
                                <img 
                                  src={item.product.images[0]} 
                                  alt={item.product.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{item.product?.name || 'Produit'}</p>
                              <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                            </div>
                            <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Adresse de livraison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-4 rounded-lg">
                          <p className="font-semibold mb-2">Adresse de livraison</p>
                          <p className="text-gray-600">{order.shippingAddress}</p>
                          <p className="text-gray-600">{order.city}</p>
                          <p className="text-gray-600">{order.phone}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <p className="font-semibold mb-2">💳 Mode de paiement</p>
                          <p className="text-gray-600">
                            {order.paymentMethod === 'cod' && '💵 Paiement à la livraison'}
                            {order.paymentMethod === 'momo' && '📱 MTN Mobile Money'}
                            {order.paymentMethod === 'om' && '🟠 Orange Money'}
                            {order.paymentMethod === 'stripe' && '💳 Carte bancaire (Stripe)'}
                            {order.paymentMethod === 'paypal' && '🅿️ PayPal'}
                            {order.paymentMethod === 'cinetpay' && '🌍 CinetPay'}
                            {!order.paymentMethod && '💵 Paiement à la livraison'}
                          </p>
                        </div>
                      </div>

                      {/* Bouton pour laisser un avis si commande livrée */}
                      {order.status === 'DELIVERED' && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-semibold mb-3 text-green-600">✓ Commande livrée - Donnez votre avis !</p>
                          <div className="flex flex-wrap gap-2">
                            {order.items?.map((item, index) => (
                              <button
                                key={index}
                                onClick={() => openReviewModal(order.id, item.product?.id, item.product?.name)}
                                disabled={reviewedProducts.includes(item.product?.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                  reviewedProducts.includes(item.product?.id)
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                }`}
                              >
                                <Star size={14} />
                                {reviewedProducts.includes(item.product?.id) ? 'Avis envoyé' : `Avis: ${item.product?.name?.substring(0, 20)}...`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal pour laisser un avis */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReviewModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Donner votre avis</h2>
                <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">{reviewModal.productName}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Note</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={star <= reviewData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {reviewData.rating === 5 && 'Excellent !'}
                  {reviewData.rating === 4 && 'Très bien'}
                  {reviewData.rating === 3 && 'Bien'}
                  {reviewData.rating === 2 && 'Moyen'}
                  {reviewData.rating === 1 && 'Décevant'}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium mb-2">Commentaire (optionnel)</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="Partagez votre expérience avec ce produit..."
                  rows={4}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={submitReview}
                disabled={reviewLoading}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reviewLoading ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  <>
                    <Star size={18} />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
