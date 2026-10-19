import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { Save, ArrowLeft, Upload, X, Image } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const VendorProductForm = () => {
  const { user } = useContext(AuthContext);
  const { vendorData } = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', price: '', oldPrice: '', brand: '',
    size: '', stock: '0', categoryId: '', images: [], isPopular: false
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/categories`);
      setCategories(data.categories || data || []);
    } catch (err) { console.error(err); }
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/products/${id}`);
      setForm({
        name: data.name || '',
        description: data.description || '',
        price: data.price?.toString() || '',
        oldPrice: data.oldPrice?.toString() || '',
        brand: data.brand || '',
        size: data.size || '',
        stock: data.stock?.toString() || '0',
        categoryId: data.category?._id || data.categoryId || '',
        images: data.images || [],
        isPopular: data.isPopular || false
      });
    } catch (err) {
      setError('Produit non trouvé');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const { data } = await axios.post(`${API_URL}/api/upload`, formData, {
          headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' }
        });
        const url = data.url || data.secure_url;
        if (url) setForm(prev => ({ ...prev, images: [...prev.images, url] }));
      } catch (err) {
        setError('Erreur upload image');
      }
    }
  };

  const removeImage = (index) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.price || !form.categoryId) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
        stock: parseInt(form.stock) || 0
      };

      if (isEdit) {
        await axios.put(`${API_URL}/api/products/${id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/products`, payload, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      }
      navigate('/vendor/dashboard/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
        </h2>
      </div>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Images du produit</label>
          <div className="flex flex-wrap gap-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={16} className="text-white" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload size={18} className="text-gray-400" />
              <span className="text-[10px] text-gray-400 mt-1">Ajouter</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" required
            placeholder="Ex: T-shirt wax africain" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" rows={4} required
            placeholder="Décrivez votre produit en détail..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" required min="0"
              placeholder="5000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ancien prix (barré)</label>
            <input type="number" value={form.oldPrice} onChange={(e) => setForm({...form, oldPrice: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" min="0"
              placeholder="7000" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
            <select value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white" required>
              <option value="">Sélectionner...</option>
              {categories.map(cat => (
                <option key={cat._id || cat.id} value={cat._id || cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
            <input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" min="0" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
            <input type="text" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="Optionnel" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
            <input type="text" value={form.size} onChange={(e) => setForm({...form, size: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="S, M, L, XL..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 border rounded-xl text-gray-700 hover:bg-gray-50 font-medium">
            Annuler
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={18} /> {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorProductForm;
