import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronRight, Plus, Edit, Trash2, Check, Home, Briefcase, X } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Addresses = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  
  const [addresses, setAddresses] = useState(() => {
    const saved = localStorage.getItem('userAddresses');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    type: 'home',
    isDefault: false
  });

  const saveAddresses = (newAddresses) => {
    setAddresses(newAddresses);
    localStorage.setItem('userAddresses', JSON.stringify(newAddresses));
  };

  const openModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setFormData(address);
    } else {
      setEditingAddress(null);
      setFormData({
        name: user?.fullName || '',
        phone: user?.phone || '',
        address: '',
        city: '',
        type: 'home',
        isDefault: addresses.length === 0
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAddress(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingAddress) {
      const updated = addresses.map(addr => 
        addr.id === editingAddress.id ? { ...formData, id: addr.id } : addr
      );
      // Si cette adresse devient par défaut, retirer le défaut des autres
      if (formData.isDefault) {
        updated.forEach(addr => {
          if (addr.id !== editingAddress.id) addr.isDefault = false;
        });
      }
      saveAddresses(updated);
      toast.success('Adresse mise à jour !');
    } else {
      const newAddress = {
        ...formData,
        id: Date.now().toString()
      };
      // Si c'est la première adresse ou si elle est par défaut
      let updated = [...addresses];
      if (formData.isDefault) {
        updated = updated.map(addr => ({ ...addr, isDefault: false }));
      }
      updated.push(newAddress);
      saveAddresses(updated);
      toast.success('Adresse ajoutée !');
    }
    
    closeModal();
  };

  const deleteAddress = (id) => {
    if (!window.confirm('Supprimer cette adresse ?')) return;
    const updated = addresses.filter(addr => addr.id !== id);
    saveAddresses(updated);
    toast.success('Adresse supprimée');
  };

  const setAsDefault = (id) => {
    const updated = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    }));
    saveAddresses(updated);
    toast.success('Adresse par défaut mise à jour');
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <MapPin size={80} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Connectez-vous</h1>
          <p className="text-gray-500 mb-6">Pour gérer vos adresses</p>
          <Link
            to="/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-medium"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="text-orange-500 hover:underline">Mon compte</Link>
          <ChevronRight size={16} className="text-gray-400" />
          <span className="text-gray-800 font-medium">Mes adresses</span>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Mes adresses</h1>
              <p className="text-gray-500 mt-1">Gérez vos adresses de livraison</p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus size={18} />
              Ajouter
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="p-12 text-center">
              <MapPin size={80} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune adresse</h2>
              <p className="text-gray-500 mb-6">Vous n'avez pas encore ajouté d'adresse de livraison</p>
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-medium"
              >
                <Plus size={18} />
                Ajouter une adresse
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-lg p-4 relative ${
                    address.isDefault ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                  }`}
                >
                  {address.isDefault && (
                    <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Check size={12} />
                      Par défaut
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      address.type === 'work' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {address.type === 'work' ? (
                        <Briefcase size={20} className="text-blue-600" />
                      ) : (
                        <Home size={20} className="text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{address.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{address.address}</p>
                      <p className="text-gray-600 text-sm">{address.city}</p>
                      <p className="text-gray-500 text-sm mt-1">{address.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    {!address.isDefault && (
                      <button
                        onClick={() => setAsDefault(address.id)}
                        className="text-sm text-orange-500 hover:underline"
                      >
                        Définir par défaut
                      </button>
                    )}
                    <div className="flex-1"></div>
                    <button
                      onClick={() => openModal(address)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => deleteAddress(address.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse complète
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Rue, quartier, repères..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Sélectionnez une ville</option>
                  <option value="Douala">Douala</option>
                  <option value="Yaoundé">Yaoundé</option>
                  <option value="Bafoussam">Bafoussam</option>
                  <option value="Bamenda">Bamenda</option>
                  <option value="Kribi">Kribi</option>
                  <option value="Limbe">Limbe</option>
                  <option value="Buea">Buea</option>
                  <option value="Garoua">Garoua</option>
                  <option value="Maroua">Maroua</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'adresse
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="home"
                      checked={formData.type === 'home'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <Home size={18} className="text-green-600" />
                    <span>Domicile</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="work"
                      checked={formData.type === 'work'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <Briefcase size={18} className="text-blue-600" />
                    <span>Bureau</span>
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Définir comme adresse par défaut</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingAddress ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Addresses;
