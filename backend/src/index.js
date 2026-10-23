const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const Vendor = require('./models/Vendor');

dotenv.config();

// Connexion à MongoDB
connectDB();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const blockRoutes = require('./routes/blockRoutes');
const blogRoutes = require('./routes/blogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const partnerRoutes = require('./routes/partnerRoutes');

const app = express();
const server = http.createServer(app);

// Nécessaire derrière les reverse proxies (Render, Vercel, Heroku) pour obtenir la vraie IP client
app.set('trust proxy', 1);

// Suivi des utilisateurs en ligne
const onlineUsers = new Map(); // userId -> Set<socketId>

// Configuration Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Rendre io accessible dans les routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log('Client connecté:', socket.id);

  // Rejoindre une room basée sur l'userId
  socket.on('join', async (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      socket.userId = userId;

      // Ajouter aux utilisateurs en ligne
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      // Mettre à jour le statut en ligne du vendeur
      try {
        await Vendor.findOneAndUpdate({ user: userId }, { isOnline: true, lastSeen: new Date() });
      } catch (e) { /* pas un vendeur */ }

      // Notifier les autres que cet utilisateur est en ligne
      socket.broadcast.emit('userOnline', { userId });
      console.log(`User ${userId} a rejoint sa room`);
    }
  });

  // Room admin
  socket.on('joinAdmin', () => {
    socket.join('admin');
    console.log('Admin connecté');
  });

  // Chat: Rejoindre une room de conversation
  socket.on('joinConversation', (conversationId) => {
    if (conversationId) {
      socket.join(`chat_${conversationId}`);
    }
  });

  // Chat: Quitter une room de conversation
  socket.on('leaveConversation', (conversationId) => {
    if (conversationId) {
      socket.leave(`chat_${conversationId}`);
    }
  });

  // Chat: Indicateur de frappe
  socket.on('typing', ({ conversationId, userId, isTyping }) => {
    socket.to(`chat_${conversationId}`).emit('userTyping', { conversationId, userId, isTyping });
  });

  // Chat: Marquer les messages comme lus
  socket.on('markAsRead', ({ conversationId, userId }) => {
    socket.to(`chat_${conversationId}`).emit('messagesRead', { conversationId, userId });
  });

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (userId) {
      // Retirer ce socket des utilisateurs en ligne
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Mettre à jour le statut hors ligne du vendeur
          try {
            await Vendor.findOneAndUpdate({ user: userId }, { isOnline: false, lastSeen: new Date() });
          } catch (e) { /* pas un vendeur */ }
          socket.broadcast.emit('userOffline', { userId });
        }
      }
    }
    console.log('Client déconnecté:', socket.id);
  });
});

// Configuration CORS tout environnement (Vercel, dev local, etc.)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Autorise tous les sous-domaines Vercel preview et prod (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9-._]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    // En production ou domaine personnalisé
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};
app.use(cors(corsOptions));

// ===== SÉCURITÉ =====
// Helmet : headers de sécurité HTTP (XSS, sniffing, clickjacking…)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // désactivé pour ne pas bloquer images externes
}));

// Protection contre les injections NoSQL MongoDB
app.use(mongoSanitize());

// ===== PERFORMANCE =====
// Compression gzip pour réduire la taille des réponses
app.use(compression());

// Limite le nombre de requêtes par IP (anti-DDoS / brute-force)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requêtes max par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes, veuillez réessayer dans 15 minutes.' }
});
app.use('/api/', apiLimiter);

// Limite pour les routes d'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 tentatives max par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/admin/login', authLimiter);
app.use('/api/vendors/register', authLimiter);

// Body parser avec limite de taille pour éviter les payloads trop gros
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/partners', partnerRoutes);

app.get('/', (req, res) => {
  res.send('API MyShop Marketplace est en ligne');
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`WebSocket actif sur le port ${PORT}`);
});
