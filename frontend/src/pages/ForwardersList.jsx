import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plane, Ship, ShieldCheck, MapPin, Phone, MessageCircle, 
  Search, ArrowRight, Package, CheckCircle, Clock, Star, 
  TrendingUp, Building2, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import { useSettings } from '../context/SettingsContext';

const ForwardersList = () => {
  const { formatPrice } = useSettings();
  const [forwarders, setForwarders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtres
  const [selectedMode, setSelectedMode] = useState(''); // '' | 'AIR_FREIGHT' | 'SEA_FREIGHT'
  const [originCountry, setOriginCountry] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchForwarders();
  }, [selectedMode, originCountry, destinationCountry]);

  const fetchForwarders = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedMode) params.mode = selectedMode;
      if (originCountry) params.originCountry = originCountry;
      if (destinationCountry) params.destinationCountry = destinationCountry;
      if (searchQuery) params.search = searchQuery;

      const { data } = await axios.get(`${API_URL}/api/forwarders`, { params });
      setForwarders(data || []);
    } catch (err) {
      console.error('Erreur chargement transitaires:', err);
      setError('Impossible de charger les transitaires pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchForwarders();
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      {/* Hero Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 md:p-12 shadow-xl">
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-400" />
              Réseau de Fret International Agréé
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Transitaires & Fret Chine ➔ Afrique
            </h1>
            <p className="text-base sm:text-lg text-slate-300 mb-6 leading-relaxed">
              Faites acheminer vos commandes depuis la Chine (Guangzhou, Yiwu, Shenzhen) ou le reste du monde vers le Cameroun (Douala, Yaoundé) en toute sécurité. Suivi tripartite en temps réel, pesée certifiée et séquestre garanti.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="#liste-transitaires" 
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition shadow-lg inline-flex items-center"
              >
                Trouver un transitaire
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
              <Link
                to="/forwarder/register"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition backdrop-blur-sm inline-flex items-center"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Devenir transitaire partenaire
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <Plane className="w-96 h-96 text-white" />
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div id="liste-transitaires" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Nom du transitaire, ville, mot-clé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
              >
                <option value="">Tous les modes de transport</option>
                <option value="AIR_FREIGHT">✈️ Fret Aérien (7 - 12 jours)</option>
                <option value="SEA_FREIGHT">🚢 Fret Maritime (35 - 50 jours)</option>
                <option value="EXPRESS">⚡ Fret Express (3 - 5 jours)</option>
              </select>
            </div>

            <div>
              <select
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
              >
                <option value="">Tous les pays de départ</option>
                <option value="Chine">🇨🇳 Chine (Guangzhou, Yiwu, Shenzhen)</option>
                <option value="Nigeria">🇳🇬 Nigeria</option>
                <option value="France">🇫🇷 France / Europe</option>
                <option value="Turquie">🇹🇷 Turquie</option>
                <option value="Dubaï">🇦🇪 Émirats Arabes Unis (Dubaï)</option>
              </select>
            </div>

            <div>
              <select
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
              >
                <option value="">Toutes destinations</option>
                <option value="Cameroun">🇨🇲 Cameroun (Douala, Yaoundé)</option>
                <option value="Côte d'Ivoire">🇨🇮 Côte d'Ivoire (Abidjan)</option>
                <option value="Gabon">🇬🇦 Gabon (Libreville)</option>
                <option value="Sénégal">🇸🇳 Sénégal (Dakar)</option>
                <option value="Congo">🇨🇬 Congo (Brazzaville, Pointe-Noire)</option>
              </select>
            </div>
          </form>
        </div>
      </div>

      {/* Grille des Transitaires */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Chargement des transitaires partenaires...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchForwarders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        ) : forwarders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Aucun transitaire trouvé</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
              Aucun transitaire ne correspond à vos critères de recherche. Essayez d'ajuster les filtres ou devenez le premier transitaire sur ce trajet !
            </p>
            <Link
              to="/forwarder/register"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              Proposer mes services de transit
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forwarders.map((fwd) => {
              const airRoute = fwd.routes?.find(r => r.mode === 'AIR_FREIGHT');
              const seaRoute = fwd.routes?.find(r => r.mode === 'SEA_FREIGHT');

              return (
                <div
                  key={fwd._id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-200 overflow-hidden flex flex-col transition duration-200"
                >
                  {/* Carte Header */}
                  <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {fwd.logo ? (
                          <img src={fwd.logo} alt={fwd.companyName} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-7 h-7 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-bold text-gray-900 text-lg hover:text-blue-600 transition">
                            <Link to={`/forwarders/${fwd.slug || fwd._id}`}>{fwd.companyName}</Link>
                          </h3>
                          {fwd.isVerified && (
                            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" title="Transitaire Vérifié" />
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          <span>{fwd.headquarters?.city || 'Douala'}, {fwd.headquarters?.country || 'Cameroun'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-amber-800 text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-500 mr-1" />
                      <span>{fwd.rating?.toFixed(1) || '4.8'}</span>
                    </div>
                  </div>

                  {/* Corps de la carte */}
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {fwd.description || 'Spécialiste du fret aérien et maritime vers le Cameroun avec dédouanement complet inclus.'}
                      </p>

                      {/* Entrepôts en Chine */}
                      <div className="mb-4">
                        <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider block mb-2">
                          Entrepôts de réception
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {fwd.warehouses?.map((wh, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium"
                            >
                              📍 {wh.city} ({wh.country})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tarifs Indicatifs */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 space-y-2">
                        {airRoute && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center text-gray-600 font-medium">
                              <Plane className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                              Fret Aérien ({airRoute.estimatedDaysMin}-{airRoute.estimatedDaysMax} j)
                            </span>
                            <span className="font-bold text-gray-900">
                              {formatPrice(airRoute.pricePerKg)} / kg
                            </span>
                          </div>
                        )}
                        {seaRoute && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center text-gray-600 font-medium">
                              <Ship className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                              Fret Maritime ({seaRoute.estimatedDaysMin}-{seaRoute.estimatedDaysMax} j)
                            </span>
                            <span className="font-bold text-gray-900">
                              {seaRoute.pricePerCbm ? `${formatPrice(seaRoute.pricePerCbm)} / m³` : `${formatPrice(seaRoute.pricePerKg)} / kg`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <Link
                        to={`/forwarders/${fwd.slug || fwd._id}`}
                        className="flex-1 text-center py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center"
                      >
                        Voir tarifs & entrepôts
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Link>

                      {fwd.whatsapp && (
                        <a
                          href={`https://wa.me/${fwd.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200 transition"
                          title="Contacter sur WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide & Sécurité Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Comment fonctionne le transit tripartite sécurisé ?
            </h2>
            <p className="text-gray-600 text-sm">
              Conformément à notre protocole logistique international (Section 16), chaque étape est supervisée pour zéro mauvaise surprise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Code de marquage unique</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                Le vendeur international expédie vos articles à l'entrepôt Chine du transitaire avec un code de marquage unique (ex: MKV-GZ-4920) inscrit sur le colis.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Pesée réelle & Photos certifiées</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                À la réception à Guangzhou ou Yiwu, le transitaire prend des photos du colis et le pèse. Vous validez le devis final basé sur le poids réel ou volumétrique.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Séquestre & Code de remise</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                Vos frais de transit sont sécurisés en séquestre. Le transitaire n'est payé que lorsque vous lui fournissez le code secret de remise en mains propres à Douala ou Yaoundé.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardersList;
