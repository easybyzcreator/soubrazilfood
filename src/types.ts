export interface Category {
  id: string;
  title: string;
  order: number;
  catalog?: 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4' | 'both' | 'all' | 'catalog_b2b' | 'b2b';
}

export type PriceType = 'fixed' | 'starting' | 'consult';

export interface Side {
  id: string;
  name: string;
  price: number;
  type?: 'side' | 'swap';
}

export interface ProductSize {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  priceType?: PriceType;
  image: string; // Base64
  categoryId?: string;
  categoryTitle?: string;
  catalog?: 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4' | 'both' | 'all' | 'catalog_b2b' | 'b2b' | string;
  isMeal?: boolean;
  isCustomCake?: boolean;
  ingredients?: string; // Comma separated
  allowedSides?: string[]; // IDs of sides
  isActive?: boolean;
  hasSizes?: boolean;
  sizes?: ProductSize[];
  cakeGalleryId?: string; // Associated image gallery
  isCustomSandwich?: boolean; // Custom sandwich or tapioca with multiple fillings
  customFillings?: string; // Comma separated list of fillings
  order?: number; // Position order in menu
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  mealOptions?: {
    removals: string[];
    sides: Side[];
  } | null;
  selectedSize?: ProductSize | null;
  cakeOptions?: {
    size?: string;
    dough?: string;
    fillings?: string[];
    topping?: string;
    topper?: string;
    styleNumber?: number; // Selected image style number from gallery
  } | null;
  sandwichOptions?: {
    fillings: string[];
  } | null;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  street?: string;
  number?: string;
  apt?: string;
  state?: string;
  zipCode?: string;
  city?: string;
  pickupDate?: string;
  birthday: string;
  observation: string;
  email: string;
  items: {
    title: string;
    quantity: number;
    price: number;
    priceType?: PriceType;
    mealOptions?: {
      removals: string[];
      sides: Side[];
    } | null;
    selectedSize?: ProductSize | null;
    cakeOptions?: {
      size?: string;
      dough?: string;
      fillings?: string[];
      topping?: string;
      topper?: string;
      styleNumber?: number; // Selected style image number from gallery
    } | null;
    sandwichOptions?: {
      fillings: string[];
    } | null;
    notes?: string;
  }[];
  total: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  createdAt: any;
  orderLanguage?: string;
  status?: 'pending' | 'delivered' | 'to_deliver' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'cancelled' | string;
  orderType?: 'delivery' | 'pickup';
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'half' | string;
  isValidatedForProduction?: boolean;
  deliveryFee?: number;
  discount?: number;
  orderNumber?: string | number;
  isB2B?: boolean;
  isPJ?: boolean;
  b2bCompanyName?: string;
  b2bAddress?: string;
  b2bManagerName?: string;
  b2bZipCode?: string;
  b2bCity?: string;
  b2bFrequency?: string;
  catalog?: string;
  catalogTitle?: string;
}

export interface ImageGallery {
  id: string;
  title: string;
  name?: string;
  images: string[]; // maximum 6 base64 images
}

export interface Settings {
  logo: string;
  primaryColor: string;
  detailsColor?: string; // Cor de "Ver Detalhes" e Preço
  whatsappNumber: string;
  whatsappCountryCode?: string;
  slug: string;
  brandName: string;
  adminPassword?: string;
  slogan?: string;
  whatsappClosingMessage?: string;
  backgroundImage?: string;
  glassColor?: string;
  textColor?: string;
  language?: 'pt' | 'en';
  currency?: 'BRL' | 'USD';
  checkoutTitle?: string;
  infoBlock1Title?: string;
  infoBlock1Text?: string;
  infoBlock2Title?: string;
  infoBlock2Text?: string;
  // Intro screen settings
  introEnabled?: boolean;
  introTitle?: string;
  introSubtitle?: string;
  introDescription?: string;
  introButtonText?: string;
  introBottomText?: string;
  // Catalog selector settings
  selectorEnabled?: boolean;
  selectorTitle?: string;
  selectorSubtitle?: string;
  pickupAddress?: string;
  catalog1Title?: string;
  catalog1Image?: string;
  catalog1Desc?: string;
  catalog1Slogan?: string;
  catalog1Active?: boolean;
  catalog1MinItems?: number;
  catalog2Title?: string;
  catalog2Image?: string;
  catalog2Desc?: string;
  catalog2Slogan?: string;
  catalog2Active?: boolean;
  catalog2MinItems?: number;
  catalog3Title?: string;
  catalog3Image?: string;
  catalog3Desc?: string;
  catalog3Slogan?: string;
  catalog3Active?: boolean;
  catalog3MinItems?: number;
  catalog4Title?: string;
  catalog4Image?: string;
  catalog4Desc?: string;
  catalog4Slogan?: string;
  catalog4Active?: boolean;
  catalog4MinItems?: number;
  // Custom Cake settings
  cakeSizes?: string[];
  cakeDoughs?: string[];
  cakeFillings?: string[];
  cakeFillingsMax?: number;
  cakeToppings?: string[];
  cakeToppers?: string[];
  // Impressora Térmica POS
  printerFormat?: 'rongta80' | 'thermal58' | 'a4';
  printerModel?: string;
  printerAutoCut?: boolean;
  // Delivery Zones / Bairros e Taxas de Entrega
  deliveryZones?: DeliveryZone[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}
