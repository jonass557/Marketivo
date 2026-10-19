import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowRight, Share2, MessageCircle, Facebook, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import API_URL from '../config/api';

const BlogList = () => {
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 6;

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/blogs?published=true`);
        setBlogs(data);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [location.key]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const shareOnWhatsApp = (blog) => {
    const url = `${window.location.origin}/blog/${blog.slug}`;
    const text = `📰 ${blog.title}\n\n${blog.excerpt?.substring(0, 100)}...\n\n👉 Lire l'article: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShareMenuOpen(null);
  };

  const shareOnFacebook = (blog) => {
    const url = `${window.location.origin}/blog/${blog.slug}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    setShareMenuOpen(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Bouton Retour */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Retour</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{t('blog.title')}</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {t('blog.subtitle')}
          </p>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Chargement des articles...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">Aucun article disponible pour le moment.</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.slice((currentPage - 1) * blogsPerPage, currentPage * blogsPerPage).map((blog) => (
              <article
                key={blog.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Image */}
                <Link to={`/blog/${blog.slug}`} className="block">
                  <div className="h-48 bg-gray-200 overflow-hidden relative">
                    {blog.imageUrl ? (
                      <>
                        <img
                          src={blog.imageUrl}
                          alt={blog.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-200" style={{display: 'none'}}>
                          <span className="text-6xl">📝</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-6xl">📝</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(blog.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {blog.author}
                      </span>
                    </div>
                    
                    {/* Bouton Partager */}
                    <div className="relative">
                      <button
                        onClick={() => setShareMenuOpen(shareMenuOpen === blog.id ? null : blog.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title={t('blog.shareArticle')}
                      >
                        <Share2 size={18} className="text-gray-500" />
                      </button>
                      
                      {shareMenuOpen === blog.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShareMenuOpen(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-50 w-48 py-2">
                            <button
                              onClick={() => shareOnWhatsApp(blog)}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-green-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <MessageCircle size={14} className="text-white" />
                              </div>
                              <span className="text-sm">WhatsApp</span>
                            </button>
                            <button
                              onClick={() => shareOnFacebook(blog)}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <Facebook size={14} className="text-white" />
                              </div>
                              <span className="text-sm">Facebook</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Link to={`/blog/${blog.slug}`}>
                    <h2 className="text-xl font-bold text-gray-800 mb-3 hover:text-orange-500 transition-colors line-clamp-2">
                      {blog.title}
                    </h2>
                  </Link>

                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {blog.excerpt}
                  </p>

                  <Link
                    to={`/blog/${blog.slug}`}
                    className="inline-flex items-center gap-2 text-orange-500 font-medium hover:text-orange-600"
                  >
                    {t('blog.readMore')}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

            {/* Pagination */}
            {Math.ceil(blogs.length / blogsPerPage) > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">
                  Page {currentPage} sur {Math.ceil(blogs.length / blogsPerPage)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  {Array.from({ length: Math.min(5, Math.ceil(blogs.length / blogsPerPage)) }, (_, i) => {
                    const totalPages = Math.ceil(blogs.length / blogsPerPage);
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-orange-500 text-white'
                            : 'border hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(blogs.length / blogsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(blogs.length / blogsPerPage)}
                    className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BlogList;
