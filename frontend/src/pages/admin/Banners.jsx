import React, { useState, useEffect, useContext } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, X, GripVertical, Loader } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import API_URL from '../../config/api';

const Banners = () => {
  const toast = useToast();
  const { user } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [banners, setBanners] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    link: '',
    active: true
  });

  const config = {
    headers: { Authorization: `Bearer ${user?.token}` }
  };

  // Charger les bannières depuis l'API
  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/banners`);
      setBanners(data);
    } catch (error) {
      console.error('Erreur chargement bannières:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload d'image vers Cloudinary
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    setUploading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/upload`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user?.token}`
        }
      });
      setFormData({ ...formData, imageUrl: data.url });
      toast.success('Image uploadée !');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const openModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        imageUrl: banner.imageUrl || '',
        link: banner.link || '',
        active: banner.active !== false
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        imageUrl: '',
        link: '',
        active: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await axios.put(`${API_URL}/api/banners/${editingBanner.id}`, formData, config);
        toast.success('Bannière mise à jour !');
      } else {
        await axios.post(`${API_URL}/api/banners`, formData, config);
        toast.success('Bannière créée avec succès !');
      }
      fetchBanners();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const toggleActive = async (id) => {
    try {
      await axios.put(`${API_URL}/api/banners/${id}/toggle`, {}, config);
      fetchBanners();
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteBanner = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette bannière ?')) {
      try {
        await axios.delete(`${API_URL}/api/banners/${id}`, config);
        fetchBanners();
        toast.success('Bannière supprimée');
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bannières</h1>
          <p className="text-gray-500">Gérez les bannières de votre boutique ({banners.length})</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Plus size={18} />
          Nouvelle bannière
        </button>
      </div>

      {/* Banners Grid */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`relative rounded-lg overflow-hidden border ${
                !banner.active ? 'opacity-50' : ''
              }`}
            >
              {banner.imageUrl ? (
                <img
                  src={banner.imageUrl}
                  alt={banner.title || 'Bannière'}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Pas d'image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                <h3 className="font-bold text-white">{banner.title || 'Sans titre'}</h3>
                {banner.link && <p className="text-xs text-white/80">Lien: {banner.link}</p>}
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => toggleActive(banner.id)}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-100"
                  title={banner.active ? 'Désactiver' : 'Activer'}
                >
                  {banner.active ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => openModal(banner)}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-100"
                  title="Modifier"
                >
                  <Edit size={16} className="text-blue-600" />
                </button>
                <button
                  onClick={() => deleteBanner(banner.id)}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-100"
                  title="Supprimer"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Banner Card */}
          <button
            onClick={() => openModal()}
            className="border-2 border-dashed border-gray-300 rounded-lg h-40 flex flex-col items-center justify-center hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <Plus size={24} className="text-gray-400 mb-2" />
            <span className="text-gray-500">Ajouter une bannière</span>
          </button>
        </div>

        {banners.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucune bannière. Créez-en une !
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {editingBanner ? 'Modifier la bannière' : 'Nouvelle bannière'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Ventes Flash"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image (optionnel)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50">
                    {uploading ? (
                      <Loader className="animate-spin" size={20} />
                    ) : (
                      <Upload size={20} className="text-gray-400" />
                    )}
                    <span className="text-gray-600">
                      {uploading ? 'Upload en cours...' : 'Cliquez pour uploader une image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Ou collez une URL d'image..."
                  />
                </div>
                {formData.imageUrl && (
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lien de redirection (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="/shop?category=..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Activer cette bannière
                </label>
              </div>

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
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {editingBanner ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;
