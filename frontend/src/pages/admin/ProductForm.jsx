import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X, Plus, Save, Loader } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import { useToast } from '../../context/ToastContext';
import AuthContext from '../../context/AuthContext';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useContext(AuthContext);
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    oldPrice: '',
    brand: '',
    size: '',
    stock: '',
    categoryId: '',
    isPopular: false,
    isAffiliate: false,
    affiliateUrl: '',
    images: []
  });

  // Charger les catégories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/categories`);
        setCategories(data);
      } catch (error) {
        console.error('Erreur:', error);
      }
    };
    fetchCategories();
  }, []);

  // Charger le produit si édition
  useEffect(() => {
    if (isEditing) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          const { data } = await axios.get(`${API_URL}/api/products/${id}`);
          setFormData({
            name: data.name || '',
            description: data.description || '',
            price: data.price || '',
            oldPrice: data.oldPrice || '',
            brand: data.brand || '',
            size: data.size || '',
            stock: data.stock || 0,
            categoryId: data.categoryId || '',
            isPopular: data.isPopular || false,
            isAffiliate: data.isAffiliate || false,
            affiliateUrl: data.affiliateUrl || '',
            images: data.images || []
          });
        } catch (error) {
          toast.error('Produit non trouvé');
          navigate('/admin/products');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditing, navigate, toast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 5MB');
        continue;
      }

      setUploading(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        const config = {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`
          }
        };

        const { data } = await axios.post(`${API_URL}/api/upload`, formDataUpload, config);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, data.url]
        }));
        toast.success('Image uploadée');
      } catch (error) {
        toast.error('Erreur lors de l\'upload');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
        brand: formData.brand || null,
        size: formData.size || null,
        stock: formData.isAffiliate ? 999 : (parseInt(formData.stock) || 0),
        categoryId: formData.categoryId,
        isPopular: formData.isPopular,
        isAffiliate: formData.isAffiliate,
        affiliateUrl: formData.affiliateUrl || null,
        images: formData.images
      };

      if (isEditing) {
        await axios.put(`${API_URL}/api/products/${id}`, productData, config);
        toast.success('Produit mis à jour !');
      } else {
        const response = await axios.post(`${API_URL}/api/products`, productData, config);
        console.log('Produit créé:', response.data);
        toast.success('Produit créé avec succès !');
      }
      
      // Forcer le rechargement en passant un state
      navigate('/admin/products', { state: { refresh: Date.now() } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
          </h1>
          <p className="text-gray-500">
            {isEditing ? 'Modifiez les informations du produit' : 'Ajoutez un nouveau produit au catalogue'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">Informations générales</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: iPhone 14 Pro Max 256GB"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Décrivez votre produit en détail..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">Images du produit</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              <label className={`aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? (
                  <Loader size={24} className="text-orange-500 animate-spin" />
                ) : (
                  <>
                    <Upload size={24} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Ajouter</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Formats acceptés: JPG, PNG, WebP. Taille max: 5MB
            </p>
          </div>

          {/* Caractéristiques produit */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">Caractéristiques</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marque
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: Nike, Samsung, Apple..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taille
                </label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: S, M, L, XL, 42, 128GB..."
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">Prix et stock</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau prix (XAF) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ancien prix (XAF)
                </label>
                <input
                  type="number"
                  name="oldPrice"
                  value={formData.oldPrice}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Prix barré (optionnel)"
                />
                <p className="text-xs text-gray-500 mt-1">Affiché barré si renseigné</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité en stock *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">Catégorie *</h2>
            
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <Link
              to="/admin/categories"
              className="mt-3 text-orange-500 text-sm hover:underline flex items-center gap-1"
            >
              <Plus size={14} />
              Gérer les catégories
            </Link>
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">Options</h2>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPopular"
                  checked={formData.isPopular}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <span className="font-medium">Produit populaire</span>
                  <p className="text-xs text-gray-500">Afficher sur la page d'accueil</p>
                </div>
              </label>

              <div className="border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isAffiliate"
                    checked={formData.isAffiliate}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-blue-600">🔗 Produit d'affiliation</span>
                    <p className="text-xs text-gray-500">Redirige vers un site externe</p>
                  </div>
                </label>

                {formData.isAffiliate && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      URL du site affilié *
                    </label>
                    <input
                      type="url"
                      name="affiliateUrl"
                      value={formData.affiliateUrl}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="https://www.amazon.com/..."
                      required={formData.isAffiliate}
                    />
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Amazon, Jumia, Alibaba, etc. Le client sera redirigé vers ce lien.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {isEditing ? 'Mettre à jour' : 'Enregistrer le produit'}
            </button>
            
            <Link
              to="/admin/products"
              className="w-full mt-3 flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors"
            >
              Annuler
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
