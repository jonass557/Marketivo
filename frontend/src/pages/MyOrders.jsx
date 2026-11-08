import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Package, ChevronRight, Calendar, Clock, CheckCircle, Truck, XCircle,
  Eye, Star, X, Loader, Download, ExternalLink, Zap, FileText, Sparkles, AlertCircle,
  Printer, ShieldCheck, Check, Plane
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'digital'
  const [orders, setOrders] = useState([]);
  const [digitalDownloads, setDigitalDownloads] = useState([]);
  const [digitalLoading, setDigitalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState([]);

  // Livraisons & Factures (Cahier des charges 4.6 & 4.7)
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [downloadingItem, setDownloadingItem] = useState(null);

  const handleConfirmDelivery = async (orderId, deliveryCode) => {
    try {
      setConfirmingOrder(orderId);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${API_URL}/api/orders/${orderId}/confirm-delivery`, {
        deliveryCode
      }, config);
      toast.success('Livraison confirmée avec succès ! Les fonds ont été libérés.');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la confirmation de livraison');
    } finally {
      setConfirmingOrder(null);
    }
  };

  const handleOpenInvoice = async (orderId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/orders/${orderId}/invoice`, config);
      setInvoiceData(data);
      setInvoiceModal(true);
    } catch (err) {
      toast.error('Erreur chargement de la facture');
    }
  };

  const handleSecureDownload = async (orderId, productId, fallbackUrl) => {
    try {
      setDownloadingItem(`${orderId}_${productId}`);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/downloads/token/${orderId}/${productId}`, config);
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else if (fallbackUrl) {
        window.open(fallbackUrl, '_blank');
      }
    } catch (err) {
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank');
      } else {
        toast.error(err.response?.data?.message || 'Erreur lors de la génération du lien sécurisé');
      }
    } finally {
      setDownloadingItem(null);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/orders/myorders`, config);
      setOrders(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDigitalDownloads = async () => {
    if (!user) return;
    try {
      setDigitalLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/orders/my-digital-downloads`, config);
      setDigitalDownloads(data || []);
    } catch (error) {
      console.error('Erreur téléchargements digitaux:', error);
    } finally {
      setDigitalLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchOrders();
    fetchDigitalDownloads();
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

      const statusMessages = {
        CONFIRMED: '✅ Votre commande a été confirmée !',
        DELIVERED: '🎉 Votre commande a été livrée !',
        CANCELLED: '❌ Votre commande a été annulée.'
      };

      if (statusMessages[updatedOrder.status]) {
        toast.success(statusMessages[updatedOrder.status]);
      }
      fetchDigitalDownloads();
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
      PROCESSING: 'En cours',
      SHIPPED: 'Expédié',
      DELIVERED: 'Livré / Disponible',
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
          <p className="text-gray-500 mb-6">Pour voir vos commandes et produits digitaux</p>
          <Link
            to="/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/profile" className="text-orange-500 hover:underline">Mon compte</Link>
          <ChevronRight size={16} className="text-gray-400" />
          <span className="text-gray-800 font-medium">Mes Achats & Commandes</span>
        </div>

        {/* Navigation Tabs (Hybride Chariow + Jumia) */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
              activeTab === 'orders'
                ? 'bg-orange-500 text-white shadow-orange-200'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            <Package size={18} />
            Mes Commandes ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('digital')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
              activeTab === 'digital'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200'
                : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <Zap size={18} />
            ⚡ Bibliothèque Digitale ({digitalDownloads.length})
          </button>
        </div>

        {/* TAB 1: MES COMMANDES */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b">
              <h1 className="text-xl font-bold text-gray-900">Historique des commandes</h1>
              <p className="text-gray-500 text-xs mt-1">Suivez l'état de préparation, d'expédition ou accédez à vos achats.</p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 text-sm">Chargement des commandes...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package size={60} className="mx-auto text-gray-300 mb-4" />
                <h2 className="text-lg font-bold text-gray-800 mb-1">Aucune commande pour le moment</h2>
                <p className="text-gray-500 text-sm mb-6">Explorez la marketplace pour commander vos premiers articles.</p>
                <Link
                  to="/shop"
                  className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm"
                >
                  Découvrir la boutique
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <div key={order.id} className="p-5 hover:bg-gray-50/60 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Infos commande */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getStatusIcon(order.status)}</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 text-sm">
                              {order.orderNumber || `Commande #${order.id.slice(-8).toUpperCase()}`}
                            </p>
                            {order.isDigitalOnly ? (
                              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ⚡ Digital
                              </span>
                            ) : (
                              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                📦 Physique
                              </span>
                            )}
                            {order.escrowStatus && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                order.escrowStatus === 'HELD'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : order.escrowStatus === 'RELEASED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {order.escrowStatus === 'HELD' && '🛡️ Séquestre sécurisé'}
                                {order.escrowStatus === 'RELEASED' && '✅ Séquestre libéré'}
                                {order.escrowStatus === 'REFUNDED' && '↩️ Remboursé'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar size={13} />
                            {formatDate(order.createdAt)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {order.items?.length || 0} article(s) • {order.deliveryMethod === 'EXPRESS' ? '⚡ Livraison Express' : order.deliveryMethod === 'PICKUP' ? '🏪 Point Relais' : '🚚 Livraison Standard'}
                          </p>
                        </div>
                      </div>

                      {/* Total et statut */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-base text-gray-900">{formatPrice(order.total)}</p>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenInvoice(order.id)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border"
                            title="Imprimer la facture"
                          >
                            <Printer size={17} />
                          </button>
                          <button
                            onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                            className="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors border"
                            title="Voir les détails"
                          >
                            <Eye size={17} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Détails déroulants */}
                    {selectedOrder?.id === order.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/80 rounded-xl p-4">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600 mb-3">Articles de la commande</h4>

                        {/* Articles */}
                        <div className="space-y-3 mb-4">
                          {order.items?.map((item, index) => {
                            const isDigital = item.productType === 'DIGITAL' || item.product?.productType === 'DIGITAL';
                            const fileUrl = item.digitalFileUrl || item.product?.digitalFileUrl;
                            const accessLink = item.digitalAccessLink || item.product?.digitalAccessLink;
                            const instructions = item.digitalInstructions || item.product?.digitalInstructions;

                            return (
                              <div key={index} className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                    {item.product?.images?.[0] ? (
                                      <img
                                        src={item.product.images[0]}
                                        alt={item.product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xl">
                                        {isDigital ? '⚡' : '📦'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-sm text-gray-900 truncate">{item.product?.name || 'Produit'}</p>
                                      {isDigital && (
                                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                          Digital
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">Quantité: {item.quantity}</p>
                                  </div>
                                  <p className="font-bold text-sm text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                                </div>

                                {/* BLOC TÉLÉCHARGEMENT DIRECT SI DIGITAL */}
                                {isDigital && (
                                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="text-xs text-purple-900">
                                      <span className="font-bold flex items-center gap-1">
                                        <Sparkles size={13} className="text-purple-600" /> Accès immédiat Chariow
                                      </span>
                                      {instructions && <p className="text-[11px] text-purple-700 mt-0.5">{instructions}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {fileUrl && (
                                        <a
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          download
                                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                                        >
                                          <Download size={13} /> Télécharger
                                        </a>
                                      )}
                                      {accessLink && (
                                        <a
                                          href={accessLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="bg-white hover:bg-gray-50 text-purple-700 border border-purple-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                        >
                                          <ExternalLink size={13} /> Ouvrir le lien
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Code secret de confirmation de livraison (Cahier des charges 4.7) */}
                        {!order.isDigitalOnly && order.deliveryCode && order.status !== 'CANCELLED' && (
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3.5 my-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                            <div>
                              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wider">
                                <ShieldCheck size={16} className="text-amber-600" />
                                Code secret de confirmation de livraison :
                                <span className="font-mono text-sm font-extrabold text-amber-950 bg-white px-2.5 py-0.5 rounded border border-amber-300 tracking-wider">
                                  {order.deliveryCode}
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-700 mt-1">
                                {order.status === 'DELIVERED'
                                  ? '✅ Ce code a été validé. La livraison a été confirmée.'
                                  : '⚠️ Donnez ce code secret au livreur UNIQUEMENT après avoir vérifié et reçu votre colis.'}
                              </p>
                            </div>
                            {order.status !== 'DELIVERED' && (
                              <button
                                onClick={() => handleConfirmDelivery(order.id, order.deliveryCode)}
                                disabled={confirmingOrder === order.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm flex-shrink-0 disabled:opacity-50"
                              >
                                {confirmingOrder === order.id ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                                Confirmer la réception
                              </button>
                            )}
                          </div>
                        )}

                        {/* Adresse & Paiement */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="font-bold text-gray-700 mb-1">
                              {order.isDigitalOnly ? '📧 Coordonnées numériques' : '📍 Adresse de livraison'}
                            </p>
                            <p className="text-gray-600">{order.shippingAddress || 'Livraison numérique instantanée'}</p>
                            <p className="text-gray-600">{order.city}</p>
                            <p className="text-gray-600">{order.phone}</p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Mode: {order.deliveryMethod === 'EXPRESS' ? '⚡ Express' : order.deliveryMethod === 'PICKUP' ? '🏪 Point Relais' : '🚚 Standard'}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-gray-700 mb-1">💳 Mode de paiement</p>
                              <button
                                onClick={() => handleOpenInvoice(order.id)}
                                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                              >
                                <Printer size={12} /> Facture PDF
                              </button>
                            </div>
                            <p className="text-gray-600 font-medium">
                              {order.paymentMethod === 'ikeepay' && '📱 Mobile Money (IKeepay)'}
                              {order.paymentMethod === 'momo' && '🟡 MTN Mobile Money'}
                              {order.paymentMethod === 'om' && '🟠 Orange Money'}
                              {order.paymentMethod === 'cod' && '💵 Paiement à la livraison'}
                              {order.paymentMethod === 'stripe' && '💳 Carte bancaire'}
                              {!order.paymentMethod && '📱 Mobile Money'}
                            </p>
                            <p className="text-gray-500 mt-1">Statut: <span className="font-semibold text-gray-800">{getStatusLabel(order.status)}</span></p>
                            {order.escrowStatus && (
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Séquestre : <span className="font-semibold text-amber-700">{order.escrowStatus === 'HELD' ? 'Fonds protégés' : order.escrowStatus === 'RELEASED' ? 'Fonds libérés' : 'Remboursé'}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dossier de transit international */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            to="/my-shipments"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 transition"
                          >
                            <Plane size={13} /> Suivre les dossiers de transit international (Chine ➔ Cameroun)
                          </Link>
                        </div>

                        {/* Avis si commande livrée */}
                        {order.status === 'DELIVERED' && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-bold text-emerald-700 mb-2">✓ Commande terminée - Laissez une évaluation :</p>
                            <div className="flex flex-wrap gap-2">
                              {order.items?.map((item, index) => (
                                <button
                                  key={index}
                                  onClick={() => openReviewModal(order.id, item.product?.id, item.product?.name)}
                                  disabled={reviewedProducts.includes(item.product?.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    reviewedProducts.includes(item.product?.id)
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                                  }`}
                                >
                                  <Star size={12} />
                                  {reviewedProducts.includes(item.product?.id) ? 'Avis envoyé' : `Noter : ${item.product?.name?.substring(0, 18)}...`}
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
        )}

        {/* TAB 2: BIBLIOTHÈQUE DIGITALE (Modèle Chariow) */}
        {activeTab === 'digital' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <span className="p-2 bg-white/20 rounded-xl"><Zap size={22} className="text-amber-300" /></span>
                <div>
                  <h2 className="text-xl font-bold">Votre Bibliothèque Digitale (Modèle Chariow)</h2>
                  <p className="text-xs text-purple-200">Accès permanent et illimité à tous vos ebooks, templates, formations et fichiers achetés.</p>
                </div>
              </div>
            </div>

            {digitalLoading ? (
              <div className="bg-white rounded-2xl p-12 text-center border">
                <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 text-sm">Chargement de votre bibliothèque...</p>
              </div>
            ) : digitalDownloads.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border">
                <FileText size={60} className="mx-auto text-purple-300 mb-3" />
                <h3 className="font-bold text-gray-800 text-base mb-1">Aucun produit digital dans votre bibliothèque</h3>
                <p className="text-gray-500 text-xs mb-5">Achetez un ebook, une formation ou un template et recevez l'accès instantanément.</p>
                <Link
                  to="/shop?type=DIGITAL"
                  className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-colors"
                >
                  Explorer les produits digitaux
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {digitalDownloads.map((item, index) => (
                  <div key={index} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-purple-50 flex-shrink-0 border border-purple-100">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">⚡</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full mb-1">
                            {item.digitalType || 'PRODUIT DIGITAL'}
                          </span>
                          <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">{item.name}</h4>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Acheté le {new Date(item.purchasedAt).toLocaleDateString('fr-FR')} • {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>

                      {item.digitalInstructions && (
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs text-gray-700 space-y-1">
                          <span className="font-bold text-gray-900 flex items-center gap-1">
                            <Sparkles size={12} className="text-purple-600" /> Instructions d'accès :
                          </span>
                          <p className="text-[11px] leading-relaxed">{item.digitalInstructions}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions de téléchargement / Accès */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      {item.digitalFileUrl && (
                        <a
                          href={item.digitalFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={item.digitalFileName || true}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Download size={14} />
                          Télécharger ({item.digitalFileName || 'Fichier'})
                        </a>
                      )}
                      {item.digitalAccessLink && (
                        <a
                          href={item.digitalAccessLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink size={14} />
                          Accéder en ligne
                        </a>
                      )}
                      {!item.digitalFileUrl && !item.digitalAccessLink && (
                        <div className="w-full text-center py-2 text-xs text-gray-400 italic">
                          Fichier disponible auprès du vendeur
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReviewModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Donner votre avis</h2>
                <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={22} />
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">{reviewModal.productName}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2">Note sur 5 étoiles</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={star <= reviewData.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">Commentaire (optionnel)</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="Partagez votre avis sur ce produit..."
                  rows={3}
                  className="w-full p-3 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 py-2 border rounded-xl hover:bg-gray-100 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                onClick={submitReview}
                disabled={reviewLoading}
                className="flex-1 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reviewLoading ? <Loader className="animate-spin" size={16} /> : 'Envoyer l\'avis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal (Cahier des charges 4.6) */}
      {invoiceModal && invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-fade-in">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">FACTURE D'ACHAT</h2>
                <p className="text-xs text-orange-600 font-mono font-bold">{invoiceData.invoiceNumber}</p>
                <p className="text-xs text-gray-400">Date : {new Date(invoiceData.date).toLocaleDateString('fr-FR')}</p>
              </div>
              <button onClick={() => setInvoiceModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Client & Vendeur */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-bold text-gray-700 mb-1">ACHETEUR</p>
                <p className="font-semibold text-gray-900">{invoiceData.customer?.fullName || 'Client'}</p>
                <p className="text-gray-600">{invoiceData.customer?.email}</p>
                <p className="text-gray-600">{invoiceData.customer?.phone}</p>
                <p className="text-gray-600">{invoiceData.shippingAddress}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-700 mb-1">PLATEFORME</p>
                <p className="font-semibold text-gray-900">{invoiceData.store?.name || 'Marketivo'}</p>
                <p className="text-gray-600">{invoiceData.store?.email}</p>
                <p className="text-gray-600">{invoiceData.store?.phone}</p>
                <p className="text-gray-600 font-medium">Mode: {invoiceData.paymentMethod?.toUpperCase()}</p>
              </div>
            </div>

            {/* Tableau des articles */}
            <table className="w-full text-xs mb-6">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-center">Qté</th>
                  <th className="py-2 text-right">Prix Unitaire</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoiceData.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium">{it.name}</td>
                    <td className="py-2 text-center">{it.quantity}</td>
                    <td className="py-2 text-right">{formatPrice(it.unitPrice)}</td>
                    <td className="py-2 text-right font-bold">{formatPrice(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux facture */}
            <div className="border-t pt-3 space-y-1 text-xs text-right max-w-xs ml-auto mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Sous-total :</span>
                <span>{formatPrice(invoiceData.subtotal)}</span>
              </div>
              {invoiceData.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Remise ({invoiceData.couponCode || 'Promo'}) :</span>
                  <span>-{formatPrice(invoiceData.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Frais de livraison :</span>
                <span>{formatPrice(invoiceData.shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 border-t pt-1">
                <span>TOTAL RÉGLÉ :</span>
                <span className="text-orange-600">{formatPrice(invoiceData.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer size={14} /> Imprimer la Facture
              </button>
              <button
                type="button"
                onClick={() => setInvoiceModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-gray-50 text-gray-700"
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

export default MyOrders;
