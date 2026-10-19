import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Mail, Phone, Shield, ShieldOff, Trash2, Eye, Loader, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import API_URL from '../../config/api';

const Users = () => {
  const toast = useToast();
  const { user: currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, admins: 0, clients: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Vérifier si l'utilisateur est Admin (accepte aussi SUPER_ADMIN pour compatibilité)
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const location = useLocation();

  // Charger les utilisateurs (aussi lors de la navigation)
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [page, roleFilter, location.key]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const params = new URLSearchParams({
        page,
        limit: 20,
        search: searchQuery,
        role: roleFilter
      });
      const { data } = await axios.get(`${API_URL}/api/users?${params}`, config);
      setUsers(data.users || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const { data } = await axios.get(`${API_URL}/api/users/stats`, config);
      setStats(data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-CM').format(price || 0) + ' XAF';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'Super Admin', class: 'bg-purple-100 text-purple-700' };
      case 'ADMIN':
        return { label: 'Administrateur', class: 'bg-orange-100 text-orange-700' };
      default:
        return { label: 'Client', class: 'bg-gray-100 text-gray-700' };
    }
  };

  const toggleUserRole = async (userId, currentRole) => {
    if (!isAdmin) {
      toast.error('Seul un administrateur peut modifier les rôles');
      return;
    }

    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    const action = newRole === 'ADMIN' ? 'promouvoir administrateur' : 'rétrograder en client';

    if (!window.confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?`)) {
      return;
    }

    try {
      setActionLoading(userId);
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const { data } = await axios.put(
        `${API_URL}/api/users/${userId}/role`,
        { role: newRole },
        config
      );
      toast.success(data.message);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du rôle');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId) => {
    if (!isAdmin) {
      toast.error('Seul un administrateur peut supprimer des utilisateurs');
      return;
    }

    try {
      setActionLoading(userId);
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const { data } = await axios.delete(`${API_URL}/api/users/${userId}`, config);
      toast.success(data.message);
      setConfirmDelete(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Utilisateurs</h1>
          <p className="text-gray-500">Gérez les utilisateurs de votre boutique</p>
        </div>
      </div>

      {/* Bannière Admin */}
      {isAdmin && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <Shield className="text-orange-600" size={24} />
          <div>
            <p className="font-medium text-orange-800">Mode Administrateur</p>
            <p className="text-sm text-orange-600">Vous pouvez modifier les rôles des clients et supprimer des utilisateurs</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Total utilisateurs</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Clients</p>
          <p className="text-2xl font-bold text-green-600">{stats.clients}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Administrateurs</p>
          <p className="text-2xl font-bold text-orange-600">{stats.admins}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Tous les rôles</option>
            <option value="USER">Clients</option>
            <option value="ADMIN">Administrateurs</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-orange-500" size={32} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm text-gray-500">
                    <th className="px-6 py-4">Utilisateur</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Rôle</th>
                    <th className="px-6 py-4">Commandes</th>
                    <th className="px-6 py-4">Inscrit le</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const roleBadge = getRoleBadge(user.role);
                      const canModify = isAdmin && user.id !== currentUser.id;
                      const canDelete = isAdmin && user.role !== 'ADMIN' && user.id !== currentUser.id;
                      
                      return (
                        <tr key={user.id} className="border-t hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                user.role === 'ADMIN' ? 'bg-orange-500' : 'bg-gray-400'
                              }`}>
                                {user.fullName?.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{user.fullName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="flex items-center gap-1 text-gray-600">
                                <Mail size={14} />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1 text-gray-500 mt-1">
                                  <Phone size={14} />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge.class}`}>
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">{user._count?.orders || 0}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2 hover:bg-gray-100 rounded text-gray-600"
                                title="Voir détails"
                              >
                                <Eye size={18} />
                              </button>
                              
                              {/* Boutons de modification - pour les administrateurs */}
                              {canModify && (
                                <button
                                  onClick={() => toggleUserRole(user.id, user.role)}
                                  disabled={actionLoading === user.id}
                                  className={`p-2 hover:bg-orange-50 rounded ${
                                    user.role === 'ADMIN' ? 'text-orange-600' : 'text-gray-600'
                                  } disabled:opacity-50`}
                                  title={user.role === 'ADMIN' ? 'Rétrograder en client' : 'Promouvoir administrateur'}
                                >
                                  {actionLoading === user.id ? (
                                    <Loader className="animate-spin" size={18} />
                                  ) : user.role === 'ADMIN' ? (
                                    <ShieldOff size={18} />
                                  ) : (
                                    <Shield size={18} />
                                  )}
                                </button>
                              )}
                              
                              {/* Bouton supprimer - uniquement pour les clients */}
                              {canDelete && (
                                <button
                                  onClick={() => setConfirmDelete(user)}
                                  disabled={actionLoading === user.id}
                                  className="p-2 hover:bg-red-50 rounded text-red-600 disabled:opacity-50"
                                  title="Supprimer"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} sur {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 bg-orange-500 text-white rounded">{page}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 text-center border-b">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 ${
                selectedUser.role === 'ADMIN' ? 'bg-orange-500' : 'bg-gray-400'
              }`}>
                {selectedUser.fullName?.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold">{selectedUser.fullName}</h2>
              <p className="text-gray-500">{selectedUser.email}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(selectedUser.role).class}`}>
                {getRoleBadge(selectedUser.role).label}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">{selectedUser._count?.orders || 0}</p>
                  <p className="text-sm text-gray-500">Commandes</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-600">{formatDate(selectedUser.createdAt)}</p>
                  <p className="text-sm text-gray-500">Inscrit le</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Téléphone</span>
                  <span>{selectedUser.phone || 'Non renseigné'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Adresse</span>
                  <span className="text-right max-w-[200px] truncate">{selectedUser.address || 'Non renseignée'}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-2 border rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">Supprimer l'utilisateur ?</h3>
              <p className="text-gray-500 mb-4">
                Êtes-vous sûr de vouloir supprimer <strong>{confirmDelete.fullName}</strong> ? 
                Cette action supprimera également toutes ses commandes et avis. Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteUser(confirmDelete.id)}
                  disabled={actionLoading === confirmDelete.id}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === confirmDelete.id ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
