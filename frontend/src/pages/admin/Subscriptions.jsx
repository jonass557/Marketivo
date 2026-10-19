import React, { useState, useEffect, useContext } from 'react';
import { CreditCard, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Star, Users, Save, X, Gift, Zap, Crown } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const Subscriptions = () => {
  const { user } = useContext(AuthContext);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', price: 0, currency: 'XAF', duration: 30,
    commission: 10, maxProducts: 20, visibilityLevel: 1,
    advantages: '', priority: 0,
    chatIncluded: true, chatPriority: false, supportPremium: false,
    isFree: false, isRecommended: false, color: '#6b7280', icon: 'gift'
  });

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/subscriptions/admin/plans`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPlans(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({
      name: '', description: '', price: 0, currency: 'XAF', duration: 30,
      commission: 10, maxProducts: 20, visibilityLevel: 1,
      advantages: '', priority: 0,
      chatIncluded: true, chatPriority: false, supportPremium: false,
      isFree: false, isRecommended: false, color: '#6b7280', icon: 'gift'
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const openEditForm = (plan) => {
    setEditingPlan(plan._id || plan.id);
    setForm({
      ...plan,
      advantages: (plan.advantages || []).join('\n'),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      commission: parseFloat(form.commission),
      maxProducts: parseInt(form.maxProducts),
      visibilityLevel: parseInt(form.visibilityLevel),
      duration: parseInt(form.duration),
      priority: parseInt(form.priority),
      advantages: form.advantages.split('\n').filter(a => a.trim())
    };

    try {
      if (editingPlan) {
        await axios.put(`${API_URL}/api/subscriptions/admin/plans/${editingPlan}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/subscriptions/admin/plans`, payload, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      }
      resetForm();
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const togglePlan = async (planId) => {
    try {
      await axios.put(`${API_URL}/api/subscriptions/admin/plans/${planId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const setRecommended = async (planId) => {
    try {
      await axios.put(`${API_URL}/api/subscriptions/admin/plans/${planId}/recommend`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const deletePlan = async (planId) => {
    if (!window.confirm('Supprimer/archiver ce plan ?')) return;
    try {
      const { data } = await axios.delete(`${API_URL}/api/subscriptions/admin/plans/${planId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert(data.message);
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const checkExpiry = async () => {
    try {
      const { data } = await axios.post(`${API_URL}/api/subscriptions/admin/check-expiry`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert(data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const formatPrice = (p) => new Intl.NumberFormat('fr-CM').format(p);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Abonnements</h1>
          <p className="text-gray-500 text-sm">Plans stockés en base de données - modifiables sans code</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkExpiry}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Vérifier expirations
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600">
            <Plus size={16} /> Nouveau plan
          </button>
        </div>
      </div>

      {/* Plan Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingPlan ? 'Modifier le plan' : 'Nouveau plan'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <div className="flex gap-2">
                    <input type="color" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})}
                      className="w-10 h-10 rounded border cursor-pointer" />
                    <input type="text" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})}
                      className="flex-1 px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%) *</label>
                  <input type="number" value={form.commission} onChange={(e) => setForm({...form, commission: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg" min="0" max="100" step="0.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée (jours)</label>
                  <input type="number" value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max produits (0 = illimité)</label>
                  <input type="number" value={form.maxProducts} onChange={(e) => setForm({...form, maxProducts: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau visibilité (1-4)</label>
                  <input type="number" value={form.visibilityLevel} onChange={(e) => setForm({...form, visibilityLevel: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg" min="1" max="4" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorité d'affichage</label>
                  <input type="number" value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avantages (un par ligne)</label>
                <textarea value={form.advantages} onChange={(e) => setForm({...form, advantages: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg" rows={4}
                  placeholder="20 produits maximum&#10;Commission 8-10%&#10;Chat inclus" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'chatIncluded', label: 'Chat inclus' },
                  { key: 'chatPriority', label: 'Chat prioritaire' },
                  { key: 'supportPremium', label: 'Support premium' },
                  { key: 'isFree', label: 'Plan gratuit' },
                  { key: 'isRecommended', label: 'Recommandé' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={form[opt.key]}
                      onChange={(e) => setForm({...form, [opt.key]: e.target.checked})}
                      className="rounded text-orange-500" />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 py-2.5 border rounded-xl text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2">
                  <Save size={16} /> {editingPlan ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => (
            <div key={plan._id || plan.id}
              className={`bg-white rounded-2xl border-2 p-5 relative ${
                !plan.isActive ? 'opacity-60 border-dashed border-gray-300' :
                plan.isRecommended ? 'border-orange-500' : 'border-gray-200'
              }`}>
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
                  Recommandé
                </div>
              )}
              {!plan.isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-xs px-3 py-1 rounded-full">
                  Inactif
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: plan.color + '20', color: plan.color }}>
                  <CreditCard size={20} />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => togglePlan(plan._id || plan.id)} title={plan.isActive ? 'Désactiver' : 'Activer'}
                    className="p-1.5 hover:bg-gray-100 rounded-lg">
                    {plan.isActive ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                  <button onClick={() => openEditForm(plan)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Edit size={16} className="text-blue-500" />
                  </button>
                  {!plan.isFree && (
                    <button onClick={() => deletePlan(plan._id || plan.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-gray-800">{plan.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{plan.description}</p>

              <div className="mt-3 mb-4">
                {plan.isFree ? (
                  <p className="text-2xl font-bold text-gray-800">Gratuit</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-800">{formatPrice(plan.price)} <span className="text-sm font-normal text-gray-500">FCFA/mois</span></p>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Commission</span>
                  <span className="font-medium">{plan.commission}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max produits</span>
                  <span className="font-medium">{plan.maxProducts === 0 ? '∞' : plan.maxProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visibilité</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4].map(l => (
                      <div key={l} className={`w-3 h-1.5 rounded-full ${l <= plan.visibilityLevel ? 'bg-orange-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Abonnés actifs</span>
                  <span className="font-medium flex items-center gap-1"><Users size={12} /> {plan.activeSubscribers || 0}</span>
                </div>
              </div>

              {!plan.isRecommended && plan.isActive && (
                <button onClick={() => setRecommended(plan._id || plan.id)}
                  className="w-full mt-4 py-2 border border-dashed border-orange-300 text-orange-500 text-xs rounded-lg hover:bg-orange-50 flex items-center justify-center gap-1">
                  <Star size={12} /> Définir comme recommandé
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <h4 className="font-semibold mb-2">Comportement des abonnements</h4>
        <ul className="space-y-1 text-blue-600">
          <li>• Un plan désactivé n'est plus visible pour les nouveaux vendeurs</li>
          <li>• Les vendeurs déjà abonnés continuent jusqu'à expiration</li>
          <li>• Impossible de renouveler un plan inactif</li>
          <li>• À l'expiration, le vendeur est rétrogradé vers le plan gratuit</li>
          <li>• Le plan gratuit ne peut pas être désactivé ni supprimé</li>
        </ul>
      </div>
    </div>
  );
};

export default Subscriptions;
