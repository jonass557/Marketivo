import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Footer = () => {
  const { settings } = useSettings();
  
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Section principale */}
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* À propos */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-white text-base sm:text-lg font-bold mb-3 sm:mb-4">MyShop</h3>
            <p className="text-xs sm:text-sm mb-3 sm:mb-4">
              Votre destination shopping en ligne au Cameroun. Découvrez des milliers de produits 
              de qualité à des prix imbattables.
            </p>
            <div className="flex gap-2 sm:gap-3">
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-theme-primary transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-theme-primary transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-theme-primary transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-theme-primary transition-colors">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Liens utiles */}
          <div>
            <h3 className="text-white text-sm sm:text-lg font-bold mb-3 sm:mb-4">Liens Utiles</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><Link to="/about" className="hover:text-theme-primary transition-colors">À propos de nous</Link></li>
              <li><Link to="/shop" className="hover:text-theme-primary transition-colors">Boutique</Link></li>
              <li><Link to="/contact" className="hover:text-theme-primary transition-colors">Contactez-nous</Link></li>
              <li><Link to="/faq" className="hover:text-theme-primary transition-colors">FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-theme-primary transition-colors">Conditions générales</Link></li>
              <li><Link to="/privacy" className="hover:text-theme-primary transition-colors">Politique de confidentialité</Link></li>
            </ul>
          </div>

          {/* Mon compte */}
          <div>
            <h3 className="text-white text-sm sm:text-lg font-bold mb-3 sm:mb-4">Mon Compte</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><Link to="/login" className="hover:text-theme-primary transition-colors">Se connecter</Link></li>
              <li><Link to="/register" className="hover:text-theme-primary transition-colors">Créer un compte</Link></li>
              <li><Link to="/cart" className="hover:text-theme-primary transition-colors">Mon panier</Link></li>
              <li><Link to="/orders" className="hover:text-theme-primary transition-colors">Mes commandes</Link></li>
              <li><Link to="/wishlist" className="hover:text-theme-primary transition-colors">Mes favoris</Link></li>
              <li><Link to="/profile" className="hover:text-theme-primary transition-colors">Mon profil</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-white text-sm sm:text-lg font-bold mb-3 sm:mb-4">Contactez-nous</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="flex-shrink-0 mt-0.5 text-theme-primary" />
                <span>{settings?.footerAddress || 'Douala, Cameroun\nRue de la Joie, Akwa'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="flex-shrink-0 text-theme-primary" />
                <span>{settings?.footerPhone || '+237 6XX XXX XXX'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="flex-shrink-0 text-theme-primary" />
                <span>{settings?.footerEmail || 'contact@myshop.cm'}</span>
              </li>
            </ul>

            {/* Newsletter */}
            <div className="mt-4 sm:mt-6">
              <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Newsletter</h4>
              <form className="flex">
                <input
                  type="email"
                  placeholder="Votre email"
                  className="flex-1 min-w-0 px-2 sm:px-3 py-2 bg-gray-800 rounded-l text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-theme-primary"
                />
                <button
                  type="submit"
                  className="bg-theme-primary bg-theme-primary-hover px-3 sm:px-4 py-2 rounded-r text-white text-xs sm:text-sm font-medium transition-colors flex-shrink-0"
                >
                  OK
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Section paiement */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-center md:text-left">
              <span className="text-gray-400">Modes de paiement acceptés:</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
              {/* MTN Mobile Money */}
              <div className="bg-yellow-400 rounded-lg px-3 py-2">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/120px-New-mtn-logo.svg.png" 
                  alt="MTN Mobile Money" 
                  className="h-6 sm:h-8 object-contain"
                />
              </div>
              {/* Orange Money */}
              <div className="bg-orange-500 rounded-lg px-3 py-2">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/100px-Orange_logo.svg.png" 
                  alt="Orange Money" 
                  className="h-6 sm:h-8 object-contain"
                />
              </div>
              {/* Cash */}
              <div className="bg-green-600 rounded-lg px-4 py-2">
                <span className="text-2xl">💵</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-gray-950 py-3 sm:py-4">
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} MyShop. Tous droits réservés. Fait avec ❤️ au Cameroun</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
