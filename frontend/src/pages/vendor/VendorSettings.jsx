import React, { useState, useContext, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Save, Store, Upload, Camera, Globe, Facebook, Instagram, Twitter,
  Youtube, Linkedin, Smartphone, Banknote, CreditCard, Truck, ShieldCheck,
  ShieldAlert, ShieldX, Copy, Check, Palette, Sparkles, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const VendorSettings = () => {
  const { user } = useContext(AuthContext);
  const { vendorData, fetchVendorProfile } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [copiedShop, setCopiedShop] = useState(false);
  const [copiedBoutique, setCopiedBoutique] = useState(false);

  // KYC state
  const [kycForm, setKycForm] = useState({
    idDocument: '',
    selfie: '',
    notes: ''
  });
  const [kycLoading, setKycLoading] = useState(false);
  const [kycSuccess, setKycSuccess] = useState('');
  const [kycError, setKycError] = useState('');

  const [form, setForm] = useState({
    shopName: '',
    tagline: '',
    accentColor: '#f97316',
    description: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    country: 'Cameroun',
    logo: '',
    banner: '',
    socialLinks: { facebook: '', instagram: '', twitter: '', tiktok: '', youtube: '', linkedin: '', website: '' },
    acceptedPayments: ['cod']
  });

  useEffect(() => {
    if (vendorData) {
      setForm({
        shopName: vendorData.shopName || '',
        tagline: vendorData.tagline || '',
        accentColor: vendorData.accentColor || '#f97316',
        description: vendorData.description || '',
        phone: vendorData.phone || '',
        whatsapp: vendorData.whatsapp || '',
        address: vendorData.address || '',
        city: vendorData.city || '',
        country: vendorData.country || 'Cameroun',
        logo: vendorData.logo || '',
        banner: vendorData.banner || '',
        socialLinks: {
          facebook: vendorData.socialLinks?.facebook || '',
          instagram: vendorData.socialLinks?.instagram || '',
          twitter: vendorData.socialLinks?.twitter || '',
          tiktok: vendorData.socialLinks?.tiktok || '',
          youtube: vendorData.socialLinks?.youtube || '',
          linkedin: vendorData.socialLinks?.linkedin || '',
          website: vendorData.socialLinks?.website || ''
        },
        acceptedPayments: vendorData.acceptedPayments?.length ? vendorData.acceptedPayments : ['cod']
      });

      if (vendorData.kycIdDocument || vendorData.kycSelfie) {
        setKycForm(prev => ({
          ...prev,
          idDocument: vendorData.kycIdDocument || '',
          selfie: vendorData.kycSelfie || ''
        }));
      }
    }
  }, [vendorData]);

  const togglePayment = (method) => {
    setForm(prev => {
      const current = prev.acceptedPayments || [];
      const updated = current.includes(method)
        ? current.filter(m => m !== method)
        : [...current, method];
      return { ...prev, acceptedPayments: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.put(`${API_URL}/api/vendors/me`, form, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSuccess('Profil et boutique mis à jour avec succès !');
      if (fetchVendorProfile) fetchVendorProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' }
      });
      setForm(prev => ({ ...prev, [field]: data.url || data.secure_url }));
    } catch (err) {
      setError("Erreur lors de l'upload de l'image");
    }
  };

  const handleKycFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setKycLoading(true);
    setKycError('');
    try {
      const { data } = await axios.post(`${API_URL}/api/upload/file`, formData, {
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' }
      });
      setKycForm(prev => ({ ...prev, [field]: data.fileUrl }));
    } catch (err) {
      setKycError(err.response?.data?.message || "Erreur lors de l'envoi du document");
    } finally {
      setKycLoading(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!kycForm.idDocument || !kycForm.selfie) {
      setKycError("Veuillez fournir à la fois votre pièce d'identité et votre photo selfie.");
      return;
    }
    setKycLoading(true);
    setKycError('');
    setKycSuccess('');
    try {
      await axios.post(`${API_URL}/api/vendors/kyc`, kycForm, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setKycSuccess('Dossier KYC soumis avec succès ! Un administrateur va valider vos documents.');
      if (fetchVendorProfile) fetchVendorProfile();
    } catch (err) {
      setKycError(err.response?.data?.message || 'Erreur lors de la soumission KYC');
    } finally {
      setKycLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'shop') {
      setCopiedShop(true);
      setTimeout(() => setCopiedShop(false), 2000);
    } else {
      setCopiedBoutique(true);
      setTimeout(() => setCopiedBoutique(false), 2000);
    }
  };

  const countries = ['Cameroun', "Côte d'Ivoire", 'Sénégal', 'Gabon', 'Congo', 'Tchad', 'RCA'];

  const kycStatus = vendorData?.kycStatus || 'NOT_SUBMITTED';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Paramètres de la boutique</h2>
        <p className="text-sm text-gray-500">Personnalisez votre boutique en ligne et gérez votre conformité.</p>
      </div>

      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}

      {/* 1. LIENS PERSONNALISÉS DE LA BOUTIQUE (Modèle Chariow) */}
      {vendorData?.slug && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-300" size={20} />
              <h3 className="font-bold text-base">Vos liens uniques de boutique</h3>
            </div>
            <a
              href={`/shop/${vendorData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              Visiter <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-xs text-blue-200">
            Partagez ces liens à vos clients sur WhatsApp, Facebook, TikTok ou par email pour vendre vos produits physiques et digitaux.
          </p>
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2 text-xs">
              <span className="font-mono text-blue-100 truncate mr-2">{window.location.origin}/shop/{vendorData.slug}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${window.location.origin}/shop/${vendorData.slug}`, 'shop')}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
              >
                {copiedShop ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedShop ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <div className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2 text-xs">
              <span className="font-mono text-blue-100 truncate mr-2">{window.location.origin}/boutique/{vendorData.slug}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${window.location.origin}/boutique/${vendorData.slug}`, 'boutique')}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
              >
                {copiedBoutique ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedBoutique ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODULE VÉRIFICATION D'IDENTITÉ (KYC) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              kycStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
              kycStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
              kycStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {kycStatus === 'VERIFIED' ? <ShieldCheck size={24} /> :
               kycStatus === 'REJECTED' ? <ShieldX size={24} /> :
               <ShieldAlert size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Vérification d'identité (KYC Vendeur)</h3>
              <p className="text-xs text-gray-500">Conforme au Cahier des Charges Marketivo</p>
            </div>
          </div>

          <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${
            kycStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
            kycStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
            kycStatus === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-gray-100 text-gray-700 border border-gray-300'
          }`}>
            {kycStatus === 'VERIFIED' ? '✓ Compte Vérifié' :
             kycStatus === 'PENDING' ? '⏳ En cours de validation' :
             kycStatus === 'REJECTED' ? '✕ Dossier Rejeté' :
             '⚠️ Non soumis'}
          </span>
        </div>

        {/* Message d'information KYC */}
        {kycStatus !== 'VERIFIED' && (
          <div className={`p-4 rounded-xl text-xs space-y-1 ${
            kycStatus === 'PENDING' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
            kycStatus === 'REJECTED' ? 'bg-red-50 text-red-900 border border-red-200' :
            'bg-blue-50 text-blue-900 border border-blue-200'
          }`}>
            <p className="font-semibold text-sm">
              {kycStatus === 'PENDING' ? 'Votre dossier est en cours d’examen par l’administration' :
               kycStatus === 'REJECTED' ? `Votre dossier a été rejeté : ${vendorData?.kycRejectionReason || 'Veuillez soumettre des documents plus lisibles'}` :
               'Information importante concernant les retraits de fonds'}
            </p>
            <p>
              Vous pouvez publier vos produits physiques et digitaux dès maintenant. Cependant, vos <strong>retraits de fonds restent bloqués</strong> tant que votre pièce d'identité et votre selfie n'ont pas été vérifiés par l'administrateur.
            </p>
          </div>
        )}

        {kycSuccess && <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold">{kycSuccess}</div>}
        {kycError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold">{kycError}</div>}

        {kycStatus !== 'VERIFIED' && (
          <form onSubmit={handleKycSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document d'identité */}
              <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    1. Pièce d'identité (CNI, Passeport, Récépissé) *
                  </label>
                  <p className="text-[11px] text-gray-500 mb-3">Photo recto/verso lisible ou PDF (max 25 Mo)</p>
                </div>
                {kycForm.idDocument ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center justify-between">
                      <span className="truncate">Document chargé</span>
                      <a href={kycForm.idDocument} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Voir</a>
                    </div>
                    <label className="block text-center text-xs text-blue-600 cursor-pointer hover:underline">
                      Remplacer le document
                      <input type="file" className="hidden" onChange={(e) => handleKycFileUpload(e, 'idDocument')} />
                    </label>
                  </div>
                ) : (
                  <label className="w-full flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                    <Upload size={22} className="text-gray-400 mb-1" />
                    <span className="text-xs font-medium text-gray-700">Choisir la pièce d'identité</span>
                    <input type="file" className="hidden" onChange={(e) => handleKycFileUpload(e, 'idDocument')} />
                  </label>
                )}
              </div>

              {/* Photo Selfie */}
              <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    2. Photo Selfie du vendeur *
                  </label>
                  <p className="text-[11px] text-gray-500 mb-3">Votre visage bien éclairé tenant votre pièce d'identité</p>
                </div>
                {kycForm.selfie ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center justify-between">
                      <span className="truncate">Selfie chargé</span>
                      <a href={kycForm.selfie} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Voir</a>
                    </div>
                    <label className="block text-center text-xs text-blue-600 cursor-pointer hover:underline">
                      Remplacer le selfie
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleKycFileUpload(e, 'selfie')} />
                    </label>
                  </div>
                ) : (
                  <label className="w-full flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                    <Camera size={22} className="text-gray-400 mb-1" />
                    <span className="text-xs font-medium text-gray-700">Prendre / Choisir un selfie</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleKycFileUpload(e, 'selfie')} />
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={kycLoading || !kycForm.idDocument || !kycForm.selfie}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              {kycLoading ? 'Envoi du dossier...' : kycStatus === 'REJECTED' ? 'Soumettre un nouveau dossier KYC' : 'Soumettre mes documents pour validation'}
            </button>
          </form>
        )}
      </div>

      {/* 3. FORMULAIRE PRINCIPAL DE LA BOUTIQUE */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
        <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
          <Store size={18} className="text-orange-500" />
          Identité visuelle et informations
        </h3>

        {/* Banner */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Bannière de la boutique</label>
          <div className="relative h-36 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
            {form.banner && <img src={form.banner} alt="" className="w-full h-full object-cover" />}
            <label className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer hover:bg-black/35 transition-colors">
              <div className="bg-white rounded-full p-2.5 shadow-md flex items-center gap-2 text-xs font-medium text-gray-700">
                <Camera size={16} /> Changer la bannière
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'banner')} />
            </label>
          </div>
        </div>

        {/* Logo et Couleur d'accent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Logo de la boutique</label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border flex-shrink-0">
                {form.logo ? (
                  <img src={form.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-orange-600 flex items-center justify-center">
                    <Store size={28} className="text-white" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer hover:bg-black/35 transition-colors">
                  <Upload size={16} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                </label>
              </div>
              <p className="text-xs text-gray-500">Format recommandé: 300x300px, carré.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Palette size={14} className="text-orange-500" />
              Couleur thématique de la boutique (Chariow Style)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5"
              />
              <span className="font-mono text-xs uppercase text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {form.accentColor}
              </span>
              <div
                className="h-7 w-20 rounded-md text-[10px] text-white flex items-center justify-center font-bold shadow-sm"
                style={{ backgroundColor: form.accentColor }}
              >
                Aperçu
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de la boutique *</label>
          <input
            type="text"
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Slogan ou phrase d'accroche (Tagline)</label>
          <input
            type="text"
            value={form.tagline}
            placeholder="Ex: Formations et ressources exclusives pour créateurs africains"
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
            rows={3}
            placeholder="Décrivez votre boutique, vos spécialités et vos engagements..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone de contact *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Numéro WhatsApp</label>
            <input
              type="tel"
              value={form.whatsapp}
              placeholder="+237 6XXXXXXXX"
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse physique / Siège</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
            placeholder="Ex: Akwa, Face Salle des Fêtes"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ville</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="Douala, Yaoundé..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Pays</label>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-sm"
            >
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow transition-colors text-sm"
        >
          <Save size={18} /> {loading ? 'Enregistrement en cours...' : 'Enregistrer les paramètres'}
        </button>
      </form>

      {/* 4. RÉSEAUX SOCIAUX */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
          <Globe size={18} className="text-orange-500" /> Réseaux sociaux & Liens
        </h3>
        <p className="text-xs text-gray-500">Ajoutez vos liens officiels pour rassurer vos acheteurs et développer votre communauté.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'facebook', label: 'Facebook', icon: <Facebook size={16} className="text-blue-600" />, placeholder: 'https://facebook.com/...' },
            { key: 'instagram', label: 'Instagram', icon: <Instagram size={16} className="text-pink-500" />, placeholder: 'https://instagram.com/...' },
            { key: 'twitter', label: 'X (Twitter)', icon: <Twitter size={16} className="text-gray-800" />, placeholder: 'https://x.com/...' },
            { key: 'tiktok', label: 'TikTok', icon: <span className="text-sm">🎵</span>, placeholder: 'https://tiktok.com/@...' },
            { key: 'youtube', label: 'YouTube', icon: <Youtube size={16} className="text-red-600" />, placeholder: 'https://youtube.com/...' },
            { key: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={16} className="text-blue-700" />, placeholder: 'https://linkedin.com/in/...' },
            { key: 'website', label: 'Site web', icon: <Globe size={16} className="text-gray-600" />, placeholder: 'https://monsite.com' },
          ].map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-lg border">{s.icon}</span>
              <input
                type="url"
                placeholder={s.placeholder}
                value={form.socialLinks[s.key] || ''}
                onChange={(e) => setForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [s.key]: e.target.value } }))}
                className="flex-1 px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={async () => {
            setLoading(true); setError(''); setSuccess('');
            try {
              await axios.put(`${API_URL}/api/vendors/me`, { socialLinks: form.socialLinks }, {
                headers: { Authorization: `Bearer ${user.token}` }
              });
              setSuccess('Réseaux sociaux mis à jour !');
              if (fetchVendorProfile) fetchVendorProfile();
              setTimeout(() => setSuccess(''), 3000);
            } catch (err) { setError(err.response?.data?.message || 'Erreur'); }
            finally { setLoading(false); }
          }}
          disabled={loading}
          className="w-full bg-gray-800 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2 text-xs transition-colors"
        >
          <Save size={16} /> Enregistrer les réseaux sociaux
        </button>
      </div>

      {/* 5. MODES DE PAIEMENT */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
          <CreditCard size={18} className="text-orange-500" /> Modes de paiement acceptés
        </h3>
        <p className="text-xs text-gray-500">Sélectionnez les modes de paiement que vos clients peuvent utiliser.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'momo_mtn', label: 'MTN Mobile Money', icon: <Smartphone size={18} className="text-yellow-500" />, desc: 'Paiement direct via MTN MoMo' },
            { id: 'momo_orange', label: 'Orange Money', icon: <Smartphone size={18} className="text-orange-500" />, desc: 'Paiement direct via Orange Money' },
            { id: 'cod', label: 'Paiement à la livraison', icon: <Truck size={18} className="text-green-600" />, desc: 'Pour produits physiques uniquement' },
            { id: 'bank_transfer', label: 'Virement bancaire', icon: <Banknote size={18} className="text-blue-600" />, desc: 'Transfert bancaire manuel' },
          ].map(pm => (
            <label key={pm.id}
              className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                (form.acceptedPayments || []).includes(pm.id)
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-200'
              }`}
            >
              <input type="checkbox" className="sr-only"
                checked={(form.acceptedPayments || []).includes(pm.id)}
                onChange={() => togglePayment(pm.id)}
              />
              <span className="flex-shrink-0">{pm.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-gray-900">{pm.label}</p>
                <p className="text-[11px] text-gray-500 truncate">{pm.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                (form.acceptedPayments || []).includes(pm.id) ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`}>
                {(form.acceptedPayments || []).includes(pm.id) && <span className="text-white text-xs">✓</span>}
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={async () => {
            setLoading(true); setError(''); setSuccess('');
            try {
              await axios.put(`${API_URL}/api/vendors/me`, { acceptedPayments: form.acceptedPayments }, {
                headers: { Authorization: `Bearer ${user.token}` }
              });
              setSuccess('Modes de paiement mis à jour !');
              if (fetchVendorProfile) fetchVendorProfile();
              setTimeout(() => setSuccess(''), 3000);
            } catch (err) { setError(err.response?.data?.message || 'Erreur'); }
            finally { setLoading(false); }
          }}
          disabled={loading}
          className="w-full bg-gray-800 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2 text-xs transition-colors"
        >
          <Save size={16} /> Enregistrer les modes de paiement
        </button>
      </div>
    </div>
  );
};

export default VendorSettings;
