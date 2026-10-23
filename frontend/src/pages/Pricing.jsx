import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gift, Zap, Star, Crown, ArrowRight } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import { DEFAULT_PLANS } from '../data/defaultData';

const Pricing = () => {
  // Chargement instantané (Cache local ou plans par défaut intégrés : 0ms de latence)
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
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState('monthly');

  useEffect(() => {
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
        console.warn('API lente ou hors-ligne, plans par défaut actifs:', err.message);
      }
    };
    fetchPlans();
  }, []);

  const formatPrice = (p) => new Intl.NumberFormat('fr-CM').format(p);
  const iconMap = { gift: Gift, flame: Zap, rocket: Star, trophy: Crown };

  return (
    <div className="py-8 sm:py-12 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
            Choisissez votre plan vendeur
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-3 max-w-xl mx-auto">
            Commencez gratuitement et évoluez selon vos besoins. Des tarifs adaptés au marché africain.
          </p>
        </div>

        {/* Duration toggle */}
        <div className="flex justify-center mb-8 sm:mb-10">
          <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
            <button onClick={() => setDuration('monthly')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                duration === 'monthly' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Mensuel
            </button>
            <button onClick={() => setDuration('quarterly')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                duration === 'quarterly' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Trimestriel <span className="text-xs text-green-600 font-bold">-10%</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {plans.map(plan => {
              const Icon = iconMap[plan.icon] || Gift;
              const price = duration === 'quarterly' && !plan.isFree
                ? Math.round(plan.price * 3 * 0.9) : plan.price;

              return (
                <div key={plan._id || plan.id}
                  className={`bg-white rounded-2xl border-2 p-5 sm:p-6 relative flex flex-col transition-all hover:shadow-xl ${
                    plan.isRecommended ? 'border-orange-500 shadow-lg sm:scale-[1.02] order-first sm:order-none' : 'border-gray-200'
                  }`}>
                  {plan.isRecommended && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-4 py-1.5 rounded-full font-bold whitespace-nowrap">
                      ⭐ Le plus populaire
                    </div>
                  )}

                  <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: plan.color + '15', color: plan.color }}>
                      <Icon size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    {plan.isFree ? (
                      <div>
                        <span className="text-4xl font-bold text-gray-800">Gratuit</span>
                        <p className="text-sm text-gray-500 mt-1">Pour toujours</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-4xl font-bold text-gray-800">{formatPrice(price)}</span>
                        <span className="text-gray-500 ml-1">FCFA</span>
                        <p className="text-sm text-gray-500 mt-1">
                          / {duration === 'quarterly' ? 'trimestre' : 'mois'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Key metrics */}
                  <div className="space-y-3 mb-6 pb-6 border-b">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Commission</span>
                      <span className="font-bold" style={{ color: plan.color }}>{plan.commission}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Produits</span>
                      <span className="font-bold">{plan.maxProducts === 0 ? 'Illimité' : plan.maxProducts}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Visibilité</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map(l => (
                          <div key={l} className={`w-5 h-2 rounded-full ${
                            l <= plan.visibilityLevel ? '' : 'bg-gray-200'
                          }`} style={l <= plan.visibilityLevel ? { backgroundColor: plan.color } : {}} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Advantages */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.advantages?.map((adv, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={`/vendor/register?planId=${plan._id || plan.id}&planName=${encodeURIComponent(plan.name)}`}
                    className={`w-full py-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 transition-all ${
                      plan.isRecommended
                        ? 'text-white hover:opacity-90'
                        : plan.isFree
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'text-white hover:opacity-90'
                    }`}
                    style={!plan.isFree ? { backgroundColor: plan.color } : {}}>
                    {plan.isFree ? 'Commencer gratuitement' : 'Choisir ce plan'} <ArrowRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ / Trust */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Questions fréquentes</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Puis-je changer de plan à tout moment ?',
                a: 'Oui, vous pouvez passer à un plan supérieur à tout moment. Le changement est immédiat.'
              },
              {
                q: 'Quels moyens de paiement acceptez-vous ?',
                a: 'Mobile Money (MTN, Orange Money), cartes bancaires et paiement à la livraison.'
              },
              {
                q: 'Que se passe-t-il si mon abonnement expire ?',
                a: 'Vos produits restent en ligne mais vous repassez automatiquement au plan gratuit avec ses limites.'
              },
              {
                q: 'Le chat est-il inclus dans tous les plans ?',
                a: 'Oui ! Le chat client ↔ vendeur est disponible sur tous les plans, sans restriction.'
              }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border p-5">
                <h4 className="font-semibold text-gray-800">{item.q}</h4>
                <p className="text-sm text-gray-500 mt-2">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
