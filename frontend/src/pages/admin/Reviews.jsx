import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Trash2, Star, ChevronLeft, ChevronRight, Loader, MessageSquare } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import { FALLBACK_IMAGE_SVG, safeImage } from '../../data/defaultData';
import { useToast } from '../../context/ToastContext';
import AuthContext from '../../context/AuthContext';

const Reviews = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, averageRating: 0, distribution: {} });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ratingFilter, setRatingFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);

  const location = useLocation();

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [currentPage, ratingFilter, location.key]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20
      });
      if (ratingFilter) params.append('rating', ratingFilter);

      const { data } = await axios.get(`${API_URL}/api/reviews?${params}`, config);
      setReviews(data.reviews || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      toast.error('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/reviews/stats`, config);
      setStats(data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    try {
      setDeleteLoading(id);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.delete(`${API_URL}/api/reviews/${id}`, config);
      toast.success(data.message);
      fetchReviews();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Avis clients</h1>
        <p className="text-gray-500">Gérez les avis laissés par vos clients</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MessageSquare size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total avis</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star size={20} className="text-yellow-600 fill-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Note moyenne</p>
              <p className="text-2xl font-bold">{stats.averageRating}/5</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Star size={20} className="text-green-600 fill-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">5 étoiles</p>
              <p className="text-2xl font-bold text-green-600">{stats.distribution?.[5] || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Star size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">1-2 étoiles</p>
              <p className="text-2xl font-bold text-red-600">
                {(stats.distribution?.[1] || 0) + (stats.distribution?.[2] || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par client, produit ou commentaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Toutes les notes</option>
            <option value="5">5 étoiles</option>
            <option value="4">4 étoiles</option>
            <option value="3">3 étoiles</option>
            <option value="2">2 étoiles</option>
            <option value="1">1 étoile</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Aucun avis trouvé</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Product Image */}
                    <img
                      src={safeImage(review.product?.images?.[0])}
                      alt={review.product?.name}
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{review.user?.fullName}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        Produit: <span className="text-orange-600 font-medium">{review.product?.name}</span>
                      </p>
                      
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                      </div>
                      
                      {review.comment && (
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={deleteLoading === review.id}
                    className="p-2 hover:bg-red-50 rounded text-red-600 disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleteLoading === review.id ? (
                      <Loader className="animate-spin" size={18} />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 py-1 bg-orange-500 text-white rounded">{currentPage}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
