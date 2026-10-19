import React, { useState, useEffect, useContext } from 'react';
import { MessageCircle, Search, Shield, Ban, Flag, Eye, Trash2, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const ChatModeration = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => { fetchConversations(); }, [page, flaggedOnly]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_URL}/api/chat/admin/conversations?flagged=${flaggedOnly}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setConversations(data.conversations || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const viewMessages = async (convId) => {
    if (selectedConv === convId) { setSelectedConv(null); return; }
    setSelectedConv(convId);
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/chat/conversations/${convId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(data.messages || []);
    } catch (err) { console.error(err); }
    finally { setLoadingMessages(false); }
  };

  const toggleBlock = async (convId, reason) => {
    try {
      await axios.put(`${API_URL}/api/chat/admin/conversations/${convId}/block`,
        { reason: reason || '' },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      fetchConversations();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  const deleteMessage = async (msgId) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await axios.delete(`${API_URL}/api/chat/admin/messages/${msgId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Refresh messages
      if (selectedConv) viewMessages(selectedConv);
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Modération des Conversations</h1>
          <p className="text-gray-500 text-sm">{total} conversation(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFlaggedOnly(false); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${!flaggedOnly ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600'}`}>
            Toutes
          </button>
          <button onClick={() => { setFlaggedOnly(true); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 ${flaggedOnly ? 'bg-red-500 text-white' : 'bg-white border text-gray-600'}`}>
            <Flag size={14} /> Signalées
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <MessageCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600">Aucune conversation</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => {
            const isBlocked = conv.status === 'BLOCKED';
            const isExpanded = selectedConv === (conv._id || conv.id);

            return (
              <div key={conv._id || conv.id} className={`bg-white rounded-xl border overflow-hidden ${
                isBlocked ? 'border-red-200' : conv.isFlagged ? 'border-yellow-200' : ''
              }`}>
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isBlocked ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <MessageCircle size={18} className={isBlocked ? 'text-red-600' : 'text-blue-600'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {conv.participants?.map(p => p.fullName).join(' ↔ ')}
                        </h4>
                        {conv.isFlagged && <AlertTriangle size={14} className="text-yellow-500" />}
                        {isBlocked && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Bloquée</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {conv.vendor?.shopName && <span>Boutique: {conv.vendor.shopName}</span>}
                        <span>{formatDate(conv.updatedAt)}</span>
                      </div>
                      {conv.lastMessage?.text && (
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-md">
                          Dernier: {conv.lastMessage.text}
                        </p>
                      )}
                      {conv.flagReason && (
                        <p className="text-xs text-yellow-600 mt-1">Raison: {conv.flagReason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => viewMessages(conv._id || conv.id)}
                      className={`p-2 rounded-lg text-sm ${isExpanded ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Voir messages">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => toggleBlock(conv._id || conv.id, isBlocked ? '' : 'Bloqué par admin')}
                      className={`p-2 rounded-lg text-sm ${isBlocked ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-500'}`}
                      title={isBlocked ? 'Débloquer' : 'Bloquer'}>
                      {isBlocked ? <Shield size={16} /> : <Ban size={16} />}
                    </button>
                  </div>
                </div>

                {/* Messages panel */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4 max-h-96 overflow-y-auto">
                    {loadingMessages ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">Aucun message</p>
                    ) : (
                      <div className="space-y-2">
                        {messages.map(msg => (
                          <div key={msg._id || msg.id} className={`flex items-start gap-2 ${msg.isDeleted ? 'opacity-50' : ''}`}>
                            <div className="flex-1 bg-white rounded-lg p-2.5 border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700">
                                  {msg.sender?.fullName || 'Inconnu'}
                                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${
                                    msg.sender?.role === 'VENDOR' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {msg.sender?.role === 'VENDOR' ? 'Vendeur' : 'Client'}
                                  </span>
                                </span>
                                <span className="text-[10px] text-gray-400">{formatDate(msg.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600">{msg.text}</p>
                            </div>
                            {!msg.isDeleted && (
                              <button onClick={() => deleteMessage(msg._id || msg.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg flex-shrink-0 mt-1" title="Supprimer">
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatModeration;
