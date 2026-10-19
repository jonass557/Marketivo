import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, Heart, MapPin, Settings, LogOut, ChevronRight } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const { formatPrice } = useSettings();
  const navigate = useNavigate();

  // Rediriger si non connecté
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <User size={80} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Connectez-vous</h1>
          <p className="text-gray-500 mb-6">Accédez à votre compte pour voir vos commandes</p>
          <Link
            to="/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-medium transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Commandes de démonstration
  const orders = [
    { id: 'CMD-001', date: '25/11/2024', total: 750000, status: 'Livré', items: 2 },
    { id: 'CMD-002', date: '20/11/2024', total: 150000, status: 'En cours', items: 1 },
    { id: 'CMD-003', date: '15/11/2024', total: 320000, status: 'Livré', items: 3 },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Livré':
        return 'bg-green-100 text-green-800';
      case 'En cours':
        return 'bg-blue-100 text-blue-800';
      case 'Annulé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded shadow p-6">
              {/* Avatar et nom */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl font-bold">
                    {user.fullName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="font-bold text-lg">{user.fullName}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
                {user.role === 'ADMIN' && (
                  <span className="inline-block mt-2 bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded">
                    Administrateur
                  </span>
                )}
              </div>

              {/* Menu */}
              <nav className="space-y-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-600 rounded"
                >
                  <User size={20} />
                  <span>Mon compte</span>
                </Link>
                <Link
                  to="/orders"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <Package size={20} />
                  <span>Mes commandes</span>
                </Link>
                <Link
                  to="/wishlist"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <Heart size={20} />
                  <span>Mes favoris</span>
                </Link>
                <Link
                  to="/addresses"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <MapPin size={20} />
                  <span>Mes adresses</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <Settings size={20} />
                  <span>Paramètres</span>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded transition-colors text-orange-600"
                  >
                    <Settings size={20} />
                    <span>Dashboard Admin</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded transition-colors text-red-600 w-full"
                >
                  <LogOut size={20} />
                  <span>Déconnexion</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-3 space-y-6">
            {/* Informations personnelles */}
            <div className="bg-white rounded shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Informations personnelles</h2>
                <button className="text-orange-500 hover:underline text-sm">Modifier</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Nom complet</label>
                  <p className="font-medium">{user.fullName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Téléphone</label>
                  <p className="font-medium">{user.phone || 'Non renseigné'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Adresse</label>
                  <p className="font-medium">{user.address || 'Non renseignée'}</p>
                </div>
              </div>
            </div>

            {/* Dernières commandes */}
            <div className="bg-white rounded shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Dernières commandes</h2>
                <Link to="/orders" className="text-orange-500 hover:underline text-sm">
                  Voir tout
                </Link>
              </div>

              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3">N° Commande</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Articles</th>
                        <th className="pb-3">Total</th>
                        <th className="pb-3">Statut</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{order.id}</td>
                          <td className="py-4 text-gray-600">{order.date}</td>
                          <td className="py-4 text-gray-600">{order.items}</td>
                          <td className="py-4 font-medium">{formatPrice(order.total)}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <Link
                              to={`/orders/${order.id}`}
                              className="text-orange-500 hover:underline text-sm flex items-center gap-1"
                            >
                              Détails <ChevronRight size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucune commande pour le moment</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
