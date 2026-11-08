import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, ShieldCheck, MapPin, Phone, MessageCircle, Mail, 
  Plane, Ship, Clock, CheckCircle2, Copy, Check, Calculator, 
  Package, AlertCircle, ArrowLeft, Star, FileText
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

const ForwarderDetail = () => {
  const { id } = useParams();
  const { formatPrice } = useSettings();
  const toast = useToast();

  const [forwarder, setForwarder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Simulateur de calcul
  const [calcWeight, setCalcWeight] = useState(2);
  const [calcLength, setCalcLength] = useState(30);
  const [calcWidth, setCalcWidth] = useState(20);
  const [calcHeight, setCalcHeight] = useState(15);
  const [calcMode, setCalcMode] = useState('AIR_FREIGHT');

  useEffect(() => {
    fetchForwarder();
  }, [id]);

  const fetchForwarder = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.get(`${API_URL}/api/forwarders/${id}`);
      setForwarder(data);
    } catch (err) {
      console.error('Erreur chargement profil transitaire:', err);
      setError('Transitaire introuvable ou indisponible.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Adresse entrepôt copiée dans le presse-papier !');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  // Calcul poids volumétrique standard : (L * l * h) / 5000 (Section 15.4)
  const volWeight = (calcLength * calcWidth * calcHeight) / 5000;
  const billableWeight = Math.max(parseFloat(calcWeight) || 0, volWeight);

  const selectedRoute = forwarder?.routes?.find(r => r.mode === calcMode) || forwarder?.routes?.[0];
  const estimatedCost = selectedRoute
    ? Math.max(
        selectedRoute.minBillingAmount || 0,
        Math.round(billableWeight * (selectedRoute.pricePerKg || 8500))
      )
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Chargement du profil transitaire...</p>
      </div>
    );
  }

  if (error || !forwarder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Transitaire introuvable</h2>
        <p className="text-gray-500 mb-6">{error || "Ce profil n'existe pas ou a été désactivé."}</p>
        <Link
          to="/forwarders"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'annuaire des transitaires
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation retour */}
        <div className="mb-6">
          <Link
            to="/forwarders"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Tous les transitaires partenaires
          </Link>
        </div>

        {/* Fiche Transitaire Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center space-x-4">
              <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {forwarder.logo ? (
                  <img src={forwarder.logo} alt={forwarder.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10 text-blue-600" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {forwarder.companyName}
                  </h1>
                  {forwarder.isVerified && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      <ShieldCheck className="w-4 h-4 mr-1 text-blue-600" />
                      Agréé & Vérifié
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500 mt-2">
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    Siège : {forwarder.headquarters?.city || 'Douala'}, {forwarder.headquarters?.country || 'Cameroun'}
                  </span>
                  <span className="flex items-center bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current text-amber-500 mr-1" />
                    {forwarder.rating?.toFixed(1) || '4.9'} / 5 ({forwarder.totalShipments || 0} expéditions réussies)
                  </span>
                </div>
              </div>
            </div>

            {/* Boutons de contact direct */}
            <div className="flex flex-wrap items-center gap-3">
              {forwarder.whatsapp && (
                <a
                  href={`https://wa.me/${forwarder.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition flex items-center shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp Direct
                </a>
              )}
              {forwarder.phone && (
                <a
                  href={`tel:${forwarder.phone}`}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-medium transition flex items-center"
                >
                  <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  Appeler
                </a>
              )}
            </div>
          </div>

          <p className="text-gray-600 text-sm mt-6 border-t border-gray-100 pt-6 leading-relaxed">
            {forwarder.description || 'Transitaire international spécialisé dans le groupage, le dédouanement et la livraison de marchandises achetées en Chine vers le Cameroun.'}
          </p>
        </div>

        {/* Grille principale : Entrepôts + Tarifs + Simulateur */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonne gauche (2 tiers) : Entrepôts et Tarifs */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Adresses des entrepôts en Chine (Section 16.4) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Entrepôts de réception en Chine
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Indiquez cette adresse à vos fournisseurs (Alibaba, Taobao, 1688 ou vendeurs de la plateforme).
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {forwarder.warehouses?.length || 1} Entrepôt(s)
                </span>
              </div>

              <div className="space-y-4">
                {forwarder.warehouses?.map((wh, idx) => {
                  const fullAddress = `${wh.name}\nDestinataire / Contact: ${wh.contactPerson || forwarder.companyName} (${wh.contactPhone || forwarder.phone})\nAdresse: ${wh.address}, ${wh.city}, ${wh.country} ${wh.postalCode ? `- Code Postal: ${wh.postalCode}` : ''}\nCode de marquage préfixe: [${wh.markingCodePrefix || forwarder.companyName.slice(0, 3).toUpperCase()}]`;

                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-xl p-5 bg-slate-50 relative group hover:border-blue-400 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-gray-900 text-base">{wh.name}</h3>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                              {wh.city} ({wh.country})
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 font-mono bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-line text-xs leading-relaxed">
                            {fullAddress}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-400">
                          Préfixe de marquage : <strong>{wh.markingCodePrefix || 'MKV'}</strong>
                        </span>
                        <button
                          onClick={() => copyToClipboard(fullAddress, idx)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center shadow-sm"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Copié !
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              Copier l'adresse
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grille Tarifaire Officielle */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Grille des tarifs officiels de fret
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                      <th className="py-3 px-4">Mode & Trajet</th>
                      <th className="py-3 px-4">Tarif au Kg</th>
                      <th className="py-3 px-4">Tarif au m³ (CBM)</th>
                      <th className="py-3 px-4">Délais</th>
                      <th className="py-3 px-4">Dédouanement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {forwarder.routes?.map((route, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-4 font-semibold text-gray-900 flex items-center">
                          {route.mode === 'AIR_FREIGHT' ? (
                            <Plane className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                          ) : (
                            <Ship className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                          )}
                          <span>
                            {route.originCountry} ➔ {route.destinationCity || route.destinationCountry}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-blue-700">
                          {formatPrice(route.pricePerKg)}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {route.pricePerCbm ? formatPrice(route.pricePerCbm) : 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          <span className="flex items-center text-xs">
                            <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                            {route.estimatedDaysMin} - {route.estimatedDaysMax} jours
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            {route.includesCustoms ? 'Inclus (DDP)' : 'Non inclus'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Services Proposés */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Services & Garanties
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-slate-50 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Groupage de colis</h4>
                    <p className="text-xs text-gray-500 mt-1">Regroupement de plusieurs commandes en un seul colis pour réduire vos frais au kilo.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-slate-50 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Photos d'inspection à l'entrepôt</h4>
                    <p className="text-xs text-gray-500 mt-1">Photos haute définition envoyées directement dans votre dossier dès réception à Guangzhou.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-slate-50 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Dédouanement sécurisé (DDP)</h4>
                    <p className="text-xs text-gray-500 mt-1">Prise en charge intégrale des formalités douanières au port ou à l'aéroport de Douala.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-slate-50 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Paiement sécurisé par séquestre</h4>
                    <p className="text-xs text-gray-500 mt-1">Fonds bloqués sur la plateforme jusqu'à ce que vous validiez la réception avec votre code secret.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite (1 tiers) : Simulateur de Frais de Fret */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <div className="flex items-center space-x-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-lg">Simulateur de Fret</h3>
              </div>
              <p className="text-xs text-gray-500 mb-6">
                Estimez le coût d'acheminement selon le poids réel et volumétrique standard `(L*l*h)/5000`.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mode de transport
                  </label>
                  <select
                    value={calcMode}
                    onChange={(e) => setCalcMode(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="AIR_FREIGHT">✈️ Fret Aérien (7 - 12 jours)</option>
                    <option value="SEA_FREIGHT">🚢 Fret Maritime (35 - 50 jours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Poids réel estimé (Kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Dimensions du carton (L x l x h en cm)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="L"
                      value={calcLength}
                      onChange={(e) => setCalcLength(e.target.value)}
                      className="py-2 px-2 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="l"
                      value={calcWidth}
                      onChange={(e) => setCalcWidth(e.target.value)}
                      className="py-2 px-2 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="h"
                      value={calcHeight}
                      onChange={(e) => setCalcHeight(e.target.value)}
                      className="py-2 px-2 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Détails du calcul */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-500">
                    <span>Poids volumétrique :</span>
                    <span className="font-semibold text-gray-700">{volWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Poids facturable retenu :</span>
                    <span className="font-bold text-gray-900">{billableWeight.toFixed(2)} kg</span>
                  </div>
                </div>

                {/* Résultat */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-xs text-blue-700 uppercase font-bold tracking-wider block mb-1">
                    Estimation des frais de transit
                  </span>
                  <div className="text-2xl font-extrabold text-blue-900">
                    {formatPrice(estimatedCost)}
                  </div>
                  <span className="text-[11px] text-blue-600 mt-1 block">
                    Dédouanement inclus • Séquestre garanti
                  </span>
                </div>

                <Link
                  to="/shop"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center shadow-md"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Commander un article international
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForwarderDetail;
