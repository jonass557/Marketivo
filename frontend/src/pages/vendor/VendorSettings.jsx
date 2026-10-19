import React, { useState, useContext, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Store, Upload, Camera, Globe, Facebook, Instagram, Twitter, Youtube, Linkedin, Smartphone, Banknote, CreditCard, Truck } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const VendorSettings = () => {
  const { user } = useContext(AuthContext);
  const { vendorData, fetchVendorProfile } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    shopName: '', description: '', phone: '', whatsapp: '',
    address: '', city: '', country: 'Cameroun', logo: '', banner: '',
    socialLinks: { facebook: '', instagram: '', twitter: '', tiktok: '', youtube: '', linkedin: '', website: '' },
    acceptedPayments: ['cod']
  });

  useEffect(() => {
    if (vendorData) {
      setForm({
        shopName: vendorData.shopName || '',
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
      setSuccess('Profil mis à jour avec succès !');
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
      setError('Erreur lors de l\'upload de l\'image');
    }
  };

  const countries = ['Cameroun', 'Côte d\'Ivoire', 'Sénégal', 'Gabon', 'Congo', 'Tchad', 'RCA'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Paramètres de la boutique</h2>

      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

      {/* Shop URL */}
      {vendorData?.slug && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            <strong>Lien de votre boutique :</strong>{' '}
            <a href={`${window.location.origin}/shop/${vendorData.slug}`}
              target="_blank" rel="noopener noreferrer"
              className="underline break-all">
              {window.location.origin}/shop/{vendorData.slug}
            </a>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {/* Banner */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bannière</label>
          <div className="relative h-32 bg-gray-100 rounded-xl overflow-hidden">
            {form.banner && <img src={form.banner} alt="" className="w-full h-full object-cover" />}
            <label className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer hover:bg-black/30 transition-colors">
              <div className="bg-white rounded-full p-2 shadow"><Camera size={20} className="text-gray-600" /></div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'banner')} />
            </label>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden">
              {form.logo ? (
                <img src={form.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                  <Store size={28} className="text-white" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer hover:bg-black/30 transition-colors">
                <Upload size={16} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
              </label>
            </div>
            <p className="text-xs text-gray-500">Format recommandé: 200x200px, JPG ou PNG</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
          <input type="text" value={form.shopName} onChange={(e) => setForm({...form, shopName: e.target.value})}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" rows={3} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input type="tel" value={form.whatsapp} onChange={(e) => setForm({...form, whatsapp: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
            <input type="text" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
            <select value={form.country} onChange={(e) => setForm({...form, country: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={18} /> {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </form>

      {/* Réseaux sociaux */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Globe size={18} className="text-orange-500" /> Réseaux sociaux</h3>
        <p className="text-xs text-gray-500">Ajoutez vos liens pour que vos clients puissent vous suivre.</p>
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
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
          className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          <Save size={16} /> Enregistrer les réseaux sociaux
        </button>
      </div>

      {/* Modes de paiement acceptés */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><CreditCard size={18} className="text-orange-500" /> Modes de paiement acceptés</h3>
        <p className="text-xs text-gray-500">Sélectionnez les modes de paiement que vous acceptez.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'momo_mtn', label: 'MTN Mobile Money', icon: <Smartphone size={18} className="text-yellow-500" />, desc: 'Paiement via MTN MoMo' },
            { id: 'momo_orange', label: 'Orange Money', icon: <Smartphone size={18} className="text-orange-500" />, desc: 'Paiement via Orange Money' },
            { id: 'cod', label: 'Paiement à la livraison', icon: <Truck size={18} className="text-green-600" />, desc: 'Le client paie à la réception' },
            { id: 'bank_transfer', label: 'Virement bancaire', icon: <Banknote size={18} className="text-blue-600" />, desc: 'Transfert vers compte bancaire' },
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
                <p className="font-medium text-sm">{pm.label}</p>
                <p className="text-xs text-gray-500 truncate">{pm.desc}</p>
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
          className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          <Save size={16} /> Enregistrer les modes de paiement
        </button>
      </div>
    </div>
  );
};

export default VendorSettings;
