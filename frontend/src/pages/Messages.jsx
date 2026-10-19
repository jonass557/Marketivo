import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, Search, Image, Store, Clock, Check, CheckCheck, Smile } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Messages = () => {
  const { user } = useContext(AuthContext);
  const { socket, connected } = useSocket();
  const [searchParams] = useSearchParams();
  const vendorParam = searchParams.get('vendor');

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch conversations on mount
  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  // Auto-open conversation with vendor from URL param
  useEffect(() => {
    if (vendorParam && user) {
      openConversationWithVendor(vendorParam);
    }
  }, [vendorParam, user]);

  // Socket.io listeners
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewMessage = (msg) => {
      if (activeConv && (msg.conversationId === activeConv._id || msg.conversationId === activeConv.id)) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
        // Mark as read
        socket.emit('markAsRead', { conversationId: activeConv._id || activeConv.id, userId: user.id });
      }
      // Refresh conversations list to update lastMessage
      fetchConversations();
    };

    const handleTyping = ({ conversationId, userId, isTyping }) => {
      if (activeConv && (conversationId === activeConv._id || conversationId === activeConv.id) && userId !== user.id) {
        setTyping(isTyping ? userId : null);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('userTyping', handleTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userTyping', handleTyping);
    };
  }, [socket, connected, activeConv, user]);

  // Join conversation room when active conversation changes
  useEffect(() => {
    if (!socket || !activeConv) return;
    const convId = activeConv._id || activeConv.id;
    socket.emit('joinConversation', convId);
    return () => { socket.emit('leaveConversation', convId); };
  }, [socket, activeConv]);

  // Scroll to bottom on new messages
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setConversations(data);
    } catch (err) {
      console.error('Erreur conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const openConversationWithVendor = async (vendorUserId) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/chat/conversations`, { vendorUserId }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActiveConv(data);
      fetchMessages(data._id || data.id);
      setShowSidebar(false);
      fetchConversations();
    } catch (err) {
      console.error('Erreur création conversation:', err);
    }
  };

  const selectConversation = async (conv) => {
    setActiveConv(conv);
    setShowSidebar(false);
    fetchMessages(conv._id || conv.id);
  };

  const fetchMessages = async (convId) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/chat/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(data.messages || []);
      scrollToBottom();
    } catch (err) {
      console.error('Erreur messages:', err);
    }
  };

  const sendMessageHandler = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || sending) return;

    const convId = activeConv._id || activeConv.id;
    setSending(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/chat/conversations/${convId}/messages`, {
        text: newMessage.trim()
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      scrollToBottom();
      fetchConversations();
    } catch (err) {
      console.error('Erreur envoi:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTypingInput = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !activeConv) return;
    const convId = activeConv._id || activeConv.id;
    socket.emit('typing', { conversationId: convId, userId: user.id, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId: convId, userId: user.id, isTyping: false });
    }, 2000);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <MessageCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Connectez-vous pour accéder aux messages</h2>
          <Link to="/login" className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded-xl hover:bg-orange-600">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-4">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-sm border-0 sm:border overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div className="flex h-full">
          
          {/* Sidebar - Conversations list */}
          <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r`}>
            {/* Header */}
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Messages</h2>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aucune conversation</p>
                  <p className="text-gray-400 text-xs mt-1">Contactez un vendeur pour démarrer</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const other = conv.otherParticipant || conv.participants?.find(p => (p._id || p.id) !== user.id);
                  const isActive = activeConv && ((activeConv._id || activeConv.id) === (conv._id || conv.id));
                  const unread = conv.unreadCount || 0;

                  return (
                    <button key={conv._id || conv.id} onClick={() => selectConversation(conv)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left ${
                        isActive ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                      }`}>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {conv.vendor?.logo ? (
                          <img src={conv.vendor.logo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-lg">
                              {(other?.fullName || conv.vendor?.shopName || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {/* Online indicator */}
                        {conv.vendor?.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h4 className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>
                            {conv.vendor?.shopName || other?.fullName || 'Conversation'}
                          </h4>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-0.5">
                          <p className={`text-xs truncate ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                            {conv.lastMessage?.text || 'Démarrer la conversation'}
                          </p>
                          {unread > 0 && (
                            <span className="w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1`}>
            {activeConv ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b flex items-center gap-3 bg-white">
                  <button onClick={() => setShowSidebar(true)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="relative">
                    {activeConv.vendor?.logo ? (
                      <img src={activeConv.vendor.logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Store size={18} className="text-blue-600" />
                      </div>
                    )}
                    {activeConv.vendor?.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-800 truncate">
                      {activeConv.vendor?.shopName || activeConv.otherParticipant?.fullName || 'Conversation'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {typing ? 'En train d\'écrire...' : activeConv.vendor?.isOnline ? 'En ligne' : 'Hors ligne'}
                    </p>
                  </div>
                  {activeConv.vendor?.slug && (
                    <Link to={`/shop/${activeConv.vendor.slug}`} className="text-xs text-blue-600 hover:underline flex-shrink-0">
                      Voir boutique
                    </Link>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.map((msg, idx) => {
                    const isMine = (msg.sender?._id || msg.sender?.id || msg.sender) === user.id;
                    const showDate = idx === 0 || formatDate(msg.createdAt) !== formatDate(messages[idx - 1]?.createdAt);

                    return (
                      <React.Fragment key={msg._id || msg.id || idx}>
                        {showDate && (
                          <div className="text-center my-3">
                            <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1 rounded-full">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white border text-gray-800 rounded-bl-md shadow-sm'
                          }`}>
                            {msg.type === 'product_link' && msg.productRef && (
                              <Link to={`/product/${msg.productRef.slug || msg.productRef._id}`}
                                className={`flex items-center gap-2 mb-2 p-2 rounded-lg ${isMine ? 'bg-blue-500' : 'bg-gray-50'}`}>
                                {msg.productRef.images?.[0] && (
                                  <img src={msg.productRef.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                                )}
                                <div>
                                  <p className="text-xs font-medium truncate">{msg.productRef.name}</p>
                                  <p className="text-xs opacity-75">{new Intl.NumberFormat('fr-CM').format(msg.productRef.price)} FCFA</p>
                                </div>
                              </Link>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                              <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                              {isMine && (
                                msg.readBy?.length > 1
                                  ? <CheckCheck size={12} />
                                  : <Check size={12} />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {typing && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessageHandler} className="p-3 border-t bg-white">
                  <div className="flex items-center gap-2">
                    <input type="text" value={newMessage} onChange={handleTypingInput}
                      placeholder="Écrivez un message..." disabled={sending}
                      className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus />
                    <button type="submit" disabled={!newMessage.trim() || sending}
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center px-4">
                  <MessageCircle size={48} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-600 mb-1">Sélectionnez une conversation</h3>
                  <p className="text-gray-400 text-sm">Choisissez un vendeur pour commencer à discuter</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
