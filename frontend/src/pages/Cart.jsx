import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Tag, Check, X, Loader, Zap, Package } from 'lucide-react';
import CartContext from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { FALLBACK_IMAGE_SVG, safeImage } from '../data/defaultData';
import axios from 'axios';
import API_URL from '../config/api';

const Cart = () => {
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useContext(CartContext);
  const toast = useToast();
  const { formatPrice } = useSettings();

  // Code promo / Coupons
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Charger le coupon sauvegardé
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
    if (!couponCode.trim()) return;

    try {
      setCouponLoading(true);
      setCouponError('');
      const { data } = await axios.post(`${API_URL}/api/coupons/validate`, {
        code: couponCode.trim(),
        orderAmount: cartTotal
      });

      if (data?.valid) {
        const couponData = {
          code: data.coupon.code,
          discountAmount: data.coupon.discountAmount,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue
        };
        setAppliedCoupon(couponData);
        localStorage.setItem('appliedCoupon', JSON.stringify(couponData));
        toast.success(`Code promo "${data.coupon.code}" appliqué ! (-${formatPrice(data.coupon.discountAmount)})`);
        setCouponCode('');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Code promo invalide ou expiré';
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

  const handleRemove = (itemId, itemName) => {
    removeFromCart(itemId);
    toast.success(`${itemName} retiré du panier`);
  };

  // Hybride Chariow + Jumia : calcul frais selon présence de produits physiques
  const isDigitalOnly = cartItems.length > 0 && cartItems.every(item => item.productType === 'DIGITAL');
  const shippingFee = isDigitalOnly ? 0 : (cartTotal >= 50000 ? 0 : 2500);
  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, cartTotal) : 0;
  const total = Math.max(0, cartTotal - discountAmount) + shippingFee;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <ShoppingBag size={80} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Votre panier est vide</h1>
          <p className="text-gray-500 mb-6">Découvrez nos produits et ajoutez-les à votre panier</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            Continuer mes achats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Mon Panier ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Liste des produits */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded shadow p-3 sm:p-4">
                <div className="flex gap-3 sm:gap-4">
                  {/* Image */}
                  <Link to={`/product/${item.id}`} className="flex-shrink-0">
                    <img
                      src={safeImage(item.images?.[0] || item.image)}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded"
                    />
                  </Link>

                  {/* Détails */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/product/${item.id}`}
                        className="font-medium text-gray-800 hover:text-orange-500 line-clamp-2 text-sm sm:text-base"
                      >
                        {item.name}
                      </Link>
                      {item.productType === 'DIGITAL' ? (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          ⚡ Digital
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          📦 Physique
                        </span>
                      )}
                    </div>

                    <div className="mt-1 sm:mt-2">
                      <span className="text-orange-500 font-bold text-sm sm:text-base">{formatPrice(item.price)}</span>
                      {item.oldPrice && (
                        <span className="text-gray-400 text-xs sm:text-sm line-through ml-1 sm:ml-2">
                          {formatPrice(item.oldPrice)}
                        </span>
                      )}
                    </div>

                    {/* Actions mobile */}
                    <div className="flex items-center justify-between mt-3 sm:hidden">
                      <div className="flex items-center border rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-100 active:bg-gray-200"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-2 font-medium text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-100 active:bg-gray-200"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id, item.name)}
                        className="text-red-500 hover:bg-red-50 active:bg-red-100 p-2 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Actions desktop */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="flex items-center border rounded">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-gray-100"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="px-4 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-gray-100"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-orange-500">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemove(item.id, item.name)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Continuer les achats */}
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-orange-500 hover:underline"
            >
              <ArrowLeft size={18} />
              Continuer mes achats
            </Link>
          </div>

          {/* Résumé */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-4 sm:p-6 sticky top-4 lg:top-32 space-y-4">
              <h2 className="font-bold text-lg">Résumé de la commande</h2>

              {/* Code Promo Input */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Tag size={14} className="text-orange-500" />
                  Code promotionnel
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Check size={14} className="text-green-600" />
                      <span><strong>{appliedCoupon.code}</strong> (-{formatPrice(appliedCoupon.discountAmount)})</span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Supprimer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Ex: PROMO20"
                      className="flex-1 text-xs px-3 py-2 border rounded-lg uppercase tracking-wider focus:ring-2 focus:ring-orange-500 font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1 transition-colors"
                    >
                      {couponLoading ? <Loader size={12} className="animate-spin" /> : 'Appliquer'}
                    </button>
                  </form>
                )}
                {couponError && (
                  <p className="text-[11px] text-red-600 mt-1.5">{couponError}</p>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium">{formatPrice(cartTotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Remise ({appliedCoupon.code})</span>
                    <span className="font-bold">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison</span>
                  <span className="font-medium">
                    {shippingFee === 0 ? (
                      <span className="text-green-600 font-semibold">Gratuite</span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </span>
                </div>
                {shippingFee > 0 && (
                  <p className="text-xs text-gray-500">
                    Livraison gratuite à partir de 50,000 XAF
                  </p>
                )}
                {isDigitalOnly && (
                  <p className="text-xs text-purple-600 font-medium">
                    ⚡ Commande digitale : livraison gratuite immédiate
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-xl text-orange-500">{formatPrice(total)}</span>
                </div>
              </div>

              <Link 
                to="/checkout"
                className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold transition-colors text-center shadow-md shadow-orange-200"
              >
                Passer la commande
              </Link>

              {/* Modes de paiement */}
              <div className="mt-4 text-center text-xs text-gray-500">
                <p>Paiement sécurisé et garanti</p>
                <p className="mt-1">Mobile Money • Orange Money • Wave • Cartes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
