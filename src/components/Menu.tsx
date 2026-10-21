import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, orderBy } from 'firebase/firestore';
import { Product, Order, Settings, Category, CartItem, Side, ProductSize, ImageGallery } from '../types';
import { Plus, Minus, ShoppingBag, X, MessageCircle, MessageSquare, Check, Calendar, Building2, User, Phone, MapPin, RefreshCw, ChevronDown, ChevronLeft, ArrowLeft, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const translations = {
  pt: {
    cartTitle: 'Seu Carrinho',
    emptyCart: 'Seu carrinho está vazio',
    total: 'Total',
    next: 'Próximo: Seus Dados',
    back: 'Voltar',
    finish: 'Finalizar Pedido',
    fullName: 'Nome Completo',
    phone: 'Telefone',
    email: 'E-mail',
    birthday: 'Nasc (MM/DD)',
    birthdayPlaceholder: 'MM/DD',
    street: 'Endereço Completo (Rua e Número)',
    number: 'Nº / Apto / Suíte',
    apt: 'Apto / Bloco / Suíte (Opcional)',
    zipCode: 'Zip Code (EUA)',
    city: 'Cidade',
    state: 'Estado (UF)',
    observation: 'Observações do Pedido',
    orderDetails: 'Finalizar Pedido',
    customCakeTitle: 'Opções de Personalização',
    chooseModel: 'Escolha o Modelo',
    chooseSize: 'Escolha o Tamanho',
    chooseDough: 'Escolha a Massa',
    chooseFillings: 'Escolha os Recheios',
    chooseFrosting: 'Escolha a Cobertura',
    chooseSides: 'Escolha os Acompanhamentos',
    excludeIngredients: 'Excluir Ingredientes',
    limitReached: 'Limite atingido',
    addToCart: 'Adicionar ao Carrinho',
    whatsappOrder: 'Pedido',
    whatsappData: 'Dados do Cliente',
    whatsappItems: 'Itens do Pedido',
    whatsappTotal: 'Total do Pedido',
    whatsappDate: 'Data',
    whatsappAt: 'às',
    pickupDate: 'Data de Entrega/Retirada',
    pickupDatePlaceholder: 'MM/DD/AAAA',
    consultMessage: 'Existem itens no pedido com valores a consultar. Aguarde a confirmação pelo WhatsApp.',
    orderMethod: 'Modalidade do Pedido',
    delivery: 'Delivery (Entrega)',
    pickup: 'Retirada (Pickup)'
  },
  en: {
    cartTitle: 'Your Cart',
    emptyCart: 'Your cart is empty',
    total: 'Total',
    next: 'Next: Your Details',
    back: 'Back',
    finish: 'Finish Order',
    fullName: 'Full Name',
    phone: 'Phone',
    email: 'E-mail',
    birthday: 'Birthday (Month/Day)',
    birthdayPlaceholder: 'MM/DD',
    street: 'Street/Avenue',
    number: 'No./Apt',
    zipCode: 'Zip Code',
    city: 'City',
    observation: 'Observation',
    orderDetails: 'Order Details',
    customCakeTitle: 'Customize your Order',
    chooseModel: 'Choose Model',
    chooseSize: 'Choose Size',
    chooseDough: 'Choose Dough',
    chooseFillings: 'Choose Fillings',
    chooseFrosting: 'Choose Frosting',
    chooseSides: 'Choose Sides',
    excludeIngredients: 'Exclude Ingredients',
    limitReached: 'Limit reached',
    addToCart: 'Add to Cart',
    whatsappOrder: 'Order',
    whatsappData: 'Customer Data',
    whatsappItems: 'Order Items',
    whatsappTotal: 'Order Total',
    whatsappDate: 'Date',
    whatsappAt: 'at',
    pickupDate: 'Pickup/Delivery Date',
    pickupDatePlaceholder: 'MM/DD/YYYY',
    consultMessage: 'There are items with values to be consulted. Please wait for confirmation via WhatsApp.',
    orderMethod: 'Order Method',
    delivery: 'Delivery',
    pickup: 'Store Pickup'
  }
};

export const US_STATES = [
  { code: 'FL', name: 'Flórida' },
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'Califórnia' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'Distrito de Columbia' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'Novo México' },
  { code: 'NY', name: 'Nova York' },
  { code: 'NC', name: 'Carolina do Norte' },
  { code: 'ND', name: 'Dakota do Norte' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pensilvânia' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'Carolina do Sul' },
  { code: 'SD', name: 'Dakota do Sul' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virgínia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'Virgínia Ocidental' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

export const getContrastText = (hexColor?: string): string => {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  );
  return hsp > 155 ? '#000000' : '#ffffff';
};

export const getColorWithLegibility = (hexColor?: string, defaultColor: string = '#865d39'): string => {
  if (!hexColor) return defaultColor;
  let hex = hexColor.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return defaultColor;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance > 0.6) {
    return defaultColor;
  }
  return `#${hex}`;
};

const normalizeSettingsInPortuguese = (s: Settings): Settings => {
  return {
    ...s,
    language: 'pt',
    currency: s.currency || 'USD',
    brandName: s.brandName || 'Sou Brazil',
    slogan: s.slogan || 'Alimentação saudável, marmitas fit e pratos deliciosos.',
    introTitle: s.introTitle || 'Sou Brazil',
    introSubtitle: s.introSubtitle || 'Alimentação Saudável e Equilibrada',
    introDescription: s.introDescription || 'Pratos nutritivos, marmitas fitness e opções saborosas para o seu dia a dia.',
    introButtonText: s.introButtonText || 'VER CARDÁPIO',
    introBottomText: s.introBottomText || '100% ARTESANAL & FIT',
    selectorTitle: s.selectorTitle || 'Cardápios Sou Brazil',
    selectorSubtitle: s.selectorSubtitle || 'Escolha seu cardápio',
    catalog1Title: s.catalog1Title || 'Marmitas Tradicionais',
    catalog1Desc: s.catalog1Desc || 'Nossos pratos fitness e refeições tradicionais saudáveis.',
    catalog1Slogan: s.catalog1Slogan || 'Refeições equilibradas feitas com amor',
    catalog2Title: s.catalog2Title || 'Marmitas Fitness',
    catalog2Desc: s.catalog2Desc || 'Pratos pensados para sua rotina de treinos e saúde.',
    catalog2Slogan: s.catalog2Slogan || 'Saúde e sabor no seu dia',
    catalog3Title: s.catalog3Title || 'Caldos',
    catalog3Desc: s.catalog3Desc || 'Caldos nutritivos e reconfortantes.',
    catalog3Slogan: s.catalog3Slogan || 'Nutrição e aconchego em cada colher',
    catalog4Title: s.catalog4Title || 'Sucos Detox',
    catalog4Desc: s.catalog4Desc || 'Sucos naturais, frescos e funcionais.',
    catalog4Slogan: s.catalog4Slogan || 'Energia e vitalidade natural',
    checkoutTitle: s.checkoutTitle || 'Ficamos muito felizes com seu pedido! Confira os dados abaixo.',
    infoBlock1Title: s.infoBlock1Title || 'CONFIRMAÇÃO DO PEDIDO',
    infoBlock1Text: s.infoBlock1Text || 'Após enviar seu pedido, entraremos em contato pelo WhatsApp para confirmar os detalhes.',
    infoBlock2Title: s.infoBlock2Title || 'ENTREGA OU RETIRADA',
    infoBlock2Text: s.infoBlock2Text || 'Verifique o endereço e os dados do seu pedido na confirmação final.',
    whatsappClosingMessage: s.whatsappClosingMessage || 'Obrigada pelo seu pedido, em breve entraremos em contato para confirmação!'
  };
};

export default function Menu({ settings: initialSettings }: { settings: Settings }) {
  const settings = normalizeSettingsInPortuguese(initialSettings);
  const t = translations.pt;
  const currencySymbol = settings.currency === 'BRL' ? 'R$' : '$';

  const DEFAULT_CAKE_SIZES = [
    'Pequeno - 15 a 20 Fatias (Aprox. 1.5kg)',
    'Médio - 25 a 30 Fatias (Aprox. 2.5kg)',
    'Grande - 40 a 50 Fatias (Aprox. 4.0kg)'
  ];

  const DEFAULT_CAKE_DOUGHS = [
    'Massa de Baunilha',
    'Massa de Chocolate 50% Cacau',
    'Massa Red Velvet'
  ];

  const DEFAULT_CAKE_FILLINGS = [
    'Brigadeiro Gourmet (Chocolate Belga)',
    'Beijinho de Coco Tradicional',
    'Doce de Leite',
    'Creme de Ninho com Frutas Vermelhas'
  ];

  const DEFAULT_CAKE_TOPPINGS = [
    'Chantininho Cremoso',
    'Ganache de Chocolate Belga',
    'Buttercream Clássico'
  ];

  const DEFAULT_CAKE_TOPPERS = [
    'None',
    'Happy Birthday',
    'Congratulations'
  ];

  const cakeSizesList = (settings.cakeSizes && settings.cakeSizes.length > 0) ? settings.cakeSizes : DEFAULT_CAKE_SIZES;
  const cakeDoughsList = (settings.cakeDoughs && settings.cakeDoughs.length > 0) ? settings.cakeDoughs : DEFAULT_CAKE_DOUGHS;
  const cakeFillingsList = (settings.cakeFillings && settings.cakeFillings.length > 0) ? settings.cakeFillings : DEFAULT_CAKE_FILLINGS;
  const cakeToppingsList = (settings.cakeToppings && settings.cakeToppings.length > 0) ? settings.cakeToppings : DEFAULT_CAKE_TOPPINGS;
  const cakeToppersList = (settings.cakeToppers && settings.cakeToppers.length > 0) ? settings.cakeToppers : DEFAULT_CAKE_TOPPERS;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatalog, setSelectedCatalog] = useState<'catalog1' | 'catalog2' | 'catalog3' | 'catalog4' | null>(null);
  const [cartsByCatalog, setCartsByCatalog] = useState<Record<string, CartItem[]>>({
    catalog1: [],
    catalog2: [],
    catalog3: [],
    catalog4: []
  });

  const activeCatalogKey = selectedCatalog || 'catalog1';
  const cart = useMemo(() => cartsByCatalog[activeCatalogKey] || [], [cartsByCatalog, activeCatalogKey]);

  const setCart = useCallback((action: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartsByCatalog(prevMap => {
      const currentList = prevMap[activeCatalogKey] || [];
      const nextList = typeof action === 'function' ? action(currentList) : action;
      return {
        ...prevMap,
        [activeCatalogKey]: nextList
      };
    });
  }, [activeCatalogKey]);

  const getCatalogTitle = useCallback((key: string) => {
    if (key === 'catalog1') return settings.catalog1Title || (settings.language === 'en' ? 'Catalog 1' : 'Cardápio Principal');
    if (key === 'catalog2') return settings.catalog2Title || (settings.language === 'en' ? 'Catalog 2' : 'Bebidas & Doces Fit');
    if (key === 'catalog3') return settings.catalog3Title || (settings.language === 'en' ? 'Catalog 3' : 'Dietas Low Carb');
    if (key === 'catalog4') return settings.catalog4Title || (settings.language === 'en' ? 'Catalog 4' : 'Dietas Hipertróficas');
    return settings.brandName || 'Cardápio';
  }, [settings]);

  const getCatalogMinItems = useCallback((key: string): number => {
    if (key === 'catalog1') return settings.catalog1MinItems !== undefined ? settings.catalog1MinItems : 8;
    if (key === 'catalog2') return settings.catalog2MinItems !== undefined ? settings.catalog2MinItems : 8;
    if (key === 'catalog3') return settings.catalog3MinItems !== undefined ? settings.catalog3MinItems : 2;
    if (key === 'catalog4') return settings.catalog4MinItems !== undefined ? settings.catalog4MinItems : 2;
    return 0;
  }, [settings]);

  const getItemPrice = useCallback((item: CartItem) => {
    const product = products.find(p => p.id === item.productId);
    const basePrice = item.selectedSize ? item.selectedSize.price : ((product?.price && product.price > 0) ? product.price : (product?.oldPrice || 0));
    let itemPrice = basePrice;
    if (item.mealOptions?.sides) {
      itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
    }
    return itemPrice;
  }, [products]);

  const getCatalogCount = useCallback((key: string) => {
    return (cartsByCatalog[key] || []).reduce((sum, item) => sum + item.quantity, 0);
  }, [cartsByCatalog]);

  const getCatalogTotal = useCallback((key: string) => {
    return (cartsByCatalog[key] || []).reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  }, [cartsByCatalog, getItemPrice]);

  const totalCartItemsCount = useMemo(() => {
    return (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).reduce((sum, key) => sum + getCatalogCount(key), 0);
  }, [getCatalogCount]);

  const totalCartPrice = useMemo(() => {
    return (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).reduce((sum, key) => sum + getCatalogTotal(key), 0);
  }, [getCatalogTotal]);

  const activeCatalogsWithItems = useMemo(() => {
    return (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).filter(key => (cartsByCatalog[key] || []).length > 0);
  }, [cartsByCatalog]);

  const allCartItems = useMemo(() => {
    const list: Array<CartItem & { catalogKey: 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4'; catalogTitle: string }> = [];
    (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).forEach(key => {
      (cartsByCatalog[key] || []).forEach(item => {
        list.push({ ...item, catalogKey: key, catalogTitle: getCatalogTitle(key) });
      });
    });
    return list;
  }, [cartsByCatalog, getCatalogTitle]);

  const updateCartItemQuantity = (catalogKey: string, cartItemId: string, delta: number) => {
    setCartsByCatalog(prev => {
      const list = prev[catalogKey] || [];
      const item = list.find(i => i.id === cartItemId);
      if (!item) return prev;

      if (delta < 0 && item.quantity <= 1) {
        return {
          ...prev,
          [catalogKey]: list.filter(i => i.id !== cartItemId)
        };
      }

      if (delta > 0) {
        const prod = products.find(p => p.id === item.productId);
        const currentQty = (prev[catalogKey] || [])
          .filter(i => i.productId === item.productId)
          .reduce((sum, i) => sum + i.quantity, 0);
        if (currentQty >= 3) {
          toast.error(
            settings.language === 'en'
              ? `Maximum limit of 3 units of "${prod?.title || 'product'}" reached!`
              : `Limite máximo de 3 unidades de "${prod?.title || 'produto'}" atingido!`
          );
          return prev;
        }
      }

      return {
        ...prev,
        [catalogKey]: list.map(i => i.id === cartItemId ? { ...i, quantity: i.quantity + delta } : i)
      };
    });
  };

  const removeCartItem = (catalogKey: string, cartItemId: string) => {
    setCartsByCatalog(prev => ({
      ...prev,
      [catalogKey]: (prev[catalogKey] || []).filter(i => i.id !== cartItemId)
    }));
  };

  const clearAllCarts = () => {
    setCartsByCatalog({
      catalog1: [],
      catalog2: [],
      catalog3: [],
      catalog4: []
    });
  };
  const [sides, setSides] = useState<Side[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedProductForCustom, setSelectedProductForCustom] = useState<Product | null>(null);
  const [isDietsModalOpen, setIsDietsModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [mealSelections, setMealSelections] = useState<{
    removals: string[];
    sides: Side[];
  }>({
    removals: [],
    sides: []
  });
  const [sideQuantities, setSideQuantities] = useState<Record<string, number>>({});
  const [selectedCakeSize, setSelectedCakeSize] = useState<string>('');
  const [selectedDough, setSelectedDough] = useState<string>('');
  const [selectedFillings, setSelectedFillings] = useState<string[]>([]);
  const [selectedSandwichFillings, setSelectedSandwichFillings] = useState<string[]>([]);
  const [selectedTopping, setSelectedTopping] = useState<string>('');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]); // dummy if needed, but not used now
  const [selectedTopper, setSelectedTopper] = useState<string>('');
  const [b2bName, setB2bName] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).name || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bResponsibleName, setB2bResponsibleName] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).manager || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bPhone, setB2bPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).phone || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bAddress, setB2bAddress] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).address || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bZipCode, setB2bZipCode] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).zipCode || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bCity, setB2bCity] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).city || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bFrequency, setB2bFrequency] = useState<'one-time' | 'weekly'>('one-time');
  const [isReturningB2b, setIsReturningB2b] = useState(() => {
    try {
      return localStorage.getItem('b2b_profile_save') ? true : false;
    } catch {
      return false;
    }
  });
  const [b2bSearchResults, setB2bSearchResults] = useState<any[]>([]);
  const [showB2bSearchDropdown, setShowB2bSearchDropdown] = useState(false);
  const [b2bProfiles, setB2bProfiles] = useState<any[]>([]);
  const [pqCoquetel, setPqCoquetel] = useState(0);
  const [pqMedio, setPqMedio] = useState(0);
  const [pqPremium, setPqPremium] = useState(0);
  const [b2bDate, setB2bDate] = useState('');
  const [b2bObservation, setB2bObservation] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'summary' | 'form' | 'channels' | 'b2b_channels'>('summary');
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [b2bSuccessUrls, setB2bSuccessUrls] = useState<{ whatsapp: string } | null>(null);
  const [standardSuccessUrls, setStandardSuccessUrls] = useState<{ whatsapp: string } | null>(null);
  const [galleries, setGalleries] = useState<ImageGallery[]>([]);
  const [selectedStyleNumber, setSelectedStyleNumber] = useState<number | null>(null);
  const [customItemQuantity, setCustomItemQuantity] = useState<number>(1);
  const [sandwichFillingQuantities, setSandwichFillingQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isCustomModalOpen || selectedProductForDetails) {
      setCustomItemQuantity(1);
      setSandwichFillingQuantities({});
    }
  }, [isCustomModalOpen, selectedProductForDetails]);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    street: '',
    apt: '',
    number: '',
    zipCode: '',
    city: '',
    state: 'MD',
    aniversario: '',
    observacao: '',
    email: ''
  });
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedDeliveryFee, setSelectedDeliveryFee] = useState<number>(0);

  const hasPickupAddress = Boolean(settings.pickupAddress && settings.pickupAddress.trim().length > 0);

  useEffect(() => {
    if (!settings.pickupAddress || !settings.pickupAddress.trim()) {
      setOrderType('delivery');
    }
  }, [settings.pickupAddress]);

  const sortedDeliveryZones = useMemo(() => {
    if (!settings?.deliveryZones || settings.deliveryZones.length === 0) return [];
    return [...settings.deliveryZones].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [settings?.deliveryZones]);

  const [activeScreen, setActiveScreen] = useState<'intro' | 'selector' | 'menu'>(() => {
    if (settings.introEnabled !== false) return 'intro';
    if (settings.selectorEnabled !== false) return 'selector';
    return 'menu';
  });
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.introEnabled === false && activeScreen === 'intro') {
        if (settings.selectorEnabled !== false) {
          setActiveScreen('selector');
        } else {
          setActiveScreen('menu');
        }
      } else if (settings.introEnabled === false && settings.selectorEnabled === false && activeScreen !== 'menu') {
        setActiveScreen('menu');
      }
    }
  }, [settings]);

  useEffect(() => {
    if (activeScreen === 'menu' && !selectedCatalog) {
      if (settings?.catalog1Active !== false) {
        setSelectedCatalog('catalog1');
      } else if (settings?.catalog2Active !== false) {
        setSelectedCatalog('catalog2');
      } else if (settings?.catalog3Active !== false) {
        setSelectedCatalog('catalog3');
      } else if (settings?.catalog4Active !== false) {
        setSelectedCatalog('catalog4');
      }
    }
  }, [activeScreen, selectedCatalog, settings]);

  useEffect(() => {
    if (selectedProductForDetails) {
      const product = selectedProductForDetails;
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize(null);
      }

      if (product.isCustomCake) {
        setSelectedCakeSize('');
        setSelectedDough('');
        setSelectedFillings([]);
        setSelectedTopping('');
        setSelectedTopper('');
        setSelectedStyleNumber(null);
      }

      if (product.isCustomSandwich) {
        setSelectedSandwichFillings([]);
      }

      setMealSelections({
        removals: [],
        sides: []
      });
      setSideQuantities({});
    }
  }, [selectedProductForDetails]);

  useEffect(() => {
    console.log('Menu: Inicilizando listeners...');
    setLoading(true);
    
    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      fetchedProducts.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 9999;
        const orderB = typeof b.order === 'number' ? b.order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '');
      });
      console.log('Menu: Produtos carregados:', fetchedProducts.length);
      setProducts(fetchedProducts);
      setLoading(false);
    }, (error) => {
      console.error('Menu: Erro ao carregar produtos:', error);
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categorias'), orderBy('order', 'asc')), (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      console.log('Menu: Categorias carregadas:', fetchedCategories.length);
      setCategories(fetchedCategories);
    }, (error) => {
      console.error('Menu: Erro ao carregar categorias:', error);
    });

    const unsubSides = onSnapshot(collection(db, 'acompanhamentos'), (snapshot) => {
      const fetchedSides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Side));
      setSides(fetchedSides);
    });

    const unsubGalleries = onSnapshot(collection(db, 'galerias'), (snapshot) => {
      setGalleries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageGallery)));
    });

    const unsubB2bProfiles = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
      const b2bOrders = snapshot.docs
        .map(doc => doc.data())
        .filter((o: any) => o.isB2B || o.isPJ);
      const profilesMap: Record<string, any> = {};
      b2bOrders.forEach((o: any) => {
        const name = o.b2bCompanyName || o.customerName;
        if (name && !profilesMap[name.toLowerCase()]) {
          profilesMap[name.toLowerCase()] = {
            name: name,
            manager: o.b2bManagerName || '',
            phone: o.phone || '',
            address: o.b2bAddress || o.address || ''
          };
        }
      });
      setB2bProfiles(Object.values(profilesMap));
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSides();
      unsubGalleries();
      unsubB2bProfiles();
    };
  }, []);

  // Load B2B Profiles for Autocomplete
  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, 'pedidos'));
      const unsub = onSnapshot(q, (snapshot) => {
        const uniqueProfilesMap: Record<string, any> = {};
        snapshot.docs.forEach(docSnap => {
          const d = docSnap.data();
          if (d.isB2B || d.isPJ) {
            const companyName = d.b2bCompanyName || d.customerName || '';
            const key = companyName.toLowerCase().trim();
            if (key && !uniqueProfilesMap[key]) {
              uniqueProfilesMap[key] = {
                name: companyName,
                manager: d.b2bManagerName || '',
                phone: d.phone || '',
                address: d.b2bAddress || d.address || ''
              };
            }
          }
        });
        setB2bProfiles(Object.values(uniqueProfilesMap));
      });
      return () => unsub();
    } catch (e) {
      console.error("Error loading B2B profiles catalog:", e);
    }
  }, []);

  // Check localStorage for saved B2B profile
  useEffect(() => {
    const saved = localStorage.getItem('b2b_profile_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setB2bName(parsed.name);
        if (parsed.manager) setB2bResponsibleName(parsed.manager);
        if (parsed.phone) setB2bPhone(parsed.phone);
        if (parsed.address) setB2bAddress(parsed.address);
        setIsReturningB2b(true);
      } catch (e) {}
    }
  }, []);

  const MAX_PRODUCT_LIMIT = 3;

  const getProductCartQty = (productId: string) => {
    return allCartItems
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const addToCart = (product: Product, customQty: number = 1) => {
    const currentQty = getProductCartQty(product.id);
    if (currentQty + customQty > MAX_PRODUCT_LIMIT) {
      toast.error(
        settings.language === 'en'
          ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${product.title}" reached!`
          : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${product.title}" atingido!`
      );
      return;
    }

    // Only custom cakes require opening custom modal
    if (product.isCustomCake) {
      setSelectedProductForCustom(product);
      setSelectedCakeSize('');
      setSelectedDough('');
      setSelectedFillings([]);
      setSelectedTopping('');
      setSelectedTopper('');
      setSelectedStyleNumber(null);
      setIsCustomModalOpen(true);
      return;
    }

    // If product has multiple sizes and none was chosen yet, open details modal to pick size
    if (product.sizes && product.sizes.length > 1 && !selectedSize) {
      setSelectedProductForDetails(product);
      setSelectedSize(product.sizes[0]);
      return;
    }

    const sizeToUse = (product.sizes && product.sizes.length > 0)
      ? (selectedSize || product.sizes[0])
      : null;

    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === product.id && 
        !item.mealOptions && 
        (!sizeToUse ? !item.selectedSize : item.selectedSize?.id === sizeToUse.id)
      );
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + customQty } : item);
      }
      return [
        ...prev, 
        { 
          id: Math.random().toString(36).substr(2, 9), 
          productId: product.id, 
          quantity: customQty, 
          selectedSize: sizeToUse || undefined 
        }
      ];
    });

    toast.success(
      settings.language === 'en'
        ? `"${product.title}" added to order!`
        : `"${product.title}" adicionado ao pedido!`
    );
  };

  const incrementSizeQty = (product: Product, size: ProductSize) => {
    const currentQty = getProductCartQty(product.id);
    if (currentQty + 1 > MAX_PRODUCT_LIMIT) {
      toast.error(
        settings.language === 'en'
          ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${product.title}" reached!`
          : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${product.title}" atingido!`
      );
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.selectedSize?.id === size.id && !item.mealOptions && !item.cakeOptions);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: 1, selectedSize: size }];
    });
  };

  const decrementSizeQty = (product: Product, size: ProductSize) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.selectedSize?.id === size.id && !item.mealOptions && !item.cakeOptions);
      if (existing) {
        if (existing.quantity <= 1) {
          return prev.filter(item => item !== existing);
        }
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev;
    });
  };

  const getMaxSandwichFillings = (sizeName: string): number => {
    const match = sizeName.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 1;
  };

  const addMealToCart = () => {
    if (!selectedProductForCustom) return;

    if (selectedProductForCustom.isCustomSandwich) {
      const activeFillings = (Object.entries(sandwichFillingQuantities) as [string, number][])
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => ({ name, qty }));

      if (activeFillings.length === 0) {
        toast.error(settings.language === 'en' ? 'Choose at least 1 option!' : 'Escolha pelo menos 1 opção!');
        return;
      }

      const totalToAdd = activeFillings.reduce((sum, item) => sum + item.qty, 0);
      const currentQty = getProductCartQty(selectedProductForCustom.id);
      if (currentQty + totalToAdd > MAX_PRODUCT_LIMIT) {
        toast.error(
          settings.language === 'en'
            ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${selectedProductForCustom.title}" reached!`
            : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${selectedProductForCustom.title}" atingido!`
        );
        return;
      }

      setCart(prev => {
        let currentCart = [...prev];

        for (const { name, qty } of activeFillings) {
          const newSandwichOptions = {
            fillings: [name]
          };

          const existing = currentCart.find(item =>
            item.productId === selectedProductForCustom.id &&
            ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
            item.sandwichOptions &&
            JSON.stringify(item.sandwichOptions.fillings) === JSON.stringify(newSandwichOptions.fillings)
          );

          if (existing) {
            currentCart = currentCart.map(item =>
              item.id === existing.id ? { ...item, quantity: item.quantity + qty } : item
            );
          } else {
            currentCart.push({
              id: Math.random().toString(36).substr(2, 9),
              productId: selectedProductForCustom.id,
              quantity: qty,
              sandwichOptions: newSandwichOptions,
              selectedSize: selectedSize || undefined
            });
          }
        }

        return currentCart;
      });

      setIsCustomModalOpen(false);
      setSelectedProductForCustom(null);
      setSelectedSize(null);
      return;
    }

    if (selectedProductForCustom.isCustomCake) {
      const currentQty = getProductCartQty(selectedProductForCustom.id);
      if (currentQty + customItemQuantity > MAX_PRODUCT_LIMIT) {
        toast.error(
          settings.language === 'en'
            ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${selectedProductForCustom.title}" reached!`
            : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${selectedProductForCustom.title}" atingido!`
        );
        return;
      }

      const maxFillings = settings.cakeFillingsMax || 2;
      if (selectedFillings.length > maxFillings) {
        toast.error(`Choose at most ${maxFillings} fillings!`);
        return;
      }
      
      setCart(prev => {
        const newCakeOptions = {
          size: selectedCakeSize,
          dough: selectedDough,
          fillings: selectedFillings,
          topping: selectedTopping,
          topper: selectedTopper,
          styleNumber: selectedStyleNumber || undefined
        };
        
        const existing = prev.find(item => 
          item.productId === selectedProductForCustom.id && 
          item.cakeOptions &&
          item.cakeOptions.size === newCakeOptions.size &&
          item.cakeOptions.dough === newCakeOptions.dough &&
          item.cakeOptions.topping === newCakeOptions.topping &&
          item.cakeOptions.topper === newCakeOptions.topper &&
          item.cakeOptions.styleNumber === newCakeOptions.styleNumber &&
          JSON.stringify([...(item.cakeOptions.fillings || [])].sort()) === JSON.stringify([...newCakeOptions.fillings].sort())
        );

        if (existing) {
          return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
        }

        return [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            productId: selectedProductForCustom.id,
            quantity: customItemQuantity,
            cakeOptions: newCakeOptions
          }
        ];
      });

      setIsCustomModalOpen(false);
      setSelectedProductForCustom(null);
      return;
    }
    
    const currentQty = getProductCartQty(selectedProductForCustom.id);
    if (currentQty + customItemQuantity > MAX_PRODUCT_LIMIT) {
      toast.error(
        settings.language === 'en'
          ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${selectedProductForCustom.title}" reached!`
          : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${selectedProductForCustom.title}" atingido!`
      );
      return;
    }

    const selectedSides: Side[] = [];
    Object.entries(sideQuantities).forEach(([id, qty]) => {
      const side = sides.find(s => s.id === id);
      if (side) {
        for (let i = 0; i < (qty as number); i++) {
          selectedSides.push(side);
        }
      }
    });

    const newMealOptions = selectedProductForCustom.isMeal ? {
      removals: mealSelections.removals,
      sides: selectedSides
    } : undefined;

    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === selectedProductForCustom.id && 
        ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
        (!newMealOptions || (
          JSON.stringify([...(item.mealOptions?.removals || [])].sort()) === JSON.stringify([...newMealOptions.removals].sort()) &&
          JSON.stringify([...(item.mealOptions?.sides || [])].map(s => s.id).sort()) === JSON.stringify([...newMealOptions.sides].map(s => s.id).sort())
        ))
      );

      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
      }

      return [
        ...prev, 
        { 
          id: Math.random().toString(36).substr(2, 9), 
          productId: selectedProductForCustom.id, 
          quantity: customItemQuantity,
          mealOptions: newMealOptions,
          selectedSize: selectedSize || undefined
        }
      ];
    });

    setIsCustomModalOpen(false);
    setSelectedProductForCustom(null);
    setSelectedSize(null);
  };

  const addDetailedProductToCart = (product: Product) => {
    if (product.isCustomSandwich) {
      const activeFillings = (Object.entries(sandwichFillingQuantities) as [string, number][])
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => ({ name, qty }));

      if (activeFillings.length === 0) {
        toast.error(settings.language === 'en' ? 'Choose at least 1 option!' : 'Escolha pelo menos 1 opção!');
        return;
      }

      const totalToAdd = activeFillings.reduce((sum, item) => sum + item.qty, 0);
      const currentQty = getProductCartQty(product.id);
      if (currentQty + totalToAdd > MAX_PRODUCT_LIMIT) {
        toast.error(
          settings.language === 'en'
            ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${product.title}" reached!`
            : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${product.title}" atingido!`
        );
        return;
      }

      setCart(prev => {
        let currentCart = [...prev];

        for (const { name, qty } of activeFillings) {
          const newSandwichOptions = {
            fillings: [name]
          };

          const existing = currentCart.find(item =>
            item.productId === product.id &&
            ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
            item.sandwichOptions &&
            JSON.stringify(item.sandwichOptions.fillings) === JSON.stringify(newSandwichOptions.fillings)
          );

          if (existing) {
            currentCart = currentCart.map(item =>
              item.id === existing.id ? { ...item, quantity: item.quantity + qty } : item
            );
          } else {
            currentCart.push({
              id: Math.random().toString(36).substr(2, 9),
              productId: product.id,
              quantity: qty,
              sandwichOptions: newSandwichOptions,
              selectedSize: selectedSize || undefined
            });
          }
        }

        return currentCart;
      });

      setSelectedProductForDetails(null);
      setSelectedSize(null);
      setSelectedSandwichFillings([]);
      toast.success(settings.language === 'en' ? 'Successfully added to request list!' : 'Adicionado com sucesso ao pedido!');
      return;
    }

    if (product.isCustomCake) {
      const currentQty = getProductCartQty(product.id);
      if (currentQty + customItemQuantity > MAX_PRODUCT_LIMIT) {
        toast.error(
          settings.language === 'en'
            ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${product.title}" reached!`
            : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${product.title}" atingido!`
        );
        return;
      }

      const maxFillings = settings.cakeFillingsMax || 2;
      if (selectedFillings.length > maxFillings) {
        toast.error(`Choose at most ${maxFillings} fillings!`);
        return;
      }
      
      setCart(prev => {
        const newCakeOptions = {
          size: selectedCakeSize,
          dough: selectedDough,
          fillings: selectedFillings,
          topping: selectedTopping,
          topper: selectedTopper,
          styleNumber: selectedStyleNumber || undefined
        };
        
        const existing = prev.find(item => 
          item.productId === product.id && 
          item.cakeOptions &&
          item.cakeOptions.size === newCakeOptions.size &&
          item.cakeOptions.dough === newCakeOptions.dough &&
          item.cakeOptions.topping === newCakeOptions.topping &&
          item.cakeOptions.topper === newCakeOptions.topper &&
          item.cakeOptions.styleNumber === newCakeOptions.styleNumber &&
          JSON.stringify([...(item.cakeOptions.fillings || [])].sort()) === JSON.stringify([...newCakeOptions.fillings].sort())
        );

        if (existing) {
          return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
        }

        return [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            quantity: customItemQuantity,
            cakeOptions: newCakeOptions
          }
        ];
      });

      setSelectedProductForDetails(null);
      toast.success(settings.language === 'en' ? 'Successfully added to request list!' : 'Adicionado com sucesso ao pedido!');
      return;
    }
    
    const currentQty = getProductCartQty(product.id);
    if (currentQty + customItemQuantity > MAX_PRODUCT_LIMIT) {
      toast.error(
        settings.language === 'en'
          ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${product.title}" reached!`
          : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${product.title}" atingido!`
      );
      return;
    }

    const selectedSides: Side[] = [];
    Object.entries(sideQuantities).forEach(([id, qty]) => {
      const side = sides.find(s => s.id === id);
      if (side) {
        for (let i = 0; i < (qty as number); i++) {
          selectedSides.push(side);
        }
      }
    });

    const newMealOptions = product.isMeal ? {
      removals: mealSelections.removals,
      sides: selectedSides
    } : undefined;

    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === product.id && 
        ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
        (!newMealOptions || (
          JSON.stringify([...(item.mealOptions?.removals || [])].sort()) === JSON.stringify([...newMealOptions.removals].sort()) &&
          JSON.stringify([...(item.mealOptions?.sides || [])].map(s => s.id).sort()) === JSON.stringify([...newMealOptions.sides].map(s => s.id).sort())
        ))
      );

      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
      }

      return [
        ...prev, 
        { 
          id: Math.random().toString(36).substr(2, 9), 
          productId: product.id, 
          quantity: customItemQuantity,
          mealOptions: newMealOptions,
          selectedSize: selectedSize || undefined
        }
      ];
    });

    setSelectedProductForDetails(null);
    setSelectedSize(null);
    toast.success(settings.language === 'en' ? 'Successfully added to request list!' : 'Adicionado com sucesso ao pedido!');
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === cartItemId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== cartItemId);
    });
  };

  const cartItemsCount = totalCartItemsCount;
  const cartTotal = totalCartPrice;

  const checkMarmitifyLimit = () => {
    return true;
  };

  const validateCartItems = () => {
    if (totalCartItemsCount === 0) {
      return {
        isValid: false,
        message: settings.language === 'en' ? 'Your cart is empty!' : 'Seu pedido está vazio!',
        errors: []
      };
    }

    const errors: { catalogKey: string; catalogTitle: string; count: number; min: number; message: string }[] = [];

    (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).forEach(key => {
      const items = cartsByCatalog[key] || [];
      const count = items.reduce((sum, it) => sum + it.quantity, 0);
      const minRequired = getCatalogMinItems(key);
      const title = getCatalogTitle(key);

      // Only check restriction if the customer added items from this catalog!
      if (count > 0 && minRequired > 0 && count < minRequired) {
        errors.push({
          catalogKey: key,
          catalogTitle: title,
          count,
          min: minRequired,
          message: settings.language === 'en'
            ? `In "${title}", you must select at least ${minRequired} items (currently selected: ${count}, missing ${minRequired - count}).`
            : `No "${title}", você deve escolher no mínimo ${minRequired} itens deste cardápio (você escolheu: ${count}, faltam ${minRequired - count}).`
        });
      }
    });

    if (errors.length > 0) {
      return {
        isValid: false,
        message: errors.map(e => e.message).join(' • '),
        errors
      };
    }

    return { isValid: true, message: '', errors: [] };
  };

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateCartItems();
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }
    
    if (!checkMarmitifyLimit()) {
      return;
    }
    
    const allItemsToOrder: Array<{
      catalogKey: 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4';
      catalogTitle: string;
      item: CartItem;
    }> = [];

    (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).forEach(key => {
      (cartsByCatalog[key] || []).forEach(item => {
        allItemsToOrder.push({
          catalogKey: key,
          catalogTitle: getCatalogTitle(key),
          item
        });
      });
    });

    const hasConsultItems = allItemsToOrder.some(({ item }) => {
      const p = products.find(prod => prod.id === item.productId);
      return p?.priceType === 'consult' || p?.isCustomCake === true;
    });

    const orderItems = allItemsToOrder.map(({ catalogTitle, item }) => {
      const product = products.find(p => p.id === item.productId)!;
      const basePrice = item.selectedSize ? item.selectedSize.price : ((product?.price && product.price > 0) ? product.price : (product?.oldPrice || 0));
      let itemPrice = basePrice;
      if (item.mealOptions?.sides) {
        itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
      }

      const cleanedMealOptions = item.mealOptions ? {
        removals: item.mealOptions.removals || [],
        sides: (item.mealOptions.sides || []).map(side => ({
          id: side.id,
          name: side.name,
          price: side.price,
          type: side.type || 'side'
        }))
      } : null;

      const titleWithDetails = item.selectedSize ? `${product.title} (${item.selectedSize.name})` : product.title;
      const fullDisplayTitle = activeCatalogsWithItems.length > 1
        ? `[${catalogTitle}] ${titleWithDetails}`
        : titleWithDetails;

      return {
        title: fullDisplayTitle,
        quantity: item.quantity,
        price: itemPrice,
        priceType: product?.priceType || 'fixed',
        mealOptions: cleanedMealOptions,
        selectedSize: item.selectedSize || null,
        cakeOptions: item.cakeOptions || null,
        sandwichOptions: item.sandwichOptions || null
      };
    });

    const deliveryFee = orderType === 'delivery' ? (selectedDeliveryFee || 0) : 0;
    const finalTotalWithTax = totalCartPrice + deliveryFee;

    const fullAddress = orderType === 'delivery'
      ? `${formData.street}${formData.apt ? `, Apt ${formData.apt}` : ''}, ${formData.city}, ${formData.state} ${formData.zipCode}`.trim()
      : (settings.pickupAddress && settings.pickupAddress.trim()
          ? `Retirada no Local: ${settings.pickupAddress}`
          : 'Retirada no Local');

    const combinedCatalogTitle = activeCatalogsWithItems.map(k => getCatalogTitle(k)).join(' + ');

    const orderData: Omit<Order, 'id'> = {
      customerName: formData.nome,
      phone: formData.telefone,
      orderType: orderType,
      address: fullAddress,
      street: orderType === 'delivery' ? formData.street : '',
      number: orderType === 'delivery' ? (formData.apt || formData.number || '') : '',
      apt: orderType === 'delivery' ? (formData.apt || '') : '',
      city: orderType === 'delivery' ? formData.city : '',
      state: orderType === 'delivery' ? (formData.state || '') : '',
      zipCode: orderType === 'delivery' ? formData.zipCode : '',
      birthday: formData.aniversario || '',
      observation: formData.observacao || '',
      email: formData.email || '',
      items: orderItems,
      total: finalTotalWithTax,
      subtotal: totalCartPrice,
      deliveryFee: deliveryFee,
      taxRate: 0,
      taxAmount: 0,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: serverTimestamp(),
      orderLanguage: 'pt',
      catalog: activeCatalogsWithItems.join(', '),
      catalogTitle: combinedCatalogTitle
    };

    try {
      console.log('Finalizando pedido...', orderData);
      await addDoc(collection(db, 'pedidos'), orderData);
      clearAllCarts();
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/New_York' });

      let message = `*${t.whatsappOrder} - ${settings.brandName || settings.slug}*\n`;
      message += `*Cardápios:* ${combinedCatalogTitle}\n`;
      message += `*${t.whatsappDate}:* ${dateStr} ${t.whatsappAt} ${timeStr}\n\n`;
      
      message += `*--- ${t.whatsappData} ---*\n`;
      message += `*${t.fullName}:* ${formData.nome}\n`;
      message += `*${t.phone}:* ${formData.telefone}\n`;
      message += `*${t.email}:* ${formData.email}\n`;
      message += `*${t.birthday}:* ${formData.aniversario}\n`;
      message += `*Modalidade:* ${orderType === 'pickup' ? '🛍️ Retirada no Local (Pickup)' : '🛵 Delivery (Entrega)'}\n`;
      if (orderType === 'delivery') {
        message += `*Endereço:* ${formData.street}${formData.apt ? `, Apt ${formData.apt}` : ''}\n`;
        message += `*Bairro/Cidade:* ${formData.city}${formData.state ? `, ${formData.state}` : ''}\n`;
        message += `*Zip Code:* ${formData.zipCode}\n`;
        if (deliveryFee > 0) {
          message += `*Taxa de Entrega:* ${currencySymbol}${deliveryFee.toFixed(2).replace('.', ',')}\n`;
        }
      } else {
        message += `*Endereço de Retirada:* ${settings.pickupAddress && settings.pickupAddress.trim() ? settings.pickupAddress : (settings.brandName || 'Loja')}\n`;
      }
      message += `*${t.observation}:* ${formData.observacao || '-'}\n\n`;

      message += `*--- ${t.whatsappItems} ---*\n`;
      (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).forEach(key => {
        const catItems = cartsByCatalog[key] || [];
        if (catItems.length === 0) return;
        const catTitle = getCatalogTitle(key);
        const catCount = catItems.reduce((s, i) => s + i.quantity, 0);
        message += `\n📋 *${catTitle}* (${catCount} ${catCount === 1 ? 'item' : 'itens'}):\n`;

        catItems.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (!product) return;
          const basePrice = item.selectedSize ? item.selectedSize.price : ((product.price && product.price > 0) ? product.price : (product.oldPrice || 0));
          let itemPrice = basePrice;
          if (item.mealOptions?.sides) {
            itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
          }
          const itemTitle = item.selectedSize ? `${product.title} (${item.selectedSize.name})` : product.title;

          if (product.priceType === 'consult') {
            message += `• ${item.quantity}x ${itemTitle} - (Valor a Consultar)\n`;
          } else {
            message += `• ${item.quantity}x ${itemTitle} - ${currencySymbol}${(itemPrice * item.quantity).toFixed(2)}\n`;
          }

          if (item.mealOptions) {
            if (item.mealOptions.removals && item.mealOptions.removals.length > 0) {
              message += `  (Sem: ${item.mealOptions.removals.join(', ')})\n`;
            }
            if (item.mealOptions.sides && item.mealOptions.sides.length > 0) {
              const normalSidesArr = item.mealOptions.sides.filter(s => s.type !== 'swap');
              const swapSidesArr = item.mealOptions.sides.filter(s => s.type === 'swap');
              if (normalSidesArr.length > 0) {
                const grouped = normalSidesArr.reduce((acc: Record<string, number>, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {});
                const str = Object.entries(grouped).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');
                message += `  (Acompanhamentos: ${str})\n`;
              }
              if (swapSidesArr.length > 0) {
                const grouped = swapSidesArr.reduce((acc: Record<string, number>, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {});
                const str = Object.entries(grouped).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');
                message += `  (Trocas: ${str})\n`;
              }
            }
          }
          if (item.cakeOptions) {
            const opts = item.cakeOptions;
            if (opts.size) message += `  (Tamanho: ${opts.size})\n`;
            if (opts.dough) message += `  (Massa: ${opts.dough})\n`;
            if (opts.fillings && opts.fillings.length > 0) message += `  (Recheios: ${opts.fillings.join(' + ')})\n`;
            if (opts.topping) message += `  (Cobertura: ${opts.topping})\n`;
            if (opts.topper) message += `  (Topo: ${opts.topper})\n`;
            if (opts.styleNumber) message += `  (Modelo #${opts.styleNumber})\n`;
          }
          if (item.sandwichOptions) {
            const opts = item.sandwichOptions;
            if (opts.fillings && opts.fillings.length > 0) message += `  (Opção: ${opts.fillings.join(' + ')})\n`;
          }
        });
      });

      if (deliveryFee > 0) {
        message += `\n*Subtotal dos itens:* ${currencySymbol}${totalCartPrice.toFixed(2)}`;
        message += `\n*Taxa de Entrega (${formData.city}):* ${currencySymbol}${deliveryFee.toFixed(2).replace('.', ',')}`;
      }
      message += `\n*${t.whatsappTotal}:* ${currencySymbol}${finalTotalWithTax.toFixed(2)}\n`;
      
      if (hasConsultItems) {
        message += `\n⚠️ *${t.consultMessage}*\n`;
      }
      
      message += `\n${settings.whatsappClosingMessage || (settings.language === 'en' ? 'Thank you for your order, we will contact you shortly for confirmation!' : 'Obrigada pelo pedido, aguarde que entraremos em contato para confirmação!')}`;

      message += `\n\nEntraremos em contato em breve para confirmar seu pedido e os detalhes da entrega.`;

      const encodedMessage = encodeURIComponent(message);
      const countryCode = settings.whatsappCountryCode?.replace(/\D/g, '') || '55';
      let whatsappNumber = settings.whatsappNumber?.replace(/\D/g, '') || '';
      
      // Remove country code from number if it's already there to avoid doubling (e.g. 5555...)
      if (whatsappNumber.startsWith(countryCode)) {
        whatsappNumber = whatsappNumber.slice(countryCode.length);
      }
      
      if (!whatsappNumber) {
        toast.error(settings.language === 'en' 
          ? 'Error: Representative contact number is not properly configured in the administration panel.' 
          : 'Erro: Número para contato não configurado corretamente no painel administrativo.'
        );
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const whatsappUrl = isIOS 
        ? `https://api.whatsapp.com/send?phone=${countryCode}${whatsappNumber}&text=${encodedMessage}`
        : `https://wa.me/${countryCode}${whatsappNumber}?text=${encodedMessage}`;

      setStandardSuccessUrls({ whatsapp: whatsappUrl });
      setCheckoutStep('channels');
      toast.success(settings.language === 'en' ? 'Order saved! Select your dispatch method below.' : 'Pedido salvo! Selecione a forma de envio abaixo.');
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error(settings.language === 'en' ? 'Error finalizing order. Please try again.' : 'Erro ao finalizar pedido. Por favor, tente novamente.');
    }
  };

  const handleCompleteStandardOrder = (url: string) => {
    clearAllCarts();
    setIsModalOpen(false);
    setCheckoutStep('summary');
    setStandardSuccessUrls(null);
    setFormData({ 
      nome: '', 
      telefone: '', 
      endereco: '', 
      street: '',
      apt: '',
      number: '',
      zipCode: '',
      city: '',
      state: 'MD',
      aniversario: '', 
      observacao: '', 
      email: '' 
    });
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      window.location.href = url;
    } else {
      try {
        const win = window.open(url, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = url;
        }
      } catch (e) {
        window.location.href = url;
      }
    }
  };

  const handleCompleteB2bOrder = (url: string) => {
    clearAllCarts();
    setIsModalOpen(false);
    setCheckoutStep('summary');
    setB2bSuccessUrls(null);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      window.location.href = url;
    } else {
      try {
        const win = window.open(url, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = url;
        }
      } catch (e) {
        window.location.href = url;
      }
    }
  };

   const handleFinalizarB2b = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateCartItems();
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    if (!b2bName.trim() || !b2bResponsibleName.trim() || !b2bPhone.trim() || !b2bAddress.trim() || !b2bZipCode.trim() || !b2bCity.trim() || !b2bDate) {
      toast.error('Please fill in all required fields!');
      return;
    }

    const orderItems = allCartItems.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      let titleStr = item.selectedSize ? `${product.title} (${item.selectedSize.name})` : product.title;
      if (item.cakeOptions) {
        const parts = [];
        if (item.cakeOptions.size) parts.push(`Tamanho: ${item.cakeOptions.size}`);
        if (item.cakeOptions.dough) parts.push(`Massa: ${item.cakeOptions.dough}`);
        if (item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0) parts.push(`Recheios: ${item.cakeOptions.fillings.join(' + ')}`);
        if (item.cakeOptions.topping) parts.push(`Cobertura: ${item.cakeOptions.topping}`);
        if (item.cakeOptions.topper) parts.push(`Topo: ${item.cakeOptions.topper}`);
        if (item.cakeOptions.styleNumber) parts.push(`Modelo #${item.cakeOptions.styleNumber}`);
        titleStr += ` [${parts.join(', ')}]`;
      }
      if (item.sandwichOptions) {
        const parts = [];
        if (item.sandwichOptions.fillings && item.sandwichOptions.fillings.length > 0) parts.push(`${settings.language === 'en' ? 'State' : 'Estado'}: ${item.sandwichOptions.fillings.join(' + ')}`);
        titleStr += ` [${parts.join(', ')}]`;
      }
      return {
        title: activeCatalogsWithItems.length > 1 ? `[${item.catalogTitle}] ${titleStr}` : titleStr,
        quantity: item.quantity,
        price: 0,
        priceType: 'consult'
      };
    });

    const b2bOrderObj = {
      customerName: b2bName,
      phone: b2bPhone,
      address: b2bAddress,
      zipCode: b2bZipCode,
      city: b2bCity,
      pickupDate: b2bDate ? (() => {
        const [year, month, day] = b2bDate.split('-');
        return `${month}/${day}/${year}`;
      })() : '',
      birthday: '',
      observation: b2bObservation,
      email: '',
      items: orderItems,
      total: 0,
      createdAt: serverTimestamp(),
      orderLanguage: 'en',
      isB2B: true,
      isPJ: true,
      b2bManagerName: b2bResponsibleName,
      b2bFrequency: b2bFrequency,
      b2bCompanyName: b2bName,
      b2bAddress: b2bAddress,
      b2bZipCode: b2bZipCode,
      b2bCity: b2bCity
    };

    try {
      console.log('Sending corporate B2B order request...', b2bOrderObj);
      await addDoc(collection(db, 'pedidos'), b2bOrderObj);
      
      // Persist client details in localStorage so it autofills on subsequent visits!
      localStorage.setItem('b2b_profile_save', JSON.stringify({
        name: b2bName,
        manager: b2bResponsibleName,
        phone: b2bPhone,
        address: b2bAddress,
        zipCode: b2bZipCode,
        city: b2bCity
      }));
      setIsReturningB2b(true);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo' });

      let message = `*Pedido Corporativo - ${settings.brandName || settings.slug}*\n`;
      message += `*Data:* ${dateStr} às ${timeStr}\n\n`;
      message += `*--- DADOS DA EMPRESA ---*\n`;
      message += `*Nome da Empresa:* ${b2bName}\n`;
      message += `*Responsável:* ${b2bResponsibleName}\n`;
      message += `*Telefone:* ${b2bPhone}\n`;
      message += `*Endereço de Entrega:* ${b2bAddress}\n`;
      message += `*CEP / Zip Code:* ${b2bZipCode}\n`;
      message += `*Cidade:* ${b2bCity}\n`;
      message += `*Frequência:* ${b2bFrequency === 'weekly' ? 'Plano Semanal (Recorrente)' : 'Pedido Único (Avulso)'}\n`;
      message += `*Data Prevista de Início:* ${b2bOrderObj.pickupDate}\n`;
      if (b2bObservation) {
        message += `*Observações:* ${b2bObservation}\n`;
      }
      message += `\n*--- ITENS DO PEDIDO ---*\n`;
      orderItems.forEach(item => {
        message += `• ${item.quantity}x ${item.title}\n`;
      });
      message += `\n*Atenção:* Recebemos sua solicitação e entraremos em contato para confirmar detalhes e prazos. Em seguida, enviaremos o link para pagamento.\n`;
      
      const encodedMessage = encodeURIComponent(message);
      const countryCode = settings.whatsappCountryCode?.replace(/\D/g, '') || '55';
      let whatsappNumber = settings.whatsappNumber?.replace(/\D/g, '') || '';
      if (whatsappNumber.startsWith(countryCode)) {
        whatsappNumber = whatsappNumber.slice(countryCode.length);
      }

      if (!whatsappNumber) {
        toast.error('Representative contact number is not fully configured in the Admin panel.');
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const whatsappUrl = isIOS 
        ? `https://api.whatsapp.com/send?phone=${countryCode}${whatsappNumber}&text=${encodedMessage}`
        : `https://wa.me/${countryCode}${whatsappNumber}?text=${encodedMessage}`;

      // Save URLs and go to success channels page
      setB2bSuccessUrls({ whatsapp: whatsappUrl });
      setCheckoutStep('b2b_channels');
      toast.success('Corporate order saved! Choose how you would like to submit below.');
    } catch (error) {
      console.error('Error saving B2B corporate order details:', error);
      toast.error('Failed to submit corporate request. Please verify and try again.');
    }
  };

  if (activeScreen === 'intro') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass max-w-md w-full rounded-3xl p-8 border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-8"
        >
          {/* Logo Frame */}
          <div className="relative mt-4">
            <div 
              className="w-[166px] h-[166px] rounded-full p-1 flex items-center justify-center overflow-hidden border-2"
              style={{ borderColor: settings.primaryColor }}
            >
              <img 
                src={settings.logo} 
                alt="Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Texts Section */}
          <div className="space-y-4">
            <h1 className="text-3xl font-serif text-black font-extrabold italic tracking-tight">
              {settings.introTitle || 'Dendê Foods'}
            </h1>
            
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="h-[1px] w-12 bg-black/20" />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
              <div className="h-[1px] w-12 bg-black/20" />
            </div>

            <p className="text-lg font-serif italic text-black/80 font-medium">
              {settings.introSubtitle || 'Alimentação Saudável e Equilibrada'}
            </p>
            
            <p className="text-sm font-medium opacity-70 italic max-w-xs mx-auto">
              {settings.introDescription || 'Pratos nutritivos, marmitas fitness e opções saborosas para o seu dia a dia.'}
            </p>
          </div>

          {/* CTA Button */}
          <div className="w-full pt-4 space-y-4">
            <button
              onClick={() => {
                if (settings.selectorEnabled !== false) {
                  setActiveScreen('selector');
                } else {
                  setActiveScreen('menu');
                }
              }}
              className="w-full py-4 px-6 rounded-full font-bold text-sm tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
            >
              {settings.introButtonText || 'INICIAR MINHA JORNADA'}
            </button>
            
            <p className="text-[10px] font-mono font-bold tracking-widest opacity-60 uppercase text-black pt-2">
              {settings.introBottomText || '100% ARTESANAL & AFRO-BRASILEIRO'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (activeScreen === 'selector') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="w-full max-w-[605px] flex flex-col items-center space-y-4 sm:space-y-6 py-2 sm:py-6"
        >
          {/* Circular Header Logo */}
          <div 
            className="w-[166px] h-[166px] sm:w-[229px] sm:h-[229px] rounded-full p-1 flex items-center justify-center overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: settings.primaryColor }}
          >
            <img 
              src={settings.logo} 
              alt="Logo" 
              className="w-full h-full object-cover rounded-full bg-white"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-4xl font-serif font-bold tracking-tight text-center" style={{ color: settings.primaryColor || '#143D25' }}>
              {settings.selectorTitle || settings.brandName || 'Dendê Foods'}
            </h2>
            <p className="text-xs font-bold tracking-wide uppercase opacity-90 text-center" style={{ color: settings.primaryColor || '#143D25' }}>
              {settings.selectorSubtitle || (settings.language === 'en' ? 'Choose your experience' : 'Escolha sua experiência')}
            </p>
          </div>

          {/* Cards Grid - Lado a Lado na vertical e horizontal */}
          <div className="grid grid-cols-2 gap-3.5 w-full mt-4 sm:mt-6">
            {/* Card 1 */}
            {settings.catalog1Active !== false && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedCatalog('catalog1');
                  setActiveScreen('menu');
                }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl p-2.5 flex flex-col items-center cursor-pointer text-center group border border-white/20 shadow-md justify-between relative"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/50 shadow-inner">
                  <img 
                    src={settings.catalog1Image || 'https://i.ibb.co/X0vYy7L/cakes.png'} 
                    alt="Catalog 1" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-2.5 space-y-1 w-full flex-grow flex flex-col justify-start">
                  <h3 className="text-xs sm:text-sm font-serif font-black uppercase tracking-wide transition-colors leading-tight" style={{ color: '#000000' }}>
                    {settings.catalog1Title || 'Acarajé & Pratos'}
                  </h3>
                  {settings.catalog1Desc && (
                    <p className="text-[10px] font-semibold leading-tight px-1 block line-clamp-2" style={{ color: '#000000' }}>
                      {settings.catalog1Desc}
                    </p>
                  )}
                  {getCatalogCount('catalog1') > 0 && (
                    <div className="mt-1.5 inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                      <span>🛒</span> {getCatalogCount('catalog1')} {getCatalogCount('catalog1') === 1 ? 'item' : 'itens'}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Card 2 */}
            {settings.catalog2Active !== false && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedCatalog('catalog2');
                  setActiveScreen('menu');
                }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl p-2.5 flex flex-col items-center cursor-pointer text-center group border border-white/20 shadow-md justify-between relative"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/50 shadow-inner">
                  <img 
                    src={settings.catalog2Image || 'https://i.ibb.co/X0vYy7L/cakes.png'} 
                    alt="Catalog 2" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-2.5 space-y-1 w-full flex-grow flex flex-col justify-start">
                  <h3 className="text-xs sm:text-sm font-serif font-black uppercase tracking-wide transition-colors leading-tight" style={{ color: '#000000' }}>
                    {settings.catalog2Title || 'Bebidas & Sobremesas'}
                  </h3>
                  {settings.catalog2Desc && (
                    <p className="text-[10px] font-semibold leading-tight px-1 block line-clamp-2" style={{ color: '#000000' }}>
                       {settings.catalog2Desc}
                    </p>
                  )}
                  {getCatalogCount('catalog2') > 0 && (
                    <div className="mt-1.5 inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                      <span>🛒</span> {getCatalogCount('catalog2')} {getCatalogCount('catalog2') === 1 ? 'item' : 'itens'}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Catalog 3 & 4 Buttons inside a beautiful unified container box card */}
          {(settings.catalog3Active !== false || settings.catalog4Active !== false) && (
            <div className="mt-6 w-full bg-white/80 backdrop-blur-lg rounded-3xl p-5 border border-white/20 shadow-md flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/45 mb-4 font-sans">
                {settings.language === 'en' ? 'More Menus' : 'Mais Cardápios'}
              </span>
              <div className="w-full flex flex-row gap-3 items-stretch justify-center">
                {settings.catalog3Active !== false && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedCatalog('catalog3');
                      setActiveScreen('menu');
                    }}
                    className="flex-1 py-4 px-3 rounded-full font-bold text-[10px] tracking-wider uppercase shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/10 text-center flex items-center justify-center min-h-[44px] gap-1"
                    style={{ 
                      backgroundColor: settings.primaryColor || '#143D25', 
                      color: getContrastText(settings.primaryColor || '#143D25') 
                    }}
                  >
                    <span>{settings.catalog3Title || 'Low Carb'}</span>
                    {getCatalogCount('catalog3') > 0 && (
                      <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                        {getCatalogCount('catalog3')}
                      </span>
                    )}
                  </motion.button>
                )}
                {settings.catalog4Active !== false && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedCatalog('catalog4');
                      setActiveScreen('menu');
                    }}
                    className="flex-1 py-4 px-3 rounded-full font-bold text-[10px] tracking-wider uppercase shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/10 text-center flex items-center justify-center min-h-[44px] gap-1"
                    style={{ 
                      backgroundColor: settings.primaryColor || '#143D25', 
                      color: getContrastText(settings.primaryColor || '#143D25') 
                    }}
                  >
                    <span>{settings.catalog4Title || 'Hipertróficas'}</span>
                    {getCatalogCount('catalog4') > 0 && (
                      <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                        {getCatalogCount('catalog4')}
                      </span>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          )}

        </motion.div>
        {renderDietsModal()}

        {/* Floating Cart Button on Selector Screen */}
        <AnimatePresence>
          {totalCartItemsCount > 0 && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40"
            >
              <button 
                onClick={() => {
                  if (!selectedCatalog) {
                    setSelectedCatalog(activeCatalogsWithItems[0] || 'catalog1');
                  }
                  setActiveScreen('menu');
                  setIsModalOpen(true);
                }}
                className="w-full h-16 rounded-2xl shadow-2xl flex items-center justify-between px-6 font-bold text-lg transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
              >
                <div className="flex items-center gap-3 font-serif">
                  <ShoppingBag size={24} />
                  <span>Ver Pedido</span>
                </div>
                <div className="flex items-center gap-2 font-serif text-sm">
                  <span className="bg-white/20 px-2.5 py-1 rounded-full">{totalCartItemsCount} {totalCartItemsCount === 1 ? 'item' : 'itens'}</span>
                  <span>{currencySymbol}{totalCartPrice.toFixed(2)}</span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (loading && activeScreen === 'menu') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh] p-4 text-center select-none">
        <div 
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" 
          style={{ borderColor: settings.primaryColor }}
        />
        <p className="mt-4 font-sans font-semibold text-sm text-black/60">
          {settings.language === 'en' ? 'Loading catalog...' : 'Carregando catálogo...'}
        </p>
      </div>
    );
  }

  const filteredCategories = categories.filter(category => {
    const cat = category.catalog || 'catalog1';
    
    // If a category belongs specifically to b2b/corporate, hide it from normal catalogs
    if (cat === 'catalog_b2b' || cat === 'b2b') {
      return false;
    }
    
    if (selectedCatalog) {
      return cat === 'both' || cat === 'all' || cat === selectedCatalog;
    }
    
    return true;
  });

  return (
    <div className="flex-grow flex flex-col items-center p-4 pb-32">
      {settings.selectorEnabled !== false && (
        <button
          onClick={() => {
            setSelectedCatalog(null);
            setActiveScreen('selector');
          }}
          className="mt-4 mb-2 px-4 py-2 bg-white/50 backdrop-blur-md hover:bg-white/80 text-black text-xs font-bold rounded-full transition-transform active:scale-95 flex items-center gap-1 shadow-sm border border-white/20 cursor-pointer"
        >
          ← Voltar aos Cardápios
        </button>
      )}

        <div className="mt-8 mb-4 relative">
        <div className="w-40 h-40 rounded-full bg-white p-1 shadow-2xl overflow-hidden flex items-center justify-center border-4 border-white">
          <img 
            src={
              selectedCatalog === 'catalog1'
                ? (settings.catalog1Image || 'https://i.ibb.co/X0vYy7L/cakes.png')
                : selectedCatalog === 'catalog2'
                  ? (settings.catalog2Image || 'https://i.ibb.co/68XwD57/meals.png')
                  : selectedCatalog === 'catalog3'
                    ? (settings.catalog3Image || settings.logo || 'https://i.ibb.co/X0vYy7L/cakes.png')
                    : selectedCatalog === 'catalog4'
                      ? (settings.catalog4Image || settings.logo || 'https://i.ibb.co/X0vYy7L/cakes.png')
                      : (settings.logo || 'https://i.ibb.co/1t0DZbPG/patitour-2026-06-05-T085539-099.png')
            } 
            alt="Logo" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {(() => {
        const catalogTitle = selectedCatalog === 'catalog1'
          ? (settings.catalog1Title || settings.brandName || 'Cardápio 1')
          : selectedCatalog === 'catalog2'
            ? (settings.catalog2Title || settings.brandName || 'Cardápio 2')
            : selectedCatalog === 'catalog3'
              ? (settings.catalog3Title || settings.brandName || 'Cardápio 3')
              : selectedCatalog === 'catalog4'
                ? (settings.catalog4Title || settings.brandName || 'Cardápio 4')
                : (settings.brandName || 'Cardápio');

        return (
          <div className="flex flex-col items-center mb-2">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-center tracking-tight" style={{ color: settings.primaryColor }}>
              {catalogTitle}
            </h1>
            {selectedCatalog && settings.brandName && settings.brandName !== catalogTitle && (
              <p className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-black/60 text-center mt-1">
                {settings.brandName}
              </p>
            )}
          </div>
        );
      })()}

      {(() => {
        const text = selectedCatalog === 'catalog1'
          ? (settings.catalog1Slogan || settings.catalog1Desc || settings.slogan || '')
          : selectedCatalog === 'catalog2'
            ? (settings.catalog2Slogan || settings.catalog2Desc || settings.slogan || '')
            : selectedCatalog === 'catalog3'
              ? (settings.catalog3Slogan || settings.catalog3Desc || settings.slogan || '')
              : selectedCatalog === 'catalog4'
                ? (settings.catalog4Slogan || settings.catalog4Desc || settings.slogan || '')
                : (settings.slogan || 'O sabor que você merece, a um clique de distância.');

        if (selectedCatalog) {
          const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          if (lines.length > 0) {
            return (
              <div className="flex flex-col items-center mb-12 max-w-sm mx-auto bg-white/40 backdrop-blur-md p-5 rounded-[2rem] border border-white/20 shadow-md">
                <ul className="text-left space-y-2.5 text-xs text-black/80 font-sans font-semibold">
                  {lines.map((line, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="shrink-0 select-none mt-0.5" style={{ color: settings.primaryColor || '#865d39' }}>✦</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
        }

        return (
          <p className="font-medium mb-12 text-center whitespace-pre-wrap max-w-md mx-auto" style={{ color: settings.textColor || '#3f2b1b' }}>
            {text}
          </p>
        );
      })()}

      {/* Dynamic Minimum Items Indicator for the Active Catalog */}
      {(() => {
        if (!selectedCatalog) return null;
        const currentMin = getCatalogMinItems(selectedCatalog);

        if (currentMin <= 0) return null;

        const currentCount = (cartsByCatalog[selectedCatalog] || []).reduce((sum, item) => sum + item.quantity, 0);
        const isMet = currentCount >= currentMin;

        return (
          <div className="w-full max-w-md mx-auto mb-8 px-4">
            <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-sm text-xs font-semibold transition-all ${
              isMet 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-900'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{isMet ? '✅' : '📋'}</span>
                <span>
                  {settings.language === 'en'
                    ? `Minimum order: ${currentMin} items`
                    : `Pedido mínimo deste cardápio: ${currentMin} itens`}
                </span>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isMet ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {currentCount} / {currentMin}
              </div>
            </div>
            {totalCartItemsCount > currentCount && (
              <p className="text-[11px] text-center font-bold text-black/70 mt-1.5">
                🛍️ Total geral do pedido: {totalCartItemsCount} {totalCartItemsCount === 1 ? 'item' : 'itens'} ({activeCatalogsWithItems.length} {activeCatalogsWithItems.length === 1 ? 'cardápio' : 'cardápios'})
              </p>
            )}
          </div>
        );
      })()}



      <div className="w-full max-w-2xl space-y-12">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => {
            const categoryProducts = products.filter(p => p.categoryId === category.id && p.isActive !== false);
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="space-y-6">
                <div className="border-b border-white/20 pb-2">
                  <h2 className="text-2xl font-serif font-bold italic" style={{ color: settings.primaryColor }}>
                    {category.title}
                  </h2>
                </div>
                <div className="space-y-4">
                  {categoryProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      onClick={(e) => {
                        // If user click is inside the cart button container, don't trigger card action
                        if ((e.target as HTMLElement).closest('.cart-button-area')) {
                          return;
                        }
                        
                        setSelectedProductForDetails(product);
                        if (product.sizes && product.sizes.length > 0) {
                          setSelectedSize(product.sizes[0]);
                        } else {
                          setSelectedSize(null);
                        }
                      }}
                      className="glass rounded-2xl p-3.5 sm:p-5 flex gap-3.5 sm:gap-5 items-center cursor-pointer hover:shadow-md transition-all duration-300 w-full min-h-[110px] sm:min-h-[140px]"
                    >
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-white/50 shadow-sm border border-black/5">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow flex-shrink min-w-0 text-black flex flex-col items-start gap-1 pr-0.5">
                        <h3 className="text-sm sm:text-base md:text-lg font-serif font-bold text-black leading-tight break-words w-full">{product.title}</h3>
                        {product.description && (
                          <p className="text-[10px] sm:text-xs text-black/75 leading-tight break-words w-full">
                            {product.description.length > 70 
                              ? `${product.description.substring(0, 70)}...` 
                              : product.description}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForDetails(product);
                            if (product.sizes && product.sizes.length > 0) {
                              setSelectedSize(product.sizes[0]);
                            } else {
                              setSelectedSize(null);
                            }
                          }}
                          className="text-[10px] uppercase tracking-wider font-extrabold underline block transition-all focus:outline-none cursor-pointer hover:opacity-80 py-0.5 text-left"
                          style={{ color: settings.detailsColor || settings.primaryColor }}
                        >
                          {settings.language === 'en' ? 'View Details' : 'Ver Detalhes'}
                        </button>
                        <div className="flex flex-col items-start mt-0.5">
                          {(product.isCustomCake || product.priceType === 'consult') ? (
                            <span className="text-[9px] sm:text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                              {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                            </span>
                          ) : product.sizes && product.sizes.length > 0 ? (
                            <>
                              <p className="text-xs sm:text-base font-bold" style={{ color: settings.detailsColor || settings.primaryColor }}>
                                A partir de {currencySymbol}{Math.min(...product.sizes.map(s => s.price)).toFixed(2)}
                              </p>
                            </>
                          ) : ((product.price && product.price > 0) || (product.oldPrice && product.oldPrice > 0)) ? (
                            <>
                              {product.price && product.price > 0 && product.oldPrice && product.oldPrice > 0 ? (
                                <>
                                  <span className="text-[9px] sm:text-xs line-through opacity-40">
                                    {currencySymbol}{product.oldPrice.toFixed(2)}
                                  </span>
                                  <p className="text-xs sm:text-base font-bold" style={{ color: settings.detailsColor || settings.primaryColor }}>
                                    {currencySymbol}{product.price.toFixed(2)}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs sm:text-base font-bold" style={{ color: settings.detailsColor || settings.primaryColor }}>
                                  {currencySymbol}{(product.price && product.price > 0 ? product.price : (product.oldPrice || 0)).toFixed(2)}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                              {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center justify-center cart-button-area pl-1 z-10">
                        {(() => {
                          const requiresChoiceBeforeAdd = Boolean(
                            (product.sizes && product.sizes.length > 1) || product.isCustomCake
                          );
                          const totalQty = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);

                          if (requiresChoiceBeforeAdd) {
                            return (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductForDetails(product);
                                  if (product.sizes && product.sizes.length > 0) {
                                    setSelectedSize(product.sizes[0]);
                                  } else {
                                    setSelectedSize(null);
                                  }
                                }}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                                style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                title="Ver opções e escolher tamanho"
                              >
                                <Plus size={16} />
                              </button>
                            );
                          }

                          if (totalQty > 0) {
                            return (
                              <div className="flex items-center gap-1 bg-white/75 backdrop-blur-sm p-1 rounded-full border border-black/10 shadow-md">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const productCartItems = cart.filter(item => item.productId === product.id);
                                    if (productCartItems.length > 0) {
                                      const lastItem = productCartItems[productCartItems.length - 1];
                                      if (lastItem.quantity > 1) {
                                        setCart(prev => prev.map(i => i.id === lastItem.id ? { ...i, quantity: i.quantity - 1 } : i));
                                      } else {
                                        removeFromCart(lastItem.id);
                                      }
                                    }
                                  }}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200 cursor-pointer active:scale-95 transition-all text-black focus:outline-none"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="font-bold text-xs sm:text-sm min-w-[14px] sm:min-w-[20px] text-center text-black">
                                  {totalQty}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (totalQty >= MAX_PRODUCT_LIMIT) {
                                      toast.error(
                                        settings.language === 'en'
                                          ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${product.title}" reached!`
                                          : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${product.title}" atingido!`
                                      );
                                      return;
                                    }
                                    addToCart(product);
                                  }}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                  style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                                style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                              >
                                <Plus size={16} />
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 opacity-60 glass rounded-2xl">
            {settings.language === 'en' ? 'No products found.' : 'Nenhum produto encontrado.'}
          </div>
        )}
      </div>

      {(selectedCatalog === 'catalog1' || selectedCatalog === 'catalog2') && (
        <div className="w-full flex flex-col items-center mt-20 mb-8 gap-3 relative">
          {/* Question mark badge above the button */}
          <div className="absolute -top-9 z-10 flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
            <div className="bg-[#608770] text-white w-[35px] h-[35px] rounded-xl text-base font-black shadow-md relative flex items-center justify-center border border-white/20">
              ?
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#608770] rotate-45 border-r border-b border-white/20" />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsStorageModalOpen(true)}
            className="px-8 py-4 rounded-full font-bold text-xs sm:text-sm tracking-wider uppercase text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg border-0 text-center flex items-center justify-center min-h-[44px]"
            style={{ backgroundColor: '#143D25' }}
          >
            {settings.language === 'en' ? 'How to store and reheat' : 'Como armazenar e como aquecer'}
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isStorageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStorageModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              {/* Header with Close button */}
              <div className="p-4 border-b border-gray-200/50 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-sans">
                  {settings.language === 'en' ? 'How to store and reheat' : 'Como armazenar e como aquecer'}
                </h3>
                <button 
                  onClick={() => setIsStorageModalOpen(false)} 
                  className="p-2 hover:bg-gray-200/50 active:scale-90 transition-all rounded-full cursor-pointer text-gray-500 hover:text-black flex items-center justify-center min-w-[44px] min-h-[44px]"
                  aria-label={settings.language === 'en' ? 'Close' : 'Fechar'}
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Image Content */}
              <div className="p-4 overflow-y-auto flex items-center justify-center bg-gray-50">
                <img 
                  src="https://i.ibb.co/qLpY6RjJ/NEWS-41.png" 
                  alt={settings.language === 'en' ? 'How to store and reheat' : 'Como armazenar e como aquecer'} 
                  className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-md border border-gray-100"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40"
          >
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full h-16 rounded-2xl shadow-2xl flex items-center justify-between px-6 font-bold text-lg transition-transform active:scale-95 cursor-pointer"
              style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
            >
              <div className="flex items-center gap-3 font-serif">
                <ShoppingBag size={24} />
                <span>Ver Pedido</span>
              </div>
              <div className="flex items-center gap-2 font-serif text-sm">
                <span className="bg-white/20 px-2.5 py-1 rounded-full">{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}</span>
                <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setCheckoutStep('summary');
              }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings border border-gray-200"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
                <h2 className="text-2xl font-serif font-bold" style={{ color: '#000000' }}>
                  {checkoutStep === 'summary' ? t.cartTitle : t.finish}
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setCheckoutStep('summary');
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1">
                {checkoutStep === 'summary' ? (
                  <div className="space-y-6">
                    <div className="space-y-5">
                      {activeCatalogsWithItems.length === 0 ? (
                        <div className="text-center py-8 text-black/60 font-medium">
                          <ShoppingBag size={48} className="mx-auto mb-2 opacity-30" />
                          <p>{t.emptyCart}</p>
                        </div>
                      ) : (
                        (['catalog1', 'catalog2', 'catalog3', 'catalog4'] as const).map(catKey => {
                          const catItems = cartsByCatalog[catKey] || [];
                          if (catItems.length === 0) return null;
                          const catTitle = getCatalogTitle(catKey);
                          const catCount = catItems.reduce((s, it) => s + it.quantity, 0);
                          const catMin = getCatalogMinItems(catKey);
                          const catSubtotal = catItems.reduce((s, it) => s + getItemPrice(it) * it.quantity, 0);
                          const isMet = catMin <= 0 || catCount >= catMin;

                          return (
                            <div key={catKey} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3 sm:p-4 space-y-3">
                              {/* Header for this catalog */}
                              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                <div className="flex flex-col pr-2 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-serif font-black text-sm sm:text-base text-black tracking-tight">
                                      {catTitle}
                                    </span>
                                    {catMin > 0 && (
                                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                        isMet ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                                      }`}>
                                        {isMet 
                                          ? (settings.language === 'en' ? `Minimum reached (${catCount}/${catMin})` : `Mínimo atingido (${catCount}/${catMin})`) 
                                          : (settings.language === 'en' ? `Missing ${catMin - catCount} for minimum (${catCount}/${catMin})` : `Faltam ${catMin - catCount} para o mínimo (${catCount}/${catMin})`)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 block">Subtotal</span>
                                  <span className="text-xs sm:text-sm font-extrabold text-black">
                                    {currencySymbol}{catSubtotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Items list for this catalog */}
                              <div className="space-y-3">
                                {catItems.map((item) => {
                                  const product = products.find(p => p.id === item.productId);
                                  if (!product) return null;
                                  return (
                                    <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs w-full justify-between">
                                      <div className="flex items-center gap-3 min-w-0 flex-grow">
                                        <img src={product.image} alt={product.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                                        <div className="flex-grow min-w-0">
                                          <h4 className="font-bold text-sm text-black leading-tight break-words w-full">{product.title}</h4>
                                          
                                          {item.selectedSize && (
                                            <span className="inline-block bg-[#ffedd5] text-[#7c2d12] text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md leading-none mt-1 border border-[#fed7aa] whitespace-normal break-words max-w-full">
                                              {(settings.language === 'en' ? 'Size' : 'Tamanho')}: {item.selectedSize.name}
                                            </span>
                                          )}

                                          {item.mealOptions && (
                                            <div className="text-[10px] leading-tight mt-1 text-black/60 break-words w-full">
                                              {item.mealOptions.removals.length > 0 && `Exclude: ${item.mealOptions.removals.join(', ')}`}
                                              {item.mealOptions.removals.length > 0 && item.mealOptions.sides.length > 0 && ' • '}
                                              {item.mealOptions.sides.length > 0 && (() => {
                                                const normalSidesArr = item.mealOptions.sides.filter(s => s.type !== 'swap');
                                                const swapSidesArr = item.mealOptions.sides.filter(s => s.type === 'swap');
                                                
                                                const formatter = (arr: any[]) => Object.entries(arr.reduce((acc: Record<string, number>, s) => { 
                                                  acc[s.name] = (acc[s.name] || 0) + 1; 
                                                  return acc; 
                                                }, {})).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');

                                                const listParts = [];
                                                if (normalSidesArr.length > 0) {
                                                  listParts.push(`Acompanhamentos: ${formatter(normalSidesArr)}`);
                                                }
                                                if (swapSidesArr.length > 0) {
                                                  listParts.push(`Trocas: ${formatter(swapSidesArr)}`);
                                                }
                                                return listParts.join(' • ');
                                              })()}
                                            </div>
                                          )}

                                          {item.cakeOptions && (
                                            <div className="text-[10px] leading-tight mt-1.5 space-y-0.5 text-black/60 break-words w-full">
                                              {item.cakeOptions.size && (
                                                <div>Tamanho: <span className="font-bold text-black">{item.cakeOptions.size}</span></div>
                                              )}
                                              {item.cakeOptions.dough && (
                                                <div>Massa: <span className="font-bold text-black">{item.cakeOptions.dough}</span></div>
                                              )}
                                              {item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0 && (
                                                <div>Recheios: <span className="font-bold text-black">{item.cakeOptions.fillings.join(' + ')}</span></div>
                                              )}
                                              {item.cakeOptions.topping && (
                                                <div>Cobertura: <span className="font-bold text-black">{item.cakeOptions.topping}</span></div>
                                              )}
                                              {item.cakeOptions.topper && (
                                                <div>Topo: <span className="font-bold text-black">{item.cakeOptions.topper}</span></div>
                                              )}
                                              {item.cakeOptions.styleNumber && (
                                                <div>Referência: <span className="font-bold text-black">Modelo #{item.cakeOptions.styleNumber}</span></div>
                                              )}
                                            </div>
                                          )}
                                          {item.sandwichOptions && (
                                            <div className="text-[10px] leading-tight mt-1.5 space-y-0.5 text-black/60 break-words w-full">
                                              {item.sandwichOptions.fillings && item.sandwichOptions.fillings.length > 0 && (
                                                <div>{settings.language === 'en' ? 'State' : 'Estado'}: <span className="font-bold text-black">{item.sandwichOptions.fillings.join(' + ')}</span></div>
                                              )}
                                            </div>
                                          )}
                                          <div className="flex flex-col items-start mt-1.5">
                                            {(product.isCustomCake || product.priceType === 'consult') ? (
                                              <span className="text-[10px] uppercase font-serif font-black tracking-wider px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                                {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                                              </span>
                                            ) : item.selectedSize ? (
                                              <>
                                                {item.selectedSize.oldPrice && item.selectedSize.oldPrice > 0 && (
                                                  <span className="text-[10px] line-through opacity-40">
                                                    {currencySymbol}{item.selectedSize.oldPrice.toFixed(2)}
                                                  </span>
                                                )}
                                                <p className="text-xs font-bold text-black">
                                                  {currencySymbol}{((item.selectedSize.price + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                                </p>
                                              </>
                                            ) : ((product.price && product.price > 0) || (product.oldPrice && product.oldPrice > 0)) ? (
                                              <>
                                                {product.price && product.price > 0 && product.oldPrice && product.oldPrice > 0 ? (
                                                  <>
                                                    <span className="text-[10px] line-through opacity-40">
                                                      {currencySymbol}{product.oldPrice.toFixed(2)}
                                                    </span>
                                                    <p className="text-xs font-bold text-black">
                                                      {currencySymbol}{((product.price + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                                    </p>
                                                  </>
                                                ) : (
                                                  <p className="text-xs font-bold text-black">
                                                    {currencySymbol}{(((product.price && product.price > 0 ? product.price : (product.oldPrice || 0)) + (item.mealOptions?.sides?.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                                  </p>
                                                )}
                                              </>
                                            ) : (
                                              <span className="text-[10px] uppercase font-serif font-black tracking-wider px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                                {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                                        <button 
                                          onClick={() => updateCartItemQuantity(catKey, item.id, -1)}
                                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center opacity-90 shadow-xs border border-gray-200 active:scale-95 transition-all select-none focus:outline-none cursor-pointer"
                                        >
                                          <Minus size={14} style={{ color: '#000000' }} />
                                        </button>
                                        <span className="font-bold text-sm text-black min-w-[16px] text-center">{item.quantity}</span>
                                        <button 
                                          onClick={() => updateCartItemQuantity(catKey, item.id, 1)}
                                          className="w-8 h-8 rounded-full flex items-center justify-center shadow-xs font-bold active:scale-95 transition-all select-none focus:outline-none cursor-pointer text-white"
                                          style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                        >
                                          <Plus size={14} />
                                        </button>
                                        <button
                                          onClick={() => removeCartItem(catKey, item.id)}
                                          className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 active:scale-95 transition-all cursor-pointer border border-red-100 ml-0.5"
                                          title="Remover item"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* If minimum is not met for this specific catalog, show quick button to jump to it */}
                              {!isMet && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCatalog(catKey);
                                    setActiveScreen('menu');
                                    setIsModalOpen(false);
                                  }}
                                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <span>+ Adicionar mais {catMin - catCount} {catMin - catCount === 1 ? 'item' : 'itens'} em "{catTitle}"</span>
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold" style={{ color: '#000000' }}>{t.total}</span>
                          <span className="text-xs text-gray-500 font-semibold">
                            {totalCartItemsCount} {totalCartItemsCount === 1 ? 'item' : 'itens'} no total ({activeCatalogsWithItems.length} {activeCatalogsWithItems.length === 1 ? 'cardápio' : 'cardápios'})
                          </span>
                        </div>
                        <span className="text-2xl font-bold" style={{ color: '#000000' }}>
                          {currencySymbol}{totalCartPrice.toFixed(2)}
                        </span>
                      </div>
                      {allCartItems.some(item => {
                        const p = products.find(prod => prod.id === item.productId);
                        return p?.priceType === 'consult' || p?.isCustomCake === true;
                      }) && (
                        <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-[10px] text-yellow-800 font-medium">
                          {t.consultMessage}
                        </div>
                      )}
                    </div>

                    {(() => {
                      const validation = validateCartItems();
                      if (!validation.isValid && validation.errors && validation.errors.length > 0) {
                        return (
                          <div className="p-3.5 mb-2 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 font-medium space-y-1 text-left">
                            <div className="flex items-center gap-1.5 font-bold text-red-950">
                              <span>⚠️</span>
                              <span>Regras pendentes para envio do pedido:</span>
                            </div>
                            <ul className="list-disc list-inside text-[11px] font-semibold space-y-0.5 text-red-800 pl-1">
                              {validation.errors.map((err, idx) => (
                                <li key={idx}>{err.message}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="space-y-2.5 pt-2">
                      <button 
                        onClick={() => {
                          const validation = validateCartItems();
                          if (!validation.isValid) {
                            toast.error(validation.message);
                            return;
                          }
                          if (checkMarmitifyLimit()) {
                            setCheckoutStep('form');
                          }
                        }}
                        className="w-full py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl transition-transform active:scale-95 cursor-pointer text-white flex items-center justify-center gap-2"
                        style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                      >
                        <span>{t.next}</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="w-full py-3.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                      >
                        <ChevronLeft size={18} />
                        <span>Voltar ao Cardápio / Escolher Mais Itens</span>
                      </button>
                    </div>
                  </div>
                ) : checkoutStep === 'channels' ? (
                  <div className="space-y-6 text-center py-4 font-sans text-black animate-fade-in">
                    <div className="mx-auto w-14 h-14 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-1">
                      <Check size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide text-black">
                        {settings.language === 'en' ? 'Order Saved!' : 'Pedido Salvo!'}
                      </h3>
                      <p className="text-xs font-semibold text-black/60 max-w-sm mx-auto">
                        {settings.language === 'en' 
                          ? 'Your order details have been successfully recorded.' 
                          : 'Os detalhes do seu pedido foram registrados com sucesso.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-950 font-medium text-xs font-sans text-left leading-relaxed">
                      {settings.language === 'en' 
                        ? 'To complete and submit your order, please select the delivery messaging channel below to send the details directly to our representative:'
                        : 'Para finalizar e enviar seu pedido, selecione o botão de envio por mensagem abaixo para entrar em contato diretamente com o nosso representante:'}
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleCompleteStandardOrder(standardSuccessUrls?.whatsapp || '')}
                        className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0"
                      >
                        <MessageCircle size={18} />
                        <span>{settings.language === 'en' ? 'Send Order via WhatsApp' : 'Enviar Pedido por WhatsApp'}</span>
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        setCheckoutStep('form');
                        setStandardSuccessUrls(null);
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-4 uppercase tracking-wider block mx-auto cursor-pointer"
                    >
                      {settings.language === 'en' ? 'Back to Edit Details' : 'Voltar para os Detalhes'}
                    </button>
                  </div>
                ) : checkoutStep === 'b2b_channels' ? (
                  <div className="space-y-6 text-center py-4 font-sans text-black animate-fade-in">
                    <div className="mx-auto w-14 h-14 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-1">
                      <Check size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide text-black">
                        Pedido Corporativo Recebido!
                      </h3>
                      <p className="text-xs font-semibold text-black/60 max-w-sm mx-auto">
                        Os dados da sua empresa e o pedido foram registrados com sucesso.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-950 font-medium text-xs font-sans text-left leading-relaxed">
                      Para concluir seu pedido, envie os detalhes para nossa equipe pelo botão abaixo:
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleCompleteB2bOrder(b2bSuccessUrls?.whatsapp || '')}
                        className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0"
                      >
                        <MessageCircle size={18} />
                        <span>Enviar Pedido via WhatsApp</span>
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        setCheckoutStep('form');
                        setB2bSuccessUrls(null);
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-4 uppercase tracking-wider block mx-auto cursor-pointer"
                    >
                      Voltar para Editar Dados
                    </button>
                  </div>
                ) : false ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide" style={{ color: settings.primaryColor }}>
                        Dados do Pedido Corporativo
                      </h3>
                      <p className="text-xs font-semibold text-black/60 font-sans max-w-sm mx-auto">
                        Informe os dados da sua empresa para aplicar as condições comerciais e enviar o pedido.
                      </p>
                    </div>

                    {isReturningB2b && (
                      <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-950 flex flex-col gap-1.5 font-sans">
                        <p className="text-xs font-bold flex items-center gap-1.5 text-teal-800">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
                          Conta Corporativa Salva
                        </p>
                        <p className="text-[10px] opacity-90 leading-tight font-medium">
                          Os dados da sua empresa estão salvos neste dispositivo. Revise abaixo ou limpe para inserir novos dados.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem('b2b_profile_save');
                            setB2bName('');
                            setB2bResponsibleName('');
                            setB2bPhone('');
                            setB2bAddress('');
                            setIsReturningB2b(false);
                            toast.success('Campos limpos com sucesso!');
                          }}
                          className="self-start text-[9px] uppercase tracking-wider font-extrabold text-red-700 hover:underline mt-1 bg-white border border-red-200 px-2 py-1 rounded-lg border-0 cursor-pointer"
                        >
                          Limpar Dados Salvos
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleFinalizarB2b} className="space-y-4">
                      {/* Company Name */}
                      <div className="space-y-1 relative">
                        <label className="text-xs font-bold uppercase text-black">Nome da Empresa / Razão Social *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Ex: Minha Empresa LLC"
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bName}
                          onChange={e => {
                            const val = e.target.value;
                            setB2bName(val);
                            if (val.trim().length > 1) {
                              const matched = b2bProfiles.filter(p => 
                                p.name.toLowerCase().includes(val.toLowerCase())
                              );
                              setB2bSearchResults(matched);
                              setShowB2bSearchDropdown(matched.length > 0);
                            } else {
                              setShowB2bSearchDropdown(false);
                            }
                          }}
                        />
                        {showB2bSearchDropdown && b2bSearchResults.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {b2bSearchResults.map((profile, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-xs font-semibold text-gray-800 border-b border-gray-50 last:border-b-0 border-0 cursor-pointer"
                                onClick={() => {
                                  setB2bName(profile.name);
                                  setB2bResponsibleName(profile.manager || '');
                                  setB2bPhone(profile.phone || '');
                                  setB2bAddress(profile.address || '');
                                  setShowB2bSearchDropdown(false);
                                }}
                              >
                                {profile.name} (Responsável: {profile.manager})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Responsible names */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Responsável pelo Pedido *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="Nome do contato"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bResponsibleName}
                            onChange={e => setB2bResponsibleName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Telefone Corporativo (EUA) *</label>
                          <input 
                            required
                            type="tel" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bPhone}
                            onChange={e => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                              let val = '';
                              if (digits.length === 0) val = '';
                              else if (digits.length <= 3) val = `(${digits}`;
                              else if (digits.length <= 6) val = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                              else val = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                              setB2bPhone(val);
                            }}
                            placeholder="(555) 000-0000"
                          />
                        </div>
                      </div>

                      {/* Commercial Address */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">Endereço Completo de Recebimento (Rua, Nº, Apto/Suíte) *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Ex: 7500 Universal Blvd, Suite 100..."
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bAddress}
                          onChange={e => setB2bAddress(e.target.value)}
                        />
                      </div>

                      {/* Zip Code and City */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Zip Code (EUA) *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="Ex: 32819"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bZipCode}
                            onChange={e => setB2bZipCode(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Cidade *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="Ex: Orlando"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bCity}
                            onChange={e => setB2bCity(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Plan and Date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase text-black block">Frequência do Pedido *</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setB2bFrequency('one-time')}
                              className={cn(
                                "py-2.5 px-3 rounded-xl font-bold font-sans text-xs border text-center transition-all cursor-pointer",
                                b2bFrequency === 'one-time'
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              Pedido Único (Avulso)
                            </button>
                            <button
                              type="button"
                              onClick={() => setB2bFrequency('weekly')}
                              className={cn(
                                "py-2.5 px-3 rounded-xl font-bold font-sans text-xs border text-center transition-all cursor-pointer",
                                b2bFrequency === 'weekly'
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              Plano Semanal (Recorrente)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Data Prevista de Entrega *</label>
                          <input 
                            required
                            type="date" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bDate}
                            onChange={e => setB2bDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Observations */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">Instruções de Entrega / Observações</label>
                        <textarea 
                          rows={2}
                          placeholder="Ex: Horário preferencial de recebimento, detalhes de faturamento ou doca..."
                          className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black text-xs font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bObservation}
                          onChange={e => setB2bObservation(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setCheckoutStep('summary')}
                          className="px-6 py-4 rounded-xl bg-white border border-gray-200 text-black font-bold cursor-pointer font-serif border-0 hover:bg-gray-50 transition-colors"
                        >
                          {t.back}
                        </button>
                        <button 
                          type="submit"
                          className="flex-grow py-4 rounded-xl font-bold text-lg shadow-xl transition-transform active:scale-95 cursor-pointer font-serif border-0"
                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                        >
                          Finalizar Pedido Corporativo
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-serif font-bold" style={{ color: '#000000' }}>{t.orderDetails}</h3>
                      {settings.checkoutTitle && (
                        <p className="text-sm font-medium italic leading-relaxed px-4" style={{ color: '#000000' }}>
                          {settings.checkoutTitle}
                        </p>
                      )}
                    </div>

                    {(settings.infoBlock1Title || settings.infoBlock1Text || settings.infoBlock2Title || settings.infoBlock2Text) && (
                      <div className="grid grid-cols-1 gap-3">
                        {settings.infoBlock1Title && (
                          <div className="bg-amber-50/90 border border-amber-200/90 border-l-4 border-l-amber-500 p-4 rounded-2xl shadow-xs text-left">
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 mb-1 font-serif">
                              {settings.infoBlock1Title}
                            </h4>
                            <p className="text-xs font-medium text-amber-900/95 leading-relaxed">
                              {settings.infoBlock1Text}
                            </p>
                          </div>
                        )}
                        {settings.infoBlock2Title && (
                          <div className="bg-emerald-50/90 border border-emerald-200/90 border-l-4 border-l-emerald-600 p-4 rounded-2xl shadow-xs text-left">
                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 mb-1 font-serif">
                              {settings.infoBlock2Title}
                            </h4>
                            <p className="text-xs font-medium text-emerald-900/95 leading-relaxed">
                              {settings.infoBlock2Text}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <form onSubmit={handleFinalizar} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800">{t.fullName} *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Ex: Patricia Guimarães"
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.nome}
                          onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-800">{t.phone} *</label>
                          <input 
                            required
                            type="tel" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white font-medium"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.telefone}
                            onChange={e => {
                              const digits = e.target.value.replace(/\D/g, '');
                              const normalized = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits.slice(0, 10);
                              let val = '';
                              if (normalized.length === 0) val = '';
                              else if (normalized.length <= 3) val = `(${normalized}`;
                              else if (normalized.length <= 6) val = `(${normalized.slice(0, 3)}) ${normalized.slice(3)}`;
                              else val = `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
                              setFormData({...formData, telefone: val});
                            }}
                            placeholder="(555) 000-0000"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-800 block whitespace-nowrap">
                            {t.birthday} *
                          </label>
                          <input 
                            required
                            type="text" 
                            placeholder="MM/DD"
                            maxLength={5}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white font-medium"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.aniversario}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                              setFormData({...formData, aniversario: val});
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800">{t.email} *</label>
                        <input 
                          required
                          type="email" 
                          placeholder="seuemail@exemplo.com"
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                      
                      {/* Order Modality Selection: DELIVERY or PICKUP (only shown if pickup address is configured in Admin) */}
                      {hasPickupAddress && (
                        <div className="space-y-2 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200">
                          <label className="text-xs font-bold text-gray-800 block">
                            Modalidade do Pedido *
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setOrderType('delivery')}
                              className={cn(
                                "py-3 px-3 rounded-xl text-sm font-extrabold uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center text-center shadow-xs",
                                orderType === 'delivery'
                                  ? "bg-black text-white border-black shadow-md ring-2 ring-black/10"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-black"
                              )}
                            >
                              <span>Entrega</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderType('pickup')}
                              className={cn(
                                "py-3 px-3 rounded-xl text-sm font-extrabold uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center text-center shadow-xs",
                                orderType === 'pickup'
                                  ? "bg-black text-white border-black shadow-md ring-2 ring-black/10"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-black"
                              )}
                            >
                              <span>Retirada</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {hasPickupAddress && orderType === 'pickup' ? (
                        <div className="bg-white border-2 border-black/80 rounded-2xl p-4 text-xs text-gray-900 shadow-sm space-y-2.5 animate-fade-in">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <span className="font-black text-xs uppercase tracking-wider text-black">
                              Endereço para Retirada
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-black text-white uppercase tracking-wider">
                              Retirada
                            </span>
                          </div>
                          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-sm font-black text-black leading-snug">
                              {settings.pickupAddress}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5 bg-gray-50/80 p-4 rounded-2xl border border-gray-200">
                          <div className="flex items-center gap-1.5 pb-2 border-b border-gray-200">
                            <MapPin size={16} className="text-black" />
                            <span className="text-xs font-bold text-gray-900">
                              Endereço de Entrega
                            </span>
                          </div>

                          {/* Rua e Número (Endereço Completo) */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-800">
                              Endereço Completo (Rua e Número) *
                            </label>
                            <input 
                              required={orderType === 'delivery'}
                              type="text" 
                              placeholder="Ex: 7500 Universal Blvd"
                              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={formData.street}
                              onChange={e => setFormData({...formData, street: e.target.value})}
                            />
                          </div>

                          {/* Apto / Suíte e Zipcode */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-800">
                                Apto / Bloco / Suíte (Opcional)
                              </label>
                              <input 
                                type="text" 
                                placeholder="Ex: Apt 204, Bloco B"
                                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                                value={formData.apt}
                                onChange={e => setFormData({...formData, apt: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-800">
                                CEP / Zip Code *
                              </label>
                              <input 
                                required={orderType === 'delivery'}
                                type="text" 
                                placeholder="Ex: 32819"
                                maxLength={10}
                                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white font-medium"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                                value={formData.zipCode}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                  let val = digits;
                                  if (digits.length > 5) {
                                    val = `${digits.slice(0, 5)}-${digits.slice(5)}`;
                                  }
                                  setFormData({...formData, zipCode: val});
                                }}
                              />
                            </div>
                          </div>

                          {/* Cidade e Estado */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                                  <span>Cidade / Bairro de Entrega *</span>
                                  {selectedDeliveryFee > 0 && (
                                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                      Taxa: {currencySymbol} {selectedDeliveryFee.toFixed(2).replace('.', ',')}
                                    </span>
                                  )}
                                </label>
                                {settings?.deliveryZones && settings.deliveryZones.length > 0 ? (
                                  <div className="space-y-2">
                                    <select
                                      required={orderType === 'delivery'}
                                      className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white font-semibold text-sm cursor-pointer shadow-2xs"
                                      style={{ '--tw-ring-color': settings.primaryColor } as any}
                                      value={selectedZoneId}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setSelectedZoneId(val);
                                        if (val === 'custom') {
                                          setFormData(prev => ({ ...prev, city: '' }));
                                          setSelectedDeliveryFee(0);
                                        } else {
                                          const found = settings.deliveryZones?.find(z => z.id === val);
                                          if (found) {
                                            setFormData(prev => ({ ...prev, city: found.name }));
                                            setSelectedDeliveryFee(found.fee || 0);
                                          }
                                        }
                                      }}
                                    >
                                      <option value="" disabled>Selecione seu bairro / região...</option>
                                      {sortedDeliveryZones.map(zone => (
                                        <option key={zone.id} value={zone.id}>
                                          {zone.name} — Taxa: {currencySymbol} {Number(zone.fee || 0).toFixed(2).replace('.', ',')}
                                        </option>
                                      ))}
                                      <option value="custom">Outro (sem taxa fixa / a combinar)</option>
                                    </select>

                                    {selectedZoneId === 'custom' && (
                                      <input 
                                        required={orderType === 'delivery'}
                                        type="text" 
                                        placeholder="Digite o nome da sua cidade ou bairro"
                                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white text-sm font-medium animate-fade-in"
                                        style={{ '--tw-ring-color': settings.primaryColor } as any}
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <input 
                                    required={orderType === 'delivery'}
                                    type="text" 
                                    placeholder="Ex: Orlando"
                                    className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white"
                                    style={{ '--tw-ring-color': settings.primaryColor } as any}
                                    value={formData.city}
                                    onChange={e => setFormData({...formData, city: e.target.value})}
                                  />
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-800">
                                  Estado
                                </label>
                                <input 
                                  type="text"
                                  readOnly
                                  tabIndex={-1}
                                  value="MD"
                                  className="w-full p-3 rounded-xl border border-gray-300 bg-gray-100 text-black font-bold text-sm select-none cursor-default outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800">{t.observation}</label>
                        <textarea 
                          rows={2}
                          placeholder="Alguma instrução especial para a entrega ou preparo?"
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.observacao}
                          onChange={e => setFormData({...formData, observacao: e.target.value})}
                        />
                      </div>

                      {/* Resumo financeiro do pedido com taxa de entrega */}
                      <div className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-2xs space-y-2 text-xs">
                        <div className="flex justify-between items-center text-gray-600">
                          <span className="font-medium">Subtotal dos itens:</span>
                          <span className="font-bold text-gray-900 font-mono text-sm">{currencySymbol}{cartTotal.toFixed(2)}</span>
                        </div>
                        {orderType === 'delivery' && (
                          <div className="flex justify-between items-center text-blue-700">
                            <span className="font-medium">Taxa de Entrega {formData.city ? `(${formData.city})` : ''}:</span>
                            <span className="font-bold font-mono text-sm">
                              {selectedDeliveryFee > 0 
                                ? `+ ${currencySymbol}${selectedDeliveryFee.toFixed(2).replace('.', ',')}` 
                                : (selectedZoneId === 'custom' ? 'A combinar' : `${currencySymbol}0,00`)}
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                          <span className="font-extrabold text-sm text-gray-900">Total do Pedido:</span>
                          <span className="text-lg font-black text-emerald-800 font-mono">
                            {currencySymbol}{(cartTotal + (orderType === 'delivery' ? selectedDeliveryFee : 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-3 border-t border-gray-100 w-full max-w-full">
                        <button 
                          type="submit"
                          className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between gap-2 text-white"
                          style={{ backgroundColor: settings.primaryColor || '#063319' }}
                        >
                          <span className="text-sm sm:text-base font-extrabold tracking-wide">
                            Finalizar Pedido
                          </span>
                          <span className="font-mono font-bold text-sm sm:text-base bg-white/20 px-3 py-1 rounded-lg shrink-0">
                            {currencySymbol}{(cartTotal + (orderType === 'delivery' ? selectedDeliveryFee : 0)).toFixed(2)}
                          </span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => setCheckoutStep('summary')}
                          className="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 font-bold text-xs sm:text-sm text-gray-700 cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5"
                        >
                          <ChevronLeft size={16} />
                          <span>Voltar ao Carrinho</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProductForDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForDetails(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-black font-sans force-dark-headings"
              style={{ '--text-color': '#000000' } as any}
            >
              {/* Close button top right overlay */}
              <button
                onClick={() => setSelectedProductForDetails(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm rounded-full transition-all border-0 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Scrollable Container */}
              <div className="overflow-y-auto w-full flex-grow">
                {/* Hero Product Image */}
                <div className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden">
                  <img 
                    src={selectedProductForDetails.image} 
                    alt={selectedProductForDetails.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* Title & Stats */}
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-black leading-tight">
                      {selectedProductForDetails.title}
                    </h2>
                    {selectedProductForDetails.categoryTitle && (
                      <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-950 rounded-lg">
                        {selectedProductForDetails.categoryTitle}
                      </span>
                    )}
                  </div>

                  {/* Pricing Display */}
                  <div className="p-4 rounded-2xl bg-white/50 border border-white/20">
                    <label className="text-[10px] font-black uppercase text-black/50 block tracking-wider mb-1">
                      Detalhes do Preço
                    </label>
                    {false ? (
                        <div className="space-y-4">
                          {Boolean((selectedProductForDetails?.sizes?.length ?? 0) > 0) && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-black/60 mb-2">
                                {settings.language === 'en' ? 'Available Options (Select to add):' : 'Opções Disponíveis (Selecione para adicionar):'}
                              </p>
                              <div className="space-y-2">
                              {selectedProductForDetails?.sizes?.map((s, idx) => {
                                const cartItem = cart.find(item => item.productId === selectedProductForDetails!.id && item.selectedSize?.id === s.id && !item.mealOptions);
                                const qty = cartItem ? cartItem.quantity : 0;
                                return (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center p-3 bg-white/80 border border-gray-200/50 rounded-2xl font-bold text-black text-xs"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-black">{s.name}</span>
                                      {typeof s.price === 'number' && s.price > 0 && (
                                        <span className="text-xs text-gray-500 font-extrabold mt-0.5">
                                          {currencySymbol}{s.price.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {qty > 0 ? (
                                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                          <button
                                            type="button"
                                            onClick={() => decrementSizeQty(selectedProductForDetails!, s)}
                                            className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all focus:outline-none"
                                          >
                                            <Minus size={14} />
                                          </button>
                                          <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                          <button
                                            type="button"
                                            onClick={() => incrementSizeQty(selectedProductForDetails!, s)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                            style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                          >
                                            <Plus size={14} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => incrementSizeQty(selectedProductForDetails!, s)}
                                          className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1 focus:outline-none"
                                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                        >
                                          <Plus size={12} />
                                          <span>{settings.language === 'en' ? 'Add' : 'Adicionar'}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (selectedProductForDetails.isCustomCake || selectedProductForDetails.priceType === 'consult' || (!selectedProductForDetails.price && !selectedProductForDetails.oldPrice && (!selectedProductForDetails.sizes || selectedProductForDetails.sizes.length === 0))) ? (
                      <div className="space-y-1">
                        <span className="text-xl font-bold text-amber-950 block font-serif">
                          {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                        </span>
                        <p className="text-[11px] text-black/60 font-semibold leading-relaxed">
                          {settings.language === 'en' 
                            ? 'Configure your preferences by clicking to add/customize.' 
                            : 'Personalize as especificações clicando para adicionar.'}
                        </p>
                      </div>
                    ) : selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-black/60 mb-2">
                          {settings.language === 'en' ? 'Available Options (Select to add):' : 'Opções Disponíveis (Selecione para adicionar):'}
                        </p>
                        <div className="space-y-2">
                          {selectedProductForDetails.sizes.map((s, idx) => {
                            const isSelected = selectedSize?.id === s.id;
                            const hasExclusionsOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                            const hasSidesOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                            const isCustomCakeOpt = !!selectedProductForDetails.isCustomCake;
                            const isCustomSandwichOpt = !!selectedProductForDetails.isCustomSandwich;
                            const requiresCustomization = hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt;

                            if (requiresCustomization) {
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSize(s);
                                    if (selectedProductForDetails.isCustomSandwich) {
                                      setSelectedSandwichFillings([]);
                                    }
                                  }}
                                  className={cn(
                                    "w-full flex justify-between items-center p-3.5 rounded-2xl font-bold text-black text-xs border-2 text-left transition-all cursor-pointer",
                                    isSelected 
                                      ? "border-blue-500 bg-white shadow-md scale-[1.01]" 
                                      : "border-gray-200/50 bg-white/80 hover:border-gray-300"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                      "w-4 h-4 rounded-full border flex items-center justify-center",
                                      isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white"
                                    )}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-black">{s.name}</span>
                                      {s.price && s.price > 0 && (
                                        <span className="text-xs text-gray-500 font-extrabold mt-0.5">
                                          {currencySymbol}{s.price.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && <Check size={14} className="text-blue-500" />}
                                </button>
                              );
                            }

                            const cartItem = cart.find(item => item.productId === selectedProductForDetails.id && item.selectedSize?.id === s.id && !item.mealOptions);
                            const qty = cartItem ? cartItem.quantity : 0;
                            return (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-3.5 bg-white/80 border border-gray-200/50 rounded-2xl font-bold text-black text-xs"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-black">{s.name}</span>
                                  {s.price && s.price > 0 && (
                                    <span className="text-xs text-gray-500 font-extrabold mt-0.5">
                                      {currencySymbol}{s.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {qty > 0 ? (
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => decrementSizeQty(selectedProductForDetails, s)}
                                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all focus:outline-none"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                      className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1 focus:outline-none"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                    >
                                      <Plus size={12} />
                                      <span>{settings.language === 'en' ? 'Add' : 'Adicionar'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-serif font-black" style={{ color: settings.detailsColor || settings.primaryColor || "#000000" }}>
                          {currencySymbol}{(selectedProductForDetails.price > 0 ? selectedProductForDetails.price : (selectedProductForDetails.oldPrice || 0)).toFixed(2)}
                        </p>
                        {selectedProductForDetails.price > 0 && selectedProductForDetails.oldPrice && selectedProductForDetails.oldPrice > 0 && (
                          <span className="text-sm line-through opacity-40">
                            {currencySymbol}{selectedProductForDetails.oldPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Extended Description Section */}
                  <div className="space-y-2 text-black">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Descrição do Produto</h3>
                    <p className="text-sm leading-relaxed text-black/80 font-medium whitespace-pre-wrap">
                      {selectedProductForDetails.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {/* Custom Cake Options in Details Modal */}
                  {selectedProductForDetails.isCustomCake && (
                    <div className="border-t border-gray-200/30 pt-6 space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-black/60">Personalização do Bolo</h4>
                      
                      {/* Size Selection */}
                      {cakeSizesList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Tamanho / Fatias / Peso</p>
                          <div className="grid grid-cols-1 gap-2">
                            {cakeSizesList.map((sizeOpt, idx) => {
                              const isSelected = selectedCakeSize === sizeOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedCakeSize(sizeOpt)}
                                  className={cn(
                                    "p-3 rounded-xl border-2 transition-all flex justify-between items-center w-full text-left font-bold text-xs cursor-pointer",
                                    isSelected 
                                      ? "shadow-md scale-[1.01]" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span>{sizeOpt}</span>
                                  {isSelected && <Check size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dough Selection */}
                      {cakeDoughsList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Escolha da Massa</p>
                          <div className="grid grid-cols-2 gap-2">
                            {cakeDoughsList.map((doughOpt, idx) => {
                              const isSelected = selectedDough === doughOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedDough(doughOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {doughOpt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fillings Selection */}
                      {cakeFillingsList.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-baseline">
                            <p className="text-xs font-bold text-black/60">Opções de Recheio</p>
                            <span className="text-[10px] text-gray-500 font-bold">Escolha até {settings.cakeFillingsMax || 2}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cakeFillingsList.map((fillingOpt, idx) => {
                              const isSelected = selectedFillings.includes(fillingOpt);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedFillings(selectedFillings.filter(f => f !== fillingOpt));
                                    } else {
                                      const maxFillings = settings.cakeFillingsMax || 2;
                                      if (selectedFillings.length >= maxFillings) {
                                        toast.error(`Você pode escolher no máximo ${maxFillings} recheios!`);
                                        return;
                                      }
                                      setSelectedFillings([...selectedFillings, fillingOpt]);
                                    }
                                  }}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all flex items-center justify-between font-bold text-xs cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span>{fillingOpt}</span>
                                  {isSelected && <Check size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Toppings Selection */}
                      {cakeToppingsList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Escolha da Cobertura</p>
                          <div className="grid grid-cols-2 gap-2">
                            {cakeToppingsList.map((toppingOpt, idx) => {
                              const isSelected = selectedTopping === toppingOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTopping(toppingOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {toppingOpt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Topper Selection */}
                      {cakeToppersList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Topo do Bolo</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cakeToppersList.map((topperOpt, idx) => {
                              const isSelected = selectedTopper === topperOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTopper(topperOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {topperOpt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Style Selection Reference */}
                      {selectedProductForDetails.cakeGalleryId && (
                        (() => {
                          const associatedGallery = galleries.find(g => g.id === selectedProductForDetails.cakeGalleryId);
                          const validImages = associatedGallery?.images?.filter(img => img && img.trim() !== '') || [];
                          if (validImages.length === 0) return null;
                          
                          const noStyleText = settings.language === 'en' 
                            ? (selectedStyleNumber === null ? 'Selected: Standard (No Reference)' : 'Choose: Standard (No Reference)')
                            : (selectedStyleNumber === null ? 'Selecionado: Base Tradicional' : 'Selecionar: Base Tradicional');

                          return (
                            <div className="space-y-3 pt-2">
                              <p className="text-xs font-bold text-black/60">Modelo / Referência Visual do Bolo</p>
                              <div className="w-full mb-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStyleNumber(null)}
                                  className={cn(
                                    "w-full py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 border-2 cursor-pointer uppercase",
                                    selectedStyleNumber === null
                                      ? "shadow-md text-white border-transparent"
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{
                                    backgroundColor: selectedStyleNumber === null ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: selectedStyleNumber === null ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {selectedStyleNumber === null ? <Check size={12} /> : <X size={12} />}
                                  <span>{noStyleText}</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                {associatedGallery?.images?.map((img, idx) => {
                                  if (!img || img.trim() === '') return null;
                                  const isSelected = selectedStyleNumber === (idx + 1);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedStyleNumber(idx + 1)}
                                      className={cn(
                                        "relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-white p-0 text-left cursor-pointer",
                                        isSelected ? "scale-[1.01]" : "border-gray-200 hover:border-gray-300"
                                      )}
                                      style={{ borderColor: isSelected ? (settings.primaryColor || '#865d39') : 'transparent' }}
                                    >
                                      <img
                                        src={img}
                                        alt={`Style ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute top-1 left-1 bg-black/75 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
                                        #{idx + 1}
                                      </div>
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}>
                                            <Check size={12} />
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* Customizable Meal Options in Details Modal (only show when ingredients or allowed sides are registered) */}
                  {Boolean(selectedProductForDetails.isMeal && (() => {
                    const hasIngredientsList = Boolean(
                      selectedProductForDetails.ingredients &&
                      selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0
                    );
                    const hasSidesConfigured = Boolean(
                      selectedProductForDetails.allowedSides &&
                      selectedProductForDetails.allowedSides.length > 0 &&
                      selectedProductForDetails.allowedSides.some(id => sides.some(s => s.id === id))
                    );
                    return hasIngredientsList || hasSidesConfigured;
                  })()) && (
                    <div className="border-t border-gray-200/30 pt-6 space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-black/60">Personalização da Marmita / Prato</h4>
                      
                      {/* Exclusions */}
                      {selectedProductForDetails.ingredients && (() => {
                        const ingredientsList = selectedProductForDetails.ingredients
                          .split(',')
                          .map(i => i.trim())
                          .filter(Boolean);
                        if (ingredientsList.length === 0) return null;
                        return (
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-black/60">{t.excludeIngredients}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ingredientsList.map((ingredient, idx) => {
                                const isSelected = mealSelections.removals.includes(ingredient);
                                return (
                                  <button 
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setMealSelections({
                                          ...mealSelections,
                                          removals: mealSelections.removals.filter(r => r !== ingredient)
                                        });
                                      } else {
                                        setMealSelections({
                                          ...mealSelections,
                                          removals: [...mealSelections.removals, ingredient]
                                        });
                                      }
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 rounded-full border-2 font-bold transition-all text-xs cursor-pointer",
                                      isSelected 
                                        ? "bg-red-500 border-red-500 text-white shadow-sm" 
                                        : "bg-white border-gray-200 text-black"
                                    )}
                                  >
                                    {ingredient}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Sides and Swaps */}
                      {selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.length > 0 && (
                        (() => {
                          const allowedSidesList = (selectedProductForDetails.allowedSides || [])
                            .map(id => sides.find(s => s.id === id))
                            .filter(Boolean) as Side[];
                          
                          const regularSides = allowedSidesList.filter(s => s.type !== 'swap');
                          const swapSides = allowedSidesList.filter(s => s.type === 'swap');

                          if (regularSides.length === 0 && swapSides.length === 0) return null;

                          const renderSideItem = (side: Side) => {
                            const qty = sideQuantities[side.id] || 0;
                            return (
                              <div 
                                key={side.id}
                                className={cn(
                                  "p-3 rounded-xl border border-gray-200 font-bold transition-all flex justify-between items-center bg-white text-xs text-black shadow-sm"
                                )}
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="font-bold text-black truncate">{side.name}</span>
                                  <span className="text-[10px] text-gray-500 font-extrabold mt-0.5">
                                    {side.price > 0 ? `+ ${currencySymbol}${side.price.toFixed(2)}` : 'Free / Grátis'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <button 
                                    type="button"
                                    onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: Math.max(0, (prev[side.id] || 0) - 1) }))}
                                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-black active:scale-95 transition-transform cursor-pointer border border-gray-200 focus:outline-none"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="w-4 text-center font-bold text-black">{qty}</span>
                                  <button 
                                    type="button"
                                    onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: (prev[side.id] || 0) + 1 }))}
                                    className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer focus:outline-none"
                                    style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-4">
                              {regularSides.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-black/60">{t.chooseSides}</p>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {regularSides.map(renderSideItem)}
                                  </div>
                                </div>
                              )}
                              {swapSides.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-amber-800">
                                    {settings.language === 'en' ? 'Swap Options' : 'Opções de Troca'}
                                  </p>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {swapSides.map(renderSideItem)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* Customizable Sandwich Options in Details Modal */}
                  {selectedProductForDetails.isCustomSandwich && (
                    <div className="border-t border-gray-200/30 pt-6 space-y-6">
                      <h4 className="text-sm font-bold text-gray-900 tracking-normal">
                        Opção de Estado da Marmita (Congelada / Natural / Fresca)
                      </h4>
                      
                      {/* Fillings Selection for Custom Sandwich */}
                      {selectedProductForDetails.customFillings && (() => {
                        const fillingsList = selectedProductForDetails.customFillings
                          .split(',')
                          .map(f => f.trim())
                          .filter(Boolean);
                        if (fillingsList.length === 0) return null;
                        return (
                          <div className="space-y-4">
                            <p className="text-xs font-bold text-black/60">
                              {settings.language === 'en' ? 'Select Quantities per Option' : 'Selecione as Quantidades por Opção'}
                            </p>
                            <div className="grid grid-cols-1 gap-2.5">
                              {fillingsList.map((fillingOpt, idx) => {
                                const qty = sandwichFillingQuantities[fillingOpt] || 0;
                                return (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-2xl border transition-all flex items-center justify-between font-bold text-xs bg-white/70 border-white/25 shadow-sm"
                                  >
                                    <span className="text-sm font-bold text-black">{fillingOpt}</span>
                                    
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={qty === 0}
                                        onClick={() => {
                                          setSandwichFillingQuantities(prev => ({
                                            ...prev,
                                            [fillingOpt]: Math.max(0, qty - 1)
                                          }));
                                        }}
                                        className={cn(
                                          "w-7 h-7 rounded-full bg-white flex items-center justify-center text-black border border-gray-200 shadow-xs cursor-pointer active:scale-95 transition-all text-xs font-bold",
                                          qty === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"
                                        )}
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="text-xs font-black min-w-[16px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const prodId = selectedProductForDetails?.id;
                                          const currentCartQty = prodId ? getProductCartQty(prodId) : 0;
                                          const currentModalTotal = (Object.values(sandwichFillingQuantities) as number[]).reduce((a, b) => a + b, 0);
                                          if (currentCartQty + currentModalTotal + 1 > MAX_PRODUCT_LIMIT) {
                                            toast.error(
                                              settings.language === 'en'
                                                ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${selectedProductForDetails?.title || 'product'}" reached!`
                                                : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${selectedProductForDetails?.title || 'produto'}" atingido!`
                                            );
                                            return;
                                          }
                                          setSandwichFillingQuantities(prev => ({
                                            ...prev,
                                            [fillingOpt]: qty + 1
                                          }));
                                        }}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-xs cursor-pointer active:scale-95 transition-all text-xs font-bold"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Sticky Action Block */}
              <div className="p-4 pb-6 md:p-6 bg-white/40 border-t border-white/20 flex flex-col gap-4">
                {!selectedProductForDetails.isCustomSandwich && (
                  <div id="details-modal-qty-container" className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-white/10">
                    <span id="details-modal-qty-label" className="text-xs font-bold text-black uppercase tracking-wider">
                      {settings.language === 'en' ? 'Quantity' : 'Quantidade'}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        id="details-modal-qty-dec-btn"
                        type="button"
                        onClick={() => setCustomItemQuantity(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all text-sm font-bold border border-gray-200"
                      >
                        <Minus size={14} />
                      </button>
                      <span id="details-modal-qty-value" className="text-sm font-black min-w-[20px] text-center text-black">{customItemQuantity}</span>
                      <button
                        id="details-modal-qty-inc-btn"
                        type="button"
                        onClick={() => {
                          const currentQty = selectedProductForDetails ? getProductCartQty(selectedProductForDetails.id) : 0;
                          if (currentQty + customItemQuantity + 1 > MAX_PRODUCT_LIMIT) {
                            toast.error(
                              settings.language === 'en'
                                ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${selectedProductForDetails?.title || 'product'}" reached!`
                                : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${selectedProductForDetails?.title || 'produto'}" atingido!`
                            );
                            return;
                          }
                          setCustomItemQuantity(prev => prev + 1);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all text-sm font-bold"
                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedProductForDetails(null)}
                    className="px-5 py-3 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-black font-serif font-bold text-xs cursor-pointer transition-all border-0 focus:outline-none"
                  >
                    Fechar
                  </button>
                  {(() => {
                    const hasSizesOpt = !!(selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0);
                    const hasExclusionsOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                    const hasSidesOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                    const isCustomCakeOpt = !!selectedProductForDetails.isCustomCake;
                    const isCustomSandwichOpt = !!selectedProductForDetails.isCustomSandwich;
                    const requiresCustomization = hasSizesOpt || hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt;

                    const isCakeIncomplete = selectedProductForDetails.isCustomCake && (
                      (cakeSizesList.length > 0 && !selectedCakeSize) ||
                      (cakeDoughsList.length > 0 && !selectedDough) ||
                      (cakeFillingsList.length > 0 && selectedFillings.length === 0) ||
                      (cakeToppingsList.length > 0 && !selectedTopping) ||
                      (cakeToppersList.length > 0 && !selectedTopper)
                    );

                    const isSandwichIncomplete = selectedProductForDetails.isCustomSandwich && (
                      (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0) === 0
                    );

                    const basePrice = (selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 && selectedSize) 
                      ? selectedSize.price 
                      : (selectedProductForDetails.price > 0 ? selectedProductForDetails.price : (selectedProductForDetails.oldPrice || 0));
                    
                    const sidesPrice = Object.entries(sideQuantities).reduce((sum, [id, qty]) => {
                      const side = sides.find(s => s.id === id);
                      return sum + (side ? side.price * (qty as number) : 0);
                    }, 0);

                    const totalPrice = basePrice + sidesPrice;

                    const getButtonLabel = () => {
                      if (isCustomCakeOpt && isCakeIncomplete) {
                        return 'Complete as opções primeiro';
                      }
                      if (selectedProductForDetails.isCustomSandwich && isSandwichIncomplete) {
                        return 'Selecione a opção primeiro';
                      }
                      return 'Adicionar ao Pedido';
                    };

                    const isDisabled = !!isCakeIncomplete || !!isSandwichIncomplete;

                    const totalQty = selectedProductForDetails.isCustomSandwich
                      ? (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0)
                      : customItemQuantity;

                    return (
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (requiresCustomization) {
                            addDetailedProductToCart(selectedProductForDetails);
                          } else {
                            addToCart(selectedProductForDetails, customItemQuantity);
                            setSelectedProductForDetails(null);
                            toast.success(settings.language === 'en' ? 'Successfully added to request list!' : 'Adicionado com sucesso ao pedido!');
                          }
                        }}
                        className={cn(
                          "flex-grow py-3 px-5 rounded-xl font-serif font-bold text-xs shadow-md transition-all text-center border-0 focus:outline-none cursor-pointer flex justify-center items-center gap-1.5",
                          isDisabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-95"
                        )}
                        style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                      >
                        <span>{getButtonLabel()}</span>
                        {totalPrice > 0 && (
                          <span className="opacity-80 font-normal">
                            ({currencySymbol}{(totalPrice * totalQty).toFixed(2)})
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomModalOpen && selectedProductForCustom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white/30">
                <h2 className="text-2xl font-serif font-bold text-black" style={{ color: '#000000' }}>
                  {selectedProductForCustom.isCustomSandwich ? selectedProductForCustom.title : t.customCakeTitle}
                </h2>
                <button 
                  onClick={() => setIsCustomModalOpen(false)} 
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                {selectedProductForCustom.isCustomSandwich ? (
                  <>
                    {/* Sizes Selection for Custom Sandwich */}
                    {selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                          {settings.language === 'en' ? 'Select Option' : 'Selecione a Opção de Estado'}
                        </h3>
                        <div className="grid grid-cols-1 gap-2.5">
                          {selectedProductForCustom.sizes.map((s) => {
                            const isSelected = selectedSize?.id === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSize(s);
                                  setSelectedSandwichFillings([]);
                                }}
                                className={cn(
                                  "p-4 rounded-2xl border-2 transition-all flex justify-between items-center w-full text-left font-bold",
                                  isSelected 
                                    ? "shadow-md scale-[1.01]" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{s.name}</span>
                                  {s.price && s.price > 0 && (
                                    <span className="text-xs opacity-80 font-semibold mt-0.5">
                                      {currencySymbol}{s.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: getContrastText(settings.primaryColor || '#865d39'), color: settings.primaryColor || '#865d39' }}>
                                    <Check size={12} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fillings Selection for Custom Sandwich */}
                    {selectedProductForCustom.customFillings && (() => {
                      const fillingsList = selectedProductForCustom.customFillings
                        .split(',')
                        .map(f => f.trim())
                        .filter(Boolean);
                      if (fillingsList.length === 0) return null;
                      return (
                        <div className="space-y-4 pt-4 border-t border-gray-200/30">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                            {settings.language === 'en' ? 'Select Quantities per Option' : 'Selecione as Quantidades por Opção'}
                          </h3>
                          <div className="grid grid-cols-1 gap-2.5">
                            {fillingsList.map((fillingOpt, idx) => {
                              const qty = sandwichFillingQuantities[fillingOpt] || 0;
                              return (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-2xl border transition-all flex items-center justify-between font-bold text-sm bg-white/70 border-white/25 shadow-sm"
                                >
                                  <span className="text-sm font-bold text-black">{fillingOpt}</span>
                                  
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      disabled={qty === 0}
                                      onClick={() => {
                                        setSandwichFillingQuantities(prev => ({
                                          ...prev,
                                          [fillingOpt]: Math.max(0, qty - 1)
                                        }));
                                      }}
                                      className={cn(
                                        "w-8 h-8 rounded-full bg-white flex items-center justify-center text-black border border-gray-200 shadow-sm cursor-pointer active:scale-95 transition-all text-sm font-bold",
                                        qty === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"
                                      )}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const prodId = selectedProductForCustom?.id;
                                        const currentCartQty = prodId ? getProductCartQty(prodId) : 0;
                                        const currentModalTotal = (Object.values(sandwichFillingQuantities) as number[]).reduce((a, b) => a + b, 0);
                                        if (currentCartQty + currentModalTotal + 1 > MAX_PRODUCT_LIMIT) {
                                          toast.error(
                                            settings.language === 'en'
                                              ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${selectedProductForCustom?.title || 'product'}" reached!`
                                              : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${selectedProductForCustom?.title || 'produto'}" atingido!`
                                          );
                                          return;
                                        }
                                        setSandwichFillingQuantities(prev => ({
                                          ...prev,
                                          [fillingOpt]: qty + 1
                                        }));
                                      }}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all text-sm font-bold"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : selectedProductForCustom.isCustomCake ? (
                  <>
                    {/* Size Selection */}
                    {cakeSizesList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Size / Slices / Weight</h3>
                        <div className="grid grid-cols-1 gap-2.5">
                          {cakeSizesList.map((sizeOpt, idx) => {
                            const isSelected = selectedCakeSize === sizeOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedCakeSize(sizeOpt)}
                                className={cn(
                                  "p-4 rounded-2xl border-2 transition-all flex justify-between items-center w-full text-left font-bold",
                                  isSelected 
                                    ? "shadow-md scale-[1.01]" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span className="font-bold text-sm">
                                  {sizeOpt}
                                </span>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: getContrastText(settings.primaryColor || '#865d39'), color: settings.primaryColor || '#865d39' }}>
                                    <Check size={12} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Dough Selection */}
                    {cakeDoughsList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Dough Selection</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {cakeDoughsList.map((doughOpt, idx) => {
                            const isSelected = selectedDough === doughOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedDough(doughOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all text-center text-sm font-bold w-full",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {doughOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fillings Selection */}
                    {cakeFillingsList.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Filling Options</h3>
                          <span className="text-xs text-gray-500 font-bold">Choose up to {settings.cakeFillingsMax || 2}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cakeFillingsList.map((fillingOpt, idx) => {
                            const isSelected = selectedFillings.includes(fillingOpt);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedFillings(selectedFillings.filter(f => f !== fillingOpt));
                                  } else {
                                    const maxFillings = settings.cakeFillingsMax || 2;
                                    if (selectedFillings.length >= maxFillings) {
                                      toast.error(`You can choose a maximum of ${maxFillings} fillings!`);
                                      return;
                                    }
                                    setSelectedFillings([...selectedFillings, fillingOpt]);
                                  }
                                }}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all flex items-center justify-between font-bold text-sm",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span>{fillingOpt}</span>
                                <div className={cn(
                                  "w-4 h-4 rounded-md border flex items-center justify-center",
                                  isSelected ? "border-transparent" : "border-gray-300 bg-white"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? getContrastText(settings.primaryColor || '#865d39') : 'transparent',
                                  color: isSelected ? (settings.primaryColor || '#865d39') : 'transparent'
                                }}
                                >
                                  {isSelected && <Check size={10} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Toppings Selection */}
                    {cakeToppingsList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Topping Selection</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {cakeToppingsList.map((toppingOpt, idx) => {
                            const isSelected = selectedTopping === toppingOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTopping(toppingOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all text-center text-sm font-bold w-full",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {toppingOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Topper Selection */}
                    {cakeToppersList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Cake Topper</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {cakeToppersList.map((topperOpt, idx) => {
                            const isSelected = selectedTopper === topperOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTopper(topperOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all text-center text-sm font-bold w-full",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {topperOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Gallery Style Selection */}
                    {selectedProductForCustom.cakeGalleryId && (
                      (() => {
                        const associatedGallery = galleries.find(g => g.id === selectedProductForCustom.cakeGalleryId);
                        const validImages = associatedGallery?.images?.filter(img => img && img.trim() !== '') || [];
                        if (validImages.length === 0) return null;
                        
                        const noStyleText = settings.language === 'en' 
                          ? (selectedStyleNumber === null ? 'Selected: Standard Cake Base (No Reference)' : 'Choose: Standard Cake Base (No Reference)')
                          : (selectedStyleNumber === null ? 'Selecionado: Base Tradicional (Sem Referência)' : 'Selecionar: Base Tradicional (Sem Referência)');

                        return (
                          <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Cake Style / Visual Reference</h3>
                            <p className="text-[11px] font-semibold text-gray-500 -mt-1 leading-normal">
                              Select one of the photos below as a model or visual reference for your customized cake. The corresponding photo number will be included with your order!
                            </p>

                            {/* Separate "No Style Reference" Button styled like Add to Cart */}
                            <div className="w-full">
                              <button
                                type="button"
                                onClick={() => setSelectedStyleNumber(null)}
                                className={cn(
                                  "w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-[0.99] flex items-center justify-center gap-2 border-2 cursor-pointer uppercase tracking-wider",
                                  selectedStyleNumber === null
                                    ? "shadow-md text-white border-transparent"
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{
                                  backgroundColor: selectedStyleNumber === null ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: selectedStyleNumber === null ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {selectedStyleNumber === null ? <Check size={16} /> : <X size={15} />}
                                <span>{noStyleText}</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                              {associatedGallery?.images?.map((img, idx) => {
                                if (!img || img.trim() === '') return null;
                                const isSelected = selectedStyleNumber === (idx + 1);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedStyleNumber(idx + 1)}
                                    className={cn(
                                      "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-white group p-0 text-left cursor-pointer shadow-sm hover:shadow",
                                      isSelected
                                        ? "scale-[1.01]"
                                        : "border-gray-200/50 hover:border-gray-300"
                                    )}
                                    style={{ borderColor: isSelected ? (settings.primaryColor || '#865d39') : 'transparent' }}
                                  >
                                    <img
                                      src={img}
                                      alt={`Style ${idx + 1}`}
                                      className="w-full h-full object-cover select-none"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Number Badge */}
                                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full z-10">
                                      Photo {idx + 1}
                                    </div>
                                    
                                    {/* Select Highlight Overlay */}
                                    <div className={cn(
                                      "absolute inset-0 transition-opacity flex items-center justify-center p-2 text-center",
                                      isSelected 
                                        ? "bg-black/35 opacity-100" 
                                        : "bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100"
                                    )}>
                                      {isSelected ? (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}>
                                          <Check size={18} />
                                        </div>
                                      ) : (
                                        <span className="text-[9px] font-bold text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-full">Select</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </>
                ) : (
                  <>
                    {/* Size Selection */}
                    {selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                          {settings.language === 'en' ? 'Select Size / Portion' : 'Selecione o Tamanho / Porção'}
                        </h3>
                        <div className="space-y-2">
                          {selectedProductForCustom.sizes.map((s) => {
                            const cartItem = cart.find(item => item.productId === selectedProductForCustom.id && item.selectedSize?.id === s.id && !item.mealOptions);
                            const qty = cartItem ? cartItem.quantity : 0;
                            return (
                              <div
                                key={s.id}
                                className="flex justify-between items-center p-3.5 bg-white border border-gray-200 rounded-2xl font-bold text-black text-xs shadow-sm"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-black">{s.name}</span>
                                  {s.price && s.price > 0 && (
                                    <span className="text-xs text-gray-500 font-extrabold mt-0.5">
                                      {currencySymbol}{s.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {qty > 0 ? (
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => decrementSizeQty(selectedProductForCustom, s)}
                                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => incrementSizeQty(selectedProductForCustom, s)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => incrementSizeQty(selectedProductForCustom, s)}
                                      className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                    >
                                      <Plus size={12} />
                                      <span>{settings.language === 'en' ? 'Add' : 'Adicionar'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ingredient Exclusions */}
                    {selectedProductForCustom.isMeal && selectedProductForCustom.ingredients && (() => {
                      const ingredientsList = selectedProductForCustom.ingredients
                        .split(',')
                        .map(i => i.trim())
                        .filter(Boolean);
                      if (ingredientsList.length === 0) return null;
                      return (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#000000' }}>{t.excludeIngredients}</h3>
                          <div className="flex flex-wrap gap-2">
                            {ingredientsList.map((ingredient, idx) => {
                              const isSelected = mealSelections.removals.includes(ingredient);
                              return (
                                <button 
                                  key={idx}
                                  onClick={() => {
                                    if (isSelected) {
                                      setMealSelections({
                                        ...mealSelections,
                                        removals: mealSelections.removals.filter(r => r !== ingredient)
                                      });
                                    } else {
                                      setMealSelections({
                                        ...mealSelections,
                                        removals: [...mealSelections.removals, ingredient]
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "px-4 py-2 rounded-full border-2 font-bold transition-all text-sm",
                                    isSelected 
                                      ? "bg-red-500 border-red-500 text-white shadow-md" 
                                      : "bg-white/50 border-transparent text-black"
                                  )}
                                >
                                  {ingredient}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sides & Swaps Selection */}
                    {selectedProductForCustom.isMeal && selectedProductForCustom.allowedSides && selectedProductForCustom.allowedSides.length > 0 && (
                      (() => {
                        const allowedSidesList = (selectedProductForCustom.allowedSides || [])
                          .map(id => sides.find(s => s.id === id))
                          .filter(Boolean) as Side[];
                        
                        const regularSides = allowedSidesList.filter(s => s.type !== 'swap');
                        const swapSides = allowedSidesList.filter(s => s.type === 'swap');

                        if (regularSides.length === 0 && swapSides.length === 0) return null;

                        const renderSideItem = (side: Side) => {
                          const qty = sideQuantities[side.id] || 0;
                          return (
                            <div 
                              key={side.id}
                              className={cn(
                                "p-4 rounded-xl border-2 font-bold transition-all flex flex-col gap-3",
                                qty > 0 
                                  ? "bg-white border-blue-500 shadow-md" 
                                  : "bg-white/50 border-transparent text-black"
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <span className={qty > 0 ? "text-blue-600" : "text-black"}>{side.name}</span>
                                <span className="text-xs opacity-60 text-black">
                                  {side.price > 0 ? `+ ${currencySymbol}${(side.price * (qty > 0 ? qty : 1)).toFixed(2)}` : 'Free'}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-4">
                                <button 
                                  onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: Math.max(0, (prev[side.id] || 0) - 1) }))}
                                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black active:scale-95 transition-transform cursor-pointer"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="w-4 text-center text-black">{qty}</span>
                                <button 
                                  onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: (prev[side.id] || 0) + 1 }))}
                                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                  style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="space-y-6">
                            {regularSides.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-black">{t.chooseSides}</h3>
                                <div className="grid grid-cols-1 gap-2">
                                  {regularSides.map(renderSideItem)}
                                </div>
                              </div>
                            )}
                            {swapSides.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800">
                                  {settings.language === 'en' ? 'Swap Options' : 'Opções de Troca'}
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                  {swapSides.map(renderSideItem)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </>
                )}
              </div>

              <div className="p-6 pb-8 sm:pb-6 bg-white/30 border-t border-gray-200">
                {selectedProductForCustom && !selectedProductForCustom.isCustomSandwich && (
                  <div id="custom-modal-qty-container" className="flex items-center justify-between mb-4 bg-white/50 p-3.5 rounded-2xl border border-gray-200/50">
                    <span id="custom-modal-qty-label" className="text-sm font-bold text-black uppercase tracking-wider">
                      {settings.language === 'en' ? 'Quantity' : 'Quantidade'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        id="custom-modal-qty-dec-btn"
                        type="button"
                        onClick={() => setCustomItemQuantity(prev => Math.max(1, prev - 1))}
                        className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black border border-gray-200 shadow-sm cursor-pointer active:scale-95 transition-all text-lg font-bold"
                      >
                        <Minus size={16} />
                      </button>
                      <span id="custom-modal-qty-value" className="text-base font-black min-w-[28px] text-center text-black">{customItemQuantity}</span>
                      <button
                        id="custom-modal-qty-inc-btn"
                        type="button"
                        onClick={() => {
                          const currentQty = selectedProductForCustom ? getProductCartQty(selectedProductForCustom.id) : 0;
                          if (currentQty + customItemQuantity + 1 > MAX_PRODUCT_LIMIT) {
                            toast.error(
                              settings.language === 'en'
                                ? `Maximum limit of ${MAX_PRODUCT_LIMIT} units of "${selectedProductForCustom?.title || 'product'}" reached!`
                                : `Limite máximo de ${MAX_PRODUCT_LIMIT} unidades de "${selectedProductForCustom?.title || 'produto'}" atingido!`
                            );
                            return;
                          }
                          setCustomItemQuantity(prev => prev + 1);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all text-lg font-bold"
                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {(() => {
                  const isCakeIncomplete = selectedProductForCustom?.isCustomCake && (
                    (cakeSizesList.length > 0 && !selectedCakeSize) ||
                    (cakeDoughsList.length > 0 && !selectedDough) ||
                    (cakeFillingsList.length > 0 && selectedFillings.length === 0) ||
                    (cakeToppingsList.length > 0 && !selectedTopping) ||
                    (cakeToppersList.length > 0 && !selectedTopper)
                  );
                  const isSandwichIncomplete = selectedProductForCustom?.isCustomSandwich && (
                    (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0) === 0
                  );
                  const isIncomplete = !!isCakeIncomplete || !!isSandwichIncomplete;

                  const totalQty = selectedProductForCustom?.isCustomSandwich
                    ? (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0)
                    : customItemQuantity;

                  return (
                    <button 
                      onClick={addMealToCart}
                      disabled={isIncomplete}
                      className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${isIncomplete ? 'opacity-50 cursor-not-allowed active:scale-100' : 'active:scale-95 cursor-pointer hover:brightness-110'}`}
                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                    >
                      {isIncomplete ? (
                        <span>{isSandwichIncomplete ? (settings.language === 'en' ? 'Select an option first' : 'Selecione a opção de estado da marmita') : (settings.language === 'en' ? 'Complete custom items first' : 'Selecione todos os itens primeiro')}</span>
                      ) : (
                        <>
                          <span>{t.addToCart}</span>
                          <span className="text-sm opacity-80 font-normal">
                            ({currencySymbol} {(
                              ((selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && selectedSize ? selectedSize.price : (selectedProductForCustom.price > 0 ? selectedProductForCustom.price : (selectedProductForCustom.oldPrice || 0))) + 
                              Object.entries(sideQuantities).reduce((sum, [id, qty]) => {
                                const side = sides.find(s => s.id === id);
                                return sum + (side ? side.price * (qty as number) : 0);
                              }, 0)) * totalQty
                            ).toFixed(2)})
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderDietsModal()}
    </div>
  );

  function renderDietsModal() {
    return null;
  }
  function unused_old_modal() {
    return (
      <AnimatePresence>
        {isDietsModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDietsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings text-black"
            >
              <div className="p-6 border-b border-gray-200/50 flex items-center justify-between bg-white/40 font-serif">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2" style={{ color: settings.primaryColor || '#000000' }}>
                  <Building2 size={24} />
                  {'CORPORATE & WHOLESALE'}
                </h2>
                <button 
                  onClick={() => setIsDietsModalOpen(false)} 
                  className="p-2 hover:bg-white/50 rounded-full transition-all text-black cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-white/50 p-4 rounded-2xl border border-white/40 space-y-2">
                  <p className="text-[11px] font-semibold leading-relaxed text-black/80">
                    💡 This is our dedicated wholesale scheduling and quote portal. Realize wholesale orders directly without retail premiums! Conditions automatically scale by volume.
                  </p>
                  
                  {isReturningB2b && (
                    <div className="flex items-center justify-between bg-[#865d39]/10 p-2.5 rounded-xl border border-[#865d39]/20 text-xs mt-1.5">
                      <span className="font-bold text-[#865d39]">✓ Returning Partner Profile Active</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          localStorage.removeItem('b2b_profile_save');
                          setB2bName('');
                          setB2bResponsibleName('');
                          setB2bPhone('');
                          setB2bAddress('');
                          setIsReturningB2b(false);
                          toast.info('Profile fields cleared.');
                        }}
                        className="text-[10px] font-extrabold text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200 hover:bg-red-50"
                      >
                        Reset Profile
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Business Name (Nome Fantasia) with autocomplete dropdown */}
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Building2 size={12} /> Nome Fantasia / Empresa *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: Minha Empresa LLC ou Restaurante"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bName}
                      onChange={e => {
                        const val = e.target.value;
                        setB2bName(val);
                        if (val.trim().length >= 2) {
                          const matched = b2bProfiles.filter(p => 
                            (p.name || '').toLowerCase().includes(val.toLowerCase()) || 
                            (p.phone || '').toLowerCase().includes(val.toLowerCase())
                          );
                          setB2bSearchResults(matched);
                          setShowB2bSearchDropdown(matched.length > 0);
                        } else {
                          setShowB2bSearchDropdown(false);
                        }
                      }}
                    />
                    
                    {showB2bSearchDropdown && b2bSearchResults.length > 0 && (
                      <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-gray-100 p-1">
                        <div className="text-[9px] font-bold text-gray-400 uppercase p-1.5 tracking-wider bg-gray-50/50">
                          Perfis Salvos (Clique para preencher):
                        </div>
                        {b2bSearchResults.map((profile, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full p-2.5 text-left text-xs text-black hover:bg-gray-100 flex flex-col gap-0.5 rounded-lg active:scale-95 transition-all text-black font-medium"
                            onClick={() => {
                              setB2bName(profile.name || '');
                              setB2bResponsibleName(profile.manager || '');
                              setB2bPhone(profile.phone || '');
                              setB2bAddress(profile.address || '');
                              setIsReturningB2b(true);
                              setShowB2bSearchDropdown(false);
                              toast.success(`Perfil de ${profile.name} preenchido!`);
                            }}
                          >
                            <span className="font-bold text-black">{profile.name}</span>
                            <span className="text-[10px] text-gray-500 font-normal">Contato: {profile.manager} • Tel: {profile.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Responsible Person Manager Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <User size={12} /> Responsável pelo Pedido / Contato *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: João da Silva"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bResponsibleName}
                      onChange={e => setB2bResponsibleName(e.target.value)}
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Phone size={12} /> Telefone de Contato *
                    </label>
                    <input 
                      type="tel" 
                      placeholder="(555) 000-0000"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bPhone}
                      onChange={e => setB2bPhone(e.target.value)}
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <MapPin size={12} /> Endereço Completo de Entrega Comercial *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: 7500 Universal Blvd, Orlando, FL"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bAddress}
                      onChange={e => setB2bAddress(e.target.value)}
                    />
                  </div>

                  {/* Delivery Schedule Frequency */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black block mb-1">
                      🚚 Frequência / Plano de Entrega *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button" 
                        onClick={() => setB2bFrequency('one-time')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${b2bFrequency === 'one-time' ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-300 text-black hover:border-black'}`}
                      >
                        <span>Entrega Única</span>
                        <span className="text-[9px] opacity-75 font-normal">Pedido Avulso</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setB2bFrequency('weekly')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${b2bFrequency === 'weekly' ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-300 text-black hover:border-black'}`}
                      >
                        <span className={b2bFrequency === 'weekly' ? "text-yellow-300" : "text-amber-600"}>★ Plano Semanal</span>
                        <span className="text-[9px] opacity-75 font-normal">Entregas Recorrentes</span>
                      </button>
                    </div>
                  </div>

                  {/* Delivery Calendar (Data de entrega) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#865d39]" /> 
                      Scheduled Delivery Date (Calendar) *
                    </label>
                    <input 
                      type="date" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-extrabold text-black active:border-black select-all"
                      style={{ color: '#000000' }}
                      value={b2bDate}
                      onChange={e => setB2bDate(e.target.value)}
                    />
                  </div>

                  {/* Quantity section */}
                  <div className="pt-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#865d39] block mb-3 border-b border-[#865d39]/20 pb-1">
                      📦 FROZEN CHEESE BREAD PACKAGES VOLUME (1KG / 2.2LBS PACKAGES)
                    </label>
                    
                    <div className="space-y-3">
                      {/* Item 1 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Cocktail Size Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • bite-sized, ideal for cafes & catering</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqCoquetel(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqCoquetel}</span>
                          <button 
                            type="button"
                            onClick={() => setPqCoquetel(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Medium Size Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • traditional classic café snack sizing</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqMedio(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqMedio}</span>
                          <button 
                            type="button"
                            onClick={() => setPqMedio(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Large Premium Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • gourmet display-counter large size</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqPremium(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqPremium}</span>
                          <button 
                            type="button"
                            onClick={() => setPqPremium(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observation box */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black">Custom Notes / Route Details</label>
                    <textarea 
                      placeholder="Enter details on delivery access, loading dock, recurring schedulings or special B2B requests"
                      rows={2.5}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold resize-none"
                      value={b2bObservation}
                      onChange={e => setB2bObservation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submission Options (Whats Only) */}
                <div className="pt-4 border-t border-gray-200/50 space-y-3">
                  <div className="text-[10px] font-extrabold text-center text-gray-500 uppercase tracking-widest">
                    Enviar Solicitação / Cotação:
                  </div>
                  
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => {
                        // Submit via WhatsApp
                        if (!b2bName.trim() || !b2bResponsibleName.trim() || !b2bPhone.trim() || !b2bAddress.trim() || !b2bDate) {
                           toast.error('Por favor, preencha todos os campos obrigatórios (*).');
                           return;
                        }
                        if (pqCoquetel === 0 && pqMedio === 0 && pqPremium === 0) {
                           toast.error('Selecione a quantidade de pelo menos um pacote.');
                           return;
                        }
                        
                        // Construct state map and trigger submitting method
                        const formattedDateForDb = (() => {
                          const [year, month, day] = b2bDate.split('-');
                          return `${month}/${day}/${year}`;
                        })();

                        const orderItems = [];
                        if (pqCoquetel > 0) orderItems.push({ title: 'Pão de Queijo Coquetel Congelado (Pct 1kg)', quantity: pqCoquetel, price: 0, priceType: 'consult' as const });
                        if (pqMedio > 0) orderItems.push({ title: 'Pão de Queijo Médio Congelado (Pct 1kg)', quantity: pqMedio, price: 0, priceType: 'consult' as const });
                        if (pqPremium > 0) orderItems.push({ title: 'Pão de Queijo Grande Premium Congelado (Pct 1kg)', quantity: pqPremium, price: 0, priceType: 'consult' as const });

                        const b2bOrderDataObj = {
                          customerName: b2bName,
                          phone: b2bPhone,
                          address: b2bAddress,
                          pickupDate: formattedDateForDb,
                          birthday: '',
                          observation: b2bObservation,
                          email: '',
                          items: orderItems,
                          total: 0,
                          createdAt: serverTimestamp(),
                          orderLanguage: 'pt',
                          isB2B: true,
                          isPJ: true,
                          b2bManagerName: b2bResponsibleName,
                          b2bFrequency: b2bFrequency,
                          b2bCompanyName: b2bName,
                          b2bAddress: b2bAddress
                        };

                        try {
                          addDoc(collection(db, 'pedidos'), b2bOrderDataObj);
                          localStorage.setItem('b2b_profile_save', JSON.stringify({
                            name: b2bName,
                            manager: b2bResponsibleName,
                            phone: b2bPhone,
                            address: b2bAddress
                          }));
                          setIsReturningB2b(true);

                          // Build message
                          let msg = `*PEDIDO CORPORATIVO E COTAÇÃO*\n`;
                          msg += `----------------------------------------\n`;
                          msg += `*Empresa:* ${b2bName}\n`;
                          msg += `*Responsável:* ${b2bResponsibleName}\n`;
                          msg += `*Telefone:* ${b2bPhone}\n`;
                          msg += `*Endereço:* ${b2bAddress}\n`;
                          msg += `*Frequência:* ${b2bFrequency === 'weekly' ? 'Plano Semanal (Recorrente)' : 'Pedido Único (Avulso)'}\n`;
                          msg += `*Data Prevista de Entrega:* ${formattedDateForDb}\n\n`;
                          msg += `*Itens solicitados:*\n`;
                          if (pqCoquetel > 0) msg += `- Pão de Queijo Coquetel: ${pqCoquetel} pacote(s) (1kg)\n`;
                          if (pqMedio > 0) msg += `- Pão de Queijo Médio: ${pqMedio} pacote(s) (1kg)\n`;
                          if (pqPremium > 0) msg += `- Pão de Queijo Grande Premium: ${pqPremium} pacote(s) (1kg)\n`;
                          if (b2bObservation) msg += `\n*Observações/Instruções:* ${b2bObservation}\n`;
                          msg += `----------------------------------------\n`;
                          msg += `Olá! Gostaríamos de solicitar os valores e agendamento de entrega corporativa. Obrigado!`;

                          const num = (settings.whatsappNumber || '').replace(/\D/g, '');
                          const sendUrl = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
                          
                          toast.success('Cotação corporativa registrada! Redirecionando para o WhatsApp...');
                          setIsDietsModalOpen(false);

                          try {
                            const win = window.open(sendUrl, '_blank');
                            if (!win || win.closed || typeof win.closed === 'undefined') {
                              window.location.href = sendUrl;
                            }
                          } catch (e) {
                            window.location.href = sendUrl;
                          }
                        } catch (err) {
                          console.error(err);
                          toast.error('Erro ao registrar pedido.');
                        }
                      }}
                      className="w-full py-4 px-4 rounded-xl font-bold text-sm tracking-wider uppercase text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md border-0"
                    >
                      <MessageCircle size={18} /> Enviar por WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
}
