import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import CartContext from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

const Cart = () => {
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useContext(CartContext);
  const toast = useToast();
  const { formatPrice } = useSettings();

  const handleRemove = (itemId, itemName) => {
    removeFromCart(itemId);
    toast.success(`${itemName} retiré du panier`);
  };

  const shippingFee = cartTotal >= 50000 ? 0 : 2500;
  const total = cartTotal + shippingFee;

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
                      src={item.images?.[0] || item.image || 'https://via.placeholder.com/100x100?text=Produit'}
                      alt={item.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded"
                    />
                  </Link>

                  {/* Détails */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.id}`}
                      className="font-medium text-gray-800 hover:text-orange-500 line-clamp-2 text-sm sm:text-base"
                    >
                      {item.name}
                    </Link>

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
            <div className="bg-white rounded shadow p-4 sm:p-6 sticky top-4 lg:top-32">
              <h2 className="font-bold text-lg mb-4">Résumé de la commande</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison</span>
                  <span className="font-medium">
                    {shippingFee === 0 ? (
                      <span className="text-green-600">Gratuite</span>
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
              </div>

              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-xl text-orange-500">{formatPrice(total)}</span>
                </div>
              </div>

              <Link 
                to="/checkout"
                className="block w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded font-medium transition-colors text-center"
              >
                Passer la commande
              </Link>

              {/* Modes de paiement */}
              <div className="mt-4 text-center text-xs text-gray-500">
                <p>Paiement à la livraison accepté</p>
                <p className="mt-1">Mobile Money • Orange Money • Cash</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
