import React, { useState, useEffect, useContext } from 'react';
import {
  Store, Search, CheckCircle, XCircle, Clock, Eye, Ban, Shield,
  ShieldCheck, ShieldAlert, ShieldX, ExternalLink, Download, Lock, Unlock
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const Vendors = () => {
  const { user } = useContext(AuthContext);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [kycModalVendor, setKycModalVendor] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchVendors(); }, [page, filter, search]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_URL}/api/vendors/admin/all?status=${filter}&search=${search}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setVendors(data.vendors || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (vendorId, status) => {
    if (!window.confirm(`Confirmer le changement de statut vers "${status}" ?`)) return;
    try {
      await axios.put(`${API_URL}/api/vendors/admin/${vendorId}/status`, { status }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const updateCommission = async (vendorId, commission) => {
    try {
      await axios.put(`${API_URL}/api/vendors/admin/${vendorId}/commission`, { commission }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchVendors();
      alert('Commission mise à jour');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const updateKYC = async (vendorId, newKycStatus, reason = '') => {
    setActionLoading(true);
    try {
      await axios.put(`${API_URL}/api/vendors/admin/${vendorId}/kyc`, {
        kycStatus: newKycStatus,
        rejectionReason: reason
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchVendors();
      setKycModalVendor(null);
      setRejectionReason('');
      alert(`Statut KYC mis à jour : ${newKycStatus}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour KYC');
    } finally {
      setActionLoading(false);
    }
  };

  const togglePayoutBlock = async (vendor) => {
    const newBlockedState = !vendor.payoutsBlocked;
    if (!window.confirm(`Voulez-vous ${newBlockedState ? 'BLOQUER' : 'DÉBLOQUER'} les retraits de fonds pour ce vendeur ?`)) return;
    try {
      await axios.put(`${API_URL}/api/vendors/admin/${vendor._id || vendor.id}/kyc`, {
        payoutsBlocked: newBlockedState
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const statusConfig = {
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700', icon: Ban },
    REJECTED: { label: 'Rejeté', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  };

  const kycStatusConfig = {
    NOT_SUBMITTED: { label: 'Non soumis', color: 'bg-gray-100 text-gray-700', icon: ShieldAlert },
    PENDING: { label: 'KYC à vérifier', color: 'bg-amber-100 text-amber-800 font-bold', icon: Clock },
    VERIFIED: { label: 'Vérifié', color: 'bg-emerald-100 text-emerald-800 font-bold', icon: ShieldCheck },
    REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: ShieldX },
  };

  const filters = [
    { value: '', label: 'Tous les comptes' },
    { value: 'PENDING', label: 'Boutique en attente' },
    { value: 'APPROVED', label: 'Boutiques actives' },
    { value: 'SUSPENDED', label: 'Suspendues' },
  ];

  const displayedVendors = vendors.filter(v => {
    if (kycFilter) {
      return (v.kycStatus || 'NOT_SUBMITTED') === kycFilter;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Vendeurs & KYC</h1>
          <p className="text-gray-500 text-xs">{total} vendeur(s) enregistré(s) • Conformité Chariow + Jumia</p>
        </div>
      </div>

      {/* Filtres + Recherche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom de boutique, email, téléphone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.value ? 'bg-orange-500 text-white shadow' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => { setKycFilter(kycFilter === 'PENDING' ? '' : 'PENDING'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              kycFilter === 'PENDING' ? 'bg-amber-600 text-white shadow' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock size={14} /> KYC en attente ({vendors.filter(v => v.kycStatus === 'PENDING').length})
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : displayedVendors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 text-sm">Aucun vendeur trouvé</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Boutique</th>
                  <th className="px-4 py-3">Vendeur</th>
                  <th className="px-4 py-3">Statut Boutique</th>
                  <th className="px-4 py-3">Vérification KYC</th>
                  <th className="px-4 py-3">Retraits</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {displayedVendors.map(v => {
                  const status = statusConfig[v.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  const kyc = kycStatusConfig[v.kycStatus] || kycStatusConfig.NOT_SUBMITTED;
                  const KycIcon = kyc.icon;
                  return (
                    <React.Fragment key={v._id || v.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {v.logo ? <img src={v.logo} alt="" className="w-full h-full object-cover" /> : <Store size={18} className="text-orange-600" />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{v.shopName}</p>
                              <a href={`/shop/${v.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                                /{v.slug} <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs">{v.user?.fullName || v.shopName}</p>
                          <p className="text-xs text-gray-400">{v.user?.email || '-'}</p>
                          <p className="text-xs text-gray-400">{v.phone || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${status.color}`}>
                            <StatusIcon size={12} /> {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${kyc.color}`}>
                              <KycIcon size={12} /> {kyc.label}
                            </span>
                            {(v.kycIdDocument || v.kycSelfie) && (
                              <button
                                onClick={() => setKycModalVendor(v)}
                                className="text-xs text-blue-600 hover:underline font-bold"
                              >
                                Examiner
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => togglePayoutBlock(v)}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                              v.payoutsBlocked
                                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="Cliquer pour basculer"
                          >
                            {v.payoutsBlocked ? <Lock size={12} /> : <Unlock size={12} />}
                            {v.payoutsBlocked ? 'Bloqués' : 'Autorisés'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedVendor(selectedVendor === (v._id || v.id) ? null : (v._id || v.id))}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                              title="Détails"
                            >
                              <Eye size={16} />
                            </button>
                            {v.status === 'PENDING' && (
                              <button onClick={() => updateStatus(v._id || v.id, 'APPROVED')} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Approuver la boutique">
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {v.status === 'APPROVED' && (
                              <button onClick={() => updateStatus(v._id || v.id, 'SUSPENDED')} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="Suspendre">
                                <Ban size={16} />
                              </button>
                            )}
                            {v.status === 'SUSPENDED' && (
                              <button onClick={() => updateStatus(v._id || v.id, 'APPROVED')} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Réactiver">
                                <Shield size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable details */}
                      {selectedVendor === (v._id || v.id) && (
                        <tr>
                          <td colSpan="6" className="px-4 py-4 bg-gray-50/80">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="text-gray-500">Ville:</span>
                                <span className="ml-2 font-bold">{v.city || '-'}, {v.country}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Total ventes:</span>
                                <span className="ml-2 font-bold">{v.totalSales || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Ventes Physiques:</span>
                                <span className="ml-2 font-bold text-blue-600">{v.physicalSales || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Ventes Digitales:</span>
                                <span className="ml-2 font-bold text-purple-600">{v.digitalSales || 0}</span>
                              </div>
                              <div className="col-span-2">
                                <label className="text-gray-500 block mb-1">Commission override (%):</label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    defaultValue={v.commissionOverride ?? ''}
                                    placeholder="Utiliser le plan"
                                    className="w-32 px-3 py-1.5 border rounded-lg text-xs"
                                    id={`commission-${v._id || v.id}`}
                                  />
                                  <button
                                    onClick={() => {
                                      const val = document.getElementById(`commission-${v._id || v.id}`).value;
                                      updateCommission(v._id || v.id, val === '' ? null : parseFloat(val));
                                    }}
                                    className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600"
                                  >
                                    Sauvegarder
                                  </button>
                                </div>
                              </div>
                              {v.kycRejectionReason && (
                                <div className="col-span-2 text-red-600">
                                  <span className="font-bold">Motif du rejet KYC :</span> {v.kycRejectionReason}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold ${page === i + 1 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL EXAMEN KYC VENDEUR */}
      {kycModalVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setKycModalVendor(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Examen du dossier KYC</h3>
                <p className="text-xs text-gray-500">Boutique : {kycModalVendor.shopName} ({kycModalVendor.user?.fullName})</p>
              </div>
              <button onClick={() => setKycModalVendor(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            {/* Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pièce d'identité */}
              <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
                <span className="text-xs font-bold text-gray-700 block">1. Pièce d'identité (CNI / Passeport)</span>
                {kycModalVendor.kycIdDocument ? (
                  <div className="space-y-2">
                    <div className="h-44 bg-white rounded-lg border overflow-hidden flex items-center justify-center">
                      <img src={kycModalVendor.kycIdDocument} alt="CNI Vendeur" className="max-h-full object-contain" />
                    </div>
                    <a
                      href={kycModalVendor.kycIdDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink size={12} /> Ouvrir en plein écran
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Aucun document chargé</p>
                )}
              </div>

              {/* Photo Selfie */}
              <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
                <span className="text-xs font-bold text-gray-700 block">2. Photo Selfie du vendeur</span>
                {kycModalVendor.kycSelfie ? (
                  <div className="space-y-2">
                    <div className="h-44 bg-white rounded-lg border overflow-hidden flex items-center justify-center">
                      <img src={kycModalVendor.kycSelfie} alt="Selfie Vendeur" className="max-h-full object-contain" />
                    </div>
                    <a
                      href={kycModalVendor.kycSelfie}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink size={12} /> Ouvrir en plein écran
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Aucun selfie chargé</p>
                )}
              </div>
            </div>

            {/* Motif de rejet si rejet */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Motif de rejet (en cas de refus) :</label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Photo CNI floue, selfie non conforme..."
                className="w-full text-xs px-3 py-2 border rounded-xl"
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setKycModalVendor(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => updateKYC(kycModalVendor._id || kycModalVendor.id, 'REJECTED', rejectionReason || 'Documents illisibles')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={14} /> Rejeter le KYC
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => updateKYC(kycModalVendor._id || kycModalVendor.id, 'VERIFIED')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow"
              >
                <CheckCircle size={14} /> Valider le KYC (Débloquer retraits)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
