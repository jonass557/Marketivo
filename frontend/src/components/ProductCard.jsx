import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, ShoppingCart, ExternalLink, Store } from 'lucide-react';
import CartContext from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { FALLBACK_IMAGE_SVG, safeImage } from '../data/defaultData';

const ProductCard = ({ product }) => {
  const { addToCart } = useContext(CartContext);
  const toast = useToast();
  const { formatPrice } = useSettings();
  const { id, name, price, oldPrice, images, image, rating, reviews, reviewCount, discount, stock, isAffiliate, affiliateUrl } = product;
  
  // Gérer les favoris (wishlist)
  const [isInWishlist, setIsInWishlist] = useState(false);
  
  useEffect(() => {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    setIsInWishlist(wishlist.some(item => item.id === id));
  }, [id]);

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    if (isInWishlist) {
      const updated = wishlist.filter(item => item.id !== id);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      setIsInWishlist(false);
      toast.info('Retiré des favoris');
    } else {
      wishlist.push(product);
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      setIsInWishlist(true);
      toast.success('Ajouté aux favoris !');
    }
    
    // Déclencher un event pour mettre à jour d'autres composants
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  // Vérifier le stock
  const isOutOfStock = stock !== undefined && stock <= 0;
  
  // Calculer la note moyenne et le nombre d'avis
  const displayRating = rating || 0;
  const displayReviewCount = reviewCount || reviews || 0;
  
  // Utiliser la première image valide ou l'image SVG intégrée instantanée
  const productImage = safeImage(images?.[0] || image, FALLBACK_IMAGE_SVG);

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product, 1);
    toast.success(`${name} ajouté au panier !`);
  };

  // Pour les produits affiliés, on redirige vers le site partenaire
  const CardWrapper = ({ children }) => {
    if (isAffiliate && affiliateUrl) {
      return (
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-lg border hover:shadow-lg transition-all duration-300 group block overflow-hidden"
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        to={`/product/${id}`}
        className="bg-white rounded-lg border hover:shadow-lg transition-all duration-300 group block overflow-hidden"
      >
        {children}
      </Link>
    );
  };

  return (
    <CardWrapper>
      {/* Image avec sécurité anti-erreur et chargement rapide */}
      <div className="relative overflow-hidden aspect-square bg-gray-100">
        <img
          src={productImage}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMAGE_SVG;
          }}
        />
        {discount && (
          <span className="absolute top-2 left-2 bg-theme-primary text-white text-xs font-bold px-2 py-1 rounded">
            -{discount}%
          </span>
        )}
        {/* Badge Affiliation */}
        {isAffiliate && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded z-10 flex items-center gap-1">
            <ExternalLink size={10} />
            Partenaire
          </span>
        )}
        {/* Badge Stock - Masqué pour affiliés */}
        {!isAffiliate && isOutOfStock && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
            Rupture
          </span>
        )}
        {!isAffiliate && !isOutOfStock && stock !== undefined && stock <= 5 && stock > 0 && (
          <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
            Stock limité
          </span>
        )}
        <button
          onClick={toggleWishlist}
          className={`absolute top-2 right-2 p-1.5 rounded-full shadow transition-all z-10 ${
            isInWishlist 
              ? 'bg-red-500 text-white opacity-100' 
              : 'bg-white text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart size={16} className={isInWishlist ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Contenu */}
      <div className="p-2 sm:p-3">
        <h3 className="text-xs sm:text-sm font-medium text-gray-800 line-clamp-2 mb-1 sm:mb-2 min-h-[32px] sm:min-h-[40px]">
          {name}
        </h3>

        {/* Vendeur */}
        {product.vendor && product.vendor.shopName && (
          <Link
            to={`/shop/${product.vendor.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 hover:underline mb-1 truncate"
          >
            <Store size={10} /> {product.vendor.shopName}
          </Link>
        )}

        {/* Prix */}
        <div className="mb-1 sm:mb-2">
          <span className="text-theme-primary font-bold text-sm sm:text-base">
            {formatPrice(price)}
          </span>
          {oldPrice && (
            <span className="text-gray-400 text-[10px] sm:text-xs line-through ml-1 sm:ml-2 block sm:inline">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>

        {/* Étoiles et avis */}
        <div className="flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={12}
                className={i < Math.floor(displayRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">({displayReviewCount})</span>
        </div>
        
        {/* Statut stock - Masqué pour affiliés */}
        {!isAffiliate && (
          <div className="mt-1">
            {isOutOfStock ? (
              <span className="text-xs font-medium text-red-500">Rupture de stock</span>
            ) : (
              <span className="text-xs font-medium text-green-600">En stock</span>
            )}
          </div>
        )}

        {/* Statut affilié */}
        {isAffiliate && (
          <div className="mt-1">
            <span className="text-xs font-medium text-blue-600">Site partenaire</span>
          </div>
        )}

        {/* Bouton Ajouter au panier ou Voir offre */}
        {isAffiliate ? (
          <div
            className="w-full mt-2 sm:mt-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-medium py-2 sm:py-2.5 rounded flex items-center justify-center gap-1 transition-colors"
          >
            <ExternalLink size={12} className="sm:w-[14px] sm:h-[14px]" />
            <span className="hidden xs:inline">Voir l'offre</span>
            <span className="xs:hidden">→</span>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full mt-2 sm:mt-3 text-white text-[10px] sm:text-xs font-medium py-2 sm:py-2.5 rounded flex items-center justify-center gap-1 transition-colors active:scale-95 ${
              isOutOfStock 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-theme-primary bg-theme-primary-hover'
            }`}
          >
            <ShoppingCart size={12} className="sm:w-[14px] sm:h-[14px]" />
            <span className="hidden xs:inline">{isOutOfStock ? 'Indisponible' : 'Ajouter'}</span>
            <span className="xs:hidden">{isOutOfStock ? '✗' : '+'}</span>
          </button>
        )}
      </div>
    </CardWrapper>
  );
};

export default ProductCard;
