import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, Plane, Ship, ShieldCheck, MapPin, Phone, 
  Mail, MessageCircle, FileText, CheckCircle2, AlertCircle, ArrowLeft, Loader
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ForwarderRegister = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    description: '',
    phone: user?.phone || '',
    whatsapp: user?.phone || '',
    email: user?.email || '',
    headquartersCountry: 'Cameroun',
    headquartersCity: 'Douala',
    headquartersAddress: '',
    
    // Entrepôt principal en Chine
    warehouseName: 'Hub Guangzhou Central',
    warehouseCity: 'Guangzhou',
    warehouseAddress: 'Baiyun District, Logistics Cargo Hub',
    warehousePhone: '',
    markingPrefix: '',

    // Tarifs de base
    airPricePerKg: 8500,
    airMinBilling: 10000,
    seaPricePerKg: 2500,
    seaPricePerCbm: 380000,
    seaMinBilling: 35000,

    // Documents KYC
    businessRegistrationNumber: '',
    transportLicenseDoc: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vous devez être connecté pour devenir transitaire partenaire.');
      navigate('/login?redirect=/forwarder/register');
      return;
    }

    if (!formData.companyName.trim()) {
      setError('Veuillez indiquer le nom de votre entreprise.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        companyName: formData.companyName,
        description: formData.description,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email,
        headquarters: {
          country: formData.headquartersCountry,
          city: formData.headquartersCity,
          address: formData.headquartersAddress
        },
        warehouses: [{
          name: formData.warehouseName,
          country: 'Chine',
          city: formData.warehouseCity,
          address: formData.warehouseAddress,
          contactPhone: formData.warehousePhone || formData.phone,
          markingCodePrefix: formData.markingPrefix || formData.companyName.slice(0, 3).toUpperCase()
        }],
        routes: [
          {
            originCountry: 'Chine',
            destinationCountry: formData.headquartersCountry,
            destinationCity: formData.headquartersCity,
            mode: 'AIR_FREIGHT',
            pricePerKg: parseFloat(formData.airPricePerKg) || 8500,
            minBillingAmount: parseFloat(formData.airMinBilling) || 10000,
            estimatedDaysMin: 7,
            estimatedDaysMax: 12,
            includesCustoms: true
          },
          {
            originCountry: 'Chine',
            destinationCountry: formData.headquartersCountry,
            destinationCity: formData.headquartersCity,
            mode: 'SEA_FREIGHT',
            pricePerKg: parseFloat(formData.seaPricePerKg) || 2500,
            pricePerCbm: parseFloat(formData.seaPricePerCbm) || 380000,
            minBillingAmount: parseFloat(formData.seaMinBilling) || 35000,
            estimatedDaysMin: 35,
            estimatedDaysMax: 50,
            includesCustoms: true
          }
        ],
        services: ['AIR_FREIGHT', 'SEA_FREIGHT', 'CUSTOMS_CLEARING', 'GROUPAGE'],
        businessRegistrationNumber: formData.businessRegistrationNumber,
        transportLicenseDoc: formData.transportLicenseDoc
      };

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      };

      await axios.post(`${API_URL}/api/forwarders/register`, payload, config);
      setSuccess(true);
      toast.success('Votre compte transitaire a été créé et activé avec succès !');
    } catch (err) {
      console.error('Erreur inscription transitaire:', err);
      const msg = err.response?.data?.message || 'Erreur lors de la création du compte transitaire.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gray-50 min-h-screen py-16 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue sur le réseau !</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Votre profil de transitaire a été enregistré avec succès. Vous figurez désormais dans l'annuaire public des transitaires partenaires et pouvez recevoir des dossiers d'expédition.
          </p>
          <div className="space-y-3">
            <Link
              to="/forwarders"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition block"
            >
              Voir mon profil dans l'annuaire
            </Link>
            <Link
              to="/my-shipments"
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition block"
            >
              Accéder à mes dossiers d'expédition
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/forwarders"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Retour à l'annuaire des transitaires
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                Devenir Transitaire Partenaire Agréé
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Rejoignez le réseau logistique international de Marketivo et recevez les flux d'acheminement de milliers de commandes.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1 : Informations de l'Entreprise */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              1. Entreprise & Coordonnées
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nom de l'entreprise / Raison sociale *
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Ex: Sino-Africa Express Cargo"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email professionnel *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@sinoafrica-cargo.com"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Téléphone d'appel *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+237 600 000 000"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Numéro WhatsApp Service Client
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="+237 600 000 000"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description de vos activités & expertises
                </label>
                <textarea
                  rows="3"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Présentez vos départs réguliers par avion et bateau, vos assurances, vos délais et services de dédouanement..."
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pays du siège
                </label>
                <input
                  type="text"
                  name="headquartersCountry"
                  value={formData.headquartersCountry}
                  onChange={handleChange}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ville du siège / Agence de retrait
                </label>
                <input
                  type="text"
                  name="headquartersCity"
                  value={formData.headquartersCity}
                  onChange={handleChange}
                  placeholder="Ex: Douala, Akwa"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Entrepôt en Chine (Guangzhou / Yiwu) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-indigo-600" />
              2. Adresse de Réception en Chine
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nom de l'entrepôt
                </label>
                <input
                  type="text"
                  name="warehouseName"
                  value={formData.warehouseName}
                  onChange={handleChange}
                  placeholder="Ex: Entrepôt Guangzhou Baiyun B4"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ville en Chine
                </label>
                <select
                  name="warehouseCity"
                  value={formData.warehouseCity}
                  onChange={handleChange}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Guangzhou">Guangzhou (Canton)</option>
                  <option value="Yiwu">Yiwu</option>
                  <option value="Shenzhen">Shenzhen</option>
                  <option value="Foshan">Foshan</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Adresse complète en Chine (Chinois ou Anglais) *
                </label>
                <textarea
                  rows="2"
                  name="warehouseAddress"
                  required
                  value={formData.warehouseAddress}
                  onChange={handleChange}
                  placeholder="Ex: Shijing Cargo Hub, Building B4-102, Baiyun District, Guangzhou, Guangdong, China"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Téléphone du contact à l'entrepôt
                </label>
                <input
                  type="tel"
                  name="warehousePhone"
                  value={formData.warehousePhone}
                  onChange={handleChange}
                  placeholder="+86 138 0000 0000"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Code de marquage préfixe (ex: MKV, GZ)
                </label>
                <input
                  type="text"
                  name="markingPrefix"
                  maxLength="5"
                  value={formData.markingPrefix}
                  onChange={handleChange}
                  placeholder="Ex: GZ, EXP, FWD"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3 : Tarifs de base */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center">
              <Plane className="w-5 h-5 mr-2 text-emerald-600" />
              3. Grille Tarifaire Indicative (Chine ➔ Cameroun)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                <span className="font-bold text-blue-900 text-sm flex items-center">
                  <Plane className="w-4 h-4 mr-1.5" />
                  Fret Aérien (7 à 12 jours)
                </span>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prix par Kg (FCFA)
                  </label>
                  <input
                    type="number"
                    name="airPricePerKg"
                    value={formData.airPricePerKg}
                    onChange={handleChange}
                    className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm font-bold text-blue-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Facturation minimale (FCFA)
                  </label>
                  <input
                    type="number"
                    name="airMinBilling"
                    value={formData.airMinBilling}
                    onChange={handleChange}
                    className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <span className="font-bold text-emerald-900 text-sm flex items-center">
                  <Ship className="w-4 h-4 mr-1.5" />
                  Fret Maritime (35 à 50 jours)
                </span>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prix par m³ / CBM (FCFA)
                  </label>
                  <input
                    type="number"
                    name="seaPricePerCbm"
                    value={formData.seaPricePerCbm}
                    onChange={handleChange}
                    className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm font-bold text-emerald-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Facturation minimale (FCFA)
                  </label>
                  <input
                    type="number"
                    name="seaMinBilling"
                    value={formData.seaMinBilling}
                    onChange={handleChange}
                    className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 : Documents KYC légaux */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-amber-600" />
              4. Documents Légaux & Vérification (KYC)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Numéro RCCM / Registre du Commerce
                </label>
                <input
                  type="text"
                  name="businessRegistrationNumber"
                  value={formData.businessRegistrationNumber}
                  onChange={handleChange}
                  placeholder="Ex: RC/DLA/2026/B/1234"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Licence de transport ou agrément douanier (Lien doc / scan)
                </label>
                <input
                  type="text"
                  name="transportLicenseDoc"
                  value={formData.transportLicenseDoc}
                  onChange={handleChange}
                  placeholder="Lien URL de votre agrément..."
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bouton de soumission */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Création du compte transitaire...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Valider mon inscription transitaire
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForwarderRegister;
