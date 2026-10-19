import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';

const BlogDetail = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/blogs/${slug}`);
        setBlog(data);
      } catch (err) {
        setError('Article non trouvé');
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slug, location.key]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const shareUrl = window.location.href;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Article non trouvé</h1>
          <Link to="/blog" className="text-orange-500 hover:underline">
            ← Retour au blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-6"
        >
          <ArrowLeft size={20} />
          Retour au blog
        </Link>

        <article className="bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl mx-auto">
          {/* Hero Image */}
          {blog.imageUrl && (
            <div className="h-64 md:h-96 bg-gray-200">
              <img
                src={blog.imageUrl}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-10">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {formatDate(blog.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <User size={16} />
                {blog.author}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              {blog.title}
            </h1>

            {/* Excerpt */}
            <p className="text-lg text-gray-600 mb-8 pb-8 border-b">
              {blog.excerpt}
            </p>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              {blog.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Share */}
            <div className="mt-10 pt-6 border-t">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-gray-600">
                  <Share2 size={18} />
                  Partager :
                </span>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
                >
                  <Facebook size={18} />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${blog.title}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center hover:bg-sky-600"
                >
                  <Twitter size={18} />
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* Back to blog */}
        <div className="text-center mt-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <ArrowLeft size={18} />
            Voir tous les articles
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;
