import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = ({ className = '', label = 'Retour' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors ${className}`}
    >
      <ArrowLeft size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

export default BackButton;
