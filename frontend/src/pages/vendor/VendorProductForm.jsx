import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { Save, ArrowLeft, Upload, X, Image, Zap, Package, FileText, Link as LinkIcon, Download } from 'lucide-react';
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
  const [fileUploading, setFileUploading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    oldPrice: '',
    brand: '',
    size: '',
    stock: '10',
    categoryId: '',
    images: [],
    isPopular: false,
    productType: 'PHYSICAL', // 'PHYSICAL' ou 'DIGITAL' (Chariow)
    digitalType: 'EBOOK',
    digitalFileUrl: '',
    digitalFileName: '',
    digitalFileSize: '',
    digitalAccessLink: '',
    digitalInstructions: ''
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
        isPopular: data.isPopular || false,
        productType: data.productType || 'PHYSICAL',
        digitalType: data.digitalType || 'EBOOK',
        digitalFileUrl: data.digitalFileUrl || '',
        digitalFileName: data.digitalFileName || '',
        digitalFileSize: data.digitalFileSize || '',
        digitalAccessLink: data.digitalAccessLink || '',
        digitalInstructions: data.digitalInstructions || ''
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

  const handleDigitalFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post(`${API_URL}/api/upload/file`, formData, {
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' }
      });
      const url = data.url || data.secure_url;
      setForm(prev => ({
        ...prev,
        digitalFileUrl: url,
        digitalFileName: data.name || file.name,
        digitalFileSize: `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
      }));
    } catch (err) {
      setError('Erreur lors de l\'upload du fichier digital');
    } finally {
      setFileUploading(false);
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
    if (form.productType === 'DIGITAL' && !form.digitalFileUrl && !form.digitalAccessLink) {
      setError('Pour un produit digital, veuillez fournir un fichier téléchargeable OU un lien d\'accès');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
        stock: form.productType === 'DIGITAL' ? 999999 : (parseInt(form.stock) || 0)
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

  const isDigital = form.productType === 'DIGITAL';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <p className="text-xs text-gray-500">Marketplace hybride : Vendez du physique ou du digital en quelques clics</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5 shadow-sm">
        {/* Choix du modèle de produit : Physique vs Digital */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Type de produit</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, productType: 'PHYSICAL' }))}
              className={`p-3.5 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                !isDigital
                  ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-semibold shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${!isDigital ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Produit Physique</p>
                <p className="text-xs text-gray-500">Stock & livraison (Jumia)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, productType: 'DIGITAL' }))}
              className={`p-3.5 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                isDigital
                  ? 'border-purple-600 bg-purple-50/60 text-purple-950 font-semibold shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${isDigital ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Produit Digital</p>
                <p className="text-xs text-gray-500">Livraison auto (Chariow)</p>
              </div>
            </button>
          </div>
        </div>

        {/* Section Spécifique Produit Digital (Chariow) */}
        {isDigital && (
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-purple-800 font-bold text-sm">
              <Zap size={16} className="fill-purple-600" />
              <span>Configuration du Produit Digital</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1">Type de ressource digitale *</label>
              <select
                value={form.digitalType}
                onChange={(e) => setForm({ ...form, digitalType: e.target.value })}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="EBOOK">Ebook / Livre électronique (PDF, EPUB)</option>
                <option value="COURSE">Formation / Cours vidéo</option>
                <option value="TEMPLATE">Template (Canva, Notion, Excel, Figma...)</option>
                <option value="SOFTWARE">Logiciel / Application / Code</option>
                <option value="COACHING">Coaching / Consultation en ligne</option>
                <option value="FILE">Fichier archive (ZIP, RAR)</option>
                <option value="OTHER">Autre ressource numérique</option>
              </select>
            </div>

            {/* Téléversement de fichier direct */}
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1">Fichier téléchargeable (PDF, ZIP, etc.)</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 px-4 py-2.5 border-2 border-dashed border-purple-300 rounded-lg bg-white hover:bg-purple-100/50 cursor-pointer flex items-center justify-center gap-2 text-sm text-purple-700 transition-colors">
                  <Upload size={16} />
                  <span>{fileUploading ? 'Téléversement en cours...' : form.digitalFileName ? `Changer (${form.digitalFileName})` : 'Téléverser le fichier du produit'}</span>
                  <input type="file" className="hidden" onChange={handleDigitalFileUpload} disabled={fileUploading} />
                </label>
                {form.digitalFileUrl && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, digitalFileUrl: '', digitalFileName: '', digitalFileSize: '' }))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                    title="Supprimer le fichier"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {form.digitalFileName && (
                <p className="text-xs text-purple-800 mt-1 font-medium flex items-center gap-1">
                  <Download size={12} /> {form.digitalFileName} ({form.digitalFileSize || 'Inclus'})
                </p>
              )}
            </div>

            {/* OU Lien d'accès en ligne */}
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1">
                Lien d'accès en ligne (Google Drive, Notion, Canva, Zoom, etc.)
              </label>
              <div className="relative">
                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="url"
                  value={form.digitalAccessLink}
                  onChange={(e) => setForm({ ...form, digitalAccessLink: e.target.value })}
                  placeholder="https://notion.so/... ou https://drive.google.com/..."
                  className="w-full pl-9 pr-3 py-2 border border-purple-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-[11px] text-purple-700 mt-1">Vous pouvez fournir un fichier OU un lien direct (ou les deux).</p>
            </div>

            {/* Instructions pour l'acheteur */}
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1">Instructions de livraison / accès après paiement</label>
              <textarea
                value={form.digitalInstructions}
                onChange={(e) => setForm({ ...form, digitalInstructions: e.target.value })}
                rows={2}
                placeholder="Ex: Cliquez sur le lien pour dupliquer votre template. Mot de passe d'accès fourni : 1234."
                className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* Images du produit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visuel / Couverture du produit *</label>
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
            placeholder={isDigital ? "Ex: Ebook Guide du Marketing WhatsApp au Cameroun" : "Ex: T-shirt wax africain"} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" rows={4} required
            placeholder={isDigital ? "Décrivez le contenu de votre ressource, ce que l'acheteur va apprendre ou recevoir..." : "Décrivez votre produit en détail..."} />
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
              placeholder="10000" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
            <select value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white" required>
              <option value="">Sélectionner une catégorie...</option>
              {categories.map(cat => (
                <option key={cat._id || cat.id} value={cat._id || cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Si physique, champ stock disponible */}
          {!isDigital ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock physique *</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" min="0" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilité</label>
              <div className="px-4 py-2.5 bg-gray-50 border rounded-xl text-sm text-purple-700 font-semibold flex items-center gap-1.5">
                <Zap size={14} /> Illimitée (Livraison automatique 24/7)
              </div>
            </div>
          )}
        </div>

        {/* Détails physiques supplémentaires */}
        {!isDigital && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
              <input type="text" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="Optionnel" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taille / Dimensions</label>
              <input type="text" value={form.size} onChange={(e) => setForm({...form, size: e.target.value})}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="S, M, L, XL..." />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 border rounded-xl text-gray-700 hover:bg-gray-50 font-medium">
            Annuler
          </button>
          <button type="submit" disabled={saving || fileUploading}
            className={`flex-1 py-3 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm ${
              isDigital ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-500 hover:bg-orange-600'
            }`}>
            <Save size={18} /> {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : isDigital ? 'Publier le produit digital' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorProductForm;
