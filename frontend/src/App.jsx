import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import MyOrders from './pages/MyOrders';
import Wishlist from './pages/Wishlist';
import Addresses from './pages/Addresses';
import UserSettings from './pages/UserSettings';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';

// Marketplace Pages
import VendorRegister from './pages/VendorRegister';
import VendorShop from './pages/VendorShop';
import VendorsList from './pages/VendorsList';
import Messages from './pages/Messages';
import Pricing from './pages/Pricing';

// Vendor Dashboard Pages
import VendorLayout from './pages/vendor/VendorLayout';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorSubscription from './pages/vendor/VendorSubscription';
import VendorSettings from './pages/vendor/VendorSettings';
import VendorProductForm from './pages/vendor/VendorProductForm';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import ProductForm from './pages/admin/ProductForm';
import Categories from './pages/admin/Categories';
import Orders from './pages/admin/Orders';
import Users from './pages/admin/Users';
import Banners from './pages/admin/Banners';
import Blogs from './pages/admin/Blogs';
import Reviews from './pages/admin/Reviews';
import Settings from './pages/admin/Settings';
import Vendors from './pages/admin/Vendors';
import Subscriptions from './pages/admin/Subscriptions';
import ChatModeration from './pages/admin/ChatModeration';
import Partners from './pages/admin/Partners';

// Layout pour les pages publiques
const PublicLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-100">
    <Header />
    <main className="flex-grow">
      {children}
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AuthProvider>
          <SocketProvider>
            <CartProvider>
              <ToastProvider>
                <Router>
                  <Routes>
                    {/* Routes publiques */}
                    <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                    <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
                    <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
                    <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
                    <Route path="/reset-password/:token" element={<PublicLayout><ResetPassword /></PublicLayout>} />
                    <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
                    <Route path="/product/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
                    <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
                    <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
                    <Route path="/profile" element={<PublicLayout><Profile /></PublicLayout>} />
                    <Route path="/orders" element={<PublicLayout><MyOrders /></PublicLayout>} />
                    <Route path="/wishlist" element={<PublicLayout><Wishlist /></PublicLayout>} />
                    <Route path="/addresses" element={<PublicLayout><Addresses /></PublicLayout>} />
                    <Route path="/settings" element={<PublicLayout><UserSettings /></PublicLayout>} />
                    <Route path="/blog" element={<PublicLayout><BlogList /></PublicLayout>} />
                    <Route path="/blog/:slug" element={<PublicLayout><BlogDetail /></PublicLayout>} />

                    {/* Marketplace Routes */}
                    <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
                    <Route path="/vendor/register" element={<PublicLayout><VendorRegister /></PublicLayout>} />
                    <Route path="/vendors" element={<PublicLayout><VendorsList /></PublicLayout>} />
                    <Route path="/shop/:slug" element={<PublicLayout><VendorShop /></PublicLayout>} />
                    <Route path="/messages" element={<PublicLayout><Messages /></PublicLayout>} />

                    {/* Vendor Dashboard Routes */}
                    <Route path="/vendor/dashboard" element={<VendorLayout />}>
                      <Route index element={<VendorDashboard />} />
                      <Route path="products" element={<VendorProducts />} />
                      <Route path="products/new" element={<VendorProductForm />} />
                      <Route path="products/:id/edit" element={<VendorProductForm />} />
                      <Route path="orders" element={<VendorOrders />} />
                      <Route path="messages" element={<Messages />} />
                      <Route path="subscription" element={<VendorSubscription />} />
                      <Route path="settings" element={<VendorSettings />} />
                    </Route>

                    {/* Route Admin Login (sans layout admin) */}
                    <Route path="/admin/login" element={<AdminLogin />} />

                    {/* Routes Admin (avec layout admin) */}
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="vendors" element={<Vendors />} />
                      <Route path="subscriptions" element={<Subscriptions />} />
                      <Route path="products" element={<Products />} />
                      <Route path="products/new" element={<ProductForm />} />
                      <Route path="products/:id/edit" element={<ProductForm />} />
                      <Route path="categories" element={<Categories />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="users" element={<Users />} />
                      <Route path="chat" element={<ChatModeration />} />
                      <Route path="partners" element={<Partners />} />
                      <Route path="banners" element={<Banners />} />
                      <Route path="blogs" element={<Blogs />} />
                      <Route path="reviews" element={<Reviews />} />
                      <Route path="settings" element={<Settings />} />
                    </Route>
                  </Routes>
                </Router>
              </ToastProvider>
            </CartProvider>
          </SocketProvider>
        </AuthProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
