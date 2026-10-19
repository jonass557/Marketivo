import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Save, Store, Globe, CreditCard, Truck, Palette, Loader, DollarSign, MessageSquare, Check, Eye, EyeOff, ExternalLink, AlertCircle, Upload, Image, Plus, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import AuthContext from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import axios from 'axios';
import API_URL from '../../config/api';

const Settings = () => {
  const toast = useToast();
  const { user } = useContext(AuthContext);
  const { refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [themes, setThemes] = useState([]);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [customCurrency, setCustomCurrency] = useState({ code: '', symbol: '', name: '' });

  const [settings, setSettings] = useState({
    storeName: '',
    storeLogo: '',
    storeDescription: '',
    storeEmail: '',
    storePhone: '',
    storeAddress: '',
    currency: 'XAF',
    currencySymbol: 'FCFA',
    currencyPosition: 'after',
    adminEmail: '',
    adminWhatsApp: '',
    orderNotifications: true,
    stockAlerts: true,
    primaryColor: '#f97316',
    secondaryColor: '#1f2937',
    accentColor: '#10b981',
    enableShipping: true,
    freeShippingThreshold: 50000,
    defaultShippingFee: 2500,
    estimatedDelivery: '24-48h',
    enableMobileMoney: false,
    enableOrangeMoney: false,
    enableCashOnDelivery: false,
    // Stripe
    enableStripe: false,
    stripePublicKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    // PayPal
    enablePaypal: false,
    paypalClientId: '',
    paypalClientSecret: '',
    paypalMode: 'sandbox',
    // CinetPay
    enableCinetpay: false,
    cinetpayApiKey: '',
    cinetpaySiteId: '',
    cinetpaySecretKey: '',
    cinetpayMode: 'test',
    // SEO
    metaTitle: '',
    metaDescription: '',
    // Footer
    footerEmail: '',
    footerPhone: '',
    footerAddress: ''
  });

  const location = useLocation();

  // Charger les paramètres (aussi lors de la navigation)
  useEffect(() => {
    fetchSettings();
    fetchCurrencies();
    fetchThemes();
  }, [location.key]);

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/settings`);
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/settings/currencies`);
      setCurrencies(data);
    } catch (error) {
      console.error('Erreur currencies:', error);
    }
  };

  const fetchThemes = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/settings/themes`);
      setThemes(data);
    } catch (error) {
      console.error('Erreur themes:', error);
    }
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleCurrencyChange = (currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    if (currency) {
      setSettings({
        ...settings,
        currency: currency.code,
        currencySymbol: currency.symbol
      });
    }
  };

  const handleThemeChange = (theme) => {
    setSettings({
      ...settings,
      primaryColor: theme.primary,
      secondaryColor: theme.secondary,
      accentColor: theme.accent
    });
  };

  // Upload du logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('image', file);

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`
        }
      };

      const { data } = await axios.post(`${API_URL}/api/upload`, formData, config);
      setSettings({ ...settings, storeLogo: data.url });
      toast.success('Logo téléchargé avec succès !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement du logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Ajouter une devise personnalisée
  const handleAddCustomCurrency = () => {
    if (!customCurrency.code || !customCurrency.symbol || !customCurrency.name) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Ajouter à la liste des devises
    const newCurrency = {
      code: customCurrency.code.toUpperCase(),
      symbol: customCurrency.symbol,
      name: customCurrency.name,
      country: 'Personnalisée'
    };

    setCurrencies([...currencies, newCurrency]);
    setSettings({
      ...settings,
      currency: newCurrency.code,
      currencySymbol: newCurrency.symbol
    });
    setCustomCurrency({ code: '', symbol: '', name: '' });
    setShowCustomCurrency(false);
    toast.success(`Devise ${newCurrency.code} ajoutée !`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${API_URL}/api/settings`, settings, config);
      toast.success('Paramètres enregistrés avec succès !');
      
      // Rafraîchir les paramètres globaux (devise, thème, etc.)
      refreshSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: Store },
    { id: 'currency', label: 'Devise', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: MessageSquare },
    { id: 'theme', label: 'Thème', icon: Palette },
    { id: 'shipping', label: 'Livraison', icon: Truck },
    { id: 'payment', label: 'Paiement', icon: CreditCard },
    { id: 'footer', label: 'Footer', icon: Globe },
    { id: 'seo', label: 'SEO', icon: Globe },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>
          <p className="text-gray-500">Configurez votre boutique en ligne</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Général */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg border-b pb-4">🏪 Informations de la boutique</h2>
              
              {/* Logo Upload Section */}
              <div className="p-4 border-2 border-dashed rounded-xl bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-3">Logo de la boutique</label>
                <div className="flex items-center gap-6">
                  {/* Preview */}
                  <div className="relative">
                    {settings.storeLogo ? (
                      <div className="relative">
                        <img 
                          src={settings.storeLogo} 
                          alt="Logo" 
                          className="w-24 h-24 object-contain border rounded-lg bg-white p-2"
                        />
                        <button
                          onClick={() => setSettings({ ...settings, storeLogo: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-white">
                        <Image className="text-gray-400" size={32} />
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                        uploadingLogo 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader className="animate-spin" size={18} />
                          Téléchargement...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          {settings.storeLogo ? 'Changer le logo' : 'Télécharger un logo'}
                        </>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG ou SVG. Max 2MB. Taille recommandée: 200x60px</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la boutique
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={settings.storeEmail}
                    onChange={(e) => handleChange('storeEmail', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={settings.storePhone}
                    onChange={(e) => handleChange('storePhone', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={settings.storeAddress}
                    onChange={(e) => handleChange('storeAddress', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={settings.storeDescription}
                    onChange={(e) => handleChange('storeDescription', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Devise */}
          {activeTab === 'currency' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg border-b pb-4">💱 Gestion de la devise</h2>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  Sélectionnez la devise correspondant à votre pays. Cette devise sera utilisée pour afficher tous les prix sur votre site.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencyChange(currency.code)}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        settings.currency === currency.code
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">{currency.symbol}</span>
                        {settings.currency === currency.code && (
                          <Check className="text-orange-500" size={20} />
                        )}
                      </div>
                      <p className="font-medium">{currency.code}</p>
                      <p className="text-sm text-gray-500">{currency.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{currency.country}</p>
                    </button>
                  ))}

                  {/* Bouton Ajouter devise personnalisée */}
                  <button
                    onClick={() => setShowCustomCurrency(true)}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-left transition-all hover:border-orange-400 hover:bg-orange-50 flex flex-col items-center justify-center"
                  >
                    <Plus className="text-gray-400 mb-2" size={32} />
                    <p className="font-medium text-gray-600">Ajouter une devise</p>
                    <p className="text-xs text-gray-400">Devise personnalisée</p>
                  </button>
                </div>

                {/* Modal Ajouter devise */}
                {showCustomCurrency && (
                  <div className="mt-4 p-4 border-2 border-orange-200 bg-orange-50 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">➕ Ajouter une devise personnalisée</h3>
                      <button 
                        onClick={() => setShowCustomCurrency(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code (ex: BTC)</label>
                        <input
                          type="text"
                          value={customCurrency.code}
                          onChange={(e) => setCustomCurrency({ ...customCurrency, code: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="USD"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Symbole (ex: ₿)</label>
                        <input
                          type="text"
                          value={customCurrency.symbol}
                          onChange={(e) => setCustomCurrency({ ...customCurrency, symbol: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="$"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                        <input
                          type="text"
                          value={customCurrency.name}
                          onChange={(e) => setCustomCurrency({ ...customCurrency, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="Dollar américain"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddCustomCurrency}
                      className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Ajouter cette devise
                    </button>
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-3">Position du symbole</h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="currencyPosition"
                        value="before"
                        checked={settings.currencyPosition === 'before'}
                        onChange={(e) => handleChange('currencyPosition', e.target.value)}
                        className="w-4 h-4 text-orange-500"
                      />
                      <span>Avant le prix ({settings.currencySymbol} 10,000)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="currencyPosition"
                        value="after"
                        checked={settings.currencyPosition === 'after'}
                        onChange={(e) => handleChange('currencyPosition', e.target.value)}
                        className="w-4 h-4 text-orange-500"
                      />
                      <span>Après le prix (10,000 {settings.currencySymbol})</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Admin */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg border-b pb-4">📬 Notifications des commandes</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Ces informations seront utilisées pour vous notifier lors de nouvelles commandes.
                    Vous recevrez un email et/ou un message WhatsApp à chaque commande passée.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📧 Email de notification
                    </label>
                    <input
                      type="email"
                      value={settings.adminEmail || ''}
                      onChange={(e) => handleChange('adminEmail', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="admin@votre-boutique.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Vous recevrez les notifications de commandes à cette adresse
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📱 Numéro WhatsApp
                    </label>
                    <input
                      type="text"
                      value={settings.adminWhatsApp || ''}
                      onChange={(e) => handleChange('adminWhatsApp', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="237XXXXXXXXX"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: indicatif pays + numéro (sans + ni espaces)
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Options de notification</h3>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Notifications de commandes</p>
                      <p className="text-sm text-gray-500">Recevoir une alerte à chaque nouvelle commande</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.orderNotifications}
                        onChange={(e) => handleChange('orderNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Alertes de stock</p>
                      <p className="text-sm text-gray-500">Recevoir une alerte quand un produit est en rupture</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.stockAlerts}
                        onChange={(e) => handleChange('stockAlerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Thème */}
          {activeTab === 'theme' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg border-b pb-4">🎨 Personnalisation du thème</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Thèmes prédéfinis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {themes.map((theme, index) => (
                      <button
                        key={index}
                        onClick={() => handleThemeChange(theme)}
                        className={`p-3 border-2 rounded-xl transition-all ${
                          settings.primaryColor === theme.primary
                            ? 'border-gray-800 shadow-lg'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: theme.primary }}
                          />
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: theme.secondary }}
                          />
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: theme.accent }}
                          />
                        </div>
                        <p className="text-xs font-medium text-center">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">Couleurs personnalisées</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Couleur principale
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => handleChange('primaryColor', e.target.value)}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.primaryColor}
                          onChange={(e) => handleChange('primaryColor', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Couleur secondaire
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.secondaryColor}
                          onChange={(e) => handleChange('secondaryColor', e.target.value)}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.secondaryColor}
                          onChange={(e) => handleChange('secondaryColor', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Couleur d'accent
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => handleChange('accentColor', e.target.value)}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.accentColor}
                          onChange={(e) => handleChange('accentColor', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aperçu */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">Aperçu</h3>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex gap-4 items-center">
                      <button
                        style={{ backgroundColor: settings.primaryColor }}
                        className="px-4 py-2 text-white rounded-lg"
                      >
                        Bouton principal
                      </button>
                      <button
                        style={{ backgroundColor: settings.secondaryColor }}
                        className="px-4 py-2 text-white rounded-lg"
                      >
                        Bouton secondaire
                      </button>
                      <button
                        style={{ backgroundColor: settings.accentColor }}
                        className="px-4 py-2 text-white rounded-lg"
                      >
                        Accent
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Livraison */}
          {activeTab === 'shipping' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg border-b pb-4">🚚 Paramètres de livraison</h2>
              
              {/* Toggle activer/désactiver les frais de livraison */}
              <div className="flex items-center justify-between p-4 border-2 rounded-xl bg-gray-50">
                <div>
                  <p className="font-medium text-gray-800">Activer les frais de livraison</p>
                  <p className="text-sm text-gray-500">
                    {settings.enableShipping 
                      ? 'Les frais de livraison seront ajoutés aux commandes' 
                      : 'Aucun frais de livraison ne sera facturé aux clients'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableShipping}
                    onChange={(e) => handleChange('enableShipping', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {/* Options de livraison (affichées seulement si activé) */}
              {settings.enableShipping && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seuil livraison gratuite ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={settings.freeShippingThreshold}
                    onChange={(e) => handleChange('freeShippingThreshold', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Livraison gratuite au-dessus de ce montant
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frais de livraison par défaut ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={settings.defaultShippingFee}
                    onChange={(e) => handleChange('defaultShippingFee', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Délai de livraison estimé
                  </label>
                  <input
                    type="text"
                    value={settings.estimatedDelivery}
                    onChange={(e) => handleChange('estimatedDelivery', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: 24-48h"
                  />
                </div>
              </div>
              )}
            </div>
          )}

          {/* Paiement */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              {/* Paiements locaux */}
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <h2 className="font-bold text-lg border-b pb-4">💵 Paiements locaux</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${settings.enableMobileMoney ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`}
                    onClick={() => handleChange('enableMobileMoney', !settings.enableMobileMoney)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">📱</span>
                      {settings.enableMobileMoney && <Check className="text-yellow-600" size={20} />}
                    </div>
                    <p className="font-medium">MTN MoMo</p>
                    <p className="text-xs text-gray-500">Mobile Money</p>
                  </div>

                  <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${settings.enableOrangeMoney ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                    onClick={() => handleChange('enableOrangeMoney', !settings.enableOrangeMoney)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🟠</span>
                      {settings.enableOrangeMoney && <Check className="text-orange-600" size={20} />}
                    </div>
                    <p className="font-medium">Orange Money</p>
                    <p className="text-xs text-gray-500">Paiement OM</p>
                  </div>

                  <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${settings.enableCashOnDelivery ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                    onClick={() => handleChange('enableCashOnDelivery', !settings.enableCashOnDelivery)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">💵</span>
                      {settings.enableCashOnDelivery && <Check className="text-green-600" size={20} />}
                    </div>
                    <p className="font-medium">À la livraison</p>
                    <p className="text-xs text-gray-500">Cash on Delivery</p>
                  </div>
                </div>
              </div>

              {/* Stripe */}
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">Stripe</h2>
                      <p className="text-sm text-gray-500">Cartes bancaires internationales</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1">
                      Obtenir les clés <ExternalLink size={14} />
                    </a>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.enableStripe}
                        onChange={(e) => handleChange('enableStripe', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                </div>

                {settings.enableStripe && (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-purple-50 rounded-lg flex items-start gap-2">
                      <AlertCircle className="text-purple-600 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-purple-700">Créez un compte sur <a href="https://stripe.com" target="_blank" className="underline">stripe.com</a> et récupérez vos clés API dans le Dashboard.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Clé publique (pk_...)</label>
                        <input type="text" value={settings.stripePublicKey || ''}
                          onChange={(e) => handleChange('stripePublicKey', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="pk_test_..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Clé secrète (sk_...)</label>
                        <input type="password" value={settings.stripeSecretKey || ''}
                          onChange={(e) => handleChange('stripeSecretKey', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="sk_test_..." />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret (optionnel)</label>
                        <input type="password" value={settings.stripeWebhookSecret || ''}
                          onChange={(e) => handleChange('stripeWebhookSecret', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="whsec_..." />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PayPal */}
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🅿️</span>
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">PayPal</h2>
                      <p className="text-sm text-gray-500">Paiement sécurisé PayPal</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                      Obtenir les clés <ExternalLink size={14} />
                    </a>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.enablePaypal}
                        onChange={(e) => handleChange('enablePaypal', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>

                {settings.enablePaypal && (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                      <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-blue-700">Créez une application sur <a href="https://developer.paypal.com" target="_blank" className="underline">developer.paypal.com</a> pour obtenir vos identifiants.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                        <input type="text" value={settings.paypalClientId || ''}
                          onChange={(e) => handleChange('paypalClientId', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="AX..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                        <input type="password" value={settings.paypalClientSecret || ''}
                          onChange={(e) => handleChange('paypalClientSecret', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="EL..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                        <select value={settings.paypalMode}
                          onChange={(e) => handleChange('paypalMode', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                          <option value="sandbox">🧪 Sandbox (Test)</option>
                          <option value="live">🚀 Live (Production)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CinetPay */}
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🌍</span>
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">CinetPay</h2>
                      <p className="text-sm text-gray-500">Paiements Mobile Money Afrique</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href="https://app.cinetpay.com/user/integration" target="_blank" rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1">
                      Obtenir les clés <ExternalLink size={14} />
                    </a>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.enableCinetpay}
                        onChange={(e) => handleChange('enableCinetpay', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>

                {settings.enableCinetpay && (
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2">
                      <AlertCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-green-700">CinetPay est idéal pour recevoir des paiements Mobile Money (MTN, Orange, Moov...) dans toute l'Afrique. Créez un compte sur <a href="https://cinetpay.com" target="_blank" className="underline">cinetpay.com</a>.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input type="text" value={settings.cinetpayApiKey || ''}
                          onChange={(e) => handleChange('cinetpayApiKey', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="12345678..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Site ID</label>
                        <input type="text" value={settings.cinetpaySiteId || ''}
                          onChange={(e) => handleChange('cinetpaySiteId', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="123456" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                        <input type="password" value={settings.cinetpaySecretKey || ''}
                          onChange={(e) => handleChange('cinetpaySecretKey', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                        <select value={settings.cinetpayMode}
                          onChange={(e) => handleChange('cinetpayMode', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500">
                          <option value="test">🧪 Test</option>
                          <option value="live">🚀 Live (Production)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          {activeTab === 'footer' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg border-b pb-4">📝 Informations du Footer</h2>
              <p className="text-sm text-gray-500">Ces informations s'afficheront dans le pied de page de votre site.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📧 Email de contact
                  </label>
                  <input
                    type="email"
                    value={settings.footerEmail || ''}
                    onChange={(e) => handleChange('footerEmail', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="contact@myshop.cm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📱 Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={settings.footerPhone || ''}
                    onChange={(e) => handleChange('footerPhone', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📍 Adresse
                  </label>
                  <textarea
                    value={settings.footerAddress || ''}
                    onChange={(e) => handleChange('footerAddress', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Douala, Cameroun&#10;Rue de la Joie, Akwa"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-medium text-gray-800 mb-2">Aperçu</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>📍 {settings.footerAddress || 'Douala, Cameroun'}</p>
                  <p>📱 {settings.footerPhone || '+237 6XX XXX XXX'}</p>
                  <p>📧 {settings.footerEmail || 'contact@myshop.cm'}</p>
                </div>
              </div>
            </div>
          )}

          {/* SEO */}
          {activeTab === 'seo' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg border-b pb-4">🔍 Optimisation SEO</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre Meta (SEO)
                  </label>
                  <input
                    type="text"
                    value={settings.metaTitle || ''}
                    onChange={(e) => handleChange('metaTitle', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="MonShop - Boutique en ligne"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(settings.metaTitle || '').length}/60 caractères recommandés
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description Meta
                  </label>
                  <textarea
                    value={settings.metaDescription || ''}
                    onChange={(e) => handleChange('metaDescription', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Description de votre boutique pour les moteurs de recherche..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(settings.metaDescription || '').length}/160 caractères recommandés
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
