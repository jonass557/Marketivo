import React, { useState, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Store, User, Mail, Lock, Phone, MapPin, Globe, ArrowRight, CheckCircle, Star } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';

const VendorRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlanId = searchParams.get('planId');
  const selectedPlanName = searchParams.get('planName') || 'Standard';
  const { login, user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    phone: '',
    whatsapp: '',
    city: '',
    country: 'Cameroun',
    businessType: 'individual',
    description: ''
  });

  const countries = ['Cameroun', 'Côte d\'Ivoire', 'Sénégal', 'Gabon', 'Congo', 'Tchad', 'RCA'];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { ...form };
      if (selectedPlanId) payload.planId = selectedPlanId;
      const { data } = await axios.post(`${API_URL}/api/vendors/register`, payload);
      login(data);
      navigate('/vendor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (user && user.role === 'VENDOR') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Vous êtes déjà vendeur !</h2>
          <p className="text-gray-500 mb-6">Accédez à votre tableau de bord pour gérer votre boutique.</p>
          <Link to="/vendor/dashboard" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600">
            Aller au Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Créez votre boutique</h1>
          <p className="text-gray-500 mt-2">Vendez vos produits à des milliers de clients en Afrique</p>
          {selectedPlanId && (
            <div className="inline-flex items-center gap-2 mt-3 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold">
              <Star size={14} className="text-orange-500" />
              Plan sélectionné : <span className="font-bold">{selectedPlanName}</span>
            </div>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                {s === 1 ? 'Compte' : 'Boutique'}
              </span>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-orange-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Informations personnelles</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" name="fullName" value={form.fullName} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Votre nom complet" required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="votre@email.com" required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password" name="password" value={form.password} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Minimum 6 caractères" required minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Confirmez votre mot de passe" required minLength={6}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
                    setError('Veuillez remplir tous les champs');
                    return;
                  }
                  if (form.password !== form.confirmPassword) {
                    setError('Les mots de passe ne correspondent pas');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 flex items-center justify-center gap-2"
              >
                Continuer <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Informations de la boutique</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
                <div className="relative">
                  <Store size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" name="shopName" value={form.shopName} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Ex: Mode Africaine" required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel" name="phone" value={form.phone} onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="6XXXXXXXX" required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel" name="whatsapp" value={form.whatsapp} onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Même numéro si identique"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text" name="city" value={form.city} onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Douala, Yaoundé..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <div className="relative">
                    <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      name="country" value={form.country} onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                    >
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de vendeur</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: 'individual', label: 'Particulier' }, { value: 'company', label: 'Entreprise' }].map(opt => (
                    <label key={opt.value} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${
                      form.businessType === opt.value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="businessType" value={opt.value} checked={form.businessType === opt.value} onChange={handleChange} className="text-orange-500" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description de la boutique</label>
                <textarea
                  name="description" value={form.description} onChange={handleChange} rows={3}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Décrivez votre activité en quelques mots..."
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">
                  Retour
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Création...' : 'Créer ma boutique'}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà vendeur ? <Link to="/login" className="text-orange-500 font-medium hover:underline">Connectez-vous</Link>
          </p>
        </form>

        {/* Avantages */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Gratuit pour commencer', desc: 'Créez votre boutique sans frais' },
            { title: 'Paiements sécurisés', desc: 'Mobile Money & cartes bancaires' },
            { title: 'Support dédié', desc: 'Assistance via WhatsApp' }
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 text-center shadow-sm">
              <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
