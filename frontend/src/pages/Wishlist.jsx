import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronRight, ShoppingCart, Trash2, Star } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import CartContext from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

const Wishlist = () => {
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const { formatPrice } = useSettings();
  const toast = useToast();
  
  // État local pour les favoris
  const [wishlistItems, setWishlistItems] = useState(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  // Écouter les changements de wishlist depuis d'autres composants
  useEffect(() => {
    const handleWishlistUpdate = () => {
      const saved = localStorage.getItem('wishlist');
      setWishlistItems(saved ? JSON.parse(saved) : []);
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    window.addEventListener('storage', handleWishlistUpdate);

    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
      window.removeEventListener('storage', handleWishlistUpdate);
    };
  }, []);

  const removeFromWishlist = (productId) => {
    const updated = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    toast.success('Produit retiré des favoris');
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    toast.success('Produit ajouté au panier !');
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Heart size={80} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Connectez-vous</h1>
          <p className="text-gray-500 mb-6">Pour voir vos favoris</p>
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
          <span className="text-gray-800 font-medium">Mes favoris</span>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-800">Mes favoris</h1>
            <p className="text-gray-500 mt-1">{wishlistItems.length} produit(s) dans vos favoris</p>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="p-12 text-center">
              <Heart size={80} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Aucun favori</h2>
              <p className="text-gray-500 mb-6">Vous n'avez pas encore ajouté de produits à vos favoris</p>
              <Link
                to="/shop"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-medium"
              >
                Découvrir nos produits
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
              {wishlistItems.map((product) => (
                <div key={product.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Image */}
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="h-48 bg-gray-100 relative">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                      )}
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Contenu */}
                  <div className="p-4">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-medium text-gray-800 line-clamp-2 hover:text-orange-500 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Note */}
                    <div className="flex items-center gap-1 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < (product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">({product.reviews || 0})</span>
                    </div>

                    {/* Prix */}
                    <div className="mt-2">
                      <span className="text-lg font-bold text-orange-500">{formatPrice(product.price)}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-gray-400 line-through ml-2">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded text-sm font-medium transition-colors"
                      >
                        <ShoppingCart size={16} />
                        Ajouter
                      </button>
                      <button
                        onClick={() => removeFromWishlist(product.id)}
                        className="p-2 border border-red-200 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
