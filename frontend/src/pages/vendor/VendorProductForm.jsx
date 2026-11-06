import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  Save, ArrowLeft, Upload, X, Image, Zap, Package, FileText,
  Link as LinkIcon, Download, Video, Calendar, Key, Plus, Trash2, Box
} from 'lucide-react';
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
    sku: '',
    stock: '10',
    categoryId: '',
    subcategory: '',
    images: [],
    videoUrl: '',
    weight: '',
    dimensions: { length: '', width: '', height: '' },
    variants: [],
    isPopular: false,
    productType: 'PHYSICAL', // 'PHYSICAL' ou 'DIGITAL'
    digitalType: 'EBOOK',    // 'EBOOK', 'COURSE', 'COACHING', 'EXTERNAL', 'TEMPLATE', 'SOFTWARE', 'FILE'
    digitalFileUrl: '',
    digitalFileName: '',
    digitalFileSize: '',
    digitalAccessLink: '',
    digitalInstructions: '',
    downloadLimit: 0,
    courseModules: [],
    coachingDetails: {
      durationMinutes: 60,
      meetingPlatform: 'GOOGLE_MEET',
      meetingLink: '',
      locationAddress: '',
      availabilitySchedule: [{ dayOfWeek: 'Lundi - Vendredi', startTime: '09:00', endTime: '18:00' }]
    },
    externalProduct: {
      accessType: 'LINK',
      accessUrl: '',
      licenseKeys: []
    }
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
        sku: data.sku || '',
        stock: data.stock?.toString() || '0',
        categoryId: data.category?._id || data.categoryId || '',
        subcategory: data.subcategory || '',
        images: data.images || [],
        videoUrl: data.videoUrl || '',
        weight: data.weight?.toString() || '',
        dimensions: data.dimensions || { length: '', width: '', height: '' },
        variants: data.variants || [],
        isPopular: data.isPopular || false,
        productType: data.productType || 'PHYSICAL',
        digitalType: data.digitalType || 'EBOOK',
        digitalFileUrl: data.digitalFileUrl || '',
        digitalFileName: data.digitalFileName || '',
        digitalFileSize: data.digitalFileSize || '',
        digitalAccessLink: data.digitalAccessLink || '',
        digitalInstructions: data.digitalInstructions || '',
        downloadLimit: data.downloadLimit || 0,
        courseModules: data.courseModules || [],
        coachingDetails: data.coachingDetails || {
          durationMinutes: 60,
          meetingPlatform: 'GOOGLE_MEET',
          meetingLink: '',
          locationAddress: '',
          availabilitySchedule: [{ dayOfWeek: 'Lundi - Vendredi', startTime: '09:00', endTime: '18:00' }]
        },
        externalProduct: data.externalProduct || {
          accessType: 'LINK',
          accessUrl: '',
          licenseKeys: []
        }
      });
    } catch (err) {
      setError('Produit non trouvé');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (form.images.length + files.length > 8) {
      setError('Vous pouvez ajouter jusqu\'à 8 photos maximum par produit.');
      return;
    }
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
      const url = data.fileUrl || data.url || data.secure_url;
      setForm(prev => ({
        ...prev,
        digitalFileUrl: url,
        digitalFileName: data.fileName || file.name,
        digitalFileSize: `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
      }));
    } catch (err) {
      setError('Erreur lors de l\'upload du fichier');
    } finally {
      setFileUploading(false);
    }
  };

  const removeImage = (index) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  // Gestion des variantes physiques
  const addVariant = () => {
    setForm(prev => ({
      ...prev,
      variants: [...prev.variants, { name: 'Taille', options: ['S', 'M', 'L'] }]
    }));
  };

  const removeVariant = (idx) => {
    setForm(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));
  };

  // Gestion des modules de formation
  const addCourseModule = () => {
    setForm(prev => ({
      ...prev,
      courseModules: [
        ...prev.courseModules,
        {
          title: `Module ${prev.courseModules.length + 1}`,
          description: '',
          lessons: [{ title: 'Introduction', type: 'VIDEO', contentUrl: '', duration: '10 min' }]
        }
      ]
    }));
  };

  const removeCourseModule = (idx) => {
    setForm(prev => ({ ...prev, courseModules: prev.courseModules.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.price || !form.categoryId) {
      setError('Veuillez remplir tous les champs obligatoires (nom, description, prix, catégorie)');
      return;
    }
    if (form.productType === 'DIGITAL') {
      if (form.digitalType === 'COURSE' && form.courseModules.length === 0 && !form.digitalAccessLink) {
        setError('Pour une formation, veuillez ajouter au moins un module ou un lien d\'accès');
        return;
      }
      if (form.digitalType === 'EBOOK' && !form.digitalFileUrl && !form.digitalAccessLink) {
        setError('Pour un produit digital téléchargeable, veuillez fournir un fichier ou un lien');
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
        stock: form.productType === 'DIGITAL' ? 999999 : (parseInt(form.stock) || 0),
        weight: form.weight ? parseFloat(form.weight) : 0
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
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du produit');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  const isDigital = form.productType === 'DIGITAL';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Modifier le produit' : 'Publier un nouveau produit'}
          </h2>
          <p className="text-xs text-gray-500">Marketplace hybride : Vendez des produits physiques ou digitaux en moins de 10 minutes</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
        {/* 1. SÉLECTION DU GRAND TYPE : PHYSIQUE VS DIGITAL (Cahier des charges 4.3) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Modèle de produit (Cahier des charges)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, productType: 'PHYSICAL' }))}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition-all ${
                !isDigital
                  ? 'border-blue-500 bg-blue-50/60 text-blue-950 font-bold shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${!isDigital ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Box size={22} />
              </div>
              <div>
                <p className="text-sm font-bold">1. Produit physique (Jumia)</p>
                <p className="text-[11px] opacity-75">Livraison, stock, variantes, poids & dimensions</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, productType: 'DIGITAL' }))}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition-all ${
                isDigital
                  ? 'border-purple-500 bg-purple-50/60 text-purple-950 font-bold shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${isDigital ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Zap size={22} />
              </div>
              <div>
                <p className="text-sm font-bold">2. Produit digital (Chariow)</p>
                <p className="text-[11px] opacity-75">Téléchargement instantané, formation, coaching</p>
              </div>
            </button>
          </div>
        </div>

        {/* SI DIGITAL : TYPE SPÉCIFIQUE (Ebook, Formation, Coaching, Externe) */}
        {isDigital && (
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
            <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider">
              Catégorie de produit digital (Modèle Chariow)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'EBOOK', label: 'Ebook & Guide PDF', icon: FileText },
                { id: 'COURSE', label: 'Formation en ligne', icon: Video },
                { id: 'COACHING', label: 'Coaching / Consultation', icon: Calendar },
                { id: 'EXTERNAL', label: 'Produit Externe / Licence', icon: Key },
                { id: 'TEMPLATE', label: 'Templates & Maquettes', icon: Zap },
                { id: 'SOFTWARE', label: 'Logiciel & Scripts', icon: Download }
              ].map(t => {
                const Icon = t.icon;
                const isSelected = form.digitalType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, digitalType: t.id }))}
                    className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. INFORMATIONS PRINCIPALES */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Titre du produit *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isDigital ? "Ex: Ebook - Comment lancer un business rentable en Afrique" : "Ex: Chaussures Sneakers Cuir Original"}
              className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Catégorie *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Sous-catégorie (optionnel)</label>
              <input
                type="text"
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                placeholder="Ex: Informatique, Ebooks Business..."
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Description complète *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Présentez les avantages, les caractéristiques et les détails du produit..."
              className="w-full text-xs p-3.5 border rounded-xl focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Prix de vente (FCFA) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="10000"
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Prix barré (optionnel)</label>
              <input
                type="number"
                value={form.oldPrice}
                onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                placeholder="15000"
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl"
              />
            </div>
            {!isDigital && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Stock disponible *</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-xl"
                  required={!isDigital}
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. GALERIE PHOTOS (Jusqu'à 8 photos) & VIDÉO (Cahier des charges 4.3) */}
        <div className="space-y-3 pt-2 border-t">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Photos du produit ({form.images.length}/8)
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {form.images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {form.images.length < 8 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-500 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-orange-50/40 transition-colors">
                <Upload size={18} className="text-gray-400 mb-1" />
                <span className="text-[10px] text-gray-500 font-bold">Ajouter</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <Video size={14} className="text-red-500" />
              Lien vidéo démo (YouTube, Vimeo ou MP4)
            </label>
            <input
              type="url"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full text-xs px-3.5 py-2 border rounded-xl"
            />
          </div>
        </div>

        {/* 4. SPÉCIFIQUE PRODUIT PHYSIQUE : Poids, Dimensions, Variantes, SKU */}
        {!isDigital && (
          <div className="space-y-4 pt-2 border-t bg-gray-50/70 p-4 rounded-2xl border">
            <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Box size={14} className="text-blue-600" /> Caractéristiques physiques (Jumia)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 mb-1">SKU (Référence)</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-1002"
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Poids (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder="0.5"
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Longueur (cm)</label>
                <input
                  type="number"
                  value={form.dimensions.length}
                  onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, length: e.target.value } })}
                  placeholder="20"
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Largeur (cm)</label>
                <input
                  type="number"
                  value={form.dimensions.width}
                  onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, width: e.target.value } })}
                  placeholder="15"
                  className="w-full px-3 py-1.5 border rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Variantes */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Variantes (Tailles, Couleurs)</span>
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Ajouter une variante
                </button>
              </div>
              {form.variants.map((v, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border flex items-center gap-3 text-xs">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => {
                      const updated = [...form.variants];
                      updated[idx].name = e.target.value;
                      setForm({ ...form, variants: updated });
                    }}
                    placeholder="Nom (ex: Taille)"
                    className="w-28 px-2 py-1 border rounded"
                  />
                  <input
                    type="text"
                    value={v.options?.join(', ')}
                    onChange={(e) => {
                      const updated = [...form.variants];
                      updated[idx].options = e.target.value.split(',').map(s => s.trim());
                      setForm({ ...form, variants: updated });
                    }}
                    placeholder="Options séparées par des virgules (ex: S, M, L, XL)"
                    className="flex-1 px-2 py-1 border rounded"
                  />
                  <button type="button" onClick={() => removeVariant(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. SPÉCIFIQUE PRODUIT DIGITAL (Chariow) */}
        {isDigital && (
          <div className="space-y-4 pt-2 border-t bg-purple-50/50 p-4 rounded-2xl border border-purple-200">
            <h4 className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-purple-600" /> Contenu digital & Accès automatique
            </h4>

            {/* Upload Fichier digital */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Fichier téléchargeable (PDF, ZIP, EPUB, MP3, MP4 - jusqu'à 25 Mo)
              </label>
              {form.digitalFileUrl ? (
                <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2 truncate">
                    <Check size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold truncate">{form.digitalFileName || 'Fichier digital chargé'}</span>
                    {form.digitalFileSize && <span className="text-[10px] text-gray-500">({form.digitalFileSize})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, digitalFileUrl: '', digitalFileName: '', digitalFileSize: '' }))}
                    className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
                  >
                    Supprimer
                  </button>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-300 rounded-xl bg-white hover:bg-purple-50/50 cursor-pointer transition-colors">
                  <Upload size={22} className="text-purple-500 mb-1" />
                  <span className="text-xs font-bold text-purple-700">
                    {fileUploading ? 'Téléversement en cours...' : 'Sélectionner le fichier numérique'}
                  </span>
                  <input type="file" className="hidden" onChange={handleDigitalFileUpload} />
                </label>
              )}
            </div>

            {/* Limite de téléchargements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Limite de téléchargements autorisés</label>
                <input
                  type="number"
                  min="0"
                  value={form.downloadLimit}
                  onChange={(e) => setForm({ ...form, downloadLimit: parseInt(e.target.value) || 0 })}
                  placeholder="0 pour illimité"
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                />
                <span className="text-[10px] text-gray-500">0 = téléchargements illimités pour l'acheteur</span>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Lien d'accès externe (optionnel)</label>
                <input
                  type="url"
                  value={form.digitalAccessLink}
                  onChange={(e) => setForm({ ...form, digitalAccessLink: e.target.value })}
                  placeholder="https://drive.google.com/... ou Notion"
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                />
              </div>
            </div>

            {/* Formation : Modules & Leçons */}
            {form.digitalType === 'COURSE' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900">Modules de la formation</span>
                  <button
                    type="button"
                    onClick={addCourseModule}
                    className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Ajouter un module
                  </button>
                </div>
                {form.courseModules.map((m, mIdx) => (
                  <div key={mIdx} className="p-3 bg-white rounded-xl border border-purple-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const updated = [...form.courseModules];
                          updated[mIdx].title = e.target.value;
                          setForm({ ...form, courseModules: updated });
                        }}
                        className="font-bold border-b border-gray-200 px-1 py-0.5 w-60"
                        placeholder="Titre du module"
                      />
                      <button type="button" onClick={() => removeCourseModule(mIdx)} className="text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Coaching : Détails et Plateforme */}
            {form.digitalType === 'COACHING' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Durée séance (minutes)</label>
                  <input
                    type="number"
                    value={form.coachingDetails.durationMinutes}
                    onChange={(e) => setForm({
                      ...form,
                      coachingDetails: { ...form.coachingDetails, durationMinutes: parseInt(e.target.value) || 60 }
                    })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Plateforme</label>
                  <select
                    value={form.coachingDetails.meetingPlatform}
                    onChange={(e) => setForm({
                      ...form,
                      coachingDetails: { ...form.coachingDetails, meetingPlatform: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="GOOGLE_MEET">Google Meet</option>
                    <option value="ZOOM">Zoom</option>
                    <option value="WHATSAPP">Appel WhatsApp</option>
                    <option value="PHYSICAL">Rencontre en présentiel</option>
                  </select>
                </div>
              </div>
            )}

            {/* Instructions pour l'acheteur */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Instructions d'accès pour l'acheteur
              </label>
              <textarea
                value={form.digitalInstructions}
                onChange={(e) => setForm({ ...form, digitalInstructions: e.target.value })}
                rows={2}
                placeholder="Ex: Merci pour votre achat ! Cliquez sur le lien pour dupliquer votre template Notion..."
                className="w-full text-xs p-3 border rounded-xl bg-white"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || fileUploading}
          className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors shadow text-sm flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {saving ? 'Publication en cours...' : isEdit ? 'Enregistrer les modifications' : 'Publier le produit sur Marketivo'}
        </button>
      </form>
    </div>
  );
};

export default VendorProductForm;
