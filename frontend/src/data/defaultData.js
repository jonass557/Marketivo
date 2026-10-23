// Données par défaut pour affichage instantané (0ms de latence)
// Même si le réseau est lent (2G/3G) ou le serveur en cours de démarrage,
// ces données s'affichent automatiquement et immédiatement.

// Placeholders SVG autonomes intégrés (zéro requête réseau, 100% fiable hors-ligne)
export const FALLBACK_IMAGE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f3f4f6"/><g transform="translate(140, 140)" fill="none" stroke="%239ca3af" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l6 14h-12z"/><rect x="8" y="24" width="104" height="80" rx="10"/><circle cx="44" cy="56" r="14"/><path d="M20 90l30-28 26 24 22-18 14 12"/></g><text x="50%25" y="78%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14" font-weight="600">Marketivo</text></svg>`;

export const FALLBACK_AVATAR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e5e7eb"/><circle cx="50" cy="38" r="20" fill="%239ca3af"/><path d="M18 88c0-18 14-30 32-30s32 12 32 30" fill="%239ca3af"/></svg>`;

// Sécurisation d'URL d'image
export const safeImage = (url, fallback = FALLBACK_IMAGE_SVG) => {
  if (!url || typeof url !== 'string' || url.trim() === '' || url.includes('via.placeholder.com')) {
    return fallback;
  }
  return url;
};

// Plans de souscription vendeur par défaut (chargement instantané)
export const DEFAULT_PLANS = [
  {
    _id: "plan_standard",
    id: "plan_standard",
    name: "Standard",
    slug: "standard",
    description: "Démarrez gratuitement avec jusqu'à 8 produits",
    price: 0,
    currency: "XAF",
    duration: 36500,
    commission: 10,
    maxProducts: 8,
    visibilityLevel: 1,
    advantages: [
      "8 produits maximum",
      "Commission 10% par vente",
      "Boutique en ligne personnalisée",
      "Chat inclus avec les clients",
      "Support communautaire",
      "Tableau de bord vendeur"
    ],
    priority: 0,
    chatIncluded: true,
    chatPriority: false,
    supportPremium: false,
    isActive: true,
    isFree: true,
    isRecommended: false,
    color: "#6b7280",
    icon: "gift"
  },
  {
    _id: "plan_premium",
    id: "plan_premium",
    name: "Premium",
    slug: "premium",
    description: "Pour les vendeurs qui veulent développer leur activité",
    price: 5000,
    currency: "XAF",
    duration: 30,
    commission: 5,
    maxProducts: 100,
    visibilityLevel: 2,
    advantages: [
      "100 produits maximum",
      "Commission réduite à 5%",
      "Visibilité améliorée dans les résultats",
      "Chat prioritaire avec les clients",
      "Badge Vendeur Premium",
      "Statistiques de ventes avancées",
      "Support par email prioritaire"
    ],
    priority: 1,
    chatIncluded: true,
    chatPriority: true,
    supportPremium: false,
    isActive: true,
    isFree: false,
    isRecommended: true,
    color: "#f97316",
    icon: "flame"
  },
  {
    _id: "plan_entreprise",
    id: "plan_entreprise",
    name: "Entreprise",
    slug: "entreprise",
    description: "La solution complète pour les grandes entreprises",
    price: 15000,
    currency: "XAF",
    duration: 30,
    commission: 0,
    maxProducts: 0,
    visibilityLevel: 4,
    advantages: [
      "Produits illimités",
      "Zéro commission sur les ventes",
      "Visibilité maximale (top des résultats)",
      "Chat prioritaire + support premium",
      "Badge Entreprise Certifiée",
      "Statistiques complètes & exports",
      "Position prioritaire sur la page d'accueil",
      "Support dédié WhatsApp 24/7"
    ],
    priority: 2,
    chatIncluded: true,
    chatPriority: true,
    supportPremium: true,
    isActive: true,
    isFree: false,
    isRecommended: false,
    color: "#8b5cf6",
    icon: "trophy"
  }
];

// Catégories par défaut pour affichage immédiat
export const DEFAULT_CATEGORIES = [
  { _id: 'cat_elec', id: 'cat_elec', name: 'Électronique', slug: 'electronique', description: 'Appareils électroniques, smartphones, audio', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&auto=format&fit=crop&q=80' },
  { _id: 'cat_mode', id: 'cat_mode', name: 'Mode', slug: 'mode', description: 'Vêtements et accessoires tendance', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&auto=format&fit=crop&q=80' },
  { _id: 'cat_maison', id: 'cat_maison', name: 'Maison', slug: 'maison', description: 'Articles et décoration pour la maison', image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&auto=format&fit=crop&q=80' },
  { _id: 'cat_sports', id: 'cat_sports', name: 'Sports', slug: 'sports', description: 'Équipements et accessoires sportifs', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&auto=format&fit=crop&q=80' },
  { _id: 'cat_beaute', id: 'cat_beaute', name: 'Beauté', slug: 'beaute', description: 'Soins, cosmétiques et bien-être', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&auto=format&fit=crop&q=80' }
];

// Produits par défaut pour affichage immédiat
export const DEFAULT_PRODUCTS = [
  {
    _id: "prod_1",
    id: "prod_1",
    name: "Smartphone Android Pro 128Go",
    slug: "smartphone-android-pro-128go",
    price: 125000,
    comparePrice: 150000,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80",
    images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80"],
    category: { name: "Électronique", slug: "electronique" },
    rating: 4.8,
    numReviews: 24,
    countInStock: 15,
    isPopular: true
  },
  {
    _id: "prod_2",
    id: "prod_2",
    name: "Écouteurs Sans Fil Bluetooth 5.3",
    slug: "ecouteurs-sans-fil-bluetooth",
    price: 18000,
    comparePrice: 25000,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80",
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80"],
    category: { name: "Électronique", slug: "electronique" },
    rating: 4.9,
    numReviews: 42,
    countInStock: 20,
    isPopular: true
  },
  {
    _id: "prod_3",
    id: "prod_3",
    name: "Montre Connectée Sport Waterproof",
    slug: "montre-connectee-sport",
    price: 32000,
    comparePrice: 45000,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80"],
    category: { name: "Électronique", slug: "electronique" },
    rating: 4.7,
    numReviews: 19,
    countInStock: 10,
    isPopular: true
  },
  {
    _id: "prod_4",
    id: "prod_4",
    name: "Sneakers Tendance Urbaines",
    slug: "sneakers-tendance-urbaines",
    price: 24000,
    comparePrice: 30000,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80"],
    category: { name: "Mode", slug: "mode" },
    rating: 4.6,
    numReviews: 31,
    countInStock: 12,
    isPopular: true
  }
];
