import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Package, Plane, Ship, ShieldCheck, MapPin, Phone, 
  Clock, CheckCircle2, AlertCircle, ArrowLeft, Send, 
  FileText, Camera, Upload, Key, Check, DollarSign, 
  ExternalLink, User, MessageCircle, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

const STATUS_LABELS = {
  WAITING_FORWARDER_CHOICE: { label: 'En attente choix transitaire', color: 'bg-yellow-100 text-yellow-800' },
  FORWARDER_SELECTED: { label: 'Transitaire choisi', color: 'bg-blue-100 text-blue-800' },
  QUOTE_ACCEPTED: { label: 'Devis accepté & Séquestré', color: 'bg-indigo-100 text-indigo-800' },
  IN_TRANSIT_TO_WAREHOUSE: { label: 'En route vers entrepôt Chine', color: 'bg-amber-100 text-amber-800' },
  RECEIVED_AT_WAREHOUSE: { label: 'Reçu à l\'entrepôt Chine', color: 'bg-purple-100 text-purple-800' },
  PREPARING: { label: 'En préparation / Emballage', color: 'bg-sky-100 text-sky-800' },
  SHIPPED: { label: 'Expédié international', color: 'bg-blue-100 text-blue-800' },
  IN_TRANSIT: { label: 'En vol / En mer', color: 'bg-cyan-100 text-cyan-800' },
  ARRIVED_DESTINATION: { label: 'Arrivé au Cameroun (Douala)', color: 'bg-teal-100 text-teal-800' },
  CUSTOMS_CLEARING: { label: 'En cours de dédouanement', color: 'bg-orange-100 text-orange-800' },
  READY_FOR_PICKUP_OR_DELIVERY: { label: 'Prêt pour retrait / livraison', color: 'bg-lime-100 text-lime-800' },
  DELIVERED: { label: 'Livré & Séquestre libéré', color: 'bg-emerald-100 text-emerald-800' },
  DISPUTED: { label: 'En litige', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-800' }
};

const ShipmentDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const { formatPrice } = useSettings();
  const toast = useToast();
  const messagesEndRef = useRef(null);

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Messages tripartites
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Formulaire de pesée (transitaire)
  const [intakeWeight, setIntakeWeight] = useState('');
  const [intakeLength, setIntakeLength] = useState('');
  const [intakeWidth, setIntakeWidth] = useState('');
  const [intakeHeight, setIntakeHeight] = useState('');
  const [intakePhotoUrl, setIntakePhotoUrl] = useState('');
  const [intakeFinalQuote, setIntakeFinalQuote] = useState('');
  const [intakeLoading, setIntakeLoading] = useState(false);

  // Code de confirmation de remise
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Mise à jour de statut (transitaire / admin)
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusLocation, setStatusLocation] = useState('');
  const [statusTrackingNumber, setStatusTrackingNumber] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Ajout de document
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('PACKING_LIST');
  const [docUrl, setDocUrl] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    fetchShipment();
  }, [id]);

  useEffect(() => {
    if (!socket || !shipment?._id) return;

    socket.emit('joinShipment', shipment._id);

    const handleThreePartyMsg = ({ message }) => {
      setShipment(prev => prev ? {
        ...prev,
        threePartyMessages: [...(prev.threePartyMessages || []), message]
      } : prev);
      scrollToBottom();
    };

    const handleStatusUpdate = (updatedShipment) => {
      setShipment(prev => ({ ...prev, ...updatedShipment }));
      toast.info('Le statut du dossier a été mis à jour.');
    };

    socket.on('threePartyMessageReceived', handleThreePartyMsg);
    socket.on('shipmentStatusUpdated', handleStatusUpdate);
    socket.on('shipmentDelivered', handleStatusUpdate);

    return () => {
      socket.emit('leaveShipment', shipment._id);
      socket.off('threePartyMessageReceived', handleThreePartyMsg);
      socket.off('shipmentStatusUpdated', handleStatusUpdate);
      socket.off('shipmentDelivered', handleStatusUpdate);
    };
  }, [socket, shipment?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [shipment?.threePartyMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchShipment = async () => {
    try {
      setLoading(true);
      setError('');
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` }
      };
      const { data } = await axios.get(`${API_URL}/api/shipments/${id}`, config);
      setShipment(data);
      setIntakeWeight(data.actualWeightKg || data.estimatedWeightKg || '');
      setIntakeFinalQuote(data.quote?.finalAmount || '');
    } catch (err) {
      console.error('Erreur chargement dossier:', err);
      setError(err.response?.data?.message || 'Impossible d\'accéder à ce dossier d\'expédition.');
    } finally {
      setLoading(false);
    }
  };

  // Envoi d'un message tripartite
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sendingMsg) return;

    try {
      setSendingMsg(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${API_URL}/api/shipments/${shipment._id}/messages`, {
        text: messageText
      }, config);
      setMessageText('');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMsg(false);
    }
  };

  // Validation du devis par l'acheteur
  const handleAcceptQuote = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`${API_URL}/api/shipments/${shipment._id}/accept-quote`, {
        paymentMethod: 'momo'
      }, config);
      setShipment(data.shipment);
      toast.success('Devis accepté ! Fonds de transit bloqués en séquestre.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la validation du devis');
    }
  };

  // Enregistrement pesée et photos à l'entrepôt
  const handleWarehouseIntakeSubmit = async (e) => {
    e.preventDefault();
    try {
      setIntakeLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`${API_URL}/api/shipments/${shipment._id}/warehouse-intake`, {
        actualWeightKg: intakeWeight,
        lengthCm: intakeLength,
        widthCm: intakeWidth,
        heightCm: intakeHeight,
        warehousePhotos: intakePhotoUrl ? [intakePhotoUrl] : [],
        finalQuoteAmount: intakeFinalQuote
      }, config);
      setShipment(data.shipment);
      toast.success('Réception à l\'entrepôt enregistrée !');
      setIntakePhotoUrl('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la pesée');
    } finally {
      setIntakeLoading(false);
    }
  };

  // Changement de statut (transitaire / admin)
  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus) return;
    try {
      setStatusLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`${API_URL}/api/shipments/${shipment._id}/status`, {
        status: newStatus,
        location: statusLocation,
        note: statusNote,
        trackingNumber: statusTrackingNumber
      }, config);
      setShipment(data.shipment);
      toast.success(`Statut mis à jour vers ${newStatus}`);
      setNewStatus('');
      setStatusNote('');
      setStatusLocation('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setStatusLoading(false);
    }
  };

  // Confirmation de livraison avec code secret
  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    try {
      setDeliveryLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${API_URL}/api/shipments/${shipment._id}/confirm-delivery`, {
        deliveryCode: deliveryCodeInput
      }, config);
      setShipment(data.shipment);
      toast.success('Livraison validée avec succès ! Les fonds du transit ont été libérés.');
      setDeliveryCodeInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Code de livraison invalide');
    } finally {
      setDeliveryLoading(false);
    }
  };

  // Upload de document
  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docName || !docUrl) return;
    try {
      setDocLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${API_URL}/api/shipments/${shipment._id}/documents`, {
        name: docName,
        type: docType,
        url: docUrl
      }, config);
      setShipment(prev => ({
        ...prev,
        documents: [...(prev.documents || []), data.document]
      }));
      toast.success('Document ajouté au dossier');
      setDocName('');
      setDocUrl('');
    } catch (err) {
      toast.error('Erreur lors de l\'ajout du document');
    } finally {
      setDocLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Chargement du dossier d'expédition...</p>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès refusé ou dossier introuvable</h2>
        <p className="text-gray-500 mb-6">{error || "Vous n'avez pas les droits nécessaires pour consulter ce dossier."}</p>
        <Link
          to="/orders"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à mes commandes
        </Link>
      </div>
    );
  }

  const isBuyer = shipment.buyer?._id?.toString() === user?._id?.toString();
  const isForwarder = user?.role === 'FORWARDER' || (shipment.forwarder?.user && shipment.forwarder.user.toString() === user?._id?.toString());
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const statusConfig = STATUS_LABELS[shipment.status] || { label: shipment.status, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation retour */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/orders"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Mes commandes
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Créé le {new Date(shipment.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        {/* Header Dossier */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Dossier d'expédition Fret
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2 font-mono">
                {shipment.folderNumber}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Associé à la commande <strong>#{shipment.order?.orderNumber || shipment.order?._id?.slice(-8)}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-gray-400 block">Mode de Fret</span>
                <span className="font-bold text-gray-900 flex items-center mt-0.5">
                  {shipment.transportMode === 'AIR_FREIGHT' ? (
                    <>
                      <Plane className="w-4 h-4 mr-1 text-blue-600" /> Fret Aérien
                    </>
                  ) : (
                    <>
                      <Ship className="w-4 h-4 mr-1 text-emerald-600" /> Fret Maritime
                    </>
                  )}
                </span>
              </div>

              {shipment.trackingNumber && (
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-gray-400 block">N° Suivi International</span>
                  <span className="font-mono font-bold text-gray-900 mt-0.5 block">
                    {shipment.trackingNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ALERTE CODE SECRET DE LIVRAISON (Section 16.6) */}
        {shipment.status !== 'DELIVERED' && (
          <div className="mb-8">
            {isBuyer ? (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Key className="w-6 h-6 text-white" />
                      <h3 className="text-lg font-extrabold">Votre Code Secret de Confirmation de Livraison</h3>
                    </div>
                    <p className="text-xs text-amber-100 mt-1 max-w-xl">
                      Ne communiquez ce code au livreur / transitaire <strong>qu'après réception et vérification physique de votre colis</strong>. C'est ce code qui débloquera ses fonds de transit sécurisés en séquestre.
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-xl border border-white/30 text-center">
                    <span className="text-xs uppercase tracking-wider block text-white/80 font-semibold">Code de remise</span>
                    <span className="text-3xl font-black font-mono tracking-widest text-white">
                      {shipment.deliveryConfirmationCode}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center">
                      <Key className="w-5 h-5 text-emerald-600 mr-2" />
                      Valider la remise du colis et débloquer les fonds (Escrow)
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Demandez à l'acheteur son code secret à 6 chiffres lors de la remise physique pour libérer le paiement du transit dans votre portefeuille.
                    </p>
                  </div>

                  <form onSubmit={handleConfirmDelivery} className="flex items-center space-x-2">
                    <input
                      type="text"
                      maxLength="6"
                      placeholder="Code à 6 chiffres"
                      value={deliveryCodeInput}
                      onChange={(e) => setDeliveryCodeInput(e.target.value)}
                      className="py-2 px-3 border border-gray-300 rounded-lg text-sm font-mono tracking-wider text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none w-36"
                    />
                    <button
                      type="submit"
                      disabled={deliveryLoading || deliveryCodeInput.length !== 6}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center disabled:opacity-50"
                    >
                      {deliveryLoading ? 'Validation...' : 'Confirmer'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grille principale : Colonne gauche (Suivi + Entrepôt + Photos) / Colonne droite (Messagerie + Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonne gauche (2 tiers) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Marquage Colis & Entrepôt en Chine (Section 16.4) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Adresse de Livraison & Code de Marquage Chine
              </h2>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-amber-900">
                    Code de Marquage à inscrire sur le colis :
                  </span>
                  <span className="font-mono text-base font-black px-3 py-1 bg-white rounded-lg border border-amber-300 text-amber-900">
                    {shipment.selectedWarehouse?.markingCode || 'MKV-GZ-COLIS'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1">
                  Ce code permet à l'équipe de l'entrepôt à {shipment.selectedWarehouse?.city || 'Guangzhou'} d'identifier instantanément votre colis dès son arrivée.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-gray-700 font-mono space-y-1">
                <p className="font-bold text-gray-900">{shipment.selectedWarehouse?.name}</p>
                <p>Adresse : {shipment.selectedWarehouse?.address}, {shipment.selectedWarehouse?.city}, {shipment.selectedWarehouse?.country}</p>
                <p>Téléphone Contact : {shipment.selectedWarehouse?.contactPhone}</p>
              </div>
            </div>

            {/* Mesures réelles & Photos d'inspection à l'entrepôt (Section 16.4) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <Camera className="w-5 h-5 mr-2 text-indigo-600" />
                  Pesée Réelle & Photos d'Inspection à l'Entrepôt
                </h2>
                {shipment.actualWeightKg > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Pesée certifiée
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-gray-400 uppercase font-semibold block">Poids réel</span>
                  <span className="text-base font-extrabold text-gray-900">
                    {shipment.actualWeightKg ? `${shipment.actualWeightKg} kg` : `${shipment.estimatedWeightKg || 1} kg (est.)`}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-gray-400 uppercase font-semibold block">Dimensions</span>
                  <span className="text-xs font-bold text-gray-900 block mt-1">
                    {shipment.actualDimensionsCm?.length ? `${shipment.actualDimensionsCm.length}x${shipment.actualDimensionsCm.width}x${shipment.actualDimensionsCm.height} cm` : 'Non mesuré'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-gray-400 uppercase font-semibold block">Volume m³</span>
                  <span className="text-base font-extrabold text-gray-900">
                    {shipment.actualVolumeCbm ? `${shipment.actualVolumeCbm} m³` : '-'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-gray-400 uppercase font-semibold block">Devis Transit</span>
                  <span className="text-base font-extrabold text-blue-700">
                    {formatPrice(shipment.quote?.finalAmount || shipment.quote?.initialEstimate || 0)}
                  </span>
                </div>
              </div>

              {/* Photos réelles */}
              {shipment.warehousePhotos && shipment.warehousePhotos.length > 0 ? (
                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-2">Photos du colis physique reçu en Chine :</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {shipment.warehousePhotos.map((photo, pIdx) => (
                      <a
                        key={pIdx}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-xl overflow-hidden border border-gray-200 relative group"
                      >
                        <img src={photo} alt={`Colis reçu ${pIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs">
                          <ExternalLink className="w-4 h-4 mr-1" /> Agrandir
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs">
                  Aucune photo disponible pour l'instant. Le transitaire enverra les photos dès réception du colis à l'entrepôt international.
                </div>
              )}

              {/* Formulaire de réception pour le transitaire / admin */}
              {(isForwarder || isAdmin) && (
                <form onSubmit={handleWarehouseIntakeSubmit} className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                  <h3 className="font-bold text-xs uppercase text-gray-700 tracking-wider">
                    Espace Transitaire : Enregistrer la pesée & photos
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Poids (kg)"
                      value={intakeWeight}
                      onChange={(e) => setIntakeWeight(e.target.value)}
                      className="py-1.5 px-2 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="L (cm)"
                      value={intakeLength}
                      onChange={(e) => setIntakeLength(e.target.value)}
                      className="py-1.5 px-2 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="l (cm)"
                      value={intakeWidth}
                      onChange={(e) => setIntakeWidth(e.target.value)}
                      className="py-1.5 px-2 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="h (cm)"
                      value={intakeHeight}
                      onChange={(e) => setIntakeHeight(e.target.value)}
                      className="py-1.5 px-2 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="url"
                      placeholder="URL photo du colis à l'entrepôt..."
                      value={intakePhotoUrl}
                      onChange={(e) => setIntakePhotoUrl(e.target.value)}
                      className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Devis final (FCFA)"
                      value={intakeFinalQuote}
                      onChange={(e) => setIntakeFinalQuote(e.target.value)}
                      className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={intakeLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      {intakeLoading ? 'Enregistrement...' : 'Valider pesée & devis final'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Validation du Devis par l'Acheteur (Section 16.6) */}
            {isBuyer && !shipment.quote?.isAcceptedByBuyer && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-blue-900 text-base">Validation du devis de transit</h3>
                    <p className="text-xs text-blue-700 mt-1">
                      Montant du transit calculé : <strong>{formatPrice(shipment.quote?.finalAmount || shipment.quote?.initialEstimate)}</strong>.
                      Les fonds seront sécurisés en séquestre jusqu'à la remise en mains propres.
                    </p>
                  </div>
                  <button
                    onClick={handleAcceptQuote}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
                  >
                    Valider le devis & Bloquer en Séquestre
                  </button>
                </div>
              </div>
            )}

            {/* Historique du Suivi (14 Statuts) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-teal-600" />
                Journal des Étapes d'Acheminement
              </h2>

              <div className="space-y-4">
                {shipment.trackingUpdates?.slice().reverse().map((update, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">
                          {STATUS_LABELS[update.status]?.label || update.status}
                        </span>
                        <span className="text-gray-400">
                          {new Date(update.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      {update.location && (
                        <span className="text-gray-500 font-medium block mt-0.5">📍 {update.location}</span>
                      )}
                      <p className="text-gray-600 mt-0.5">{update.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulaire de mise à jour de statut (Transitaire / Admin) */}
              {(isForwarder || isAdmin) && (
                <form onSubmit={handleStatusChangeSubmit} className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                  <h3 className="font-bold text-xs uppercase text-gray-700 tracking-wider">
                    Faire avancer le statut du colis
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs bg-white"
                    >
                      <option value="">Sélectionner nouveau statut...</option>
                      <option value="PREPARING">En préparation / Emballage</option>
                      <option value="SHIPPED">Expédié par fret international</option>
                      <option value="IN_TRANSIT">En transit international (vol/mer)</option>
                      <option value="ARRIVED_DESTINATION">Arrivé à destination (Douala)</option>
                      <option value="CUSTOMS_CLEARING">En cours de dédouanement</option>
                      <option value="READY_FOR_PICKUP_OR_DELIVERY">Prêt à retirer / Livrer</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Lieu actuel (ex: Aéroport Douala)"
                      value={statusLocation}
                      onChange={(e) => setStatusLocation(e.target.value)}
                      className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Note d'information destinataire..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="N° de suivi transporteur (ex: LTA...)"
                      value={statusTrackingNumber}
                      onChange={(e) => setStatusTrackingNumber(e.target.value)}
                      className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={statusLoading || !newStatus}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      {statusLoading ? 'Mise à jour...' : 'Mettre à jour le statut'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Documents du Dossier */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-600" />
                Documents d'Expédition (Packing List, LTA, Connaissement B/L)
              </h2>

              {shipment.documents && shipment.documents.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {shipment.documents.map((doc, dIdx) => (
                    <div key={dIdx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-gray-900 block">{doc.name}</span>
                        <span className="text-gray-400 text-[11px]">{doc.type}</span>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-blue-600 font-semibold hover:bg-gray-50 transition"
                      >
                        Consulter
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-4">Aucun document attaché pour le moment.</p>
              )}

              {/* Formulaire ajout doc */}
              <form onSubmit={handleUploadDoc} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                <input
                  type="text"
                  placeholder="Nom du document"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs"
                />
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs bg-white"
                >
                  <option value="PACKING_LIST">Liste de colisage (Packing list)</option>
                  <option value="AIR_WAYBILL">Lettre de transport aérien (LTA)</option>
                  <option value="BILL_OF_LADING">Connaissement maritime (B/L)</option>
                  <option value="COMMERCIAL_INVOICE">Facture commerciale</option>
                  <option value="CUSTOMS_DECLARATION">Déclaration douanière</option>
                  <option value="OTHER">Autre document</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="URL doc..."
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="py-1.5 px-3 border border-gray-300 rounded-lg text-xs flex-grow"
                  />
                  <button
                    type="submit"
                    disabled={docLoading || !docName || !docUrl}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Colonne droite (1 tiers) : Messagerie Tripartite In-Dossier (Section 16.4) */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px] sticky top-24">
              
              {/* Header Messagerie */}
              <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1.5 text-blue-600" />
                    Messagerie Tripartite
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Acheteur • Vendeur • Transitaire
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="En direct" />
              </div>

              {/* Liste des messages */}
              <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-gray-50/50">
                {(!shipment.threePartyMessages || shipment.threePartyMessages.length === 0) ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    Posez vos questions sur l'acheminement, la préparation du carton ou le dédouanement. Toutes les parties ont accès à cette conversation.
                  </div>
                ) : (
                  shipment.threePartyMessages.map((msg, mIdx) => {
                    const isMe = msg.sender?._id?.toString() === user?._id?.toString() || msg.sender?.toString() === user?._id?.toString();

                    const roleBadges = {
                      BUYER: 'bg-blue-100 text-blue-800',
                      VENDOR: 'bg-emerald-100 text-emerald-800',
                      FORWARDER: 'bg-purple-100 text-purple-800',
                      ADMIN: 'bg-red-100 text-red-800'
                    };

                    return (
                      <div
                        key={mIdx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-gray-400">
                          <span className="font-semibold text-gray-700">{msg.senderName}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${roleBadges[msg.senderRole] || 'bg-gray-100'}`}>
                            {msg.senderRole}
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire d'envoi */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Écrire un message tripartite..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-grow py-2 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !messageText.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShipmentDetail;
