import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, Plane, Ship, ShieldCheck, Clock, MapPin, 
  ArrowRight, Search, AlertCircle, ExternalLink 
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const STATUS_LABELS = {
  WAITING_FORWARDER_CHOICE: { label: 'En attente transitaire', color: 'bg-yellow-100 text-yellow-800' },
  FORWARDER_SELECTED: { label: 'Transitaire choisi', color: 'bg-blue-100 text-blue-800' },
  QUOTE_ACCEPTED: { label: 'Devis accepté & Séquestré', color: 'bg-indigo-100 text-indigo-800' },
  IN_TRANSIT_TO_WAREHOUSE: { label: 'En route vers entrepôt Chine', color: 'bg-amber-100 text-amber-800' },
  RECEIVED_AT_WAREHOUSE: { label: 'Reçu à l\'entrepôt Chine', color: 'bg-purple-100 text-purple-800' },
  PREPARING: { label: 'En préparation', color: 'bg-sky-100 text-sky-800' },
  SHIPPED: { label: 'Expédié international', color: 'bg-blue-100 text-blue-800' },
  IN_TRANSIT: { label: 'En vol / En mer', color: 'bg-cyan-100 text-cyan-800' },
  ARRIVED_DESTINATION: { label: 'Arrivé au Cameroun', color: 'bg-teal-100 text-teal-800' },
  CUSTOMS_CLEARING: { label: 'En dédouanement', color: 'bg-orange-100 text-orange-800' },
  READY_FOR_PICKUP_OR_DELIVERY: { label: 'Prêt pour retrait / livraison', color: 'bg-lime-100 text-lime-800' },
  DELIVERED: { label: 'Livré & Séquestre libéré', color: 'bg-emerald-100 text-emerald-800' },
  DISPUTED: { label: 'En litige', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-800' }
};

const MyShipments = () => {
  const { user } = useContext(AuthContext);
  const { formatPrice } = useSettings();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.token) {
      fetchShipments();
    }
  }, [user, filterStatus]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError('');
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const { data } = await axios.get(`${API_URL}/api/shipments/my-shipments`, {
        ...config,
        params
      });
      setShipments(data || []);
    } catch (err) {
      console.error('Erreur chargement expéditions:', err);
      setError('Impossible de charger vos dossiers d\'expédition.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchShipments();
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Mes Dossiers de Fret International
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Supervisez le transit, la pesée en entrepôt et le dédouanement de vos commandes internationales.
            </p>
          </div>

          <Link
            to="/forwarders"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center shadow-sm self-start sm:self-auto"
          >
            Annuaire des transitaires
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>

        {/* Barre Filtres & Recherche */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: '', label: 'Tous' },
              { id: 'FORWARDER_SELECTED', label: 'Transitaire choisi' },
              { id: 'RECEIVED_AT_WAREHOUSE', label: 'Reçu en Chine' },
              { id: 'IN_TRANSIT', label: 'En vol / Mer' },
              { id: 'CUSTOMS_CLEARING', label: 'En douane' },
              { id: 'DELIVERED', label: 'Livrés' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="N° dossier, code marquage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </form>
        </div>

        {/* Liste des Dossiers */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Chargement de vos dossiers d'expédition...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchShipments}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Aucun dossier d'expédition</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
              Vous n'avez aucun dossier de fret en cours. Lorsque vous commandez un article international, un dossier d'expédition tripartite est automatiquement ouvert.
            </p>
            <Link
              to="/shop"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              Parcourir les produits
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map((shp) => {
              const statusCfg = STATUS_LABELS[shp.status] || { label: shp.status, color: 'bg-gray-100 text-gray-800' };

              return (
                <div
                  key={shp._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-gray-900 text-base">
                        {shp.folderNumber}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        {shp.transportMode === 'AIR_FREIGHT' ? (
                          <Plane className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        ) : (
                          <Ship className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        )}
                        {shp.transportMode === 'AIR_FREIGHT' ? 'Fret Aérien' : 'Fret Maritime'}
                      </span>
                      {shp.forwarder && (
                        <span>
                          Transitaire : <strong>{shp.forwarder.companyName}</strong>
                        </span>
                      )}
                      {shp.selectedWarehouse?.markingCode && (
                        <span className="font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                          Marquage : {shp.selectedWarehouse.markingCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-right">
                      <span className="text-[11px] text-gray-400 block">Frais transit</span>
                      <span className="font-bold text-gray-900 text-sm">
                        {formatPrice(shp.quote?.finalAmount || shp.quote?.initialEstimate || 0)}
                      </span>
                    </div>

                    <Link
                      to={`/shipments/${shp._id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                    >
                      Ouvrir le dossier
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShipments;
