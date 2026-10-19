import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';

const ChatButton = () => {
  const { user } = useContext(AuthContext);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.token) return;
    const fetchUnread = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/chat/unread`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setUnread(data.unreadCount || 0);
      } catch (err) { /* silently fail */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <Link to="/messages"
      className="fixed bottom-20 right-4 z-40 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 active:scale-95"
      title="Messages">
      <MessageCircle size={22} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
};

export default ChatButton;
