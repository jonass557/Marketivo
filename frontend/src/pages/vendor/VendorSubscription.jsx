import React, { useState, useEffect, useContext } from 'react';
import { Check, Star, Zap, Crown, Gift, ArrowRight, Clock, CreditCard } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';
import { DEFAULT_PLANS } from '../../data/defaultData';

const VendorSubscription = () => {
  const { user } = useContext(AuthContext);
  // Affichage instantané avec les plans par défaut ou le cache
  const [plans, setPlans] = useState(() => {
    try {
      const cached = localStorage.getItem('marketivo_subscription_plans');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PLANS;
  });
  const [currentSub, setCurrentSub] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('monthly');

  useEffect(() => {
    Promise.allSettled([fetchPlans(), fetchMySubscription()]).finally(() => setLoading(false));
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/subscriptions/plans`, { timeout: 12000 });
      if (Array.isArray(data) && data.length > 0) {
        setPlans(data);
        try {
          localStorage.setItem('marketivo_subscription_plans', JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Plans par défaut utilisés:', err.message);
    }
  };

  const fetchMySubscription = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setCurrentSub(data.current);
      setHistory(data.history || []);
    } catch (err) { console.error(err); }
  };

  const handleSubscribe = async (planId) => {
    if (subscribing) return;
    setSubscribing(true);
    try {
      await axios.post(`${API_URL}/api/subscriptions/subscribe`, {
        planId,
        paymentMethod: 'mobile_money',
        duration: selectedDuration === 'quarterly' ? 'quarterly' : 'monthly'
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert('Abonnement activé avec succès !');
      fetchMySubscription();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la souscription');
    } finally {
      setSubscribing(false);
    }
  };

  const formatPrice = (p) => new Intl.NumberFormat('fr-CM').format(p);

  const iconMap = {
    gift: Gift, flame: Zap, rocket: Star, trophy: Crown
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Current subscription */}
      {currentSub && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-200 text-sm">Plan actuel</p>
              <h2 className="text-2xl font-bold mt-1">{currentSub.planSnapshot?.name}</h2>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-blue-100">
                <span className="flex items-center gap-1"><CreditCard size={14} /> Commission: {currentSub.planSnapshot?.commission}%</span>
                <span className="flex items-center gap-1"><Clock size={14} /> Expire: {new Date(currentSub.endDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatPrice(currentSub.amountPaid)}</p>
              <p className="text-blue-200 text-sm">FCFA / {currentSub.planSnapshot?.price === 0 ? 'gratuit' : 'mois'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Duration toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
          <button onClick={() => setSelectedDuration('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDuration === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}>
            Mensuel
          </button>
          <button onClick={() => setSelectedDuration('quarterly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDuration === 'quarterly' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}>
            Trimestriel <span className="text-xs text-green-600">-10%</span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => {
          const Icon = iconMap[plan.icon] || Gift;
          const isCurrentPlan = currentSub?.plan?._id === plan._id || currentSub?.plan === plan._id;
          const price = selectedDuration === 'quarterly' && !plan.isFree
            ? Math.round(plan.price * 3 * 0.9) : plan.price;

          return (
            <div key={plan._id || plan.id} className={`bg-white rounded-2xl border-2 p-5 relative transition-all hover:shadow-lg ${
              plan.isRecommended ? 'border-blue-500 shadow-lg' : isCurrentPlan ? 'border-green-500' : 'border-gray-200'
            }`}>
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Recommandé
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Plan actuel
                </div>
              )}

              <div className="text-center mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3`}
                  style={{ backgroundColor: plan.color + '20', color: plan.color }}>
                  <Icon size={24} />
                </div>
                <h3 className="font-bold text-gray-800">{plan.name}</h3>
                <div className="mt-2">
                  {plan.isFree ? (
                    <p className="text-3xl font-bold text-gray-800">Gratuit</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-gray-800">{formatPrice(price)}</p>
                      <p className="text-sm text-gray-500">FCFA / {selectedDuration === 'quarterly' ? 'trimestre' : 'mois'}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Commission</span>
                  <span className="font-semibold" style={{ color: plan.color }}>{plan.commission}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Produits</span>
                  <span className="font-semibold">{plan.maxProducts === 0 ? 'Illimité' : plan.maxProducts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Visibilité</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map(l => (
                      <div key={l} className={`w-4 h-1.5 rounded-full ${l <= plan.visibilityLevel ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.advantages?.map((adv, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {adv}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <button disabled className="w-full py-2.5 rounded-xl text-sm font-medium bg-green-100 text-green-700 cursor-default">
                  Plan actuel
                </button>
              ) : plan.isFree ? (
                <button disabled className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 cursor-default">
                  Inclus par défaut
                </button>
              ) : (
                <button onClick={() => handleSubscribe(plan._id || plan.id)} disabled={subscribing}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: plan.color }}>
                  {subscribing ? 'Traitement...' : 'Choisir ce plan'} <ArrowRight size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Historique */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-gray-800 mb-4">Historique des abonnements</h3>
          <div className="space-y-3">
            {history.map(sub => (
              <div key={sub._id || sub.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{sub.planSnapshot?.name || sub.plan?.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(sub.startDate).toLocaleDateString('fr-FR')} → {new Date(sub.endDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    sub.status === 'EXPIRED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                  }`}>{sub.status}</span>
                  <p className="text-sm font-medium mt-1">{formatPrice(sub.amountPaid)} FCFA</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorSubscription;
