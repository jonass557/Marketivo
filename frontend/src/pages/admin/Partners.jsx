import React, { useState, useEffect, useContext } from 'react';
import { Handshake, Plus, Edit, Trash2, ToggleLeft, ToggleRight, X, Save, ExternalLink } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const emptyForm = { name: '', logo: '', website: '', order: 0, isActive: true };

const Partners = () => {
  const { user } = useContext(AuthContext);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${user.token}` };

  useEffect(() => { fetchPartners(); }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/partners/admin`, { headers });
      setPartners(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ name: p.name, logo: p.logo, website: p.website || '', order: p.order || 0, isActive: p.isActive }); setEditingId(p._id || p.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/partners/${editingId}`, form, { headers });
      } else {
        await axios.post(`${API_URL}/api/partners`, form, { headers });
      }
      closeForm();
      fetchPartners();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    try {
      await axios.put(`${API_URL}/api/partners/${p._id || p.id}`, { isActive: !p.isActive }, { headers });
      fetchPartners();
    } catch (err) { alert('Erreur'); }
  };

  const deletePartner = async (id) => {
    if (!window.confirm('Supprimer ce partenaire ?')) return;
    try {
      await axios.delete(`${API_URL}/api/partners/${id}`, { headers });
      fetchPartners();
    } catch (err) { alert('Erreur'); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Handshake className="text-orange-500" size={24} /> Partenaires
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les logos partenaires affichés sur la page d'accueil</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
          <Plus size={16} /> Ajouter un partenaire
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? 'Modifier le partenaire' : 'Nouveau partenaire'}</h2>
              <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du partenaire *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required placeholder="Ex: MTN Cameroun" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL du logo *</label>
                <input type="url" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required placeholder="https://..." />
                {form.logo && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-xl flex items-center justify-center h-16">
                    <img src={form.logo} alt="preview" className="max-h-full max-w-full object-contain"
                      onError={(e) => { e.target.src = ''; e.target.alt = 'Image invalide'; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site web (optionnel)</label>
                <input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
                  <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" min="0" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 w-full">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="text-orange-500" />
                    <span className="text-sm font-medium">Actif</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 py-2.5 border rounded-xl text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-60">
                  <Save size={15} /> {editingId ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partners Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-orange-200 p-12 text-center">
          <Handshake size={40} className="text-orange-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun partenaire encore</p>
          <p className="text-sm text-gray-400 mt-1">Ajoutez des logos partenaires pour les afficher sur la page d'accueil</p>
          <button onClick={openNew} className="mt-4 bg-orange-500 text-white px-5 py-2 rounded-xl text-sm hover:bg-orange-600">
            Ajouter le premier partenaire
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {partners.map((p) => (
            <div key={p._id || p.id} className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 ${!p.isActive ? 'opacity-50 border-dashed' : 'border-gray-200'}`}>
              <div className="flex items-center justify-center h-20 bg-gray-50 rounded-xl overflow-hidden">
                <img src={p.logo} alt={p.name} className="max-h-16 max-w-full object-contain"
                  onError={(e) => { e.target.src = ''; e.target.alt = '❌'; }} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-orange-500 hover:underline flex items-center gap-1 mt-0.5">
                    <ExternalLink size={10} /> {p.website.replace('https://', '')}
                  </a>
                )}
                <p className="text-xs text-gray-400 mt-0.5">Ordre: {p.order}</p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t">
                <button onClick={() => toggleActive(p)} title={p.isActive ? 'Désactiver' : 'Activer'} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  {p.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                </button>
                <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-50 rounded-lg">
                  <Edit size={15} className="text-blue-500" />
                </button>
                <button onClick={() => deletePartner(p._id || p.id)} className="p-1.5 hover:bg-red-50 rounded-lg ml-auto">
                  <Trash2 size={15} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">
        <strong>Conseil :</strong> Les logos partenaires s'affichent en défilement automatique sur la page d'accueil. Utilisez des images de 200×80px minimum sur fond transparent (PNG) pour un meilleur rendu.
      </div>
    </div>
  );
};

export default Partners;
