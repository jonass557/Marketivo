import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, MapPin, Phone, CreditCard, Truck, CheckCircle, ArrowLeft, MessageCircle, Loader, ExternalLink, Star, X, Smartphone, AlertCircle, RefreshCw, Zap, Download, Tag, Check, ShieldCheck, Printer, FileText, Plane, Ship } from 'lucide-react';
import CartContext from '../context/CartContext';
import AuthContext from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import axios from 'axios';
import API_URL from '../config/api';
import { FALLBACK_IMAGE_SVG, safeImage } from '../data/defaultData';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { formatPrice, settings } = useSettings();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [createdOrderId, setCreatedOrderId] = useState(null);

  // Mode de livraison physique (Cahier des charges 4.5)
  const [deliveryMethod, setDeliveryMethod] = useState('STANDARD'); // 'STANDARD' | 'EXPRESS' | 'PICKUP'

  // Code promo / Coupon
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Facture modale
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  
  // État spécifique pour le paiement Mobile Money (iKeepay)
  const [ikeepayDetails, setIkeepayDetails] = useState({
    country: 'CI',
    operator: 'ORANGE',
    phone: '',
    otp: ''
  });
  const [ikeepayModalOpen, setIkeepayModalOpen] = useState(false);
  const [ikeepayStatus, setIkeepayStatus] = useState('idle'); // 'idle' | 'pending' | 'success' | 'failed' | 'timeout'
  const [ikeepayReference, setIkeepayReference] = useState('');
  const [ikeepayCheckLoading, setIkeepayCheckLoading] = useState(false);

  // État pour le modal d'avis
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProductIndex, setReviewProductIndex] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState([]);
  const [orderedProducts, setOrderedProducts] = useState([]);

  // Extension internationale & Transitaires (Section 15 & 16)
  const [forwardersList, setForwardersList] = useState([]);
  const [selectedForwarderId, setSelectedForwarderId] = useState('');
  const [isExternalForwarder, setIsExternalForwarder] = useState(false);
  const [externalForwarderDetails, setExternalForwarderDetails] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    warehouseAddress: '',
    instructions: ''
  });
  const [forwarderTransportMode, setForwarderTransportMode] = useState('AIR_FREIGHT');
  const [createdShipmentId, setCreatedShipmentId] = useState(null);
  
  // Charger les données sauvegardées depuis localStorage
  const getSavedFormData = () => {
    try {
      const saved = localStorage.getItem('checkoutFormData');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erreur chargement formData:', e);
    }
    return null;
  };

  const savedData = getSavedFormData();
  
  const [formData, setFormData] = useState({
    fullName: savedData?.fullName || user?.fullName || '',
    email: savedData?.email || user?.email || '',
    phone: savedData?.phone || '',
    address: savedData?.address || '',
    city: savedData?.city || 'Douala',
    notes: savedData?.notes || '',
    paymentMethod: savedData?.paymentMethod || ''
  });

  // Hybride Chariow + Jumia : détection des produits digitaux
  const isDigitalOnly = cartItems.length > 0 && cartItems.every(item => item.productType === 'DIGITAL');
  const hasDigitalItems = cartItems.some(item => item.productType === 'DIGITAL');
  const hasInternationalItems = cartItems.some(item => 
    (item.originCountry && item.originCountry !== 'Cameroun') || 
    item.requiresForwarder
  );

  // Charger le coupon sauvegardé depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('appliedCoupon');
      if (saved) {
        setAppliedCoupon(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Erreur chargement coupon:', e);
    }
  }, []);

  const handleApplyCoupon = async (e) => {
    e?.preventDefault();
    if (!couponCodeInput.trim()) return;
    try {
      setCouponLoading(true);
      setCouponError('');
      const { data } = await axios.post(`${API_URL}/api/coupons/validate`, {
        code: couponCodeInput.trim(),
        orderAmount: cartTotal
      });
      if (data?.valid) {
        const cData = {
          code: data.coupon.code,
          discountAmount: data.coupon.discountAmount,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue
        };
        setAppliedCoupon(cData);
        localStorage.setItem('appliedCoupon', JSON.stringify(cData));
        toast.success(`Code promo "${data.coupon.code}" appliqué ! (-${formatPrice(data.coupon.discountAmount)})`);
        setCouponCodeInput('');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Code promo invalide';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    localStorage.removeItem('appliedCoupon');
    toast.info('Code promo retiré');
  };

  const handleViewInvoice = async (orderId) => {
    if (!orderId) return;
    try {
      const config = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};
      const { data } = await axios.get(`${API_URL}/api/orders/${orderId}/invoice`, config);
      setInvoiceData(data);
      setInvoiceModal(true);
    } catch (e) {
      toast.error('Erreur lors du chargement de la facture');
    }
  };

  // Calcul frais de livraison dynamique selon le mode choisi (Cahier des charges 4.5)
  const getCalculatedShipping = () => {
    if (isDigitalOnly) return 0;
    if (deliveryMethod === 'PICKUP') return 0;
    const base = settings?.defaultShippingFee || 2000;
    if (cartTotal >= 50000) return deliveryMethod === 'EXPRESS' ? 1500 : 0;
    if (deliveryMethod === 'EXPRESS') return base + 1500;
    return base;
  };

  const enableShipping = !isDigitalOnly && settings?.enableShipping !== false;
  const shippingCost = enableShipping ? getCalculatedShipping() : 0;
  const subtotal = cartTotal;
  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotal) : 0;
  const total = Math.max(0, subtotal - discountAmount) + shippingCost;

  // Sauvegarder les données du formulaire dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('checkoutFormData', JSON.stringify(formData));
  }, [formData]);

  // Charger les moyens de paiement et transitaires disponibles
  useEffect(() => {
    fetchPaymentMethods();
    fetchForwardersList();
  }, []);

  const fetchForwardersList = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/forwarders`);
      setForwardersList(data || []);
      if (data && data.length > 0 && !selectedForwarderId) {
        setSelectedForwarderId(data[0]._id);
      }
    } catch (error) {
      console.error('Erreur chargement transitaires:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/payments/methods`);
      setPaymentMethods(data);
      // Sélectionner le premier moyen de paiement par défaut
      if (data.length > 0 && !formData.paymentMethod) {
        setFormData(prev => ({ ...prev, paymentMethod: data[0].id }));
      }
    } catch (error) {
      console.error('Erreur chargement moyens de paiement:', error);
    }
  };

  const handleChange = (e) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation des informations de livraison
    if (!formData.fullName.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }
    if (!formData.email.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }
    if (!isDigitalOnly && !formData.address.trim()) {
      setError('Veuillez entrer votre adresse de livraison');
      return;
    }
    if (!isDigitalOnly && !formData.city) {
      setError('Veuillez sélectionner votre ville');
      return;
    }
    if (!formData.paymentMethod) {
      setError('Veuillez sélectionner un moyen de paiement');
      return;
    }

    setLoading(true);

    try {
      const orderItems = cartItems.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        productType: item.productType || 'PHYSICAL',
        digitalType: item.digitalType,
        digitalFileUrl: item.digitalFileUrl,
        digitalFileName: item.digitalFileName,
        digitalAccessLink: item.digitalAccessLink,
        digitalInstructions: item.digitalInstructions,
        selectedVariant: item.selectedVariant || null
      }));

      const config = user?.token ? {
        headers: { Authorization: `Bearer ${user.token}` }
      } : {};

      const finalAddress = isDigitalOnly ? (formData.address?.trim() || 'Livraison Numérique Instantanée') : formData.address;
      const finalCity = isDigitalOnly ? (formData.city || 'Numérique') : formData.city;

      // Créer la commande (Hybride Chariow + Jumia avec commande invité autorisée pour digital)
      const { data } = await axios.post(`${API_URL}/api/orders`, {
        items: orderItems,
        shippingAddress: finalAddress,
        city: finalCity,
        phone: formData.phone,
        paymentMethod: formData.paymentMethod,
        shippingCost,
        deliveryMethod: isDigitalOnly ? 'DIGITAL' : deliveryMethod,
        couponCode: appliedCoupon?.code,
        notes: formData.notes,
        guestCheckout: !user,
        guestEmail: !user ? formData.email : undefined,
        guestPhone: !user ? formData.phone : undefined
      }, config);

      const orderId = data.order?.id;
      setCreatedOrderId(orderId);

      // Création automatique du dossier d'expédition tripartite si la commande contient des articles internationaux (Section 16.3)
      if (hasInternationalItems && user) {
        try {
          const { data: shpData } = await axios.post(`${API_URL}/api/shipments`, {
            orderId,
            forwarderId: !isExternalForwarder ? selectedForwarderId : undefined,
            isExternalForwarder: isExternalForwarder,
            externalForwarderDetails: isExternalForwarder ? externalForwarderDetails : undefined,
            transportMode: forwarderTransportMode,
            destinationAddress: {
              fullName: formData.fullName,
              phone: formData.phone,
              city: formData.city,
              street: formData.address,
              notes: formData.notes
            }
          }, config);
          if (shpData?.shipment?._id) {
            setCreatedShipmentId(shpData.shipment._id);
          }
        } catch (shpErr) {
          console.error("Erreur création dossier d'expédition:", shpErr);
        }
      }

      // Sauvegarder les produits commandés pour les avis
      setOrderedProducts(cartItems.map(item => ({ id: item.id, name: item.name, image: item.images?.[0] || item.image, productType: item.productType, digitalFileUrl: item.digitalFileUrl, digitalAccessLink: item.digitalAccessLink })));
      
      // Traiter le paiement selon la méthode choisie
      if (formData.paymentMethod === 'ikeepay') {
        // Paiement Mobile Money direct iKeepay (H2H)
        await handleIkeepayPayment(orderId, total);
      } else if (formData.paymentMethod === 'cod' || formData.paymentMethod === 'momo' || formData.paymentMethod === 'om') {
        // Paiement à la livraison ou Mobile Money local - Succès direct
        setOrderSuccess(data);
        clearCart();
        localStorage.removeItem('checkoutFormData'); // Nettoyer après commande réussie
        toast.success('Commande passée avec succès !');
        // Afficher le modal d'avis après un court délai
        setTimeout(() => setShowReviewModal(true), 1500);
      } else if (formData.paymentMethod === 'stripe') {
        // Redirection vers Stripe
        await handleStripePayment(orderId, total);
      } else if (formData.paymentMethod === 'paypal') {
        // Redirection vers PayPal
        await handlePayPalPayment(orderId, total);
      } else if (formData.paymentMethod === 'cinetpay') {
        // Redirection vers CinetPay
        await handleCinetPayPayment(orderId, total);
      } else {
        setOrderSuccess(data);
        clearCart();
        localStorage.removeItem('checkoutFormData'); // Nettoyer après commande réussie
        toast.success('Commande passée avec succès !');
        setTimeout(() => setShowReviewModal(true), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
      toast.error('Échec de la commande');
    } finally {
      setLoading(false);
    }
  };

  // Paiement Stripe
  const handleStripePayment = async (orderId, amount) => {
    try {
      setPaymentLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      const { data } = await axios.post(`${API_URL}/api/payments/stripe/create-intent`, {
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        orderId
      }, config);

      // Charger Stripe.js dynamiquement
      const stripeMethod = paymentMethods.find(m => m.id === 'stripe');
      if (!stripeMethod?.publicKey) {
        throw new Error('Stripe non configuré');
      }

      // Rediriger vers une page de paiement Stripe ou utiliser Stripe Elements
      // Pour simplifier, on utilise Checkout Session
      toast.info('Redirection vers Stripe...');
      
      // Stocker les infos pour la page de retour
      localStorage.setItem('pendingOrder', JSON.stringify({ orderId, paymentIntentId: data.paymentIntentId }));
      
      // Pour une implémentation complète, utiliser @stripe/stripe-js
      // Ici on simule le succès pour la démo
      clearCart();
      setOrderSuccess({ order: { id: orderId }, message: 'Paiement Stripe initié' });
      toast.success('Paiement initié - Vérifiez votre email pour finaliser');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur Stripe');
      setError('Erreur lors du paiement Stripe');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Paiement PayPal
  const handlePayPalPayment = async (orderId, amount) => {
    try {
      setPaymentLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      const { data } = await axios.post(`${API_URL}/api/payments/paypal/create-order`, {
        amount,
        orderId
      }, config);

      if (data.approvalUrl) {
        // Stocker l'orderId pour la page de retour
        localStorage.setItem('pendingPayPalOrder', JSON.stringify({ orderId, paypalOrderId: data.orderId }));
        clearCart();
        // Rediriger vers PayPal
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('URL PayPal non reçue');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur PayPal');
      setError('Erreur lors du paiement PayPal');
      setPaymentLoading(false);
    }
  };

  // Paiement CinetPay
  const handleCinetPayPayment = async (orderId, amount) => {
    try {
      setPaymentLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      const { data } = await axios.post(`${API_URL}/api/payments/cinetpay/initialize`, {
        amount,
        orderId
      }, config);

      if (data.paymentUrl) {
        localStorage.setItem('pendingCinetPayOrder', JSON.stringify({ orderId, transactionId: data.transactionId }));
        clearCart();
        // Rediriger vers CinetPay
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('URL CinetPay non reçue');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur CinetPay');
      setError('Erreur lors du paiement CinetPay');
      setPaymentLoading(false);
    }
  };

  // Paiement iKeepay Mobile Money (H2H)
  const handleIkeepayPayment = async (orderId, amount) => {
    try {
      setPaymentLoading(true);
      const config = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};
      
      const phoneToUse = (ikeepayDetails.phone || formData.phone || '').trim();
      if (!phoneToUse) {
        throw new Error('Veuillez saisir votre numéro de téléphone Mobile Money');
      }

      const { data } = await axios.post(`${API_URL}/api/payments/ikeepay/payin`, {
        orderId,
        amount,
        currency: settings?.currency || 'XOF',
        country: ikeepayDetails.country || 'CI',
        operator: ikeepayDetails.operator || 'ORANGE',
        phoneNumber: phoneToUse,
        otp: ikeepayDetails.otp?.trim() || undefined
      }, config);

      if (data.payment_link) {
        // Redirection vers le lien de paiement externe (Wave ou Orange web)
        localStorage.setItem('pendingIkeepayOrder', JSON.stringify({ orderId, reference: data.external_reference }));
        clearCart();
        window.location.href = data.payment_link;
      } else {
        // Débit Push direct sur le téléphone mobile
        setIkeepayReference(data.external_reference);
        setIkeepayStatus('pending');
        setIkeepayModalOpen(true);
        startIkeepayPolling(data.external_reference, orderId);
      }
    } catch (error) {
      console.error('Erreur iKeepay:', error);
      const msg = error.response?.data?.message || error.message || 'Erreur lors du paiement Mobile Money';
      toast.error(msg);
      setError(msg);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Polling automatique pour vérifier le statut du paiement iKeepay
  const startIkeepayPolling = (reference, orderId) => {
    let attempts = 0;
    const maxAttempts = 35; // 35 * 4s = 140s (~2min20)
    const interval = setInterval(async () => {
      attempts++;
      try {
        const config = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};
        const { data } = await axios.get(`${API_URL}/api/payments/ikeepay/verify/${reference}`, config);

        if (data.isPaid || data.status === 'completed' || data.status === 'success') {
          clearInterval(interval);
          setIkeepayStatus('success');
          clearCart();
          localStorage.removeItem('checkoutFormData');
          toast.success('Paiement Mobile Money validé avec succès !');
          setTimeout(() => {
            setIkeepayModalOpen(false);
            setOrderSuccess({ order: { id: orderId } });
            setTimeout(() => setShowReviewModal(true), 1500);
          }, 1800);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setIkeepayStatus('failed');
          toast.error('La transaction Mobile Money a été rejetée ou a échoué');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIkeepayStatus('timeout');
        }
      } catch (e) {
        console.error('Erreur vérification iKeepay:', e);
      }
    }, 4000);
  };

  // Vérification manuelle par le client en cliquant sur le bouton
  const checkIkeepayStatusManually = async () => {
    if (!ikeepayReference) return;
    try {
      setIkeepayCheckLoading(true);
      const config = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};
      const { data } = await axios.get(`${API_URL}/api/payments/ikeepay/verify/${ikeepayReference}`, config);

      if (data.isPaid || data.status === 'completed' || data.status === 'success') {
        setIkeepayStatus('success');
        clearCart();
        localStorage.removeItem('checkoutFormData');
        toast.success('Paiement Mobile Money validé avec succès !');
        setTimeout(() => {
          setIkeepayModalOpen(false);
          setOrderSuccess({ order: { id: createdOrderId } });
          setTimeout(() => setShowReviewModal(true), 1500);
        }, 1800);
      } else if (data.status === 'failed') {
        setIkeepayStatus('failed');
        toast.error('Le paiement a été rejeté ou a échoué.');
      } else {
        toast.info('Paiement en attente de validation sur votre téléphone mobile...');
      }
    } catch (e) {
      toast.error('Impossible de vérifier le statut pour l\'instant.');
    } finally {
      setIkeepayCheckLoading(false);
    }
  };

  // Obtenir l'icône du moyen de paiement
  const getPaymentIcon = (method) => {
    const icons = {
      cod: '💵',
      momo: '📱',
      om: '🟠',
      stripe: '💳',
      paypal: '🅿️',
      cinetpay: '🌍',
      ikeepay: '📱'
    };
    return icons[method.id] || method.icon || '💰';
  };

  // Soumettre un avis
  const submitReview = async () => {
    if (!orderedProducts[reviewProductIndex]) return;
    
    const product = orderedProducts[reviewProductIndex];
    
    try {
      setReviewLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      await axios.post(`${API_URL}/api/reviews`, {
        productId: product.id,
        orderId: createdOrderId,
        rating: reviewRating,
        comment: reviewComment
      }, config);
      
      toast.success(`Merci pour votre avis sur ${product.name} !`);
      setReviewedProducts([...reviewedProducts, product.id]);
      
      // Passer au produit suivant ou fermer
      if (reviewProductIndex < orderedProducts.length - 1) {
        setReviewProductIndex(reviewProductIndex + 1);
        setReviewRating(5);
        setReviewComment('');
      } else {
        setShowReviewModal(false);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis';
      toast.error(message);
    } finally {
      setReviewLoading(false);
    }
  };

  // Passer au produit suivant sans laisser d'avis
  const skipReview = () => {
    if (reviewProductIndex < orderedProducts.length - 1) {
      setReviewProductIndex(reviewProductIndex + 1);
      setReviewRating(5);
      setReviewComment('');
    } else {
      setShowReviewModal(false);
    }
  };

  // Page de succès
  if (orderSuccess) {
    const isSuccessDigitalOnly = isDigitalOnly || orderSuccess.order?.isDigitalOnly;
    const orderNum = orderSuccess.order?.orderNumber || orderSuccess.order?.id;
    const invNum = orderSuccess.invoiceNumber || orderSuccess.order?.invoiceNumber;
    const delCode = orderSuccess.deliveryCode || orderSuccess.order?.deliveryCode;

    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
              <CheckCircle className="text-green-500" size={48} />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Commande validée avec succès !</h1>
            <p className="text-gray-500 text-sm mb-5">
              Merci pour votre confiance. Votre commande est prise en charge.
            </p>

            {/* Code Secret de Confirmation de Livraison (Cahier des charges 4.7) */}
            {!isSuccessDigitalOnly && delCode && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-400 rounded-2xl p-5 mb-6 text-center shadow-sm">
                <div className="flex items-center justify-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wider mb-1">
                  <ShieldCheck size={18} className="text-amber-600" />
                  Code secret de confirmation de livraison
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-950 tracking-widest font-mono my-2 select-all">
                  {delCode}
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed max-w-sm mx-auto">
                  ⚠️ <strong>Sécurité anti-fraude (Séquestre) :</strong> Ne transmettez ce code à 6 chiffres au livreur <strong>qu'après avoir reçu et inspecté vos articles</strong> en main propre.
                </p>
              </div>
            )}

            {/* Numéros officiels & Facture */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2 border border-gray-200 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200">
                <span className="text-gray-500">N° de commande :</span>
                <span className="font-bold font-mono text-gray-900">{orderNum}</span>
              </div>
              {invNum && (
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-gray-500">N° de Facture officielle :</span>
                  <span className="font-bold font-mono text-orange-600">{invNum}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-500">Facture & Reçu d'achat :</span>
                <button
                  type="button"
                  onClick={() => handleViewInvoice(orderSuccess.order?.id || createdOrderId)}
                  className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm"
                >
                  <Printer size={13} />
                  Imprimer la Facture
                </button>
              </div>
            </div>

            {/* Blocs de téléchargement instantané (Modèle Chariow) */}
            {hasDigitalItems && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-6 text-left space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <Zap size={18} className="text-purple-600" />
                  Vos produits digitaux sont prêts (Modèle Chariow)
                </div>
                <p className="text-xs text-purple-700">
                  Accédez immédiatement à vos téléchargements ou retrouvez-les à tout moment dans votre compte :
                </p>
                <div className="space-y-2">
                  {orderedProducts.filter(p => p.productType === 'DIGITAL').map((prod, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-gray-800 truncate">{prod.name}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {prod.digitalFileUrl && (
                          <a href={prod.digitalFileUrl} target="_blank" rel="noopener noreferrer" download className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                            <Download size={12} /> Télécharger
                          </a>
                        )}
                        {prod.digitalAccessLink && (
                          <a href={prod.digitalAccessLink} target="_blank" rel="noopener noreferrer" className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                            <ExternalLink size={12} /> Accéder
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/orders" className="block text-center text-xs font-bold text-purple-700 hover:underline pt-1">
                  Accéder à ma Bibliothèque Digitale complète →
                </Link>
              </div>
            )}

            {/* Suivi du Dossier d'Expédition Fret International (Section 16.4) */}
            {hasInternationalItems && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6 text-left space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Plane size={18} className="text-blue-600" />
                  Dossier d'expédition international ouvert
                </div>
                <p className="text-xs text-blue-700">
                  Votre colis sera acheminé à l'entrepôt international avec un code de marquage unique. Suivez la réception, visualisez les photos d'inspection et communiquez avec le transitaire et le vendeur :
                </p>
                <div className="pt-1">
                  <Link
                    to={createdShipmentId ? `/shipments/${createdShipmentId}` : '/my-shipments'}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Plane size={14} /> Suivre le transit en direct (Pesée & Photos) →
                  </Link>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2 text-sm text-gray-800">Récapitulatif de paiement</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Total payé : <span className="font-bold text-orange-500">{formatPrice(total)}</span></p>
                <p>Moyen utilisé : {
                  paymentMethods.find(m => m.id === formData.paymentMethod)?.name || 
                  (formData.paymentMethod === 'cod' ? 'À la livraison' : formData.paymentMethod)
                }</p>
                <p className="text-xs text-green-700 flex items-center gap-1 mt-1 font-medium">
                  <ShieldCheck size={14} /> Séquestre sécurisé (Escrow) garanti par la plateforme
                </p>
              </div>
            </div>

            {/* Lien WhatsApp pour contacter le vendeur */}
            {orderSuccess.whatsappLink && (
              <a
                href={orderSuccess.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold mb-4 transition-colors shadow-sm"
              >
                <MessageCircle size={20} />
                Contacter le vendeur sur WhatsApp
              </a>
            )}

            <div className="flex gap-3 justify-center mt-2">
              <Link
                to="/orders"
                className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors"
              >
                Mes commandes
              </Link>
              <Link
                to="/shop"
                className="px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-xs font-bold transition-colors shadow-sm"
              >
                Continuer mes achats
              </Link>
            </div>
          </div>
        </div>

        {/* Modal de facture imprimable */}
        {invoiceModal && invoiceData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-fade-in">
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">FACTURE OFFICIELLE</h2>
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
                  <p className="font-bold text-gray-700 mb-1">CLIENT</p>
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
                  <span>TOTAL :</span>
                  <span className="text-orange-600">{formatPrice(invoiceData.total)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} /> Imprimer
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

        {/* Modal d'avis */}
        {showReviewModal && orderedProducts.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowReviewModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="text-yellow-500 fill-yellow-500" size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Donnez votre avis !</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Produit {reviewProductIndex + 1} sur {orderedProducts.length}
                </p>
              </div>

              {/* Produit actuel */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg mb-6">
                <img
                  src={safeImage(orderedProducts[reviewProductIndex]?.image)}
                  alt={orderedProducts[reviewProductIndex]?.name}
                  loading="lazy"
                  onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <p className="font-medium text-gray-800 line-clamp-2">
                    {orderedProducts[reviewProductIndex]?.name}
                  </p>
                </div>
              </div>

              {/* Étoiles */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Votre note</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Commentaire */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Partagez votre expérience avec ce produit..."
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  onClick={skipReview}
                  className="flex-1 py-2.5 border rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  Passer
                </button>
                <button
                  onClick={submitReview}
                  disabled={reviewLoading}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
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
  }

  // Si le panier est vide
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="container mx-auto px-4 text-center">
          <ShoppingBag className="mx-auto text-gray-300 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Votre panier est vide</h1>
          <p className="text-gray-500 mb-6">Ajoutez des produits pour passer commande</p>
          <Link to="/shop" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600">
            Voir la boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <Link to="/cart" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-6">
          <ArrowLeft size={20} />
          Retour au panier
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Finaliser la commande</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations personnelles */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="text-orange-500" size={20} />
                  {isDigitalOnly ? 'Informations de l\'acheteur (Livraison digitale)' : 'Informations de livraison'}
                </h2>

                {isDigitalOnly && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 mb-4 flex items-center gap-3">
                    <Zap size={20} className="text-purple-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-purple-900">Commande 100% Digitale (Modèle Chariow)</h4>
                      <p className="text-[11px] text-purple-700">Aucun frais de port. Les fichiers et liens d'accès seront disponibles instantanément après paiement.</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email * (pour réception des accès)</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone size={14} className="inline mr-1" />
                      Téléphone Mobile Money *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="6XXXXXXXX"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                  
                  {!isDigitalOnly && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="Douala">Douala</option>
                        <option value="Yaoundé">Yaoundé</option>
                        <option value="Bafoussam">Bafoussam</option>
                        <option value="Bamenda">Bamenda</option>
                        <option value="Garoua">Garoua</option>
                        <option value="Maroua">Maroua</option>
                      </select>
                    </div>
                  )}
                  
                  {!isDigitalOnly && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de livraison physique *</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Quartier, rue, repère..."
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required={!isDigitalOnly}
                      />
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Instructions spéciales pour la livraison..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mode de livraison physique (Cahier des charges 4.5) */}
              {!isDigitalOnly && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Truck className="text-orange-500" size={20} />
                    Mode de livraison physique
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                      deliveryMethod === 'STANDARD' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="STANDARD"
                          checked={deliveryMethod === 'STANDARD'}
                          onChange={() => setDeliveryMethod('STANDARD')}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-xs font-bold text-gray-700">Standard</span>
                      </div>
                      <p className="font-bold text-sm text-gray-900">24h - 48h</p>
                      <p className="text-xs text-gray-500 mt-1">À domicile ou au bureau</p>
                      <p className="text-xs font-bold text-orange-600 mt-2">
                        {cartTotal >= 50000 ? 'Gratuit' : formatPrice(settings?.defaultShippingFee || 2000)}
                      </p>
                    </label>

                    <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                      deliveryMethod === 'EXPRESS' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="EXPRESS"
                          checked={deliveryMethod === 'EXPRESS'}
                          onChange={() => setDeliveryMethod('EXPRESS')}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">⚡ Express</span>
                      </div>
                      <p className="font-bold text-sm text-gray-900">Le jour même</p>
                      <p className="text-xs text-gray-500 mt-1">Livraison prioritaire garantie</p>
                      <p className="text-xs font-bold text-purple-600 mt-2">
                        {formatPrice((settings?.defaultShippingFee || 2000) + 1500)}
                      </p>
                    </label>

                    <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                      deliveryMethod === 'PICKUP' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="PICKUP"
                          checked={deliveryMethod === 'PICKUP'}
                          onChange={() => setDeliveryMethod('PICKUP')}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-[11px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Point Relais</span>
                      </div>
                      <p className="font-bold text-sm text-gray-900">Retrait direct</p>
                      <p className="text-xs text-gray-500 mt-1">En boutique partenaire</p>
                      <p className="text-xs font-bold text-green-600 mt-2">0 FCFA (Gratuit)</p>
                    </label>
                  </div>
                </div>
              )}

              {/* Acheminement International & Transitaire Partenaire (Section 16.3) */}
              {hasInternationalItems && (
                <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border-2 border-blue-200 rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Plane className="text-blue-600" size={20} />
                      Acheminement International & Transitaire
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      Chine ➔ Cameroun
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    Votre commande contient des articles internationaux. Choisissez le mode d'acheminement et le transitaire partenaire qui prendra en charge la réception à l'entrepôt en Chine (Guangzhou / Yiwu) et le dédouanement.
                  </p>

                  {/* Mode de transport international */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setForwarderTransportMode('AIR_FREIGHT')}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        forwarderTransportMode === 'AIR_FREIGHT'
                          ? 'border-blue-600 bg-white shadow-sm'
                          : 'border-gray-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-gray-900">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span>Fret Aérien (7 - 12 jours)</span>
                      </div>
                      <span className="text-[11px] text-gray-500 mt-1 block">~8 500 FCFA / kg • Idéal colis légers</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForwarderTransportMode('SEA_FREIGHT')}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        forwarderTransportMode === 'SEA_FREIGHT'
                          ? 'border-blue-600 bg-white shadow-sm'
                          : 'border-gray-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-gray-900">
                        <Ship className="w-4 h-4 text-emerald-600" />
                        <span>Fret Maritime (35 - 50 jours)</span>
                      </div>
                      <span className="text-[11px] text-gray-500 mt-1 block">~380 000 FCFA / m³ • Idéal volumes</span>
                    </button>
                  </div>

                  {/* Choix Transitaire Partenaire ou Externe */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-100">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                      <input
                        type="radio"
                        name="transitaireChoice"
                        checked={!isExternalForwarder}
                        onChange={() => setIsExternalForwarder(false)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Transitaire Partenaire Agréé Marketivo (Recommandé - Séquestre inclus)</span>
                    </label>

                    {!isExternalForwarder && (
                      <div className="pl-6 pt-1">
                        {forwardersList.length === 0 ? (
                          <p className="text-xs text-gray-400">Recherche des transitaires disponibles...</p>
                        ) : (
                          <select
                            value={selectedForwarderId}
                            onChange={(e) => setSelectedForwarderId(e.target.value)}
                            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            {forwardersList.map(fwd => (
                              <option key={fwd._id} value={fwd._id}>
                                {fwd.companyName} • {fwd.warehouses?.[0]?.city || 'Guangzhou'} (★ {fwd.rating?.toFixed(1) || '4.9'})
                              </option>
                            ))}
                          </select>
                        )}
                        <p className="text-[11px] text-blue-700 mt-1.5">
                          ✓ Vos frais de transit ne sont débloqués qu'après vérification du colis avec votre code secret de remise.
                        </p>
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 pt-2 border-t border-gray-100">
                      <input
                        type="radio"
                        name="transitaireChoice"
                        checked={isExternalForwarder}
                        onChange={() => setIsExternalForwarder(true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>J'ai mon propre transitaire en Chine (Transitaire Externe)</span>
                    </label>

                    {isExternalForwarder && (
                      <div className="pl-6 pt-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Nom de votre transitaire en Chine"
                          value={externalForwarderDetails.companyName}
                          onChange={(e) => setExternalForwarderDetails(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Adresse de son entrepôt en Chine (Guangzhou / Yiwu)"
                          value={externalForwarderDetails.warehouseAddress}
                          onChange={(e) => setExternalForwarderDetails(prev => ({ ...prev, warehouseAddress: e.target.value }))}
                          className="w-full py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                        />
                        <input
                          type="tel"
                          placeholder="Téléphone / WhatsApp du contact en Chine"
                          value={externalForwarderDetails.phone}
                          onChange={(e) => setExternalForwarderDetails(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode de paiement */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="text-orange-500" size={20} />
                  Mode de paiement
                </h2>
                
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader className="animate-spin mx-auto mb-2" size={24} />
                    <p>Chargement des moyens de paiement...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <label 
                        key={method.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.paymentMethod === method.id 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={formData.paymentMethod === method.id}
                          onChange={handleChange}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-2xl">{getPaymentIcon(method)}</span>
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-gray-500">
                            {method.type === 'card' && 'Visa, Mastercard, etc.'}
                            {method.type === 'paypal' && 'Paiement sécurisé PayPal'}
                            {method.type === 'cinetpay' && 'MTN MoMo, Orange Money, Moov...'}
                            {method.type === 'ikeepay' && (method.description || 'Orange, MTN, Wave, Moov, Airtel, Mobicash...')}
                            {method.type === 'mobile' && 'Paiement mobile local'}
                            {method.type === 'cash' && 'Payez en espèces à la réception'}
                          </p>
                        </div>
                        {(method.type === 'card' || method.type === 'paypal' || method.type === 'cinetpay' || method.type === 'ikeepay') && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Sécurisé</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {/* Formulaire spécifique Mobile Money iKeepay */}
                {formData.paymentMethod === 'ikeepay' && (
                  <div className="mt-4 p-4 bg-orange-50/80 border border-orange-200 rounded-xl space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-orange-900 font-semibold text-sm border-b border-orange-200 pb-2">
                      <Smartphone size={18} className="text-orange-600" />
                      <span>Paramètres du paiement Mobile Money</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Pays <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={ikeepayDetails.country}
                          onChange={(e) => setIkeepayDetails({ ...ikeepayDetails, country: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="CI">🇨🇮 Côte d'Ivoire (+225)</option>
                          <option value="CM">🇨🇲 Cameroun (+237)</option>
                          <option value="SN">🇸🇳 Sénégal (+221)</option>
                          <option value="BF">🇧🇫 Burkina Faso (+226)</option>
                          <option value="BJ">🇧🇯 Bénin (+229)</option>
                          <option value="ML">🇲🇱 Mali (+223)</option>
                          <option value="TG">🇹🇬 Togo (+228)</option>
                          <option value="GN">🇬🇳 Guinée (+224)</option>
                          <option value="CD">🇨🇩 RDC (+243)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Opérateur Mobile Money <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={ikeepayDetails.operator}
                          onChange={(e) => setIkeepayDetails({ ...ikeepayDetails, operator: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="ORANGE">🟠 ORANGE MONEY</option>
                          <option value="MTN">🟡 MTN MOBILE MONEY</option>
                          <option value="WAVE">🌊 WAVE</option>
                          <option value="MOOV">🔵 MOOV MONEY</option>
                          <option value="MOBICASH">🟢 MOBICASH</option>
                          <option value="AIRTEL">🔴 AIRTEL MONEY</option>
                          <option value="VODACOM">🔴 VODACOM M-PESA</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Numéro de téléphone Mobile Money <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={ikeepayDetails.phone || formData.phone}
                        onChange={(e) => setIkeepayDetails({ ...ikeepayDetails, phone: e.target.value })}
                        placeholder="Ex: 2250700000000 ou 0700000000"
                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500"
                        required
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        La notification de paiement sécurisé Push USSD sera envoyée directement sur ce numéro.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Code OTP <span className="text-gray-400 font-normal">(Optionnel, ex: Orange Burkina Faso)</span>
                      </label>
                      <input
                        type="text"
                        value={ikeepayDetails.otp}
                        onChange={(e) => setIkeepayDetails({ ...ikeepayDetails, otp: e.target.value })}
                        placeholder="Code OTP si demandé par votre opérateur"
                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}

                {paymentMethods.length === 0 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Aucun moyen de paiement configuré. Contactez l'administrateur.
                  </p>
                )}
              </div>

              {/* Message d'aide */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Important :</strong> Tous les champs marqués d'un * sont obligatoires pour confirmer votre commande.
                </p>
              </div>

              {/* Bouton de validation (mobile) */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={loading || paymentLoading || !formData.fullName || !formData.email || !formData.phone || (!isDigitalOnly && !formData.address) || !formData.paymentMethod}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading || paymentLoading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      {paymentLoading ? 'Paiement en cours...' : 'Traitement...'}
                    </>
                  ) : (
                    isDigitalOnly ? 'Payer & Télécharger' : 'Confirmer la commande'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Récapitulatif */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-6 sticky top-4">
              <h2 className="text-lg font-bold mb-4">Récapitulatif</h2>
              
              {/* Liste des produits */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={safeImage(item.images?.[0] || item.image)}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                      <p className="text-sm font-bold text-orange-500">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Code Promo Input */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 my-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-orange-500" />
                  Code promotionnel / Réduction
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-lg text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Check size={14} className="text-green-600" />
                      <span><strong>{appliedCoupon.code}</strong> (-{formatPrice(appliedCoupon.discountAmount)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-gray-400 hover:text-red-500 p-0.5"
                      title="Retirer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      placeholder="Code promo"
                      className="flex-1 text-xs px-2.5 py-1.5 border rounded-lg uppercase tracking-wider focus:ring-2 focus:ring-orange-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCodeInput.trim()}
                      className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {couponLoading ? <Loader size={12} className="animate-spin" /> : 'OK'}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-[11px] text-red-600 mt-1">{couponError}</p>
                )}
              </div>

              {/* Totaux */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Remise ({appliedCoupon.code})</span>
                    <span className="font-bold">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {enableShipping && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Truck size={14} /> Livraison ({deliveryMethod === 'EXPRESS' ? 'Express' : deliveryMethod === 'PICKUP' ? 'Point Relais' : 'Standard'})
                  </span>
                  <span>{shippingCost === 0 ? <span className="text-green-600 font-bold">Gratuite</span> : formatPrice(shippingCost)}</span>
                </div>
                )}
                {isDigitalOnly && (
                  <div className="flex justify-between text-xs text-purple-600 font-semibold">
                    <span>⚡ Livraison digitale</span>
                    <span>Instantanée (0 FCFA)</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-orange-500">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Bouton de validation (desktop) */}
              <button
                onClick={handleSubmit}
                disabled={loading || paymentLoading || !formData.fullName || !formData.email || !formData.phone || (!isDigitalOnly && !formData.address) || !formData.paymentMethod}
                className="hidden lg:flex w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center gap-2"
              >
                {loading || paymentLoading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    {paymentLoading ? 'Paiement en cours...' : 'Traitement...'}
                  </>
                ) : (
                  isDigitalOnly ? 'Payer & Télécharger' : 'Confirmer la commande'
                )}
              </button>

              {(!formData.fullName || !formData.email || !formData.phone || (!isDigitalOnly && !formData.address) || !formData.paymentMethod) && (
                <p className="text-xs text-red-500 text-center mt-2">
                  Veuillez remplir tous les champs obligatoires
                </p>
              )}

              <p className="text-xs text-gray-500 text-center mt-4">
                En confirmant, vous acceptez nos conditions générales de vente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de suivi de paiement Mobile Money iKeepay */}
      {ikeepayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-fade-in space-y-4">
            
            {ikeepayStatus === 'pending' && (
              <>
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Smartphone size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Validation sur votre mobile</h3>
                
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-950 space-y-2 text-left">
                  <p>
                    Une demande de débit de <strong className="text-orange-600">{formatPrice(total)}</strong> a été envoyée au :
                  </p>
                  <p className="font-mono font-bold text-base bg-white p-2 rounded border border-orange-200 text-center text-gray-800">
                    📱 {ikeepayDetails.phone || formData.phone} ({ikeepayDetails.operator})
                  </p>
                  <p className="text-xs text-gray-600">
                    👉 <strong>Action requise :</strong> Consultez votre téléphone et tapez votre code secret Mobile Money pour valider la transaction.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
                  <Loader className="animate-spin text-orange-500" size={16} />
                  <span>En attente de votre confirmation...</span>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={ikeepayCheckLoading}
                    onClick={checkIkeepayStatusManually}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {ikeepayCheckLoading ? <Loader className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    J'ai validé sur mon téléphone
                  </button>
                  <button
                    type="button"
                    onClick={() => setIkeepayModalOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Fermer la fenêtre
                  </button>
                </div>
              </>
            )}

            {ikeepayStatus === 'success' && (
              <div className="py-4 space-y-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Paiement validé avec succès !</h3>
                <p className="text-sm text-gray-600">Votre commande est confirmée et payée.</p>
              </div>
            )}

            {ikeepayStatus === 'failed' && (
              <div className="py-2 space-y-3">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={36} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Échec du paiement</h3>
                <p className="text-sm text-gray-600">La transaction a été annulée ou refusée par l'opérateur.</p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIkeepayModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {ikeepayStatus === 'timeout' && (
              <div className="py-2 space-y-3">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={36} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Délai d'attente dépassé</h3>
                <p className="text-xs text-gray-600">
                  Si vous avez déjà validé le débit sur votre téléphone, votre commande sera automatiquement mise à jour dès notification de l'opérateur.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={checkIkeepayStatusManually}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
                  >
                    Vérifier à nouveau
                  </button>
                  <button
                    type="button"
                    onClick={() => setIkeepayModalOpen(false)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
