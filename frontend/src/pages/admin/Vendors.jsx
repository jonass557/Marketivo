import React, { useState, useEffect, useContext } from 'react';
import { Store, Search, CheckCircle, XCircle, Clock, Eye, Ban, Shield, ChevronDown } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const Vendors = () => {
  const { user } = useContext(AuthContext);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState(null);

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

  const statusConfig = {
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700', icon: Ban },
    REJECTED: { label: 'Rejeté', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  };

  const filters = [
    { value: '', label: 'Tous' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'APPROVED', label: 'Approuvés' },
    { value: 'SUSPENDED', label: 'Suspendus' },
    { value: 'REJECTED', label: 'Rejetés' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Vendeurs</h1>
          <p className="text-gray-500 text-sm">{total} vendeur(s) au total</p>
        </div>
      </div>

      {/* Filtres + Recherche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un vendeur..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {filters.map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                filter === f.value ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600">Aucun vendeur trouvé</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-4 py-3">Boutique</th>
                  <th className="px-4 py-3">Vendeur</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Produits</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vendors.map(v => {
                  const status = statusConfig[v.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <React.Fragment key={v._id || v.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                              {v.logo ? <img src={v.logo} alt="" className="w-full h-full rounded-xl object-cover" /> : <Store size={18} className="text-blue-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{v.shopName}</p>
                              <p className="text-xs text-gray-400">{v.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{v.user?.fullName}</p>
                          <p className="text-xs text-gray-400">{v.user?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                            <StatusIcon size={12} /> {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{v.productCount || 0}</td>
                        <td className="px-4 py-3 text-sm">{v.currentPlan || 'Aucun'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedVendor(selectedVendor === (v._id || v.id) ? null : (v._id || v.id))}
                              className="p-1.5 hover:bg-gray-100 rounded-lg" title="Détails">
                              <Eye size={16} className="text-gray-500" />
                            </button>
                            {v.status === 'PENDING' && (
                              <button onClick={() => updateStatus(v._id || v.id, 'APPROVED')}
                                className="p-1.5 hover:bg-green-50 rounded-lg" title="Approuver">
                                <CheckCircle size={16} className="text-green-500" />
                              </button>
                            )}
                            {v.status === 'APPROVED' && (
                              <button onClick={() => updateStatus(v._id || v.id, 'SUSPENDED')}
                                className="p-1.5 hover:bg-red-50 rounded-lg" title="Suspendre">
                                <Ban size={16} className="text-red-500" />
                              </button>
                            )}
                            {v.status === 'SUSPENDED' && (
                              <button onClick={() => updateStatus(v._id || v.id, 'APPROVED')}
                                className="p-1.5 hover:bg-green-50 rounded-lg" title="Réactiver">
                                <Shield size={16} className="text-green-500" />
                              </button>
                            )}
                            {v.status === 'PENDING' && (
                              <button onClick={() => updateStatus(v._id || v.id, 'REJECTED')}
                                className="p-1.5 hover:bg-red-50 rounded-lg" title="Rejeter">
                                <XCircle size={16} className="text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expandable details */}
                      {selectedVendor === (v._id || v.id) && (
                        <tr>
                          <td colSpan="6" className="px-4 py-4 bg-gray-50">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Téléphone:</span>
                                <span className="ml-2 font-medium">{v.phone || '-'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Ville:</span>
                                <span className="ml-2 font-medium">{v.city || '-'}, {v.country}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Type:</span>
                                <span className="ml-2 font-medium">{v.businessType === 'company' ? 'Entreprise' : 'Particulier'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Note:</span>
                                <span className="ml-2 font-medium">{v.rating?.toFixed(1) || '0'} / 5</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Ventes:</span>
                                <span className="ml-2 font-medium">{v.totalSales || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Inscrit le:</span>
                                <span className="ml-2 font-medium">{new Date(v.createdAt).toLocaleDateString('fr-FR')}</span>
                              </div>
                              <div className="col-span-2">
                                <label className="text-gray-500 block mb-1">Commission override (%):</label>
                                <div className="flex gap-2">
                                  <input type="number" min="0" max="100" step="0.5"
                                    defaultValue={v.commissionOverride ?? ''}
                                    placeholder="Utiliser le plan"
                                    className="w-32 px-3 py-1.5 border rounded-lg text-sm"
                                    id={`commission-${v._id || v.id}`} />
                                  <button onClick={() => {
                                    const val = document.getElementById(`commission-${v._id || v.id}`).value;
                                    updateCommission(v._id || v.id, val === '' ? null : parseFloat(val));
                                  }} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
                                    Sauvegarder
                                  </button>
                                </div>
                              </div>
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
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Vendors;
