import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FolderTree, X, Upload, Image, Loader } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Categories = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({ name: '', description: '', image: '' });

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/categories`);
      setCategories(data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchCategories();
  }, [location.key]);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (category = null) => {
    setError('');
    if (category) {
      setEditingCategory(category);
      setFormData({ 
        name: category.name, 
        description: category.description || '', 
        image: category.image || '' 
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', image: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', image: '' });
    setError('');
  };

  // Upload image to Cloudinary
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    setUploading(true);
    try {
      const config = {
        headers: { 
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      };
      const { data } = await axios.post(`${API_URL}/api/upload`, formDataUpload, config);
      setFormData({ ...formData, image: data.url });
      toast.success('Image uploadée avec succès !');
    } catch (err) {
      setError('Erreur lors de l\'upload de l\'image');
      toast.error('Erreur lors de l\'upload');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };

      if (editingCategory) {
        await axios.put(
          `${API_URL}/api/categories/${editingCategory.id}`,
          formData,
          config
        );
        toast.success('Catégorie mise à jour !');
      } else {
        await axios.post(`${API_URL}/api/categories`, formData, config);
        toast.success('Catégorie créée avec succès !');
      }

      fetchCategories();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      await axios.delete(`${API_URL}/api/categories/${id}`, config);
      fetchCategories();
      toast.success('Catégorie supprimée');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catégories</h1>
          <p className="text-gray-500">Organisez vos produits par catégories</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Plus size={18} />
          Nouvelle catégorie
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-orange-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                  {category.image ? (
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FolderTree className="text-gray-400" size={24} />
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(category)}
                    className="p-2 hover:bg-blue-50 rounded text-blue-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 hover:bg-red-50 rounded text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-bold text-gray-800 mb-1">{category.name}</h3>
              <p className="text-sm text-gray-500 mb-2">/{category.slug}</p>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-orange-500">{category.productCount || 0}</span> produits
              </p>
            </div>
          ))}

          {/* Add Category Card */}
          <button
            onClick={() => openModal()}
            className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-colors flex flex-col items-center justify-center min-h-[180px]"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <Plus size={24} className="text-gray-400" />
            </div>
            <span className="text-gray-500 font-medium">Ajouter une catégorie</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image de la catégorie
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300">
                    {formData.image ? (
                      <img 
                        src={formData.image} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="text-gray-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        {uploading ? (
                          <Loader className="animate-spin" size={18} />
                        ) : (
                          <Upload size={18} />
                        )}
                        <span>{uploading ? 'Upload...' : 'Choisir une image'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 2MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: Téléphones & Tablettes"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Description de la catégorie..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader className="animate-spin" size={16} />}
                  {editingCategory ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
