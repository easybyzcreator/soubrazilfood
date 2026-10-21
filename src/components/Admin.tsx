import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, 
  query, orderBy 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Product, Order, Settings, Category, Side, ImageGallery, DeliveryZone } from '../types';
import { 
  Settings as SettingsIcon, Package, History, LogOut, Plus, Trash2, Edit2, 
  Save, X, Copy, CheckCircle2, Loader2, Layers, Image as ImageIcon,
  ArrowUp, ArrowDown, MessageCircle, MessageSquare, Calendar, Printer, Cake, Eye, EyeOff,
  DollarSign, Coins, ChevronDown, ChevronUp, Users, Download, Truck, Search,
  Clock, MapPin, ExternalLink, Check, AlertCircle, CalendarDays, ChevronLeft, ChevronRight,
  ShoppingBag, CreditCard, Send, FileText, Ban, PhoneCall, RefreshCw,
  LayoutList, LayoutGrid, Kanban, User, Mail, ArrowUpDown, ChevronsUp, ChevronsDown,
  ListOrdered, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const getContrastText = (hexColor?: string): string => {
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

const getColorWithLegibility = (hexColor?: string, defaultColor: string = '#865d39'): string => {
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: string; nextStatus?: string; nextLabel?: string }> = {
  pending: {
    label: 'A Entregar',
    bg: 'bg-[#fff4d2]',
    text: 'text-[#92400e]',
    border: 'border-[#f59e0b]',
    icon: '⏳',
    nextStatus: 'delivered',
    nextLabel: 'Marcar Entregue'
  },
  to_deliver: {
    label: 'A Entregar',
    bg: 'bg-[#fff4d2]',
    text: 'text-[#92400e]',
    border: 'border-[#f59e0b]',
    icon: '⏳',
    nextStatus: 'delivered',
    nextLabel: 'Marcar Entregue'
  },
  delivered: {
    label: 'Entregue',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    icon: '✓',
    nextStatus: undefined,
    nextLabel: undefined
  },
  confirmed: {
    label: 'A Entregar',
    bg: 'bg-[#fff4d2]',
    text: 'text-[#92400e]',
    border: 'border-[#f59e0b]',
    icon: '⏳'
  },
  preparing: {
    label: 'A Entregar',
    bg: 'bg-[#fff4d2]',
    text: 'text-[#92400e]',
    border: 'border-[#f59e0b]',
    icon: '⏳'
  },
  ready: {
    label: 'A Entregar',
    bg: 'bg-[#fff4d2]',
    text: 'text-[#92400e]',
    border: 'border-[#f59e0b]',
    icon: '⏳'
  },
  delivering: {
    label: 'A Entregar',
    bg: 'bg-[#fff4d2]',
    text: 'text-[#92400e]',
    border: 'border-[#f59e0b]',
    icon: '⏳'
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    icon: '❌',
    nextStatus: undefined,
    nextLabel: undefined
  }
};

const getRelativeTime = (order: any) => {
  if (!order?.createdAt?.toDate) return '';
  const d = order.createdAt.toDate();
  const diffMinutes = Math.floor((Date.now() - d.getTime()) / (1000 * 60));
  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Há ${diffDays}d`;
};

export default function Admin({ settings, setSettings, setIsAdmin }: { 
  settings: Settings, 
  setSettings: React.Dispatch<React.SetStateAction<Settings>>,
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [galleryIdToDelete, setGalleryIdToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'menu' | 'orders' | 'categories' | 'customers' | 'cakeOptions' | 'galleries' | 'reorder'>('orders');
  const [selectedReorderCatalog, setSelectedReorderCatalog] = useState<'all' | 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4'>('all');
  const [selectedReorderCategoryId, setSelectedReorderCategoryId] = useState<string>('all');
  const [galleries, setGalleries] = useState<ImageGallery[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [newSide, setNewSide] = useState<Partial<Side>>({ name: '', price: 0, type: 'side' });
  const [isEditingSide, setIsEditingSide] = useState<Side | null>(null);
  const [sidePriceInput, setSidePriceInput] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isEditingProduct, setIsEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    title: '',
    description: '',
    price: 0,
    oldPrice: 0,
    priceType: 'fixed',
    image: '',
    categoryId: '',
    isMeal: false,
    isCustomCake: false,
    isCustomSandwich: false,
    customFillings: 'Congelada, Natural',
    ingredients: '',
    allowedSides: [],
    isActive: true,
    hasSizes: false,
    sizes: [],
    cakeGalleryId: ''
  });
  const [priceInput, setPriceInput] = useState('');
  const [sizeForm, setSizeForm] = useState({ name: '', price: '', oldPrice: '' });
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);

  const [isEditingCategory, setIsEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ title: '', order: 0, catalog: 'both' as 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4' | 'both' | 'all' | 'catalog_b2b' });

  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFeeInput, setNewZoneFeeInput] = useState('');
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedHistoryCatalog, setSelectedHistoryCatalog] = useState<'all' | 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4'>('all');
  const [orderTypeTab, setOrderTypeTab] = useState<'retail' | 'b2b'>('retail');
  const [customerSearch, setCustomerSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showBirthdaysOnly, setShowBirthdaysOnly] = useState(false);
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState<Order | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState<any | null>(null);
  const [viewingCustomerOrders, setViewingCustomerOrders] = useState<any | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState<any>({});
  const [editOrderForm, setEditOrderForm] = useState<Partial<Order>>({});
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addItemQuantity, setAddItemQuantity] = useState(1);

  const updateOrderFormWithItems = (updatedItems: any[]) => {
    const isCorp = editOrderForm.isB2B || editOrderForm.isPJ;
    const subtotalVal = updatedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    if (isCorp) {
      setEditOrderForm({
        ...editOrderForm,
        items: updatedItems,
        total: subtotalVal,
        subtotal: subtotalVal,
        taxRate: 0,
        taxAmount: 0
      });
    } else {
      setEditOrderForm({
        ...editOrderForm,
        items: updatedItems,
        total: subtotalVal,
        subtotal: subtotalVal,
        taxRate: 0,
        taxAmount: 0
      });
    }
  };
  const [oldPriceInput, setOldPriceInput] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // --- CALENDAR & MANUAL ORDER & STATUS STATES ---
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [orderViewFormat, setOrderViewFormat] = useState<'table' | 'cards' | 'kanban'>('table');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [isEditingPickupDate, setIsEditingPickupDate] = useState(false);
  const [newPickupDate, setNewPickupDate] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [openWhatsAppMenuOrderId, setOpenWhatsAppMenuOrderId] = useState<string | null>(null);

  // Modal helpers for dates and phones
  const toDateInputFormat = (dateStr?: string): string => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m}-${d}`;
    }
    return dateStr;
  };

  const toBrazilianDateFormat = (dateStr?: string): string => {
    if (!dateStr) return 'A definir';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  };

  const formatUSPhoneInput = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const formatPhoneNumber = (phone?: string): string => {
    if (!phone) return 'Sem telefone';
    const clean = phone.replace(/\D/g, '');
    // Standard US 10-digit number: (XXX) XXX-XXXX
    if (clean.length === 10) {
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    // US 11-digit number starting with 1: (XXX) XXX-XXXX
    if (clean.length === 11 && clean.startsWith('1')) {
      return `(${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`;
    }
    // US number with leading 1 and extra country code prefix:
    if (clean.length > 10 && clean.startsWith('1') && clean.length <= 12) {
      const rest = clean.slice(-10);
      return `(${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
    }
    // Legacy Brazilian 11-digit number: (XX) XXXXX-XXXX
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phone;
  };

  // Manual order creation modal state
  const [isCreatingManualOrder, setIsCreatingManualOrder] = useState(false);
  const [manualOrderForm, setManualOrderForm] = useState<{
    customerName: string;
    phone: string;
    email: string;
    orderType: 'delivery' | 'pickup';
    address: string;
    pickupDate: string;
    birthday: string;
    observation: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid';
    deliveryFee: number;
    discount: number;
    items: {
      title: string;
      quantity: number;
      price: number;
      selectedSize?: any;
      notes?: string;
    }[];
  }>({
    customerName: '',
    phone: '',
    email: '',
    orderType: 'delivery',
    address: '',
    pickupDate: new Date().toISOString().slice(0, 10),
    birthday: '',
    observation: '',
    status: 'pending',
    paymentMethod: 'Pix',
    paymentStatus: 'pending',
    deliveryFee: 0,
    discount: 0,
    items: []
  });

  const [manualSelectedProductId, setManualSelectedProductId] = useState('');
  const [manualSelectedSizeId, setManualSelectedSizeId] = useState('');
  const [manualItemQuantity, setManualItemQuantity] = useState(1);
  const [manualItemCustomTitle, setManualItemCustomTitle] = useState('');
  const [manualItemCustomPrice, setManualItemCustomPrice] = useState('');
  const [manualItemNotes, setManualItemNotes] = useState('');

  const getOrderDateKey = (order: Order): string => {
    if (order.pickupDate) {
      if (order.pickupDate.includes('-') && order.pickupDate.length >= 10) {
        return order.pickupDate.slice(0, 10);
      }
      if (order.pickupDate.includes('/')) {
        const parts = order.pickupDate.split('/');
        if (parts.length === 3) {
          let p1 = parseInt(parts[0]);
          let p2 = parseInt(parts[1]);
          let p3 = parseInt(parts[2]);
          let day = p1;
          let month = p2;
          let year = p3;
          if (p1 > 12) {
            day = p1;
            month = p2;
          } else if (p2 > 12) {
            month = p1;
            day = p2;
          }
          if (year < 100) year += 2000;
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    if (order.createdAt?.toDate) {
      const d = order.createdAt.toDate();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return '';
  };

  const ordersCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      const key = getOrderDateKey(order);
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus });
      setSelectedOrderForModal(prev => (prev && prev.id === orderId ? { ...prev, status: newStatus as any } : prev));
      const statusLabels: Record<string, string> = {
        pending: 'A Entregar',
        to_deliver: 'A Entregar',
        delivered: 'Entregue'
      };
      toast.success(`Status alterado para: ${statusLabels[newStatus] || newStatus}`);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status do pedido');
    }
  };

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: 'pending' | 'paid' | 'half' | string) => {
    try {
      await updateDoc(doc(db, 'pedidos', orderId), { paymentStatus: newPaymentStatus });
      setSelectedOrderForModal(prev => (prev && prev.id === orderId ? { ...prev, paymentStatus: newPaymentStatus as any } : prev));
      const labels: Record<string, string> = {
        pending: 'Não Rec.',
        not_received: 'Não Rec.',
        half: '50%',
        '50%': '50%',
        paid: 'Integral',
        integral: 'Integral'
      };
      toast.success(`Pagamento alterado para: ${labels[newPaymentStatus] || newPaymentStatus}`);
    } catch (err) {
      console.error('Erro ao atualizar status do pagamento:', err);
      toast.error('Erro ao atualizar pagamento');
    }
  };

  const copyOrderSummary = (order: Order) => {
    const orderNum = order.id ? `#${order.id.slice(-5).toUpperCase()}` : '';
    const itemsText = order.items.map(it => `• ${it.quantity}x ${it.title}${it.selectedSize ? ` (${it.selectedSize.name})` : ''} - ${currencySymbol} ${(it.price * it.quantity).toFixed(2).replace('.', ',')}`).join('\n');
    
    const text = `📋 *RESUMO DO PEDIDO ${orderNum}*
👤 *Cliente:* ${order.customerName}
📱 *Telefone:* ${order.phone}
${order.email ? `✉️ *Email:* ${order.email}\n` : ''}📍 *Tipo:* ${order.orderType === 'pickup' ? '🛍️ Retirada no Local' : '🛵 Delivery'}
🏠 *Endereço:* ${order.address || 'Não informado'}
${order.pickupDate ? `📅 *Data Agendada:* ${order.pickupDate}\n` : ''}
📦 *ITENS:*
${itemsText}

💰 *TOTAL:* ${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}
${order.paymentMethod ? `💳 *Pagamento:* ${order.paymentMethod} (${order.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'})\n` : ''}${order.observation ? `📝 *Observação:* ${order.observation}\n` : ''}`;

    navigator.clipboard.writeText(text);
    toast.success('Resumo do pedido copiado com sucesso!');
  };

  const sendWhatsAppMessage = (order: Order, type: 'open' | 'confirm' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'resend') => {
    const phoneClean = order.phone.replace(/\D/g, '');
    if (!phoneClean) {
      toast.error('Telefone não informado neste pedido');
      return;
    }
    const orderNum = order.id ? `#${order.id.slice(-5).toUpperCase()}` : '';
    const brand = settings.brandName || 'Nosso Restaurante';
    const isEnglish = order.orderLanguage === 'en' || settings.language === 'en';
    let message = '';
    
    if (type === 'open') {
      message = isEnglish
        ? `Hello ${order.customerName}! We are contacting you regarding your order ${orderNum} at ${brand}.`
        : `Olá ${order.customerName}! Entrando em contato sobre seu pedido ${orderNum} no ${brand}.`;
    } else if (type === 'resend') {
      // Mensagem especial de REENVIAR PEDIDO COM ALTERAÇÕES FEITAS E NOVO VALOR
      const itemsText = order.items.map(it => {
        let str = `• ${it.quantity}x ${it.title}${it.selectedSize ? ` (${it.selectedSize.name})` : ''} - ${currencySymbol} ${(it.price * it.quantity).toFixed(2).replace('.', ',')}`;
        if (it.cakeOptions) {
          const opts = [];
          if (it.cakeOptions.size) opts.push(`Tam: ${it.cakeOptions.size}`);
          if (it.cakeOptions.dough) opts.push(`Massa: ${it.cakeOptions.dough}`);
          if (it.cakeOptions.fillings?.length) opts.push(`Recheios: ${it.cakeOptions.fillings.join(', ')}`);
          if (it.cakeOptions.topping) opts.push(`Cobertura: ${it.cakeOptions.topping}`);
          if (it.cakeOptions.topper) opts.push(`Topper: ${it.cakeOptions.topper}`);
          if (opts.length) str += `\n   ${opts.join(' | ')}`;
        }
        if (it.sandwichOptions?.fillings?.length) {
          str += `\n   Recheios: ${it.sandwichOptions.fillings.join(', ')}`;
        }
        if (it.mealOptions) {
          if (it.mealOptions.sides?.length) str += `\n   Acompanhamentos: ${it.mealOptions.sides.map((s: any) => s.name).join(', ')}`;
          if (it.mealOptions.removals?.length) str += `\n   Sem: ${it.mealOptions.removals.join(', ')}`;
        }
        if (it.notes) str += `\n   Obs: ${it.notes}`;
        return str;
      }).join('\n');

      if (isEnglish) {
        message = `Hello ${order.customerName}! 🔄 Your order ${orderNum} at ${brand} has been updated with the requested changes!\n\n📋 *UPDATED ORDER SUMMARY:*\n${itemsText}\n\n${order.deliveryFee && order.deliveryFee > 0 ? `🚚 Delivery Fee: +${currencySymbol} ${order.deliveryFee.toFixed(2)}\n` : ''}${order.discount && order.discount > 0 ? `🏷️ Discount: -${currencySymbol} ${order.discount.toFixed(2)}\n` : ''}💰 *NEW TOTAL:* ${currencySymbol} ${order.total.toFixed(2)}\n${order.pickupDate ? `📅 Date: ${order.pickupDate}\n` : ''}📍 Modality: ${order.orderType === 'pickup' ? '🛍️ Pickup' : '🛵 Delivery'}\n${order.address ? `🏠 Address: ${order.address}\n` : ''}${order.paymentMethod ? `💳 Payment: ${order.paymentMethod} (${order.paymentStatus === 'paid' ? 'PAID' : order.paymentStatus === 'half' ? '50% PAID' : 'PENDING'})\n` : ''}${order.observation ? `📝 Notes: ${order.observation}\n` : ''}\nThank you! If you have any questions, feel free to reply.`;
      } else {
        message = `Olá ${order.customerName}! 🔄 Seu pedido ${orderNum} no ${brand} foi atualizado com as alterações solicitadas!\n\n📋 *RESUMO ATUALIZADO DO PEDIDO:*\n${itemsText}\n\n${order.deliveryFee && order.deliveryFee > 0 ? `🚚 Taxa de Entrega: +${currencySymbol} ${order.deliveryFee.toFixed(2).replace('.', ',')}\n` : ''}${order.discount && order.discount > 0 ? `🏷️ Desconto: -${currencySymbol} ${order.discount.toFixed(2).replace('.', ',')}\n` : ''}💰 *NOVO VALOR TOTAL:* ${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}\n${order.pickupDate ? `📅 Data: ${order.pickupDate}\n` : ''}📍 Modalidade: ${order.orderType === 'pickup' ? '🛍️ Retirada' : '🛵 Delivery'}\n${order.address ? `🏠 Endereço: ${order.address}\n` : ''}${order.paymentMethod ? `💳 Pagamento: ${order.paymentMethod} (${order.paymentStatus === 'paid' ? 'PAGO' : order.paymentStatus === 'half' ? '50% PAGO' : 'PENDENTE'})\n` : ''}${order.observation ? `📝 Observação: ${order.observation}\n` : ''}\nQualquer dúvida, estamos à disposição!`;
      }
    } else if (type === 'confirm') {
      message = `Olá ${order.customerName}! ✅ Seu pedido ${orderNum} no ${brand} foi confirmado com sucesso e logo começará a ser preparado! Total: ${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}. Agradecemos a preferência!`;
    } else if (type === 'preparing') {
      message = `Olá ${order.customerName}! 🍳 Seu pedido ${orderNum} já está em fase de preparo com muito carinho pela nossa equipe!`;
    } else if (type === 'ready') {
      message = `Olá ${order.customerName}! 📦 Seu pedido ${orderNum} está PRONTO! Se for retirada no local, você já pode retirá-lo.`;
    } else if (type === 'delivering') {
      message = `Olá ${order.customerName}! 🛵 Seu pedido ${orderNum} acabou de sair para entrega no seu endereço!`;
    } else if (type === 'delivered') {
      message = `Olá ${order.customerName}! 🎉 Seu pedido ${orderNum} foi finalizado! Esperamos que goste e agradecemos imensamente pela preferência. Bom apetite!`;
    }
    
    // Configuração telefônica para EUA (+1) como padrão
    const countryCode = settings.whatsappCountryCode || '+1';
    const cleanCountry = countryCode.replace(/\D/g, '') || '1';
    let fullPhone = phoneClean;
    if (phoneClean.length === 10) {
      fullPhone = `${cleanCountry}${phoneClean}`;
    } else if (phoneClean.length === 11 && phoneClean.startsWith('1')) {
      fullPhone = phoneClean;
    } else if (phoneClean.length <= 11 && !phoneClean.startsWith(cleanCountry)) {
      fullPhone = `${cleanCountry}${phoneClean}`;
    }
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderForm.customerName.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    if (manualOrderForm.items.length === 0) {
      toast.error('Adicione ao menos um item ao pedido');
      return;
    }

    const itemsSubtotal = manualOrderForm.items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    const grandTotal = Math.max(0, itemsSubtotal + (Number(manualOrderForm.deliveryFee) || 0) - (Number(manualOrderForm.discount) || 0));

    try {
      setIsSaving(true);
      await addDoc(collection(db, 'pedidos'), {
        customerName: manualOrderForm.customerName.trim(),
        phone: manualOrderForm.phone.trim(),
        email: manualOrderForm.email.trim(),
        orderType: manualOrderForm.orderType,
        address: manualOrderForm.address.trim(),
        pickupDate: manualOrderForm.pickupDate,
        birthday: manualOrderForm.birthday.trim(),
        observation: manualOrderForm.observation.trim(),
        status: manualOrderForm.status || 'pending',
        paymentMethod: manualOrderForm.paymentMethod || 'Pix',
        paymentStatus: manualOrderForm.paymentStatus || 'pending',
        deliveryFee: Number(manualOrderForm.deliveryFee) || 0,
        discount: Number(manualOrderForm.discount) || 0,
        items: manualOrderForm.items,
        subtotal: itemsSubtotal,
        total: grandTotal,
        createdAt: new Date(),
        orderLanguage: settings.language || 'pt'
      });

      toast.success('Pedido manual cadastrado com sucesso!');
      setIsCreatingManualOrder(false);
      setManualOrderForm({
        customerName: '',
        phone: '',
        email: '',
        orderType: 'delivery',
        address: '',
        pickupDate: new Date().toISOString().slice(0, 10),
        birthday: '',
        observation: '',
        status: 'pending',
        paymentMethod: 'Pix',
        paymentStatus: 'pending',
        deliveryFee: 0,
        discount: 0,
        items: []
      });
    } catch (err) {
      console.error('Erro ao criar pedido manual:', err);
      toast.error('Erro ao cadastrar pedido manual');
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueCustomers = useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      email: string;
      birthday: string;
      address: string;
      orderLanguage?: string;
      lastOrder: any;
      totalOrders: number;
      isB2B: boolean;
      managerName: string;
      street: string;
      number: string;
      zipCode: string;
      city: string;
      frequency: string;
      orders: Order[];
    }>();

    orders.forEach(order => {
      const isCorp = !!(order.isB2B || order.isPJ);
      const name = isCorp ? (order.b2bCompanyName || order.customerName) : order.customerName;
      const phone = order.phone || '';
      const email = order.email || '';
      const key = phone || email || name;
      if (!key) return;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: name,
          phone: phone,
          email: email,
          birthday: order.birthday || '',
          address: isCorp ? (order.b2bAddress || order.address || '') : (order.address || ''),
          orderLanguage: order.orderLanguage,
          lastOrder: order.createdAt,
          totalOrders: 1,
          isB2B: isCorp,
          managerName: order.b2bManagerName || '',
          street: order.street || '',
          number: order.number || '',
          zipCode: isCorp ? (order.b2bZipCode || order.zipCode || '') : (order.zipCode || ''),
          city: isCorp ? (order.b2bCity || order.city || '') : (order.city || ''),
          frequency: order.b2bFrequency || '',
          orders: [order]
        });
      } else {
        const existing = customerMap.get(key)!;
        existing.totalOrders += 1;
        existing.orders.push(order);
        if (isCorp) {
          existing.isB2B = true;
          if (order.b2bCompanyName) existing.name = order.b2bCompanyName;
          if (order.b2bManagerName) existing.managerName = order.b2bManagerName;
          if (order.b2bAddress) existing.address = order.b2bAddress;
          if (order.b2bZipCode) existing.zipCode = order.b2bZipCode;
          if (order.b2bCity) existing.city = order.b2bCity;
          if (order.b2bFrequency) existing.frequency = order.b2bFrequency;
        } else {
          if (order.street) existing.street = order.street;
          if (order.number) existing.number = order.number;
          if (order.zipCode) existing.zipCode = order.zipCode;
          if (order.city) existing.city = order.city;
        }
        if (order.createdAt?.toDate && existing.lastOrder?.toDate) {
          if (order.createdAt.toDate() > existing.lastOrder.toDate()) {
            existing.lastOrder = order.createdAt;
            if (!isCorp) {
              existing.name = order.customerName;
              existing.birthday = order.birthday || existing.birthday;
              existing.address = order.address || existing.address;
            }
            existing.orderLanguage = order.orderLanguage || existing.orderLanguage;
          }
        }
      }
    });

    return Array.from(customerMap.values());
  }, [orders]);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  const handleBrandNameChange = (name: string) => {
    setSettings(prev => ({
      ...prev,
      brandName: name,
      slug: slugify(name)
    }));
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);

    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      fetched.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 9999;
        const orderB = typeof b.order === 'number' ? b.order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '');
      });
      setProducts(fetched);
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categorias'), orderBy('order', 'asc')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const unsubOrders = onSnapshot(query(collection(db, 'pedidos'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubSides = onSnapshot(collection(db, 'acompanhamentos'), (snapshot) => {
      setSides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Side)));
    });

    const unsubGalleries = onSnapshot(collection(db, 'galerias'), (snapshot) => {
      setGalleries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageGallery)));
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubOrders();
      unsubSides();
      unsubGalleries();
    };
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = settings?.adminPassword || 'admin123';
    if (password === correctPassword) {
      try {
        await signInAnonymously(auth);
        setIsLoggedIn(true);
        toast.success('Login realizado com sucesso!');
      } catch (error) {
        console.error('Erro ao autenticar com Firebase:', error);
        toast.error('Erro ao conectar com o servidor. Tente novamente.');
      }
    } else {
      toast.error('Senha incorreta!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void, imageType: boolean | 'logo' | 'background' | 'catalog' | 'product' = 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image if it's too large
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          let MAX_WIDTH = 600;
          let MAX_HEIGHT = 600;
          let quality = 0.5;

          if (imageType === 'logo') {
            MAX_WIDTH = 250;
            MAX_HEIGHT = 250;
            quality = 0.6;
          } else if (imageType === 'background') {
            MAX_WIDTH = 800;
            MAX_HEIGHT = 800;
            quality = 0.4;
          } else if (imageType === 'catalog') {
            MAX_WIDTH = 450;
            MAX_HEIGHT = 450;
            quality = 0.4;
          } else if (imageType === 'product') {
            MAX_WIDTH = 600;
            MAX_HEIGHT = 600;
            quality = 0.5;
          } else if (imageType === true) {
            MAX_WIDTH = 450;
            MAX_HEIGHT = 450;
            quality = 0.4;
          } else if (imageType === false) {
            MAX_WIDTH = 600;
            MAX_HEIGHT = 600;
            quality = 0.5;
          }
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          callback(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const addCakeOptionItem = (key: 'cakeSizes' | 'cakeDoughs' | 'cakeFillings' | 'cakeToppings' | 'cakeToppers', defaultValue: string = '') => {
    setSettings(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), defaultValue]
    }));
  };

  const removeCakeOptionItem = (key: 'cakeSizes' | 'cakeDoughs' | 'cakeFillings' | 'cakeToppings' | 'cakeToppers', index: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const updateCakeOptionItem = (key: 'cakeSizes' | 'cakeDoughs' | 'cakeFillings' | 'cakeToppings' | 'cakeToppers', index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((v: string, i: number) => i === index ? value : v)
    }));
  };

  const sanitizeForFirestore = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;
    if (Array.isArray(data)) {
      return data
        .filter(item => item !== undefined)
        .map(item => (typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item));
    }
    if (typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleaned[key] = (typeof value === 'object' && value !== null) ? sanitizeForFirestore(value) : value;
        }
      }
      return cleaned;
    }
    return data;
  };

  const saveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const rawSettings = {
        ...settings,
        language: 'pt' as const,
        currency: 'USD' as const,
        printerFormat: settings?.printerFormat || 'rongta80',
        printerModel: settings?.printerModel || 'Rongta POS 3.150 in (80mm) con cortador automático',
        printerAutoCut: settings?.printerAutoCut !== false
      };

      const cleanSettings = sanitizeForFirestore(rawSettings);

      // Check document size against Firestore's 1MB limit
      const jsonString = JSON.stringify(cleanSettings);
      const sizeInKb = Math.round(new Blob([jsonString]).size / 1024);
      console.log(`[Firebase] Tamanho das configurações: ${sizeInKb} KB`);

      if (sizeInKb > 950) {
        throw new Error(`PAYLOAD_TOO_LARGE: O tamanho total com as imagens (${sizeInKb} KB) excedeu o limite máximo de 1MB do Firestore. Por favor, reenvie ou remova fotos muito pesadas.`);
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT: Tempo limite de conexão com o Firebase (30s) excedido. Verifique sua conexão com a internet.')), 30000)
      );

      await Promise.race([
        setDoc(doc(db, 'configuracoes', 'geral'), cleanSettings),
        timeoutPromise
      ]);
      
      toast.success('Configurações salvas com sucesso!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      const errMsg = err?.message || String(err);
      const errCode = err?.code || '';

      if (errCode === 'permission-denied' || errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions')) {
        toast.error('Permissão negada no Firebase! É necessário atualizar as Regras de Segurança (Rules) no Firebase Console.', { duration: 6000 });
      } else if (errMsg.includes('PAYLOAD_TOO_LARGE') || errMsg.includes('exceeds the maximum') || errMsg.includes('too large')) {
        toast.error('O tamanho das imagens excedeu o limite de 1MB do documento Firebase. Reduza o tamanho das fotos.', { duration: 6000 });
      } else if (errMsg.includes('TIMEOUT')) {
        toast.error('Tempo de conexão esgotado (30s). Verifique sua internet.', { duration: 5000 });
      } else {
        toast.error(`Erro ao salvar configurações: ${errMsg}`, { duration: 5000 });
      }
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const formatFeeWithComma = (fee?: number) => {
    return Number(fee || 0).toFixed(2).replace('.', ',');
  };

  const parseFeeWithComma = (val: string) => {
    if (!val) return 0;
    const sanitized = val.replace(',', '.');
    const n = parseFloat(sanitized);
    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  };

  const handleSaveDeliveryZone = async () => {
    if (!newZoneName.trim()) {
      toast.error('Informe o nome do bairro ou região');
      return;
    }
    const feeNumber = parseFeeWithComma(newZoneFeeInput);
    const currentZones = settings?.deliveryZones || [];
    
    let updatedZones: DeliveryZone[];
    if (editingZoneId) {
      updatedZones = currentZones.map(z => z.id === editingZoneId ? { ...z, name: newZoneName.trim(), fee: feeNumber } : z);
    } else {
      updatedZones = [...currentZones, { id: Date.now().toString(), name: newZoneName.trim(), fee: feeNumber }];
    }

    const newSettings = { ...settings, deliveryZones: updatedZones };
    setSettings(newSettings);
    const wasEditing = !!editingZoneId;
    setEditingZoneId(null);
    setNewZoneName('');
    setNewZoneFeeInput('');

    try {
      await setDoc(doc(db, 'configuracoes', 'geral'), sanitizeForFirestore(newSettings), { merge: true });
      toast.success(wasEditing ? 'Bairro atualizado com sucesso!' : 'Bairro cadastrado com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar bairro:', err);
      toast.error('Erro ao salvar bairro');
    }
  };

  const handleDeleteDeliveryZone = async (id: string) => {
    const currentZones = settings?.deliveryZones || [];
    const updatedZones = currentZones.filter(z => z.id !== id);
    const newSettings = { ...settings, deliveryZones: updatedZones };
    setSettings(newSettings);

    try {
      await setDoc(doc(db, 'configuracoes', 'geral'), sanitizeForFirestore(newSettings), { merge: true });
      toast.success('Bairro excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir bairro:', err);
      toast.error('Erro ao excluir bairro');
    }
  };

  const handlePriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setPriceInput('0,00');
      setNewProduct(prev => ({ ...prev, price: 0 }));
      return;
    }
    
    const numericValue = parseInt(digits) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    setPriceInput(formatted);
    setNewProduct(prev => ({ ...prev, price: numericValue }));
  };

  const handleOldPriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setOldPriceInput('0,00');
      setNewProduct(prev => ({ ...prev, oldPrice: 0 }));
      return;
    }
    
    const numericValue = parseInt(digits) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    setOldPriceInput(formatted);
    setNewProduct(prev => ({ ...prev, oldPrice: numericValue }));
  };

  const handleAddSizeOption = () => {
    if (!sizeForm.name) {
      toast.error('Informe ao menos o nome do tamanho.');
      return;
    }
    const priceVal = sizeForm.price ? (parseFloat(sizeForm.price.replace(/\D/g, '')) / 100) : 0;
    
    if (editingSizeId) {
      setNewProduct((prev: any) => ({
        ...prev,
        sizes: (prev.sizes || []).map((s: any) => 
          s.id === editingSizeId ? { ...s, name: sizeForm.name, price: priceVal } : s
        )
      }));
      setEditingSizeId(null);
      setSizeForm({ name: '', price: '', oldPrice: '' });
      toast.success('Opção de tamanho atualizada!');
    } else {
      const newSizeOption = {
        id: Math.random().toString(36).substr(2, 9),
        name: sizeForm.name,
        price: priceVal
      };
      
      setNewProduct((prev: any) => ({
        ...prev,
        sizes: [...(prev.sizes || []), newSizeOption]
      }));
      
      setSizeForm({ name: '', price: '', oldPrice: '' });
      toast.success('Opção de tamanho adicionada!');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newProduct.title || !newProduct.categoryId) {
        toast.error('Por favor, preencha o título e a categoria.');
        return;
      }

      if (isEditingProduct) {
        await updateDoc(doc(db, 'produtos', isEditingProduct.id), newProduct);
        setIsEditingProduct(null);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'produtos'), { ...newProduct, isActive: true });
        toast.success('Produto adicionado com sucesso!');
      }
      setNewProduct({ 
        title: '', 
        description: '', 
        price: 0, 
        priceType: 'fixed',
        image: '', 
        categoryId: '',
        isMeal: false,
        isCustomCake: false,
        isCustomSandwich: false,
        customFillings: 'Congelada, Natural',
        ingredients: '',
        allowedSides: [],
        isActive: true,
        oldPrice: 0,
        hasSizes: false,
        sizes: [],
        cakeGalleryId: ''
      });
      setPriceInput('');
      setOldPriceInput('');
      setEditingSizeId(null);
      setSizeForm({ name: '', price: '', oldPrice: '' });
    } catch (err) {
      toast.error('Erro ao salvar produto.');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'produtos', product.id), {
        isActive: product.isActive === false ? true : false
      });
    } catch (err) {
      alert('Erro ao alterar status do produto.');
    }
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    const current = categories[index];
    const other = categories[otherIndex];

    const currentOrder = current.order ?? index;
    const otherOrder = other.order ?? otherIndex;

    let newCurrentOrder = otherOrder;
    let newOtherOrder = currentOrder;

    if (newCurrentOrder === newOtherOrder) {
      if (direction === 'up') {
        newCurrentOrder = newOtherOrder - 1;
      } else {
        newCurrentOrder = newOtherOrder + 1;
      }
    }

    await updateDoc(doc(db, 'categorias', current.id), { order: newCurrentOrder });
    await updateDoc(doc(db, 'categorias', other.id), { order: newOtherOrder });
  };

  const moveProduct = async (productId: string, direction: 'up' | 'down', list: Product[]) => {
    const index = list.findIndex(p => p.id === productId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const current = list[index];
    const target = list[targetIndex];

    const newList = [...list];
    newList[index] = target;
    newList[targetIndex] = current;

    // Optimistic UI update
    setProducts(prev => {
      const map = new Map(newList.map((p, i) => [p.id, i + 1]));
      return prev.map(p => {
        if (map.has(p.id)) {
          return { ...p, order: map.get(p.id)! };
        }
        return p;
      });
    });

    try {
      const promises = newList.map((item, i) =>
        updateDoc(doc(db, 'produtos', item.id), { order: i + 1 })
      );
      await Promise.all(promises);
      toast.success(`"${current.title}" movido para #${targetIndex + 1}!`);
    } catch (error) {
      console.error('Erro ao reordenar produtos:', error);
      toast.error('Erro ao salvar nova ordem');
    }
  };

  const handleSequentialNumbering = async (list: Product[]) => {
    if (!list || list.length === 0) return;
    try {
      const promises = list.map((item, i) =>
        updateDoc(doc(db, 'produtos', item.id), { order: i + 1 })
      );
      await Promise.all(promises);
      setProducts(prev => {
        const map = new Map(list.map((p, i) => [p.id, i + 1]));
        return prev.map(p => {
          if (map.has(p.id)) {
            return { ...p, order: map.get(p.id)! };
          }
          return p;
        });
      });
      toast.success('Produtos numerados sequencialmente (1, 2, 3...)!');
    } catch (error) {
      console.error('Erro ao renumerar produtos:', error);
      toast.error('Erro ao salvar nova ordem');
    }
  };

  const handleSortAlphabetically = async (list: Product[]) => {
    if (!list || list.length === 0) return;
    try {
      const sorted = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      const promises = sorted.map((item, i) =>
        updateDoc(doc(db, 'produtos', item.id), { order: i + 1 })
      );
      await Promise.all(promises);
      setProducts(prev => {
        const map = new Map(sorted.map((p, i) => [p.id, i + 1]));
        return prev.map(p => {
          if (map.has(p.id)) {
            return { ...p, order: map.get(p.id)! };
          }
          return p;
        });
      });
      toast.success('Produtos ordenados de A a Z!');
    } catch (error) {
      console.error('Erro ao ordenar produtos:', error);
      toast.error('Erro ao salvar ordem A-Z');
    }
  };

  const handleMoveToPosition = async (product: Product, currentList: Product[]) => {
    const currentIndex = currentList.findIndex(p => p.id === product.id);
    if (currentIndex === -1) return;
    const input = window.prompt(`Mover "${product.title}" para qual posição? (1 a ${currentList.length})`, String(currentIndex + 1));
    if (!input) return;
    const targetPos = parseInt(input, 10);
    if (isNaN(targetPos) || targetPos < 1 || targetPos > currentList.length) {
      toast.error(`Posição inválida. Escolha um número entre 1 e ${currentList.length}`);
      return;
    }
    const targetIndex = targetPos - 1;
    if (targetIndex === currentIndex) return;

    const newList = [...currentList];
    newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, product);

    // Optimistic UI update
    setProducts(prev => {
      const map = new Map(newList.map((p, i) => [p.id, i + 1]));
      return prev.map(p => {
        if (map.has(p.id)) {
          return { ...p, order: map.get(p.id)! };
        }
        return p;
      });
    });

    try {
      const promises = newList.map((item, i) =>
        updateDoc(doc(db, 'produtos', item.id), { order: i + 1 })
      );
      await Promise.all(promises);
      toast.success(`"${product.title}" movido para a posição #${targetPos}!`);
    } catch (error) {
      console.error('Erro ao mover produto:', error);
      toast.error('Erro ao salvar nova posição');
    }
  };

  const scrollToEditForm = () => {
    setTimeout(() => {
      const mainElem = document.querySelector('main');
      if (mainElem) {
        mainElem.scrollTo({ top: 0, behavior: 'smooth' });
      }
      const formElem = document.getElementById('product-edit-form');
      if (formElem) {
        formElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        const input = document.getElementById('product-title-input') as HTMLInputElement | null;
        input?.focus();
      }, 150);
    }, 50);
  };

  const handleStartEditProduct = (product: Product) => {
    setIsEditingProduct(product);
    setNewProduct({
      title: product.title,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice || 0,
      priceType: product.priceType || 'fixed',
      image: product.image,
      categoryId: product.categoryId,
      isMeal: product.isMeal || false,
      isCustomCake: product.isCustomCake || false,
      isCustomSandwich: product.isCustomSandwich || false,
      customFillings: product.customFillings || (product.isCustomSandwich ? 'Congelada, Natural' : ''),
      ingredients: product.ingredients || '',
      allowedSides: product.allowedSides || [],
      isActive: product.isActive ?? true,
      hasSizes: product.hasSizes || false,
      sizes: product.sizes || [],
      cakeGalleryId: product.cakeGalleryId || ''
    });
    setPriceInput(product.price ? product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    setEditingSizeId(null);
    setSizeForm({ name: '', price: '', oldPrice: '' });
    setOldPriceInput(product.oldPrice ? product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    setActiveTab('menu');
    scrollToEditForm();
  };

  const handleAddSide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSide.name) return;

    try {
      if (isEditingSide) {
        await updateDoc(doc(db, 'acompanhamentos', isEditingSide.id), newSide);
        toast.success('Acompanhamento atualizado!');
      } else {
        await addDoc(collection(db, 'acompanhamentos'), newSide);
        toast.success('Acompanhamento adicionado!');
      }
      setNewSide({ name: '', price: 0, type: 'side' });
      setSidePriceInput('');
      setIsEditingSide(null);
    } catch (error) {
      console.error('Error adding side:', error);
      toast.error('Erro ao salvar acompanhamento');
    }
  };

  const deleteSide = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Acompanhamento',
      message: 'Tem certeza que deseja excluir este acompanhamento?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'acompanhamentos', id));
          toast.success('Acompanhamento excluído!');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          toast.error('Erro ao excluir');
        }
      }
    });
  };

  const handleSidePriceChange = (val: string) => {
    setSidePriceInput(val);
    const numeric = parseFloat(val.replace(',', '.'));
    if (!isNaN(numeric)) {
      setNewSide({ ...newSide, price: numeric });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newCategory.title) {
        toast.error('Por favor, preencha o título da categoria.');
        return;
      }

      if (isEditingCategory) {
        await updateDoc(doc(db, 'categorias', isEditingCategory.id), { 
          title: newCategory.title,
          catalog: newCategory.catalog || 'both'
        });
        setIsEditingCategory(null);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0);
        await addDoc(collection(db, 'categorias'), {
          title: newCategory.title,
          order: maxOrder + 1,
          catalog: newCategory.catalog || 'both'
        });
        toast.success('Categoria adicionada com sucesso!');
      }
      setNewCategory({ title: '', order: 0, catalog: 'both' });
    } catch (err: any) {
      console.error('Erro ao salvar categoria:', err);
      if (err.message?.includes('permission-denied')) {
        toast.error('Erro de permissão: Você não tem autorização para salvar. Verifique se está logado corretamente.');
      } else {
        toast.error('Erro ao salvar categoria. Verifique sua conexão.');
      }
    }
  };

  const deleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: 'Deseja realmente excluir este produto? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'produtos', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          alert('Erro ao excluir produto.');
        }
      }
    });
  };

  const deleteCategory = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Categoria',
      message: 'Deseja realmente excluir esta categoria? Todos os produtos vinculados a ela ficarão sem categoria.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'categorias', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          alert('Erro ao excluir categoria.');
        }
      }
    });
  };

  const deleteOrder = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Pedido',
      message: 'Deseja realmente excluir este pedido do histórico? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'pedidos', id));
          setOrders(prev => prev.filter(o => o.id !== id));
          setSelectedOrderForModal(prev => (prev?.id === id ? null : prev));
          toast.success('Pedido excluído com sucesso!');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error('Erro ao excluir pedido:', err);
          toast.error('Erro ao excluir pedido.');
        }
      }
    });
  };

  const deleteCustomer = async (customer: any) => {
    const customerId = customer.phone || customer.email || customer.name;
    const customerOrders = orders.filter(o => (o.phone || o.email || o.customerName) === customerId);
    
    try {
      setIsSaving(true);
      for (const order of customerOrders) {
        await deleteDoc(doc(db, 'pedidos', order.id));
      }
      toast.success('Cliente e seus pedidos excluídos com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    } finally {
      setIsSaving(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const updateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const originalId = isEditingCustomer.phone || isEditingCustomer.email || isEditingCustomer.name;
    const customerOrders = orders.filter(o => {
      const isCorp = o.isB2B || o.isPJ;
      const oName = isCorp ? (o.b2bCompanyName || o.customerName) : o.customerName;
      const oKey = o.phone || o.email || oName;
      return oKey === originalId;
    });

    try {
      setIsSaving(true);
      for (const order of customerOrders) {
        const updateData: any = {
          phone: editCustomerForm.phone,
          email: editCustomerForm.email,
          birthday: editCustomerForm.birthday || '',
        };

        if (editCustomerForm.isB2B) {
          updateData.b2bCompanyName = editCustomerForm.name;
          updateData.b2bManagerName = editCustomerForm.managerName || '';
          updateData.b2bAddress = editCustomerForm.address || '';
          updateData.b2bZipCode = editCustomerForm.zipCode || '';
          updateData.b2bCity = editCustomerForm.city || '';
          updateData.b2bFrequency = editCustomerForm.frequency || '';
          // Keep customerName in sync for fallback
          updateData.customerName = editCustomerForm.managerName || editCustomerForm.name;
          updateData.address = editCustomerForm.address || '';
        } else {
          updateData.customerName = editCustomerForm.name;
          updateData.street = editCustomerForm.street || '';
          updateData.number = editCustomerForm.number || '';
          updateData.zipCode = editCustomerForm.zipCode || '';
          updateData.city = editCustomerForm.city || '';
          
          // Rebuild full address from components
          const fullAddr = `${editCustomerForm.street || ''}, ${editCustomerForm.number || 'S/N'} - ${editCustomerForm.city || ''} (${editCustomerForm.zipCode || ''})`;
          updateData.address = fullAddr;
        }

        await updateDoc(doc(db, 'pedidos', order.id), updateData);
      }
      toast.success('Informações do cliente atualizadas!');
      setIsEditingCustomer(null);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const closestUpcomingOrder = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDateString = (str: string, lang?: string) => {
      if (!str || !str.includes('/')) return null;
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      
      let month = parseInt(parts[0]);
      let day = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      // Always treat as MM/DD/YYYY by default (USA pattern), but if the first part (month) is > 12, it is definitely DD/MM/YYYY
      if (month > 12) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
      
      if (!day || !month || !year || month > 12) return null;
      return new Date(year, month - 1, day);
    };

    const upcomingOrders = orders
      .map(o => {
        if (!o.pickupDate) return null;
        const d = parseDateString(o.pickupDate, o.orderLanguage || settings.language || 'pt');
        if (!d) return null;
        d.setHours(0, 0, 0, 0);
        return { order: o, date: d };
      })
      .filter((item): item is { order: Order; date: Date } => item !== null && item.date >= today);

    if (upcomingOrders.length === 0) {
      // If none are in the future, get the closest one overall that has a pickupDate
      const allWithDate = orders
        .map(o => {
          if (!o.pickupDate) return null;
          const d = parseDateString(o.pickupDate, o.orderLanguage || settings.language || 'pt');
          if (!d) return null;
          d.setHours(0, 0, 0, 0);
          return { order: o, date: d };
        })
        .filter((item): item is { order: Order; date: Date } => item !== null);
      
      if (allWithDate.length === 0) return null;
      
      allWithDate.sort((a, b) => b.date.getTime() - a.date.getTime());
      return allWithDate[0].order;
    }

    upcomingOrders.sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcomingOrders[0].order;
  }, [orders, settings.language]);

  const printWithIframe = (htmlContent: string) => {
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (iframe) {
      document.body.removeChild(iframe);
    }

    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.setAttribute('style', 'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0;');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 250);
  };

  const getPrinterStyles = () => {
    const format = settings?.printerFormat || 'rongta80';
    
    if (format === 'thermal58') {
      return `
        @page { size: 58mm auto; margin: 0; }
        @media print {
          html, body { width: 58mm; margin: 0 !important; padding: 0 !important; }
        }
        body { 
          font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          width: 48mm; 
          margin: 0 auto; 
          padding: 2mm 1mm ${settings?.printerAutoCut !== false ? '20mm' : '8mm'} 1mm; 
          font-size: 10px; 
          color: #000;
          line-height: 1.25;
          -webkit-font-smoothing: antialiased;
          font-weight: 600;
        }
        .header { text-align: center; border-bottom: 2px double #000; padding-bottom: 4px; margin-bottom: 6px; }
        .header h1, .header h2 { font-size: 13px; margin: 0 0 2px 0; text-transform: uppercase; font-weight: bold; }
        .header p { font-size: 8px; margin: 0; }
        .section { margin-bottom: 5px; }
        .label { font-weight: bold; font-size: 9px; text-transform: uppercase; }
        .value { font-size: 10px; margin-top: 1px; }
        .badge { display: inline-block; padding: 2px 4px; font-weight: bold; font-size: 9px; border: 1px solid #000; text-transform: uppercase; margin: 3px 0; }
        .item-row { border-bottom: 1px dashed #000; padding: 3px 0; font-size: 10px; }
        .item-main { display: flex; justify-content: space-between; font-weight: bold; }
        .item-sub { font-size: 8px; color: #333; padding-left: 4px; margin-top: 1px; line-height: 1.2; }
        .divider { border-top: 1px solid #000; margin: 4px 0; }
        .double-divider { border-top: 2px double #000; margin: 4px 0; }
        .total-section { text-align: right; font-size: 9px; margin-top: 4px; }
        .total { text-align: right; font-weight: bold; font-size: 12px; margin-top: 4px; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; }
        .cutter-feed { text-align: center; margin-top: 8px; font-size: 9px; }
        .cutter-feed .thanks { font-weight: bold; margin: 2px 0; }
        .cutter-feed .store-name { font-weight: bold; font-size: 10px; text-transform: uppercase; }
        .cutter-feed .cut-indicator { font-size: 8px; margin-top: 3px; opacity: 0.7; }
        .feed-space { height: ${settings?.printerAutoCut !== false ? '20mm' : '6mm'}; }
        .order-block { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
        .order-header { font-weight: bold; font-size: 10px; }
        .order-details { font-size: 9px; margin: 2px 0; }
        .order-items { white-space: pre-wrap; font-size: 9px; margin: 3px 0; background: #fafafa; padding: 2px; }
        .order-total { text-align: right; font-weight: bold; font-size: 10px; }
        .total-sum { font-size: 11px; font-weight: bold; text-align: right; border-top: 2px solid #000; padding-top: 4px; margin-top: 8px; text-transform: uppercase; }
        .category-block { margin-top: 8px; }
        .category-title { font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px; text-transform: uppercase; }
        .product-block { margin-bottom: 6px; border-bottom: 1px dashed #ccc; padding-bottom: 3px; }
        .product-title { font-weight: bold; font-size: 10px; }
        .product-desc { font-size: 9px; color: #444; margin: 1px 0; }
        .product-catalog { font-size: 9px; font-style: italic; }
        .product-price { font-weight: bold; font-size: 10px; white-space: pre-wrap; margin-top: 1px; }
        .section-title { font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px; text-transform: uppercase; }
        .summary-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dashed #ccc; font-size: 9px; }
        .summary-row .title { max-width: 80%; }
        .summary-row .qty { font-weight: bold; }
      `;
    }

    if (format === 'a4') {
      return `
        @page { size: A4 portrait; margin: 15mm; }
        body { 
          font-family: Arial, sans-serif; 
          width: 100%; 
          margin: 0; 
          padding: 0; 
          font-size: 13px; 
          color: #000;
          line-height: 1.4;
        }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1, .header h2 { font-size: 20px; margin: 0 0 5px 0; text-transform: uppercase; }
        .header p { font-size: 11px; margin: 0; color: #555; }
        .section { margin-bottom: 10px; }
        .label { font-weight: bold; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 13px; margin-top: 2px; }
        .badge { display: inline-block; padding: 4px 8px; font-weight: bold; font-size: 11px; border: 1px solid #000; border-radius: 4px; text-transform: uppercase; margin: 5px 0; }
        .item-row { border-bottom: 1px solid #eee; padding: 6px 0; font-size: 13px; }
        .item-main { display: flex; justify-content: space-between; font-weight: bold; }
        .item-sub { font-size: 11px; color: #555; padding-left: 12px; margin-top: 2px; }
        .divider { border-top: 1px solid #ccc; margin: 8px 0; }
        .double-divider { border-top: 2px solid #000; margin: 8px 0; }
        .total-section { text-align: right; font-size: 12px; margin-top: 8px; }
        .total { text-align: right; font-weight: bold; font-size: 16px; margin-top: 6px; text-transform: uppercase; border-top: 2px solid #000; padding-top: 4px; }
        .cutter-feed { text-align: center; margin-top: 20px; font-size: 12px; }
        .cutter-feed .thanks { font-weight: bold; }
        .feed-space { height: 10mm; }
        .order-block { margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .order-header { font-weight: bold; font-size: 14px; }
        .order-details { font-size: 12px; margin: 4px 0; color: #444; }
        .order-items { white-space: pre-wrap; font-size: 12px; margin: 6px 0; background: #f9f9f9; padding: 6px; border-radius: 4px; }
        .order-total { text-align: right; font-weight: bold; font-size: 13px; }
        .total-sum { font-size: 16px; font-weight: bold; text-align: right; border-top: 2px solid #000; padding-top: 8px; margin-top: 15px; text-transform: uppercase; }
        .category-block { margin-top: 15px; }
        .category-title { font-weight: bold; font-size: 14px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
        .product-block { margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
        .product-title { font-weight: bold; font-size: 13px; }
        .product-desc { font-size: 12px; color: #555; margin: 3px 0; }
        .product-catalog { font-size: 11px; font-style: italic; color: #777; }
        .product-price { font-weight: bold; font-size: 13px; white-space: pre-wrap; margin-top: 3px; }
        .section-title { font-weight: bold; font-size: 14px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
        .summary-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
        .summary-row .title { max-width: 80%; }
        .summary-row .qty { font-weight: bold; }
      `;
    }

    // Padrão: 'rongta80' (Rongta POS 3.150 in / 80mm com Cortador Automático)
    return `
      @page { 
        size: 80mm auto; 
        margin: 0mm; 
      }
      @media print {
        html, body { 
          width: 80mm; 
          margin: 0 !important; 
          padding: 0 !important; 
          background: #fff;
          color: #000;
        }
      }
      body { 
        font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        width: 72mm; 
        margin: 0 auto; 
        padding: 3mm 1mm ${settings?.printerAutoCut !== false ? '25mm' : '8mm'} 1mm; 
        font-size: 12px; 
        color: #000;
        line-height: 1.35;
        -webkit-font-smoothing: antialiased;
        font-weight: 600;
      }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
      .header h1, .header h2 { font-size: 17px; margin: 0 0 3px 0; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
      .header p { font-size: 10px; margin: 1px 0; font-weight: 600; }
      .section { margin-bottom: 6px; }
      .label { font-weight: 800; font-size: 11px; text-transform: uppercase; }
      .value { font-size: 12px; margin-top: 1px; font-weight: 600; }
      .badge { 
        display: block; 
        padding: 4px 6px; 
        font-weight: 800; 
        font-size: 11px; 
        border: 2px solid #000; 
        text-transform: uppercase; 
        margin: 5px 0; 
        text-align: center;
        background: #000;
        color: #fff;
      }
      .item-row { border-bottom: 1px dashed #000; padding: 5px 0; font-size: 12px; }
      .item-main { display: flex; justify-content: space-between; font-weight: 800; }
      .item-sub { font-size: 10px; color: #000; padding-left: 6px; margin-top: 2px; line-height: 1.3; font-weight: 600; }
      .divider { border-top: 1.5px solid #000; margin: 6px 0; }
      .double-divider { border-top: 2px solid #000; margin: 6px 0; }
      .total-section { text-align: right; font-size: 11px; margin-top: 6px; font-weight: 700; }
      .total { 
        text-align: right; 
        font-weight: 900; 
        font-size: 16px; 
        margin-top: 5px; 
        text-transform: uppercase; 
        border-top: 2px solid #000; 
        border-bottom: 2px solid #000; 
        padding: 5px 0; 
      }
      .cutter-feed { text-align: center; margin-top: 10px; font-size: 11px; }
      .cutter-feed .thanks { font-weight: 800; font-size: 12px; margin: 3px 0; }
      .cutter-feed .store-name { font-weight: 800; font-size: 13px; text-transform: uppercase; }
      .cutter-feed .cut-indicator { font-size: 10px; margin-top: 4px; font-weight: bold; }
      .feed-space { height: ${settings?.printerAutoCut !== false ? '25mm' : '8mm'}; }
      .order-block { margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
      .order-header { font-weight: 800; font-size: 13px; }
      .order-details { font-size: 11px; margin: 2px 0; font-weight: 600; }
      .order-items { white-space: pre-wrap; font-size: 12px; margin: 4px 0; background: #fafafa; padding: 4px; font-weight: 600; }
      .order-total { text-align: right; font-weight: 800; font-size: 12px; }
      .total-sum { font-size: 14px; font-weight: 900; text-align: right; border-top: 2px solid #000; padding-top: 5px; margin-top: 10px; text-transform: uppercase; }
      .category-block { margin-top: 10px; }
      .category-title { font-weight: bold; font-size: 11px; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 5px; text-transform: uppercase; }
      .product-block { margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }
      .product-title { font-weight: bold; font-size: 11px; }
      .product-desc { font-size: 10px; color: #444; margin: 2px 0; }
      .product-catalog { font-size: 10px; font-style: italic; }
      .product-price { font-weight: bold; font-size: 11px; white-space: pre-wrap; margin-top: 2px; }
      .section-title { font-weight: bold; font-size: 11px; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 5px; text-transform: uppercase; }
      .summary-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #ccc; }
      .summary-row .title { max-width: 80%; }
      .summary-row .qty { font-weight: bold; }
    `;
  };

  const printTestReceipt = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    
    printWithIframe(`
      <html>
        <head>
          <title>Teste de Impressão Rongta 80mm - ${settings?.brandName || 'Sou Brazil'}</title>
          <style>
            ${getPrinterStyles()}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings?.brandName || 'Sou Brazil'}</h1>
            <p style="font-size: 10px; margin: 0; font-weight: bold;">TESTE DE IMPRESSÃO POS</p>
            <p style="font-size: 9px; margin: 2px 0 0 0;">MODELO: Rongta 3.150 in (80mm) Auto-Cut</p>
            <p style="font-size: 9px; margin: 0;">${dateStr}</p>
          </div>

          <div class="badge">TESTE DE COMUNICAÇÃO OK</div>

          <div class="section" style="margin-top: 6px;">
            <span class="label">LARGURA DO PAPEL:</span> <span class="value">80mm (3.150 in)</span><br/>
            <span class="label">ÁREA IMPRIMÍVEL:</span> <span class="value">72mm</span><br/>
            <span class="label">CORTE AUTOMÁTICO:</span> <span class="value">${settings?.printerAutoCut !== false ? 'ATIVADO (Avanço 25mm)' : 'DESATIVADO'}</span>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="label" style="margin-bottom: 3px;">EXEMPLO DE PRODUTO:</div>
            <div class="item-row">
              <div class="item-main">
                <span>1x MARMITA FITNESS G</span>
                <span>${currencySymbol} 28,00</span>
              </div>
              <div class="item-sub">• Frango Desfiado + Batata Doce</div>
              <div class="item-sub">• Brócolis e Cenoura ao Vapor</div>
            </div>
            <div class="item-row">
              <div class="item-main">
                <span>1x SUCO DETOX 500ML</span>
                <span>${currencySymbol} 9,50</span>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="total-section">
            <div>SUBTOTAL: ${currencySymbol} 37,50</div>
            <div>ENTREGA: ${currencySymbol} 0,00</div>
          </div>
          <div class="total">
            TOTAL: ${currencySymbol} 37,50
          </div>

          <div class="cutter-feed">
            <div class="double-divider"></div>
            <div class="thanks">*** IMPRESSÃO E CORTE OK! ***</div>
            <div class="store-name">${settings?.brandName || 'Sou Brazil'}</div>
            <div class="divider"></div>
            <div class="cut-indicator">- - - - - - CORTE AUTOMÁTICO - - - - - -</div>
            <div class="feed-space"></div>
          </div>
        </body>
      </html>
    `);
  };

  const printOrdersList = () => {
    const listTitle = orderTypeTab === 'b2b' 
      ? 'PEDIDOS CORPORATIVOS (B2B)' 
      : 'PEDIDOS VAREJO (RETAIL)';

    const contentHtml = filteredOrders.map((order, index) => {
      const itemsText = order.items.map(item => `  ${item.quantity}x ${item.title}${item.selectedSize ? ` (${item.selectedSize.name})` : ''}`).join('\n');
      const name = order.isB2B || order.isPJ ? (order.b2bCompanyName || order.customerName) : order.customerName;
      const deliveryDate = order.pickupDate ? order.pickupDate : 'N/A';
      
      return `
        <div class="order-block">
          <div class="order-header">#${index + 1} - ${name.toUpperCase()}</div>
          <div class="order-details">
            TEL: ${order.phone}<br/>
            ENTREGA: ${deliveryDate}
          </div>
          <div class="order-items">${itemsText}</div>
          <div class="order-total">TOTAL: ${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}</div>
        </div>
      `;
    }).join('');

    const totalSum = filteredOrders.reduce((sum, o) => sum + o.total, 0);

    printWithIframe(`
      <html>
        <head>
          <title>${listTitle}</title>
          <style>
            ${getPrinterStyles()}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${listTitle}</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Total de Pedidos: ${filteredOrders.length}</p>
          </div>
          ${contentHtml || '<div style="text-align: center; padding: 15px; color: #666;">Nenhum pedido encontrado.</div>'}
          <div class="total-sum">
            SOMA TOTAL: ${currencySymbol} ${totalSum.toFixed(2).replace('.', ',')}
          </div>
          <div class="cutter-feed">
            <div class="divider"></div>
            <div class="thanks">*** FIM DO RELATÓRIO ***</div>
            <div class="feed-space"></div>
          </div>
        </body>
      </html>
    `);
  };

  const printAllProductsList = () => {
    const groupedProducts = categories.map(cat => {
      const catProducts = products.filter(p => p.categoryId === cat.id);
      return {
        categoryTitle: cat.title,
        products: catProducts
      };
    }).filter(group => group.products.length > 0);

    const uncategorizedProducts = products.filter(p => !p.categoryId || !categories.some(cat => cat.id === p.categoryId));
    if (uncategorizedProducts.length > 0) {
      groupedProducts.push({
        categoryTitle: 'Sem Categoria',
        products: uncategorizedProducts
      });
    }

    const contentHtml = groupedProducts.map(group => {
      const productsHtml = group.products.map((product, idx) => {
        let priceStr = '';
        if (product.hasSizes && product.sizes && product.sizes.length > 0) {
          priceStr = product.sizes.map(s => `  - ${s.name}: ${currencySymbol} ${Number(s.price).toFixed(2).replace('.', ',')}`).join('\n');
        } else {
          priceStr = `  ${currencySymbol} ${Number(product.price || 0).toFixed(2).replace('.', ',')}`;
          if (product.oldPrice) {
            priceStr += ` (De: ${currencySymbol} ${Number(product.oldPrice).toFixed(2).replace('.', ',')})`;
          }
        }

        let catalogLabel = '';
        if (product.catalog === 'catalog1') {
          catalogLabel = settings?.catalog1Title || 'Catálogo 1';
        } else if (product.catalog === 'catalog2') {
          catalogLabel = settings?.catalog2Title || 'Catálogo 2';
        } else if (product.catalog === 'catalog3') {
          catalogLabel = settings?.catalog3Title || 'Catálogo 3';
        } else if (product.catalog === 'catalog4') {
          catalogLabel = settings?.catalog4Title || 'Catálogo 4';
        } else if (product.catalog === 'all') {
          catalogLabel = 'Todos';
        }

        const activeStatusText = product.isActive !== false ? 'ATIVO' : 'INATIVO';

        return `
          <div class="product-block">
            <div class="product-title">${idx + 1}. ${product.title.toUpperCase()} [${activeStatusText}]</div>
            ${product.description ? `<div class="product-desc">${product.description}</div>` : ''}
            ${catalogLabel ? `<div class="product-catalog">Catálogo: ${catalogLabel}</div>` : ''}
            <div class="product-price">${priceStr}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="category-block">
          <div class="category-title">${group.categoryTitle.toUpperCase()}</div>
          ${productsHtml}
        </div>
      `;
    }).join('');

    printWithIframe(`
      <html>
        <head>
          <title>Cardápio Completo</title>
          <style>
            ${getPrinterStyles()}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings?.brandName || 'Sou Brazil'}</h1>
            <p>Relatório de Produtos do Cardápio</p>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Total de Produtos: ${products.length}</p>
          </div>
          ${contentHtml || '<div style="text-align: center; padding: 15px; color: #666;">Nenhum produto cadastrado.</div>'}
          <div class="cutter-feed">
            <div class="divider"></div>
            <div class="thanks">*** FIM DO CARDÁPIO ***</div>
            <div class="feed-space"></div>
          </div>
        </body>
      </html>
    `);
  };

  const printProductionSummary = () => {
    const listTitle = orderTypeTab === 'b2b'
      ? 'RESUMO PRODUÇÃO - B2B'
      : 'RESUMO PRODUÇÃO - VAREJO';

    const itemsHtml = Object.entries(batchSummary.items).map(([title, qty]) => `
      <div class="summary-row">
        <span class="title">${title}</span>
        <span class="qty">${qty}x</span>
      </div>
    `).join('');

    const sidesHtml = Object.entries(batchSummary.sides).map(([name, qty]) => `
      <div class="summary-row">
        <span class="title">${name}</span>
        <span class="qty">${qty}x</span>
      </div>
    `).join('');

    const dateRangeText = (startDate || endDate) 
      ? `Período: ${startDate || 'Início'} até ${endDate || 'Fim'}`
      : 'Todos os Pedidos';

    printWithIframe(`
      <html>
        <head>
          <title>${listTitle}</title>
          <style>
            ${getPrinterStyles()}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${listTitle}</h1>
            <p>${dateRangeText}</p>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <div class="section">
            <div class="section-title">📦 TOTAL DE ITENS</div>
            <div>
              ${itemsHtml || '<div style="text-align: center; padding: 5px; color: #666;">Nenhum item no período.</div>'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">➕ ACOMPANHAMENTOS</div>
            <div>
              ${sidesHtml || '<div style="text-align: center; padding: 5px; color: #666;">Nenhum acompanhamento.</div>'}
            </div>
          </div>

          <div class="cutter-feed">
            <div class="divider"></div>
            <div class="thanks">*** RESUMO DE PRODUÇÃO ***</div>
            <div class="feed-space"></div>
          </div>
        </body>
      </html>
    `);
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingOrder) return;
    try {
      await updateDoc(doc(db, 'pedidos', isEditingOrder.id), editOrderForm);
      setIsEditingOrder(null);
    } catch (err) {
      alert('Erro ao atualizar pedido.');
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?slug=${settings?.slug || 'easy-menu'}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printOrder = (order: Order) => {
    const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('pt-BR') : 'N/A';
    const isPickup = order.orderType === 'pickup' || (order.address && order.address.toLowerCase().includes('retirada'));
    const isB2bOrder = order.isB2B || order.isPJ;
    
    let itemsHtml = order.items.map(item => {
      let optionsHtml = '';
      if (item.cakeOptions && (item.cakeOptions.size || item.cakeOptions.dough || item.cakeOptions.fillings)) {
        optionsHtml = `
          <div class="item-sub">
            ${item.cakeOptions.size ? `<div>TAMANHO: ${item.cakeOptions.size}</div>` : ''}
            ${item.cakeOptions.dough ? `<div>MASSA: ${item.cakeOptions.dough}</div>` : ''}
            ${item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0 ? `<div>RECHEIOS: ${item.cakeOptions.fillings.join(', ')}</div>` : ''}
            ${item.cakeOptions.topping ? `<div>COBERTURA: ${item.cakeOptions.topping}</div>` : ''}
            ${item.cakeOptions.topper ? `<div>TOPPER: ${item.cakeOptions.topper}</div>` : ''}
          </div>
        `;
      } else if (item.sandwichOptions && item.sandwichOptions.fillings && item.sandwichOptions.fillings.length > 0) {
        optionsHtml = `
          <div class="item-sub">
            <div>RECHEIOS: ${item.sandwichOptions.fillings.join(', ')}</div>
          </div>
        `;
      } else if (item.mealOptions) {
        optionsHtml = `
          <div class="item-sub">
            ${item.mealOptions.removals && item.mealOptions.removals.length > 0 ? `<div>REMOVER: ${item.mealOptions.removals.join(', ')}</div>` : ''}
            ${item.mealOptions.sides && item.mealOptions.sides.length > 0 ? `<div>ACOMPANHAMENTOS: ${item.mealOptions.sides.map(s => s.name).join(', ')}</div>` : ''}
          </div>
        `;
      }

      return `
        <div class="item-row">
          <div class="item-main">
            <span>${item.quantity}x ${item.title.toUpperCase()}${item.selectedSize ? ` (${item.selectedSize.name.toUpperCase()})` : ''}</span>
            <span>${currencySymbol} ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
          </div>
          ${optionsHtml}
        </div>
      `;
    }).join('');

    printWithIframe(`
      <html>
        <head>
          <title>Comanda #${order.id ? order.id.slice(0, 8).toUpperCase() : ''} - ${order.customerName}</title>
          <style>
            ${getPrinterStyles()}
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${settings?.brandName || "Sou Brazil"}</h2>
            ${settings?.slogan ? `<p style="font-style: italic;">${settings.slogan}</p>` : ''}
            <p>PEDIDO #${order.id ? order.id.slice(0, 8).toUpperCase() : 'NOVO'}</p>
            <p>${dateStr}</p>
          </div>
          
          <div class="badge">
            ${isB2bOrder 
              ? '🏢 PEDIDO CORPORATIVO (B2B)' 
              : (isPickup ? '🛍️ RETIRADA NO BALCÃO (PICKUP)' : '🚚 ENTREGA EM DOMICÍLIO (DELIVERY)')}
          </div>

          <div class="section" style="margin-top: 6px;">
            <span class="label">${isB2bOrder ? 'EMPRESA / RESPONSÁVEL:' : 'CLIENTE:'}</span>
            <span class="value">${(isB2bOrder && order.b2bCompanyName ? `${order.b2bCompanyName} (${order.customerName})` : order.customerName).toUpperCase()}</span>
          </div>
          
          <div class="section">
            <span class="label">TELEFONE / WHATSAPP:</span>
            <span class="value">${order.phone}</span>
          </div>
          
          ${order.email ? `
          <div class="section">
            <span class="label">EMAIL:</span>
            <span class="value">${order.email}</span>
          </div>
          ` : ''}

          ${order.pickupDate ? `
          <div class="section">
            <span class="label">${isPickup ? 'DATA DE RETIRADA:' : 'DATA DE ENTREGA:'}</span>
            <span class="value" style="font-weight: bold;">${order.pickupDate}</span>
          </div>
          ` : ''}
          
          <div class="section">
            <span class="label">${isPickup ? 'LOCAL DE RETIRADA (PICKUP):' : 'ENDEREÇO DE ENTREGA:'}</span>
            <span class="value">${(isPickup ? (settings?.pickupAddress || order.address || 'Balcão da Loja') : order.address).toUpperCase()}</span>
          </div>
          
          ${order.birthday ? `
          <div class="section">
            <span class="label">ANIVERSÁRIO DO CLIENTE:</span>
            <span class="value">${order.birthday}</span>
          </div>
          ` : ''}
          
          <div class="divider"></div>
          
          <div class="section">
            <div class="label" style="margin-bottom: 3px;">ITENS DO PEDIDO:</div>
            ${itemsHtml}
          </div>
          
          ${order.observation ? `
          <div class="divider"></div>
          <div class="section">
            <div class="label">OBSERVAÇÕES:</div>
            <div class="value" style="font-style: italic; background: #fafafa; padding: 2px;">${order.observation.toUpperCase()}</div>
          </div>
          ` : ''}
          
          <div class="divider"></div>
          
          ${(order.taxAmount && order.taxAmount > 0) ? `
          <div class="total-section">
            <div>SUBTOTAL: ${currencySymbol} ${(order.subtotal || (order.total - order.taxAmount)).toFixed(2).replace('.', ',')}</div>
            <div style="margin-top: 2px;">TAX (${order.taxRate || 8.25}%): + ${currencySymbol} ${order.taxAmount.toFixed(2).replace('.', ',')}</div>
          </div>
          ` : ''}
          
          <div class="total">
            TOTAL: ${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}
          </div>

          <div class="cutter-feed">
            <div class="double-divider"></div>
            <div class="thanks">*** OBRIGADO PELA PREFERÊNCIA! ***</div>
            <div class="store-name">${settings?.brandName || 'SOU FIT'}</div>
            ${settings?.whatsappNumber ? `<div style="font-size: 9px; margin-top: 2px;">WhatsApp: ${settings.whatsappNumber}</div>` : ''}
            <div class="divider"></div>
            <div class="cut-indicator">- - - - - - - CORTE AQUI - - - - - - -</div>
            <div class="feed-space"></div>
          </div>
        </body>
      </html>
    `);
  };

  const isBirthdayThisWeek = (birthdayStr: string, orderLanguage?: string) => {
    if (!birthdayStr) return false;
    
    // Expected format is strictly MM/DD, but we will add a smart fallback for legacy DD/MM
    const parts = birthdayStr.split('/');
    if (parts.length < 2) return false;
    
    let month = parseInt(parts[0]) - 1; // 0-indexed month
    let day = parseInt(parts[1]);
    
    // Smart Fallback: if the first part is greater than 12, it is definitely DD/MM
    if (parseInt(parts[0]) > 12) {
      day = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
    }
    
    if (isNaN(day) || isNaN(month) || month < 0 || month > 11) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    
    // Check multiple years to handle boundary conditions safely
    const checkDates = [
      new Date(currentYear - 1, month, day),
      new Date(currentYear, month, day),
      new Date(currentYear + 1, month, day)
    ];
    
    return checkDates.some(bday => {
      const diffTime = bday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Capture birthdays from 3 days ago up to 14 days in the future (generous "Aniversários da Semana" window)
      return diffDays >= -3 && diffDays <= 14;
    });
  };

  const orderBelongsToCatalog = (order: Order, catalogId: 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4') => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.some(item => {
      const prod = products.find(p => p.title === item.title);
      if (!prod) return false;
      const catObj = categories.find(c => c.id === prod.categoryId);
      if (!catObj) return false;
      const catVal = catObj.catalog || 'catalog1';
      return catVal === catalogId || catVal === 'both' || catVal === 'all';
    });
  };

  const filteredProducts = useMemo(() => {
    const query = productSearch.toLowerCase().trim();
    if (!query) return products;
    return products.filter(product => 
      product.title.toLowerCase().includes(query) || 
      (product.description || '').toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  const filteredCategoriesForReorder = useMemo(() => {
    return categories.filter(cat => {
      if (selectedReorderCatalog === 'all') return true;
      if (!cat.catalog || cat.catalog === 'both' || cat.catalog === 'all') return true;
      return cat.catalog === selectedReorderCatalog;
    });
  }, [categories, selectedReorderCatalog]);

  const activeReorderCategoryId = useMemo(() => {
    if (selectedReorderCategoryId !== 'all' && categories.some(c => c.id === selectedReorderCategoryId)) {
      return selectedReorderCategoryId;
    }
    return filteredCategoriesForReorder[0]?.id || '';
  }, [selectedReorderCategoryId, categories, filteredCategoriesForReorder]);

  const currentReorderCategory = useMemo(() => {
    return categories.find(c => c.id === activeReorderCategoryId);
  }, [categories, activeReorderCategoryId]);

  const productsForActiveCategory = useMemo(() => {
    if (!activeReorderCategoryId) return [];
    const list = products.filter(p => p.categoryId === activeReorderCategoryId);
    return [...list].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 9999;
      const orderB = typeof b.order === 'number' ? b.order : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [products, activeReorderCategoryId]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(orderSearch.toLowerCase());
    
    const parseDateString = (str: string, lang?: string) => {
      if (!str || !str.includes('/')) return null;
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      
      let month = parseInt(parts[0]);
      let day = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      // Always treat as MM/DD/YYYY by default (USA pattern), but if the first part (month) is > 12, it is definitely DD/MM/YYYY
      if (month > 12) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
      
      if (!day || !month || !year || month > 12) return null;
      const d = new Date(year, month - 1, day);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    let matchesDate = true;
    if (startDate || endDate) {
      // Try to use pickupDate first if available, otherwise use createdAt
      let orderDate: Date | null = null;
      if (order.pickupDate) {
        orderDate = parseDateString(order.pickupDate, order.orderLanguage || settings.language || 'pt');
      }
      
      if (!orderDate && order.createdAt?.toDate) {
        orderDate = order.createdAt.toDate();
        if (orderDate) {
          orderDate.setHours(0, 0, 0, 0);
        }
      }

      if (orderDate) {
        if (startDate && startDate.length === 10) {
          const start = parseDateString(startDate, settings.language || 'pt');
          if (start && orderDate < start) matchesDate = false;
        }
        if (endDate && endDate.length === 10) {
          const end = parseDateString(endDate, settings.language || 'pt');
          if (end && orderDate > end) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }

    if (selectedCalendarDate) {
      const orderDateKey = getOrderDateKey(order);
      if (orderDateKey !== selectedCalendarDate) {
        return false;
      }
    }

    if (orderStatusFilter !== 'all') {
      const currentStatus = order.status || 'pending';
      if (orderStatusFilter === 'delivered') {
        if (currentStatus !== 'delivered') return false;
      } else if (orderStatusFilter === 'pending' || orderStatusFilter === 'to_deliver') {
        if (currentStatus === 'delivered') return false;
      } else if (orderStatusFilter === 'pay_not_received') {
        if (order.paymentStatus === 'paid' || order.paymentStatus === 'integral' || order.paymentStatus === 'half' || order.paymentStatus === '50%') return false;
      } else if (orderStatusFilter === 'pay_half') {
        if (order.paymentStatus !== 'half' && order.paymentStatus !== '50%') return false;
      } else if (orderStatusFilter === 'pay_paid') {
        if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'integral') return false;
      } else if (currentStatus !== orderStatusFilter) {
        return false;
      }
    }
    
    const isB2bOrder = order.isB2B === true || order.isPJ === true;
    const matchesTab = orderTypeTab === 'b2b' ? isB2bOrder : !isB2bOrder;
    
    let matchesCatalog = true;
    if (selectedHistoryCatalog !== 'all') {
      matchesCatalog = orderBelongsToCatalog(order, selectedHistoryCatalog);
    }
    
    return matchesSearch && matchesDate && matchesTab && matchesCatalog;
  }).sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return timeB - timeA;
  });

  const batchSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    const sidesSummary: { [key: string]: number } = {};

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.title;
        summary[key] = (summary[key] || 0) + item.quantity;

        if (item.mealOptions?.sides) {
          item.mealOptions.sides.forEach(side => {
            sidesSummary[side.name] = (sidesSummary[side.name] || 0) + item.quantity;
          });
        }
      });
    });

    return { items: summary, sides: sidesSummary };
  }, [filteredOrders]);

  const currencySymbol = settings?.currency === 'USD' ? '$' : 'R$';

  if (!isLoggedIn) {
    return (
      <div className="flex-grow flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-3xl w-full max-w-md shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="h-24 w-24 flex items-center justify-center mb-4 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
              <img src={settings?.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-2xl font-serif font-bold opacity-90">Painel adm - Easy menu</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Senha de acesso"
              className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': settings?.primaryColor || '#865d39' } as any}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button 
              type="submit"
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all"
              style={{ 
                backgroundColor: settings?.primaryColor || '#865d39',
                color: getContrastText(settings?.primaryColor || '#865d39')
              }}
            >
              Entrar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col md:flex-row md:h-screen md:overflow-hidden text-gray-900">
      <div className="w-full md:w-64 glass border-r border-white/20 p-4 md:p-6 flex flex-col gap-4 md:gap-8 md:overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center rounded-full overflow-hidden border border-white/50 bg-white shadow-sm">
            <img src={settings?.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="font-serif font-bold text-lg opacity-90">{settings?.brandName || 'Easy Plate Menu'}</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'orders' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'orders' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <History size={20} /> Histórico de Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'customers' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'customers' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Users size={20} /> Clientes
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'categories' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'categories' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Layers size={20} /> Categorias
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'menu' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'menu' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Package size={20} /> Gerenciar Cardápio
          </button>

          <button 
            onClick={() => setActiveTab('reorder')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'reorder' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'reorder' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <ArrowUpDown size={20} /> Ordenar Cardápio
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'settings' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'settings' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <SettingsIcon size={20} /> Configurações
          </button>
        </nav>

        <button 
          onClick={() => {
            setIsLoggedIn(false);
            setIsAdmin(false);
            window.history.pushState({}, '', '/');
          }}
          className="mt-auto flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 transition-all font-bold"
        >
          <LogOut size={20} /> Sair
        </button>
      </div>

      <main className="flex-grow p-4 md:p-10 overflow-y-auto min-w-0 w-full">
        {activeTab === 'galleries' && (
          <div className="max-w-5xl space-y-8 pb-10">
            <div className="flex items-center justify-between border-b border-gray-200/50 pb-4">
              <div>
                <h1 className="text-3xl font-serif font-black" style={{ color: settings.primaryColor || '#865d39' }}>Galerias de Imagem</h1>
                <p className="text-sm text-black font-semibold opacity-100" style={{ color: '#000000' }}>Crie e gerencie até 6 galerias com 6 fotos cada para exibir como referências de estilo para bolos personalizados.</p>
              </div>
              <div>
                <button
                  type="button"
                  disabled={galleries.length >= 6}
                  onClick={async () => {
                    if (galleries.length >= 6) {
                      toast.error("O limite é de no máximo 6 galerias!");
                      return;
                    }
                    try {
                      await addDoc(collection(db, "galerias"), {
                        name: `Galeria ${galleries.length + 1}`,
                        images: ["", "", "", "", "", ""]
                      });
                      toast.success("Galeria criada com sucesso!");
                    } catch (e) {
                      toast.error("Erro ao criar galeria.");
                    }
                  }}
                className={cn(
                    "flex items-center gap-1.5 py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow border-0",
                    galleries.length >= 6 ? "bg-gray-400 text-white cursor-not-allowed" : "hover:scale-[1.02] cursor-pointer"
                  )}
                  style={galleries.length >= 6 ? {} : { 
                    backgroundColor: settings.primaryColor || '#865d39',
                    color: getContrastText(settings.primaryColor || '#865d39')
                  }}
                >
                  <Plus size={16} /> Criar Nova Galeria ({galleries.length}/6)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {galleries.map((gallery) => (
                <div key={gallery.id} className="glass p-6 rounded-3xl space-y-4 relative flex flex-col justify-between">
                  <div>
                    {/* Gallery Title Input and Delete Button */}
                    <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 mb-2">
                      <input
                        type="text"
                        value={gallery.name}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await updateDoc(doc(db, "galerias", gallery.id), {
                            name: val
                          });
                        }}
                        className="font-serif font-black text-lg bg-transparent border-b border-transparent hover:border-black/20 focus:border-black/50 focus:outline-none transition-all w-3/4 pb-0.5 text-black"
                        placeholder="Nome da Galeria"
                      />
                      {galleryIdToDelete === gallery.id ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await deleteDoc(doc(db, "galerias", gallery.id));
                                toast.success("Galeria removida com sucesso!");
                                setGalleryIdToDelete(null);
                              } catch (e) {
                                toast.error("Erro ao remover galeria.");
                              }
                            }}
                            className="px-2 py-1 text-xs text-white rounded-lg font-bold transition-all border-0 cursor-pointer shadow-sm"
                            style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryIdToDelete(null);
                            }}
                            className="px-2 py-1 text-xs text-black bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition-all border-0 cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGalleryIdToDelete(gallery.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors font-medium border-0 cursor-pointer"
                          title="Excluir Galeria"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Image uploads grid - 6 separate slots */}
                    <div className="bg-white/60 border border-white/30 rounded-2xl p-3 mt-2 shadow-sm">
                      <p className="text-[11px] font-bold text-gray-950 leading-relaxed text-center">
                        Gerencie as 6 imagens da galeria de forma independente abaixo. Clique em um espaço para fazer upload ou apague para remover.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 mt-3">
                      {[0, 1, 2, 3, 4, 5].map((index) => {
                        const currentImg = gallery.images?.[index] || "";
                        return (
                          <div key={index} className="flex flex-col items-center gap-1.5">
                            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/40 border border-black/10 flex items-center justify-center group shadow-sm">
                              {currentImg ? (
                                <>
                                  <img
                                    src={currentImg}
                                    alt={`Slot ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5 p-1">
                                    {/* Edit Upload */}
                                    <label className="p-1.5 bg-white text-gray-800 rounded-full cursor-pointer hover:scale-105 shadow hover:text-black">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          handleFileChange(e, async (b64) => {
                                            const updatedImages = [...(gallery.images || ["", "", "", "", "", ""])];
                                            updatedImages[index] = b64;
                                            await updateDoc(doc(db, "galerias", gallery.id), {
                                              images: updatedImages
                                            });
                                            toast.success(`Foto ${index + 1} alterada com sucesso!`);
                                          }, true);
                                        }}
                                      />
                                      <Edit2 size={12} />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const updatedImages = [...(gallery.images || ["", "", "", "", "", ""])];
                                        updatedImages[index] = "";
                                        await updateDoc(doc(db, "galerias", gallery.id), {
                                          images: updatedImages
                                        });
                                        toast.success(`Foto ${index + 1} removida!`);
                                      }}
                                      className="p-1.5 bg-red-500 text-white rounded-full hover:scale-105 shadow border-0 cursor-pointer"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-white/50 transition-colors p-2 text-center text-gray-500 hover:text-black select-none">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      handleFileChange(e, async (b64) => {
                                        const updatedImages = [...(gallery.images || ["", "", "", "", "", ""])];
                                        updatedImages[index] = b64;
                                        await updateDoc(doc(db, "galerias", gallery.id), {
                                          images: updatedImages
                                        });
                                        toast.success(`Foto ${index + 1} adicionada com sucesso!`);
                                      }, true);
                                    }}
                                  />
                                  <Plus size={16} className="text-gray-400" />
                                  <span className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-60">Enviar</span>
                                </label>
                              )}
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/60">Foto {index + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {galleries.length === 0 && (
                <div className="md:col-span-2 glass p-10 rounded-3xl text-center space-y-3">
                  <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-lg text-black">Nenhuma galeria criada</h3>
                    <p className="text-xs font-semibold text-gray-500 max-w-sm mx-auto leading-normal">Comece criando uma nova galeria de fotos separadas acima e vincule-a nos seus bolos personalizados!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cakeOptions' && (
          <div className="max-w-4xl space-y-8 pb-10">
            <div className="flex items-center justify-between border-b border-gray-200/50 pb-4">
              <div>
                <h1 className="text-3xl font-serif font-black" style={{ color: settings.primaryColor || '#865d39' }}>Opções de Bolos</h1>
                <p className="text-sm text-black font-semibold opacity-100" style={{ color: '#000000' }}>Gerencie tamanhos, massas, recheios, coberturas e toppers que poderão ser customizados pelo cliente.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TAMANHOS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Tamanhos / Fatias / Peso</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeSizes', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeSizes || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhum tamanho adicionado.</p>
                  ) : (
                    (settings.cakeSizes || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: 7 inches - 20 fatias - 1,5 kg"
                          onChange={(e) => updateCakeOptionItem('cakeSizes', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeSizes', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MASSAS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Tipos de Massa</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeDoughs', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeDoughs || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhuma massa adicionada.</p>
                  ) : (
                    (settings.cakeDoughs || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: Chocolate, Branca, Mesclado"
                          onChange={(e) => updateCakeOptionItem('cakeDoughs', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeDoughs', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RECHEIOS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <div className="space-y-1">
                    <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Recheios</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-black font-extrabold" style={{ color: '#000000' }}>Máximo de opções:</span>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        value={settings.cakeFillingsMax || 2}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setSettings(prev => ({ ...prev, cakeFillingsMax: val }));
                        }}
                        className="w-16 bg-white/60 border border-gray-200 py-1 px-2 rounded-lg text-sm text-center font-bold"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => addCakeOptionItem('cakeFillings', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeFillings || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhum recheio adicionado.</p>
                  ) : (
                    (settings.cakeFillings || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: Chocolate, Morango, Cereja, Abacaxi"
                          onChange={(e) => updateCakeOptionItem('cakeFillings', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeFillings', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* COBERTURAS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Coberturas</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeToppings', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeToppings || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhuma cobertura adicionada.</p>
                  ) : (
                    (settings.cakeToppings || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: Chocolate, Chantilly"
                          onChange={(e) => updateCakeOptionItem('cakeToppings', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeToppings', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TOPO DO BOLO */}
              <div className="glass p-6 rounded-3xl space-y-4 md:col-span-2">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Topo do Bolo (Topper)</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeToppers', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeToppers || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhum topo de bolo adicionado.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(settings.cakeToppers || []).map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input 
                            type="text"
                            value={item}
                            placeholder="Ex: Flores, Topper"
                            onChange={(e) => updateCakeOptionItem('cakeToppers', idx, e.target.value)}
                            className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                          />
                          <button 
                            onClick={() => removeCakeOptionItem('cakeToppers', idx)}
                            className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-4 font-extrabold rounded-2xl shadow-xl transition-all active:scale-[0.98] select-none hover:shadow-2xl cursor-pointer disabled:opacity-50"
                style={{ 
                  backgroundColor: settings.primaryColor || '#865d39',
                  color: getContrastText(settings.primaryColor || '#865d39')
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Salvar Opções de Bolos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8 pb-10">
            <h2 className="text-3xl font-serif font-bold">Configure seu app</h2>
            
            <div className="glass p-6 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">faça o upload do seu logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white p-1 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      <img src={settings?.logo} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="file" 
                        id="logo-upload"
                        accept="image/*"
                        onChange={e => handleFileChange(e, (b64) => setSettings({...settings, logo: b64}), 'logo')}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <label 
                          htmlFor="logo-upload"
                          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors text-black"
                        >
                          Selecionar Imagem
                        </label>
                        <button
                          type="button"
                          onClick={() => setSettings({...settings, logo: 'https://i.ibb.co/SXRBhD32/dende.png'})}
                          className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                        >
                          Remover Logo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.primaryColor || '#865d39'}
                      onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50"
                      value={settings?.primaryColor || ''}
                      onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor do Efeito Glass</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.glassColor?.startsWith('#') ? settings.glassColor : '#ffffff'}
                      onChange={e => setSettings(prev => ({...prev, glassColor: e.target.value}))}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50"
                      value={settings?.glassColor || ''}
                      onChange={e => setSettings(prev => ({...prev, glassColor: e.target.value}))}
                      placeholder="Ex: rgba(255, 255, 255, 0.4)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor da Fonte (Textos)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.textColor || '#000000'}
                      onChange={e => setSettings({...settings, textColor: e.target.value})}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50 text-black"
                      value={settings?.textColor || ''}
                      onChange={e => setSettings({...settings, textColor: e.target.value})}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor de "Ver Detalhes" e Preço</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.detailsColor || settings?.primaryColor || '#865d39'}
                      onChange={e => setSettings({...settings, detailsColor: e.target.value})}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50 text-black"
                      value={settings?.detailsColor || ''}
                      onChange={e => setSettings({...settings, detailsColor: e.target.value})}
                      placeholder={settings?.primaryColor || "#865d39"}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Slogan do App</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.slogan || ''}
                    onChange={e => setSettings({...settings, slogan: e.target.value})}
                    placeholder="Ex: O sabor que você merece..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Mensagem Final WhatsApp</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.whatsappClosingMessage || ''}
                    onChange={e => setSettings({...settings, whatsappClosingMessage: e.target.value})}
                    placeholder="Ex: Obrigada pelo pedido..."
                  />
                </div>
              </div>



              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Imagem de Fundo do App</label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {settings?.backgroundImage ? (
                        <img 
                          key={settings.backgroundImage}
                          src={settings.backgroundImage} 
                          alt="Background Preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Sem fundo</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="file" 
                        id="bg-upload"
                        accept="image/*"
                        onChange={e => handleFileChange(e, (b64) => setSettings(prev => ({...prev, backgroundImage: b64})), 'background')}
                        className="hidden"
                      />
                      <label 
                        htmlFor="bg-upload"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors text-black"
                      >
                        Fazer Upload
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-40">Ou cole o link da imagem direta</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 text-sm"
                      value={settings?.backgroundImage?.startsWith('data:image/') ? '' : (settings?.backgroundImage || '')}
                      onChange={e => setSettings(prev => ({...prev, backgroundImage: e.target.value}))}
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Nome da Marca</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.brandName || ''}
                    onChange={e => handleBrandNameChange(e.target.value)}
                    placeholder="Ex: Easy Plate Menu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Slug da Loja (URL)</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50"
                    value={settings?.slug || ''}
                    onChange={e => setSettings({...settings, slug: slugify(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">WhatsApp</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select 
                      className="p-3 rounded-xl border border-gray-300 bg-white font-bold w-full sm:w-auto"
                      value={settings?.whatsappCountryCode || '+55'}
                      onChange={e => setSettings({...settings, whatsappCountryCode: e.target.value})}
                    >
                      <option value="+55">+55 (BR)</option>
                      <option value="+1">+1 (US)</option>
                    </select>
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 w-full"
                      value={settings?.whatsappNumber || ''}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        const countryCode = settings?.whatsappCountryCode || '+55';
                        
                        if (countryCode === '+55') {
                          if (val.length > 11) val = val.slice(0, 11);
                          if (val.length > 7) val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                          else if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                        } else {
                          if (val.length > 10) val = val.slice(0, 10);
                          if (val.length > 6) val = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                          else if (val.length > 3) val = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                        }
                        
                        setSettings({...settings, whatsappNumber: val});
                      }}
                      placeholder={settings?.whatsappCountryCode === '+1' ? '(999) 999-9999' : '(99) 99999-9999'}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Senha do Painel Adm</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.adminPassword || ''}
                    onChange={e => setSettings({...settings, adminPassword: e.target.value})}
                    placeholder="admin123"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-serif font-bold text-black">Endereço de Retirada (Pickup) & Checkout</h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-black text-white uppercase tracking-wider">
                    Opção Pickup
                  </span>
                </div>
                
                <div className="space-y-2 bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-2xs">
                  <label className="text-sm font-black uppercase text-gray-800 flex items-center gap-2">
                    <span>📍</span>
                    <span>Endereço para Retirada (Exibido no Checkout quando o cliente escolhe PICKUP)</span>
                  </label>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Escreva aqui o endereço completo do seu estabelecimento. Quando o cliente selecionar a opção <strong>"Pickup"</strong> na tela de checkout, este endereço aparecerá para ele saber exatamente onde retirar o pedido.
                  </p>
                  <input 
                    type="text" 
                    className="w-full p-3.5 rounded-xl border-2 border-gray-300 focus:border-black focus:ring-0 outline-none bg-white font-bold text-sm text-black shadow-inner"
                    value={settings?.pickupAddress || ''}
                    onChange={e => setSettings({...settings, pickupAddress: e.target.value})}
                    placeholder="Ex: 123 Main Street, Suite 4B, Orlando, FL 32801"
                  />
                  {settings?.pickupAddress && (
                    <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Prévia no checkout:</span>
                      <strong className="text-black">{settings.pickupAddress}</strong>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Título do Checkout (Abaixo de "Detalhes do Pedido")</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.checkoutTitle || ''}
                    onChange={e => setSettings({...settings, checkoutTitle: e.target.value})}
                    placeholder="Ex: Ficamos muito felizes com seu pedido!..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 p-4 bg-white/50 rounded-2xl border border-gray-100">
                    <label className="text-xs font-bold uppercase opacity-60">Bloco Informativo 1</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm font-bold"
                      value={settings?.infoBlock1Title || ''}
                      onChange={e => setSettings({...settings, infoBlock1Title: e.target.value})}
                      placeholder="Título (Ex: CONFIRMAÇÃO DO PEDIDO)"
                    />
                    <textarea 
                      rows={3}
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                      value={settings?.infoBlock1Text || ''}
                      onChange={e => setSettings({...settings, infoBlock1Text: e.target.value})}
                      placeholder="Texto informativo..."
                    />
                  </div>
                  <div className="space-y-3 p-4 bg-white/50 rounded-2xl border border-gray-100">
                    <label className="text-xs font-bold uppercase opacity-60">Bloco Informativo 2</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm font-bold"
                      value={settings?.infoBlock2Title || ''}
                      onChange={e => setSettings({...settings, infoBlock2Title: e.target.value})}
                      placeholder="Título (Ex: RETIRADA NO LOCAL)"
                    />
                    <textarea 
                      rows={3}
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                      value={settings?.infoBlock2Text || ''}
                      onChange={e => setSettings({...settings, infoBlock2Text: e.target.value})}
                      placeholder="Texto informativo..."
                    />
                  </div>
                </div>
              </div>

              {/* BAIRROS E TAXAS DE ENTREGA (DELIVERY) */}
              <div className="glass p-6 rounded-2xl space-y-6 bg-white/90 shadow-sm border border-gray-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs border border-blue-100 shrink-0 mt-0.5">
                    <MapPin size={22} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold font-serif text-black">Bairros e Taxas de Entrega</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase tracking-wider">
                        {(settings?.deliveryZones || []).length} { (settings?.deliveryZones || []).length === 1 ? 'BAIRRO' : 'BAIRROS'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Cadastre os bairros atendidos e seus valores de taxa de entrega. O cliente selecionará o bairro no checkout e o valor será somado ao pedido automaticamente.
                    </p>
                  </div>
                </div>

                {/* Box de Cadastro / Edição */}
                <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                    {editingZoneId ? '✏️ Editar Bairro / Região' : '+ CADASTRAR NOVO BAIRRO / REGIÃO'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-gray-600">
                        NOME DO BAIRRO / REGIÃO
                      </label>
                      <input 
                        type="text"
                        placeholder="Ex: Centro, Jardim América, etc."
                        value={newZoneName}
                        onChange={e => setNewZoneName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveDeliveryZone();
                          }
                        }}
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-black focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-gray-600">
                        TAXA DE ENTREGA ({currencySymbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm pointer-events-none">
                          {currencySymbol}
                        </span>
                        <input 
                          type="text"
                          placeholder="0,00"
                          value={newZoneFeeInput}
                          onChange={e => {
                            // Suporte a digitação com vírgula e centavos
                            const val = e.target.value.replace(/[^0-9,.]/g, '');
                            setNewZoneFeeInput(val);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveDeliveryZone();
                            }
                          }}
                          className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-300 bg-white text-sm font-bold text-black focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDeliveryZone}
                        className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {editingZoneId ? <Check size={16} /> : <Plus size={16} />}
                        {editingZoneId ? 'Salvar' : '+ Adicionar Bairro'}
                      </button>
                      {editingZoneId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingZoneId(null);
                            setNewZoneName('');
                            setNewZoneFeeInput('');
                          }}
                          className="py-3 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Bairros Cadastrados */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                      BAIRROS CADASTRADOS PARA ENTREGA
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      Opção "Outro" (sem taxa fixa) é incluída automaticamente no checkout
                    </span>
                  </div>

                  {(!settings?.deliveryZones || settings.deliveryZones.length === 0) ? (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400 text-xs bg-gray-50/50">
                      Nenhum bairro cadastrado ainda. Preencha os campos acima para cadastrar os locais atendidos e suas taxas de entrega.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {[...settings.deliveryZones].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })).map(zone => (
                        <div 
                          key={zone.id} 
                          className="p-3.5 rounded-2xl border border-gray-200 bg-white flex items-center justify-between shadow-2xs hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                              <MapPin size={17} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase text-gray-900 tracking-wide truncate">
                                {zone.name}
                              </p>
                              <p className="text-xs font-bold text-blue-600 mt-0.5">
                                Taxa: {currencySymbol} {formatFeeWithComma(zone.fee)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingZoneId(zone.id);
                                setNewZoneName(zone.name);
                                setNewZoneFeeInput(formatFeeWithComma(zone.fee));
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDeliveryZone(zone.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CONFIGURAÇÃO DA TELA DE BOAS VINDAS (TELA 1) */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-lg text-black">Tela de Boas-Vindas (Apresentação)</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.introEnabled !== false}
                      onChange={e => setSettings({...settings, introEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-xs font-bold uppercase opacity-65 text-black">Ativada</span>
                  </label>
                </div>
                
                {settings?.introEnabled !== false && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Título Principal</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.introTitle || ''}
                          onChange={e => setSettings({...settings, introTitle: e.target.value})}
                          placeholder="Ex: Dendê Foods"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Texto do Botão</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.introButtonText || ''}
                          onChange={e => setSettings({...settings, introButtonText: e.target.value})}
                          placeholder="Ex: INICIAR OPERAÇÃO"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-50 text-black">Subtítulo Prato/Frase Cursiva</label>
                      <input 
                        type="text" 
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-sm font-medium bg-white"
                        value={settings?.introSubtitle || ''}
                        onChange={e => setSettings({...settings, introSubtitle: e.target.value})}
                        placeholder="Ex: From sacred nature to your plate"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-50 text-black">Texto de Apresentação (Pequeno)</label>
                      <textarea 
                        rows={2}
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                        value={settings?.introDescription || ''}
                        onChange={e => setSettings({...settings, introDescription: e.target.value})}
                        placeholder="Ex: Descrição sobre o propósito do restaurante..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-50 text-black">Texto Inferior (Rodapé)</label>
                      <input 
                        type="text" 
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-sm font-mono bg-white"
                        value={settings?.introBottomText || ''}
                        onChange={e => setSettings({...settings, introBottomText: e.target.value})}
                        placeholder="Ex: 100% ARTESANAL & AFRO-BRASILEIRO"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CONFIGURAÇÃO DO SELETOR DE CATÁLOGOS (TELA 2) */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-lg text-black">Seletor de Catálogos / Multi-Menu</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.selectorEnabled !== false}
                      onChange={e => setSettings({...settings, selectorEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-xs font-bold uppercase opacity-65 text-black">Ativado</span>
                  </label>
                </div>

                {settings?.selectorEnabled !== false && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Título Superior</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.selectorTitle || ''}
                          onChange={e => setSettings({...settings, selectorTitle: e.target.value})}
                          placeholder="Ex: Dendê Foods"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Subtítulo Informativo</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.selectorSubtitle || ''}
                          onChange={e => setSettings({...settings, selectorSubtitle: e.target.value})}
                          placeholder="Ex: Escolha sua experiência"
                        />
                      </div>
                    </div>

                    {/* Configuração do Catálogo 1 */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                        <span className="text-xs font-extrabold uppercase text-gray-600">Item do Catálogo 1 (Esquerda)</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings?.catalog1Active !== false}
                            onChange={e => setSettings({...settings, catalog1Active: e.target.checked})}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Nome do Catálogo 1</label>
                            <input 
                              type="text" 
                              className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                              value={settings?.catalog1Title || ''}
                              onChange={e => setSettings({...settings, catalog1Title: e.target.value})}
                              placeholder="Ex: Pratos Executivos"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Descrição/Resumo do Catálogo 1 (Abaixo da imagem)</label>
                            <input 
                              type="text" 
                              className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white text-black"
                              value={settings?.catalog1Desc || ''}
                              onChange={e => setSettings({...settings, catalog1Desc: e.target.value})}
                              placeholder="Ex: Almoços saudáveis e pratos"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Slogan do Catálogo 1 (Mostrado no cabeçalho do menu)</label>
                            <textarea 
                              rows={3}
                              className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white text-black font-medium resize-y"
                              value={settings?.catalog1Slogan || ''}
                              onChange={e => setSettings({...settings, catalog1Slogan: e.target.value})}
                              placeholder="Ex: Coleque cada frase em uma linha para que fiquem bem formatadas de forma legível!"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-75 text-gray-700 flex items-center justify-between">
                              <span>Quantidade Limite / Mínima de Itens para Pedido</span>
                              <span className="text-[9px] text-blue-600 font-semibold">(0 = sem limite)</span>
                            </label>
                            <input 
                              type="number" 
                              min="0"
                              className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white text-black"
                              value={settings?.catalog1MinItems ?? 8}
                              onChange={e => setSettings({...settings, catalog1MinItems: parseInt(e.target.value) || 0})}
                              placeholder="Ex: 8"
                            />
                          </div>
                        </div>
                        <div className="space-y flex flex-col items-center">
                          <label className="text-[9px] font-bold uppercase opacity-50 self-start text-gray-500">Imagem de Capa</label>
                          <div className="w-full h-20 rounded-lg bg-white border border-gray-300 flex items-center justify-center overflow-hidden mb-1 shadow-sm relative">
                            {settings?.catalog1Image ? (
                              <img src={settings.catalog1Image} alt="Cover 1" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-gray-400">Sem Imagem</span>
                            )}
                          </div>
                          <input 
                            type="file" 
                            id="catalog1-upload"
                            accept="image/*"
                            onChange={e => handleFileChange(e, (b64) => setSettings({...settings, catalog1Image: b64}), 'catalog')}
                            className="hidden"
                          />
                          <label 
                            htmlFor="catalog1-upload"
                            className="px-2 py-1 bg-white border border-gray-300 rounded text-[9px] font-bold cursor-pointer hover:bg-gray-50 text-black text-center w-full"
                          >
                            Selecionar
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Configuração do Catálogo 2 */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                        <span className="text-xs font-extrabold uppercase text-gray-600">Item do Catálogo 2 (Direita)</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                              className="sr-only peer" 
                              checked={settings?.catalog2Active !== false}
                              onChange={e => setSettings({...settings, catalog2Active: e.target.checked})}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 space-y-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Nome do Catálogo 2</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                                value={settings?.catalog2Title || ''}
                                onChange={e => setSettings({...settings, catalog2Title: e.target.value})}
                                placeholder="Ex: Bebidas & Sobremesas"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Descrição/Resumo do Catálogo 2 (Abaixo da imagem)</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white text-black"
                                value={settings?.catalog2Desc || ''}
                                onChange={e => setSettings({...settings, catalog2Desc: e.target.value})}
                                placeholder="Ex: Sucos refrescantes, bolos e doces"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Slogan do Catálogo 2 (Mostrado no cabeçalho do menu)</label>
                              <textarea 
                                rows={3}
                                className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white text-black font-medium resize-y"
                                value={settings?.catalog2Slogan || ''}
                                onChange={e => setSettings({...settings, catalog2Slogan: e.target.value})}
                                placeholder="Ex: Coloques cada frase em uma linha para que fiquem bem formatadas de forma legível!"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-75 text-gray-700 flex items-center justify-between">
                                <span>Quantidade Limite / Mínima de Itens para Pedido</span>
                                <span className="text-[9px] text-blue-600 font-semibold">(0 = sem limite)</span>
                              </label>
                              <input 
                                type="number" 
                                min="0"
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white text-black"
                                value={settings?.catalog2MinItems ?? 8}
                                onChange={e => setSettings({...settings, catalog2MinItems: parseInt(e.target.value) || 0})}
                                placeholder="Ex: 8"
                              />
                            </div>
                          </div>
                          <div className="space-y flex flex-col items-center">
                            <label className="text-[9px] font-bold uppercase opacity-50 self-start text-gray-500">Imagem de Capa</label>
                            <div className="w-full h-20 rounded-lg bg-white border border-gray-300 flex items-center justify-center overflow-hidden mb-1 shadow-sm relative">
                              {settings?.catalog2Image ? (
                                <img src={settings.catalog2Image} alt="Cover 2" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-gray-400">Sem Imagem</span>
                              )}
                            </div>
                            <input 
                              type="file" 
                              id="catalog2-upload"
                              accept="image/*"
                              onChange={e => handleFileChange(e, (b64) => setSettings({...settings, catalog2Image: b64}), 'catalog')}
                              className="hidden"
                            />
                            <label 
                              htmlFor="catalog2-upload"
                              className="px-2 py-1 bg-white border border-gray-300 rounded text-[9px] font-bold cursor-pointer hover:bg-gray-50 text-black text-center w-full"
                            >
                              Selecionar
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Configuração do Catálogo 3 */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                          <span className="text-xs font-extrabold uppercase text-gray-600">Botão do Terceiro Catálogo (Abaixo dos cards)</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={settings?.catalog3Active !== false}
                              onChange={e => setSettings({...settings, catalog3Active: e.target.checked})}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 space-y-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Texto Escrito no Botão (Catálogo 3)</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                                value={settings?.catalog3Title || ''}
                                onChange={e => setSettings({...settings, catalog3Title: e.target.value})}
                                placeholder="Ex: DIETAS PERSONALIZADAS"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Descrição/Resumo do Catálogo 3 (Abaixo do título no menu)</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white text-black"
                                value={settings?.catalog3Desc || ''}
                                onChange={e => setSettings({...settings, catalog3Desc: e.target.value})}
                                placeholder="Ex: Refeições personalizadas para sua dieta"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Slogan do Catálogo 3 (Mostrado no cabeçalho do menu)</label>
                              <textarea 
                                rows={3}
                                className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white text-black font-medium resize-y"
                                value={settings?.catalog3Slogan || ''}
                                onChange={e => setSettings({...settings, catalog3Slogan: e.target.value})}
                                placeholder="Ex: Coloques cada frase em uma linha para que fiquem bem formatadas de forma legível!"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-75 text-gray-700 flex items-center justify-between">
                                <span>Quantidade Limite / Mínima de Itens para Pedido</span>
                                <span className="text-[9px] text-blue-600 font-semibold">(0 = sem limite)</span>
                              </label>
                              <input 
                                type="number" 
                                min="0"
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white text-black"
                                value={settings?.catalog3MinItems ?? 2}
                                onChange={e => setSettings({...settings, catalog3MinItems: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})}
                                placeholder="Ex: 2"
                              />
                            </div>
                          </div>
                          <div className="space-y flex flex-col items-center">
                            <label className="text-[9px] font-bold uppercase opacity-50 self-start text-gray-500">Imagem de Capa (Circular no Menu)</label>
                            <div className="w-full h-20 rounded-lg bg-white border border-gray-300 flex items-center justify-center overflow-hidden mb-1 shadow-sm relative">
                              {settings?.catalog3Image ? (
                                <img src={settings.catalog3Image} alt="Cover 3" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-gray-400">Sem Imagem</span>
                              )}
                            </div>
                            <input 
                              type="file" 
                              id="catalog3-upload"
                              accept="image/*"
                              onChange={e => handleFileChange(e, (b64) => setSettings({...settings, catalog3Image: b64}), 'catalog')}
                              className="hidden"
                            />
                            <label 
                              htmlFor="catalog3-upload"
                              className="px-2 py-1 bg-white border border-gray-300 rounded text-[9px] font-bold cursor-pointer hover:bg-gray-50 text-black text-center w-full"
                            >
                              Selecionar
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Configuração do Catálogo 4 */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                          <span className="text-xs font-extrabold uppercase text-gray-600">Botão do Quarto Catálogo (Abaixo dos cards)</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={settings?.catalog4Active !== false}
                              onChange={e => setSettings({...settings, catalog4Active: e.target.checked})}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 space-y-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Texto Escrito no Botão (Catálogo 4)</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                                value={settings?.catalog4Title || ''}
                                onChange={e => setSettings({...settings, catalog4Title: e.target.value})}
                                placeholder="Ex: DIETAS HIPERTROFICAS"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Descrição/Resumo do Catálogo 4 (Abaixo do título no menu)</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white text-black"
                                value={settings?.catalog4Desc || ''}
                                onChange={e => setSettings({...settings, catalog4Desc: e.target.value})}
                                placeholder="Ex: Refeições com mais proteínas para hipertrofia"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Slogan do Catálogo 4 (Mostrado no cabeçalho do menu)</label>
                              <textarea 
                                rows={3}
                                className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white text-black font-medium resize-y"
                                value={settings?.catalog4Slogan || ''}
                                onChange={e => setSettings({...settings, catalog4Slogan: e.target.value})}
                                placeholder="Ex: Adicione slogans ou informações sobre as dietas hipertróficas"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-75 text-gray-700 flex items-center justify-between">
                                <span>Quantidade Limite / Mínima de Itens para Pedido</span>
                                <span className="text-[9px] text-blue-600 font-semibold">(0 = sem limite)</span>
                              </label>
                              <input 
                                type="number" 
                                min="0"
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white text-black"
                                value={settings?.catalog4MinItems ?? 2}
                                onChange={e => setSettings({...settings, catalog4MinItems: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})}
                                placeholder="Ex: 2"
                              />
                            </div>
                          </div>
                          <div className="space-y flex flex-col items-center">
                            <label className="text-[9px] font-bold uppercase opacity-50 self-start text-gray-500">Imagem de Capa (Circular no Menu)</label>
                            <div className="w-full h-20 rounded-lg bg-white border border-gray-300 flex items-center justify-center overflow-hidden mb-1 shadow-sm relative">
                              {settings?.catalog4Image ? (
                                <img src={settings.catalog4Image} alt="Cover 4" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-gray-400">Sem Imagem</span>
                              )}
                            </div>
                            <input 
                              type="file" 
                              id="catalog4-upload"
                              accept="image/*"
                              onChange={e => handleFileChange(e, (b64) => setSettings({...settings, catalog4Image: b64}), 'catalog')}
                              className="hidden"
                            />
                            <label 
                              htmlFor="catalog4-upload"
                              className="px-2 py-1 bg-white border border-gray-300 rounded text-[9px] font-bold cursor-pointer hover:bg-gray-50 text-black text-center w-full"
                            >
                              Selecionar
                            </label>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              <div className="glass rounded-3xl p-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-serif font-medium" style={{ color: settings?.textColor || 'inherit' }}>Seu Cardápio Digital está Online!</h3>
                  <p className="opacity-40 text-sm" style={{ color: settings?.textColor || 'inherit' }}>Compartilhe o link ou o QR Code abaixo com seus clientes:</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-grow w-full glass p-4 rounded-2xl font-mono text-xs break-all border border-white/10" style={{ color: settings?.textColor || 'inherit' }}>
                        {`${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`}
                      </div>
                      <button 
                        onClick={copyLink}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold transition-all uppercase tracking-wider text-xs active:scale-95 text-center cursor-pointer border border-white/10 hover:bg-white/5 whitespace-nowrap"
                        style={{ color: settings?.primaryColor || '#865d39' }}
                      >
                        {copied ? 'COPIADO!' : 'COPIAR LINK'}
                      </button>
                    </div>

                    <div className="text-xs opacity-50 space-y-2 leading-relaxed" style={{ color: settings?.textColor || 'inherit' }}>
                      <p>💡 <strong>Dica de Sucesso:</strong> Imprima o QR Code e coloque-o nas suas mesas, no balcão de atendimento ou nas embalagens de entrega para que os clientes acessem seu cardápio instantaneamente!</p>
                      <p>📸 Você também pode publicá-lo nos Stories do Instagram, enviar no WhatsApp ou colocar no link da sua bio.</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="p-3 bg-white rounded-xl shadow-md">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`)}`}
                        alt="QR Code do Cardápio" 
                        className="w-32 h-32 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const appLink = `${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`;
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(appLink)}`;
                          const response = await fetch(qrUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `qrcode-cardapio-${settings?.slug || 'menu'}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                          toast.success('QR Code baixado com sucesso!');
                        } catch (error) {
                          console.error('Error downloading QR code:', error);
                          const appLink = `${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`;
                          window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(appLink)}`, '_blank');
                        }
                      }}
                      className="w-full py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 cursor-pointer text-black shadow-sm"
                      style={{ backgroundColor: '#efedea', color: '#000000' }}
                    >
                      <Download size={14} className="text-black" />
                      <span className="text-black">Baixar QR Code</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Configuração da Impressora Térmica POS */}
              <div className="glass rounded-3xl p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Printer size={22} style={{ color: settings?.primaryColor || '#865d39' }} />
                      <h3 className="text-2xl font-serif font-medium" style={{ color: settings?.textColor || 'inherit' }}>
                        Impressora Térmica de Recibos / Comandas
                      </h3>
                    </div>
                    <p className="opacity-50 text-sm" style={{ color: settings?.textColor || 'inherit' }}>
                      Configurada especialmente para impressoras térmicas de 80mm (3.150 in) com cortador automático.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={printTestReceipt}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 border border-white/20 hover:bg-white/10 whitespace-nowrap shadow-sm cursor-pointer"
                    style={{ 
                      backgroundColor: settings?.primaryColor || '#865d39',
                      color: getContrastText(settings?.primaryColor || '#865d39')
                    }}
                  >
                    <Printer size={16} />
                    Testar Impressão (Rongta 80mm)
                  </button>
                </div>

                {/* Banner do modelo Rongta */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Ativa / Compatível
                      </span>
                      <span className="font-bold text-sm" style={{ color: settings?.textColor || 'inherit' }}>
                        {settings?.printerModel || 'Rongta POS 3.150 in (80mm) com Cortador Automático'}
                      </span>
                    </div>
                    <p className="text-xs opacity-60" style={{ color: settings?.textColor || 'inherit' }}>
                      Compatível com Windows, MacOS e Linux (Conexão USB / Ethernet / Serial)
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-lg bg-black/20 font-mono" style={{ color: settings?.textColor || 'inherit' }}>
                    Largura: 80mm / 3.150"
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider block opacity-70" style={{ color: settings?.textColor || 'inherit' }}>
                      Modelo / Formato do Recibo
                    </label>
                    <select
                      value={settings?.printerFormat || 'rongta80'}
                      onChange={(e) => setSettings(prev => ({ ...prev, printerFormat: e.target.value as any }))}
                      className="w-full glass p-3.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-black/30 text-white"
                    >
                      <option value="rongta80" className="bg-neutral-900 text-white">
                        🖨️ Rongta 80mm (3.150") Térmica POS com Auto-Corte [Recomendado]
                      </option>
                      <option value="thermal58" className="bg-neutral-900 text-white">
                        🖨️ Térmica 58mm (2.28") Padrão
                      </option>
                      <option value="a4" className="bg-neutral-900 text-white">
                        📄 Folha A4 Padrão (Impressora Convencional)
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider block opacity-70" style={{ color: settings?.textColor || 'inherit' }}>
                      Cortador Automático (Auto-Cutter)
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-xl glass border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={settings?.printerAutoCut !== false}
                        onChange={(e) => setSettings(prev => ({ ...prev, printerAutoCut: e.target.checked }))}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs" style={{ color: settings?.textColor || 'inherit' }}>
                        <strong>Avançar papel antes do corte:</strong> Garante que a lâmina do cortador automático não corte o texto do total ou rodapé do recibo.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Dica de configuração da impressora Rongta no computador */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 leading-relaxed" style={{ color: settings?.textColor || 'inherit' }}>
                  <div className="font-bold flex items-center gap-1.5 text-amber-400">
                    💡 Dica para Impressão Perfeita na Rongta (Windows / Mac / Linux):
                  </div>
                  <ol className="list-decimal list-inside space-y-1 opacity-90 pl-1">
                    <li>Na janela de impressão do navegador (Chrome, Edge ou Safari), selecione a sua impressora <strong>Rongta</strong> em <em>Destino</em>.</li>
                    <li>Em <em>Mais Definições</em>, selecione o tamanho do papel como <strong>80mm</strong> ou <strong>Roll Paper 80 x 297mm</strong>.</li>
                    <li>Em <em>Margens</em>, selecione <strong>Nenhuma</strong> (ou <em>Mínimas</em>).</li>
                    <li>Desmarque a caixa <strong>Cabeçalhos e rodapés</strong> para não imprimir a URL ou data do navegador na comanda.</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-4 pt-4 items-center">
                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Salvar Alterações
                </button>
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold shadow-sm border border-green-200"
                    >
                      <CheckCircle2 size={18} /> Salvo com sucesso!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}



        {activeTab === 'categories' && (
          <div className="max-w-2xl space-y-8">
            <h2 className="text-3xl font-serif font-bold">Gerenciar Categorias</h2>
            
            <form onSubmit={handleAddCategory} className="glass p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="Nome da categoria (Ex: Pratos Executivos)"
                  className="flex-grow p-3 rounded-xl border border-gray-300 w-full"
                  value={newCategory.title || ''}
                  onChange={e => setNewCategory({...newCategory, title: e.target.value})}
                />
                <select
                  className="p-3 rounded-xl border border-gray-300 bg-white font-bold text-gray-700 sm:w-64"
                  value={(newCategory.catalog === 'both' ? 'all' : newCategory.catalog) || 'all'}
                  onChange={e => setNewCategory({...newCategory, catalog: e.target.value as any})}
                >
                  <option value="all">Em Todos os 4 Cardápios</option>
                  <option value="catalog1">Apenas no {settings?.catalog1Title || 'Cardápio 1'}</option>
                  <option value="catalog2">Apenas no {settings?.catalog2Title || 'Cardápio 2'}</option>
                  <option value="catalog3">Apenas no {settings?.catalog3Title || 'Cardápio 3'}</option>
                  <option value="catalog4">Apenas no {settings?.catalog4Title || 'Cardápio 4'}</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  type="submit"
                  className="px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isEditingCategory ? <Save size={20} /> : <Plus size={20} />}
                  {isEditingCategory ? 'Salvar' : 'Adicionar'}
                </button>
                {isEditingCategory && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditingCategory(null);
                      setNewCategory({ title: '', order: 0, catalog: 'all' });
                    }}
                    className="px-6 py-3 rounded-xl bg-gray-200 font-bold cursor-pointer text-black"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              {categories.map((cat, idx) => (
                <motion.div 
                  layout
                  key={cat.id} 
                  className="glass p-4 rounded-xl flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => moveCategory(cat.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-white/50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveCategory(cat.id, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-1 hover:bg-white/50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="font-bold text-lg text-black">{cat.title}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/10 text-black/60 w-max">
                        {cat.catalog === 'catalog1' 
                          ? (settings?.catalog1Title || 'Cardápio 1') 
                          : cat.catalog === 'catalog2' 
                            ? (settings?.catalog2Title || 'Cardápio 2') 
                            : cat.catalog === 'catalog3'
                              ? (settings?.catalog3Title || 'Cardápio 3')
                              : cat.catalog === 'catalog4'
                                ? (settings?.catalog4Title || 'Cardápio 4')
                                : 'Todos os 4 Cardápios'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditingCategory(cat);
                        setNewCategory({ title: cat.title, order: cat.order || 0, catalog: (cat.catalog === 'both' ? 'all' : (cat.catalog || 'all')) as any });
                      }}
                      className="p-2.5 text-blue-600 hover:bg-blue-100/80 bg-blue-50/70 rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs"
                      title="Editar categoria"
                      aria-label="Editar categoria"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => deleteCategory(cat.id)}
                      className="p-2.5 text-red-600 hover:bg-red-100/80 bg-red-50/70 rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs"
                      title="Excluir categoria"
                      aria-label="Excluir categoria"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-serif font-bold">Gerenciar Cardápio</h2>
            </div>

            <form id="product-edit-form" onSubmit={handleAddProduct} className="glass p-8 rounded-2xl space-y-6 text-black">
              <h3 className="text-xl font-serif font-bold text-gray-900">{isEditingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Título do Produto</label>
                    <input 
                      id="product-title-input"
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white"
                      value={newProduct.title || ''}
                      onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                      placeholder="Ex: Prato Executivo de Frango"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Descrição</label>
                    <textarea 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white"
                      rows={3}
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="Detalhes do produto..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Preço Original (De) ({currencySymbol})</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold opacity-50 text-gray-600">{currencySymbol}</span>
                        <input 
                          type="text" 
                          className="w-full p-3 pl-10 rounded-xl border border-gray-300 bg-white"
                          value={oldPriceInput}
                          onChange={e => handleOldPriceChange(e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Preço Promocional (Por) ({currencySymbol})</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold opacity-50 text-gray-600">{currencySymbol}</span>
                        <input 
                          type="text" 
                          className="w-full p-3 pl-10 rounded-xl border border-gray-300 bg-white"
                          value={priceInput}
                          onChange={e => handlePriceChange(e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Categoria</label>
                    {categories.length === 0 ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-black">
                        <p className="text-xs text-red-700 font-bold leading-relaxed">
                          ⚠️ Nenhuma categoria cadastrada. Crie uma abaixo para poder cadastrar produtos:
                        </p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Ex: Hambúrgueres, Bebidas..." 
                            className="flex-grow p-2 text-xs rounded-lg border border-red-300 bg-white text-black"
                            id="quick-category-input"
                          />
                          <button 
                            type="button" 
                            onClick={async () => {
                              const input = document.getElementById('quick-category-input') as HTMLInputElement;
                              if (!input || !input.value.trim()) {
                                toast.error('Digite o nome da categoria.');
                                return;
                              }
                              const title = input.value.trim();
                              try {
                                await addDoc(collection(db, 'categorias'), {
                                  title,
                                  order: 0,
                                  catalog: 'both'
                                });
                                toast.success('Categoria adicionada com sucesso!');
                              } catch (err) {
                                toast.error('Erro ao adicionar categoria.');
                              }
                            }}
                            className="px-3 py-2 bg-[#865d39] text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-1"
                          >
                            <Plus size={12} /> Criar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black font-sans"
                        value={newProduct.categoryId}
                        onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}
                      >
                        <option value="">Selecionar categoria...</option>
                        {categories.map(cat => {
                          const catName = cat.catalog === 'catalog1' 
                            ? (settings?.catalog1Title || 'Cardápio 1') 
                            : cat.catalog === 'catalog2' 
                              ? (settings?.catalog2Title || 'Cardápio 2') 
                              : cat.catalog === 'catalog3'
                                ? (settings?.catalog3Title || 'Cardápio 3')
                                : cat.catalog === 'catalog4'
                                  ? (settings?.catalog4Title || 'Cardápio 4')
                                  : 'Todos os 4 Cardápios';
                          return (
                            <option key={cat.id} value={cat.id}>
                              {cat.title} — ({catName})
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Imagem do Produto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                        {newProduct.image ? (
                          <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="text-gray-300" size={32} />
                        )}
                      </div>
                      <input 
                        type="file" 
                        id="product-image"
                        accept="image/*"
                        onChange={e => handleFileChange(e, (b64) => setNewProduct({...newProduct, image: b64}))}
                        className="hidden"
                      />
                      <label 
                        htmlFor="product-image"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors text-black font-sans"
                      >
                        Selecionar Imagem
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 p-4 bg-white/50 rounded-2xl border border-gray-100">


                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-300"
                        checked={newProduct.isCustomSandwich || false}
                        onChange={e => {
                          const isChecked = e.target.checked;
                          setNewProduct({
                            ...newProduct, 
                            isCustomSandwich: isChecked, 
                            isMeal: false, 
                            isCustomCake: false,
                            customFillings: isChecked ? (newProduct.customFillings || 'Congelada, Natural') : newProduct.customFillings
                          });
                        }}
                      />
                      <span className="font-bold text-sm text-gray-800">Opção de Estado da Marmita (Congelada / Natural / Fresca)</span>
                    </label>

                    {newProduct.isCustomSandwich && (
                      <div className="space-y-4 pl-8 pt-1 text-black">
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-bold uppercase opacity-60 text-black">Opções de Estado Disponíveis (Separados por vírgula)</label>
                          <input 
                            type="text" 
                            className="w-full p-2.5 rounded-xl border border-gray-300 text-sm font-semibold bg-white text-black focus:outline-none"
                            value={newProduct.customFillings !== undefined && newProduct.customFillings !== '' ? newProduct.customFillings : 'Congelada, Natural'}
                            onChange={e => setNewProduct({...newProduct, customFillings: e.target.value})}
                            placeholder="Ex: Congelada, Natural"
                          />
                          <p className="text-[10px] text-gray-500 font-semibold leading-normal mt-0.5">
                            Digite as opções disponíveis separadas por vírgula. A quantidade máxima de opções que o cliente poderá escolher será definida pelo número no nome da variação (ex: se a variação for de 1 escolha, ele poderá selecionar até 1 opção).
                          </p>
                        </div>
                      </div>
                    )}


                    <label className="flex items-center gap-3 cursor-pointer mt-3 pt-3 border-t border-gray-200">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-300"
                        checked={!!newProduct.hasSizes}
                        onChange={e => {
                          const checked = e.target.checked;
                          setNewProduct({
                            ...newProduct,
                            hasSizes: checked,
                            sizes: newProduct.sizes || []
                          });
                        }}
                      />
                      <span className="font-bold text-sm text-gray-800">Habilitar Múltiplos Tamanhos, Quantidades ou Preços (Variações)</span>
                    </label>

                    {newProduct.hasSizes && (
                      <div className="space-y-4 pl-8 mt-2 text-black">
                        <div className="bg-white/40 p-4 rounded-xl border border-gray-200 space-y-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900 opacity-95">Adicionar Tamanho/Preço</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-gray-700 opacity-90">Nome da Opção</label>
                              <input 
                                type="text"
                                placeholder="Ex: Pequeno / 10 Pessoas"
                                className="w-full p-2 text-xs rounded-lg border border-gray-300 bg-white text-black font-sans"
                                value={sizeForm.name}
                                onChange={e => setSizeForm({ ...sizeForm, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-gray-700 opacity-90">Preço ({currencySymbol})</label>
                              <input 
                                type="text"
                                placeholder="0,00"
                                className="w-full p-2 text-xs rounded-lg border border-gray-300 bg-white text-black font-sans"
                                value={sizeForm.price}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  if (!digits) {
                                    setSizeForm({ ...sizeForm, price: '' });
                                    return;
                                  }
                                  const val = parseInt(digits) / 100;
                                  setSizeForm({ ...sizeForm, price: val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) });
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleAddSizeOption}
                              className="flex-grow py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              {editingSizeId ? (
                                <>
                                  <Save size={14} /> Salvar Alterações
                                </>
                              ) : (
                                <>
                                  <Plus size={14} /> Adicionar Opção de Tamanho
                                </>
                              )}
                            </button>
                            {editingSizeId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSizeId(null);
                                  setSizeForm({ name: '', price: '', oldPrice: '' });
                                }}
                                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* List of defined sizes */}
                        <div className="space-y-2">
                          {(newProduct.sizes || []).map((size, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3.5 bg-white/60 rounded-xl border border-gray-200">
                              <div>
                                <span className="font-bold text-xs text-black block">{size.name}</span>
                                <span className="text-[10px] text-gray-700 font-mono">
                                  Preço: {size.price && size.price > 0 ? `${currencySymbol} ${size.price.toFixed(2).replace('.', ',')}` : 'Sob Consulta (Sem valor)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSizeId(size.id);
                                    setSizeForm({
                                      name: size.name,
                                      price: (size.price && size.price > 0) ? size.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
                                      oldPrice: ''
                                    });
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingSizeId === size.id) {
                                      setEditingSizeId(null);
                                      setSizeForm({ name: '', price: '', oldPrice: '' });
                                    }
                                    setNewProduct({
                                      ...newProduct,
                                      sizes: (newProduct.sizes || []).filter((_, sIdx) => sIdx !== idx)
                                    });
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(newProduct.sizes || []).length === 0 && (
                            <div className="text-center p-4 bg-gray-50/20 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500">
                              Nenhum tamanho adicionado ainda. É necessário adicionar pelo menos 1 tamanho.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isEditingProduct ? <Save size={20} /> : <Plus size={20} />}
                  {isEditingProduct ? 'Salvar Alterações' : 'Adicionar ao Cardápio'}
                </button>
                {isEditingProduct && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditingProduct(null);
                      setNewProduct({ 
                        title: '', description: '', price: 0, oldPrice: 0, priceType: 'fixed',
                        image: '', categoryId: '', isMeal: false, isCustomCake: false, isCustomSandwich: false, customFillings: 'Congelada, Natural', ingredients: '', allowedSides: [], isActive: true,
                        hasSizes: false, sizes: []
                      });
                      setPriceInput('');
                      setOldPriceInput('');
                      setEditingSizeId(null);
                      setSizeForm({ name: '', price: '', oldPrice: '' });
                    }}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gray-200 font-bold text-black cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="glass p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar produto pelo nome..."
                  className="w-full p-3 pl-10 rounded-xl border border-gray-300 bg-white text-black"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={printAllProductsList}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-gray-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Printer size={18} /> Imprimir Todos os Produtos
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center p-12 glass rounded-2xl">
                <p className="text-gray-500 font-bold text-black opacity-60">Nenhum produto encontrado com a pesquisa atual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <motion.div 
                    layout
                    key={product.id} 
                    className={cn(
                      "glass rounded-2xl overflow-hidden flex flex-col border transition-all",
                      product.isActive === false ? "opacity-50 grayscale" : "border-white/20"
                    )}
                  >
                    <div className="h-48 relative">
                      <img src={product.image} alt={product.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button 
                          onClick={() => toggleProductStatus(product)}
                          className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-gray-700 hover:text-black"
                          title={product.isActive === false ? "Ativar" : "Desativar"}
                        >
                          {product.isActive === false ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button 
                          onClick={() => handleStartEditProduct(product)}
                          className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-blue-600 hover:bg-blue-50 cursor-pointer transition-all"
                          title="Editar prato"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteProduct(product.id)}
                          className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="p-5 flex-grow flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif font-bold text-lg">{product.title}</h4>
                        <div className="flex flex-col items-end">
                          {product.sizes && product.sizes.length > 0 ? (
                            <>
                              <span className="text-[10px] font-bold uppercase opacity-40">Tamanhos múltiplos</span>
                              <span className="font-bold text-blue-600">
                                A partir de: {currencySymbol} {Math.min(...product.sizes.map(s => s.price)).toFixed(2).replace('.', ',')}
                              </span>
                            </>
                          ) : (
                            <>
                              {product.price > 0 && product.oldPrice && product.oldPrice > 0 && (
                                <span className="text-xs line-through opacity-40">
                                  {currencySymbol} {product.oldPrice.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                              <span className="font-bold text-blue-600">
                                {currencySymbol} {(product.price > 0 ? product.price : (product.oldPrice || 0)).toFixed(2).replace('.', ',')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-sm opacity-60 line-clamp-2">{product.description}</p>
                      
                      {product.sizes && product.sizes.length > 0 && (
                        <div className="bg-black/5 p-2 rounded-xl text-[11px] space-y-1 mt-2">
                          <span className="font-bold opacity-60">Tamanhos:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {product.sizes.map((s, idx) => (
                              <span key={idx} className="bg-white/70 px-2 py-0.5 rounded border border-black/5 font-medium text-black">
                                {s.name} ({currencySymbol} {s.price.toFixed(2).replace('.', ',')})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-black/5">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                          {categories.find(c => c.id === product.categoryId)?.title || 'Sem categoria'}
                        </span>
                        <div className="flex gap-1.5">
                          {product.isMeal && (
                            <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase">
                              Opções de Personalização
                            </span>
                          )}
                          {product.sizes && product.sizes.length > 0 && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                              Múltiplos Tamanhos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reorder' && (
          <div className="space-y-6">
            {/* Header matching Image 2 */}
            <div className="bg-white/85 backdrop-blur-md p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-black/5">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                >
                  <ArrowUpDown size={24} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Ordenar Cardápio</h2>
                  <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                    Defina a sequência exata em que os pratos e combos aparecerão para os clientes no cardápio.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold transition-all shadow-xs cursor-pointer hover:shadow-sm shrink-0 active:scale-95"
              >
                <Package size={18} /> Ir para Cadastro de Pratos
              </button>
            </div>

            {/* Cardápio Selector & Category Selector Card matching Image 2 */}
            <div className="bg-white/85 backdrop-blur-md p-6 rounded-3xl space-y-5 shadow-sm border border-black/5">
              {/* Cardápio Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200/70">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Filtrar Cardápio:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReorderCatalog('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      selectedReorderCatalog === 'all'
                        ? "shadow-sm text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    style={selectedReorderCatalog === 'all' ? { backgroundColor: settings?.primaryColor || '#865d39' } : {}}
                  >
                    Todos os Cardápios
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReorderCatalog('catalog1')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      selectedReorderCatalog === 'catalog1'
                        ? "shadow-sm text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    style={selectedReorderCatalog === 'catalog1' ? { backgroundColor: settings?.primaryColor || '#865d39' } : {}}
                  >
                    {settings?.catalog1Title || 'Cardápio 1'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReorderCatalog('catalog2')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      selectedReorderCatalog === 'catalog2'
                        ? "shadow-sm text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    style={selectedReorderCatalog === 'catalog2' ? { backgroundColor: settings?.primaryColor || '#865d39' } : {}}
                  >
                    {settings?.catalog2Title || 'Cardápio 2'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReorderCatalog('catalog3')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      selectedReorderCatalog === 'catalog3'
                        ? "shadow-sm text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    style={selectedReorderCatalog === 'catalog3' ? { backgroundColor: settings?.primaryColor || '#865d39' } : {}}
                  >
                    {settings?.catalog3Title || 'Cardápio 3'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReorderCatalog('catalog4')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      selectedReorderCatalog === 'catalog4'
                        ? "shadow-sm text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    style={selectedReorderCatalog === 'catalog4' ? { backgroundColor: settings?.primaryColor || '#865d39' } : {}}
                  >
                    {settings?.catalog4Title || 'Cardápio 4'}
                  </button>
                </div>
              </div>

              {/* 1. Escolha a Categoria Para Reordenar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
                  <Layers size={16} /> 1. ESCOLHA A CATEGORIA PARA REORDENAR
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  {filteredCategoriesForReorder.length} categoria(s) cadastradas
                </span>
              </div>

              {filteredCategoriesForReorder.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Nenhuma categoria encontrada para o filtro selecionado.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {filteredCategoriesForReorder.map(cat => {
                    const isSelected = activeReorderCategoryId === cat.id;
                    const count = products.filter(p => p.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedReorderCategoryId(cat.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer border active:scale-95",
                          isSelected
                            ? "text-white border-transparent shadow-md"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        )}
                        style={isSelected ? { backgroundColor: settings?.primaryColor || '#283629' } : {}}
                      >
                        <span>{cat.title}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          isSelected ? "bg-white/25 text-white" : "bg-gray-100 text-gray-600"
                        )}>
                          {count} {count === 1 ? 'item' : 'itens'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Header Card matching Image 2 */}
            {currentReorderCategory && (
              <div className="bg-white/85 backdrop-blur-md p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-black/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center font-serif font-bold text-xl text-gray-800 shrink-0 shadow-2xs">
                    {currentReorderCategory.title.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-serif font-bold text-gray-900">{currentReorderCategory.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {productsForActiveCategory.length} {productsForActiveCategory.length === 1 ? 'prato ativo' : 'pratos ativos'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Use as setas para alterar a posição ou reordenar instantaneamente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSequentialNumbering(productsForActiveCategory)}
                    disabled={productsForActiveCategory.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 active:scale-95"
                    title="Renumerar itens sequencialmente (#1, #2, #3...)"
                  >
                    <ListOrdered size={16} /> Numerar Sequencial
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortAlphabetically(productsForActiveCategory)}
                    disabled={productsForActiveCategory.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 active:scale-95"
                    title="Ordenar em ordem alfabética de A a Z"
                  >
                    <Sparkles size={16} /> Ordem A-Z
                  </button>
                </div>
              </div>
            )}

            {/* Products List matching Image 2 */}
            {currentReorderCategory && productsForActiveCategory.length === 0 ? (
              <div className="bg-white/85 backdrop-blur-md p-12 rounded-3xl text-center space-y-3 border border-black/5 shadow-sm">
                <Package size={44} className="mx-auto text-gray-400 opacity-60" />
                <h4 className="font-serif font-bold text-lg text-gray-800">Nenhum produto nesta categoria</h4>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Esta categoria ainda não possui pratos cadastrados. Adicione pratos na aba "Gerenciar Cardápio".
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition-all cursor-pointer active:scale-95"
                  style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                >
                  <Plus size={16} /> Adicionar Produto
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {productsForActiveCategory.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layout
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="bg-white/85 backdrop-blur-md p-4 sm:p-5 rounded-3xl flex items-center justify-between gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all border border-black/5"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Left arrow column matching Image 2 */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveProduct(product.id, 'up', productsForActiveCategory)}
                          disabled={idx === 0}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 transition-colors cursor-pointer shadow-2xs active:scale-90"
                          title="Mover para cima"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProduct(product.id, 'down', productsForActiveCategory)}
                          disabled={idx === productsForActiveCategory.length - 1}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 transition-colors cursor-pointer shadow-2xs active:scale-90"
                          title="Mover para baixo"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </div>

                      {/* Position badge with position jump matching Image 2 */}
                      <button
                        type="button"
                        onClick={() => handleMoveToPosition(product, productsForActiveCategory)}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs sm:text-sm shrink-0 border border-gray-200 transition-colors cursor-pointer"
                        title="Clique para mudar a posição diretamente"
                      >
                        #{idx + 1}
                      </button>

                      {/* Product thumbnail image */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200 shadow-2xs">
                        {product.image ? (
                          <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>

                      {/* Product details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900 truncate">{product.title}</h4>
                          {product.sizes && product.sizes.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                              {product.sizes.length} variações
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                        )}
                        <div className="font-bold text-xs sm:text-sm text-gray-900">
                          {currencySymbol} {(product.price > 0 ? product.price : (product.oldPrice || 0)).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>

                    {/* Right actions matching Image 2 */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveProduct(product.id, 'up', productsForActiveCategory)}
                        disabled={idx === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer transition-colors"
                        title="Mover para cima"
                      >
                        <ChevronUp size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProduct(product.id, 'down', productsForActiveCategory)}
                        disabled={idx === productsForActiveCategory.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer transition-colors"
                        title="Mover para baixo"
                      >
                        <ChevronDown size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditProduct(product)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-90"
                        title="Editar produto no cadastro"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl font-serif font-bold">Histórico de Pedidos</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="MM/DD/AAAA"
                    className="pl-10 p-2 rounded-xl border border-gray-300 text-sm w-32"
                    value={startDate}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 8) val = val.slice(0, 8);
                      if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                      else if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      setStartDate(val);
                    }}
                  />
                </div>
                <span className="text-gray-400">até</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="MM/DD/AAAA"
                    className="pl-10 p-2 rounded-xl border border-gray-300 text-sm w-32"
                    value={endDate}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 8) val = val.slice(0, 8);
                      if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                      else if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      setEndDate(val);
                    }}
                  />
                </div>
                <button 
                  onClick={() => {
                    setShowBatchSummary(false);
                    setStartDate('');
                    setEndDate('');
                    setSelectedHistoryCatalog('all');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer",
                    (selectedHistoryCatalog === 'all' && !startDate && !endDate && !showBatchSummary) 
                      ? "bg-gray-800 text-white shadow-md" 
                      : "bg-white border border-gray-300 text-gray-600"
                  )}
                >
                  <History size={18} /> Todos os Pedidos
                </button>
                {settings?.catalog1Active !== false && (
                  <button 
                    onClick={() => {
                      setShowBatchSummary(false);
                      setSelectedHistoryCatalog('catalog1');
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer",
                      (selectedHistoryCatalog === 'catalog1' && !showBatchSummary) 
                        ? "bg-gray-800 text-white shadow-md" 
                        : "bg-white border border-gray-300 text-gray-600"
                    )}
                  >
                    {settings?.catalog1Title || 'Catálogo 1'}
                  </button>
                )}
                {settings?.catalog2Active !== false && (
                  <button 
                    onClick={() => {
                      setShowBatchSummary(false);
                      setSelectedHistoryCatalog('catalog2');
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer",
                      (selectedHistoryCatalog === 'catalog2' && !showBatchSummary) 
                        ? "bg-gray-800 text-white shadow-md" 
                        : "bg-white border border-gray-300 text-gray-600"
                    )}
                  >
                    {settings?.catalog2Title || 'Catálogo 2'}
                  </button>
                )}
                {settings?.catalog3Active !== false && (
                  <button 
                    onClick={() => {
                      setShowBatchSummary(false);
                      setSelectedHistoryCatalog('catalog3');
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer",
                      (selectedHistoryCatalog === 'catalog3' && !showBatchSummary) 
                        ? "bg-gray-800 text-white shadow-md" 
                        : "bg-white border border-gray-300 text-gray-600"
                    )}
                  >
                    {settings?.catalog3Title || 'Catálogo 3'}
                  </button>
                )}
                {settings?.catalog4Active !== false && (
                  <button 
                    onClick={() => {
                      setShowBatchSummary(false);
                      setSelectedHistoryCatalog('catalog4');
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer",
                      (selectedHistoryCatalog === 'catalog4' && !showBatchSummary) 
                        ? "bg-gray-800 text-white shadow-md" 
                        : "bg-white border border-gray-300 text-gray-600"
                    )}
                  >
                    {settings?.catalog4Title || 'Catálogo 4'}
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (!startDate || !endDate) {
                      toast.error('Por favor, selecione um intervalo de datas primeiro.');
                      return;
                    }
                    setShowBatchSummary(!showBatchSummary);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                    showBatchSummary ? "bg-blue-600 text-white shadow-md" : "bg-white border border-gray-300 text-gray-600"
                  )}
                >
                  <Layers size={18} /> Resumo de Produção
                </button>
                {showBatchSummary ? (
                  <button 
                    onClick={printProductionSummary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-md cursor-pointer"
                  >
                    <Printer size={18} /> Imprimir Resumo
                  </button>
                ) : (
                  <button 
                    onClick={printOrdersList}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-md cursor-pointer"
                  >
                    <Printer size={18} /> Imprimir Lista
                  </button>
                )}
              </div>
            </div>

            {/* --- CALENDÁRIO DE PEDIDOS (MENSAL, SEMANAL, DIÁRIO) & BOTÃO NOVO PEDIDO MANUAL --- */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-md space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-white/70 shadow-sm border border-black/5 text-gray-800">
                    <CalendarDays size={22} style={{ color: settings?.primaryColor || '#865d39' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-gray-900 capitalize">
                      {calendarViewMode === 'month' && calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      {calendarViewMode === 'week' && (() => {
                        const start = new Date(calendarMonth);
                        start.setDate(start.getDate() - start.getDay());
                        const end = new Date(start);
                        end.setDate(end.getDate() + 6);
                        return `Semana de ${start.getDate()}/${start.getMonth() + 1} a ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
                      })()}
                      {calendarViewMode === 'day' && calendarMonth.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {calendarViewMode === 'month' && 'Visão Mensal • Clique nos pedidos para ver detalhes ou no dia para filtrar'}
                      {calendarViewMode === 'week' && 'Visão Semanal • Visualize os pedidos de cada dia da semana selecionada'}
                      {calendarViewMode === 'day' && 'Visão Diária • Agenda detalhada dos pedidos do dia'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Seletor de Modo do Calendário: Mensal / Semanal / Diário */}
                  <div className="flex items-center p-1 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode('month')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        calendarViewMode === 'month'
                          ? "bg-gray-900 text-white shadow-xs"
                          : "text-gray-600 hover:text-black"
                      )}
                    >
                      Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode('week')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        calendarViewMode === 'week'
                          ? "bg-gray-900 text-white shadow-xs"
                          : "text-gray-600 hover:text-black"
                      )}
                    >
                      Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode('day')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        calendarViewMode === 'day'
                          ? "bg-gray-900 text-white shadow-xs"
                          : "text-gray-600 hover:text-black"
                      )}
                    >
                      Diário
                    </button>
                  </div>

                  {/* Navegação < e > adaptada ao modo */}
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMonth(prev => {
                        const d = new Date(prev);
                        if (calendarViewMode === 'month') d.setMonth(d.getMonth() - 1);
                        else if (calendarViewMode === 'week') d.setDate(d.getDate() - 7);
                        else d.setDate(d.getDate() - 1);
                        return d;
                      });
                    }}
                    className="p-2 rounded-xl bg-white/80 hover:bg-white border border-gray-200 text-gray-700 transition-colors shadow-sm cursor-pointer"
                    title="Anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setCalendarMonth(today);
                      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      setSelectedCalendarDate(key);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-gray-200 text-gray-700 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Hoje
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate(null)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer",
                      selectedCalendarDate === null 
                        ? "bg-gray-800 text-white" 
                        : "bg-white/80 hover:bg-white border border-gray-200 text-gray-700"
                    )}
                  >
                    Todos
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMonth(prev => {
                        const d = new Date(prev);
                        if (calendarViewMode === 'month') d.setMonth(d.getMonth() + 1);
                        else if (calendarViewMode === 'week') d.setDate(d.getDate() + 7);
                        else d.setDate(d.getDate() + 1);
                        return d;
                      });
                    }}
                    className="p-2 rounded-xl bg-white/80 hover:bg-white border border-gray-200 text-gray-700 transition-colors shadow-sm cursor-pointer"
                    title="Próximo"
                  >
                    <ChevronRight size={18} />
                  </button>
                  
                  {/* Botão de Adicionar Pedido Manual */}
                  <button
                    type="button"
                    onClick={() => setIsCreatingManualOrder(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:scale-105 active:scale-95 transition-all ml-auto cursor-pointer"
                    style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                  >
                    <Plus size={16} /> Adicionar Pedido Manual
                  </button>
                </div>
              </div>

              {/* Corpo do Calendário conforme o modo (Mensal, Semanal, Diário) */}
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-black/5 shadow-inner">
                {/* --- MODO MENSAL COM VISUALIZAÇÃO INTERATIVA DOS PEDIDOS --- */}
                {calendarViewMode === 'month' && (
                  <>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="py-1">{d}</div>
                      ))}
                    </div>

                    {(() => {
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const firstDayIndex = new Date(year, month, 1).getDay();
                      const totalDays = new Date(year, month + 1, 0).getDate();
                      const today = new Date();
                      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                      const cells = [];
                      for (let i = 0; i < firstDayIndex; i++) {
                        cells.push(<div key={`empty-${i}`} className="min-h-[105px] sm:min-h-[120px] rounded-xl bg-gray-50/40 opacity-40 border border-transparent" />);
                      }

                      for (let day = 1; day <= totalDays; day++) {
                        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayOrders = orders.filter(o => getOrderDateKey(o) === dateKey);
                        const count = dayOrders.length;
                        const isSelected = selectedCalendarDate === dateKey;
                        const isToday = dateKey === todayKey;

                        cells.push(
                          <div
                            key={day}
                            onClick={() => setSelectedCalendarDate(prev => prev === dateKey ? null : dateKey)}
                            className={cn(
                              "min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-start relative group shadow-xs",
                              isSelected
                                ? "bg-amber-50/90 border-2 border-amber-500 shadow-md ring-2 ring-amber-300/40"
                                : isToday
                                  ? "bg-blue-50/70 border-blue-300 hover:border-blue-400"
                                  : count > 0
                                    ? "bg-amber-50/30 border-amber-200/80 hover:bg-amber-50/60"
                                    : "bg-white/70 border-gray-200/70 hover:bg-white"
                            )}
                          >
                            {/* Topo da Célula */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                                isToday 
                                  ? "bg-blue-600 text-white shadow-xs" 
                                  : isSelected
                                    ? "bg-amber-600 text-white"
                                    : "text-gray-700"
                              )}>
                                {day}
                              </span>

                              {count > 0 && (
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                                  isSelected ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-900 border border-amber-300/60"
                                )}>
                                  {count} {count === 1 ? 'ped' : 'peds'}
                                </span>
                              )}
                            </div>

                            {/* Lista de Pedidos dentro do Dia do Calendário */}
                            <div className="space-y-1 w-full overflow-hidden mt-0.5">
                              {dayOrders.slice(0, 2).map(ord => {
                                const st = STATUS_CONFIG[ord.status || 'pending'] || STATUS_CONFIG.pending;
                                return (
                                  <div
                                    key={ord.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrderForModal(ord);
                                    }}
                                    className={cn(
                                      "w-full text-left px-1.5 py-0.5 rounded-lg text-[10px] truncate border shadow-2xs transition-all hover:scale-[1.02] flex items-center justify-between gap-1 cursor-pointer font-bold",
                                      st.bg, st.text, st.border
                                    )}
                                    title={`Abrir Pedido #${ord.id.slice(-5).toUpperCase()}: ${ord.customerName} - ${currencySymbol} ${ord.total.toFixed(2)}`}
                                  >
                                    <span className="truncate flex items-center gap-0.5">
                                      <span>{ord.orderType === 'pickup' ? '🛍️' : '🛵'}</span>
                                      <span className="truncate font-semibold">{ord.customerName}</span>
                                    </span>
                                    <span className="shrink-0 font-black font-mono text-[9px]">
                                      {currencySymbol}{Math.round(ord.total)}
                                    </span>
                                  </div>
                                );
                              })}

                              {count > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCalendarDate(dateKey);
                                  }}
                                  className="w-full text-[9px] font-extrabold text-blue-700 bg-blue-100/80 hover:bg-blue-200 px-1 py-0.5 rounded-md text-center transition-colors cursor-pointer"
                                >
                                  +{count - 2} mais
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return <div className="grid grid-cols-7 gap-1 sm:gap-2">{cells}</div>;
                    })()}
                  </>
                )}

                {/* --- MODO SEMANAL (COLUNAS DOS DIAS COM CARDS DE PEDIDOS) --- */}
                {calendarViewMode === 'week' && (
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 overflow-x-auto pb-2">
                    {(() => {
                      const start = new Date(calendarMonth);
                      start.setDate(start.getDate() - start.getDay());
                      const today = new Date();
                      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const weekDaysLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

                      return weekDaysLabels.map((dayName, index) => {
                        const curDate = new Date(start);
                        curDate.setDate(curDate.getDate() + index);
                        const dateKey = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
                        const dayOrders = orders.filter(o => getOrderDateKey(o) === dateKey);
                        const isSelected = selectedCalendarDate === dateKey;
                        const isToday = dateKey === todayKey;
                        const dayTotal = dayOrders.reduce((sum, o) => sum + o.total, 0);

                        return (
                          <div
                            key={index}
                            className={cn(
                              "rounded-2xl p-2.5 sm:p-3 border transition-all flex flex-col justify-start min-h-[260px] shadow-xs",
                              isSelected
                                ? "bg-amber-50/90 border-2 border-amber-500 shadow-md ring-2 ring-amber-300/40"
                                : isToday
                                  ? "bg-blue-50/60 border-blue-300"
                                  : "bg-white/80 border-gray-200/80"
                            )}
                          >
                            {/* Cabeçalho da Coluna do Dia */}
                            <div 
                              onClick={() => setSelectedCalendarDate(prev => prev === dateKey ? null : dateKey)}
                              className="pb-2 mb-2 border-b border-gray-200/80 cursor-pointer flex items-center justify-between"
                            >
                              <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                                  {dayName.slice(0, 3)}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                                    isToday ? "bg-blue-600 text-white" : "text-gray-900"
                                  )}>
                                    {curDate.getDate()}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-bold">
                                    {curDate.toLocaleDateString('pt-BR', { month: 'short' })}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 block">
                                  {dayOrders.length} {dayOrders.length === 1 ? 'ped' : 'peds'}
                                </span>
                                {dayTotal > 0 && (
                                  <span className="text-[9px] font-black text-emerald-700 block mt-0.5">
                                    {currencySymbol}{Math.round(dayTotal)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Cards de Pedidos na Coluna Semanal */}
                            <div className="space-y-2 flex-grow overflow-y-auto max-h-[380px] pr-0.5">
                              {dayOrders.length > 0 ? (
                                dayOrders.map(ord => {
                                  const st = STATUS_CONFIG[ord.status || 'pending'] || STATUS_CONFIG.pending;
                                  return (
                                    <div
                                      key={ord.id}
                                      onClick={() => setSelectedOrderForModal(ord)}
                                      className="p-2.5 rounded-xl bg-white border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-gray-400 transition-all cursor-pointer space-y-1 text-left group"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-900 text-white">
                                          #{ord.id.slice(-5).toUpperCase()}
                                        </span>
                                        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border", st.bg, st.text, st.border)}>
                                          {st.icon} {st.label}
                                        </span>
                                      </div>

                                      <div className="font-black text-xs text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                        {ord.customerName}
                                      </div>

                                      <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                                        <span>{ord.orderType === 'pickup' ? '🛍️ Retirada' : '🛵 Delivery'}</span>
                                        {ord.pickupDate && <span>• {ord.pickupDate}</span>}
                                      </div>

                                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                                        <span className="text-[10px] font-bold text-gray-500">
                                          {ord.items.reduce((s, it) => s + it.quantity, 0)}x itens
                                        </span>
                                        <span className="font-black text-gray-900" style={{ color: settings?.primaryColor || '#865d39' }}>
                                          {currencySymbol} {ord.total.toFixed(2).replace('.', ',')}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-gray-400 text-[11px] my-auto">
                                  Sem pedidos
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* --- MODO DIÁRIO (AGENDA DO DIA SELECIONADO) --- */}
                {calendarViewMode === 'day' && (
                  <div className="space-y-4">
                    {(() => {
                      const dateKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(calendarMonth.getDate()).padStart(2, '0')}`;
                      const dayOrders = orders.filter(o => getOrderDateKey(o) === dateKey);
                      const dayTotal = dayOrders.reduce((sum, o) => sum + o.total, 0);
                      const deliveryCount = dayOrders.filter(o => o.orderType === 'delivery').length;
                      const pickupCount = dayOrders.filter(o => o.orderType === 'pickup').length;
                      const isSelected = selectedCalendarDate === dateKey;

                      return (
                        <>
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-white/80 rounded-2xl border border-gray-200">
                            <div className="space-y-1 text-center sm:text-left">
                              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                {calendarMonth.toLocaleDateString('pt-BR', { weekday: 'long' })}
                              </span>
                              <h4 className="text-2xl font-serif font-black text-gray-900">
                                {calendarMonth.getDate()} de {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 font-bold text-gray-800">
                                  📦 {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black">
                                  💰 Total: {currencySymbol} {dayTotal.toFixed(2).replace('.', ',')}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold">
                                  🛵 {deliveryCount} Delivery
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold">
                                  🛍️ {pickupCount} Retirada
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedCalendarDate(isSelected ? null : dateKey)}
                              className={cn(
                                "px-5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer",
                                isSelected
                                  ? "bg-gray-900 text-white"
                                  : "bg-amber-500 hover:bg-amber-600 text-white"
                              )}
                            >
                              {isSelected ? '✓ Filtrando Este Dia' : 'Filtrar Este Dia'}
                            </button>
                          </div>

                          {/* Lista dos pedidos do dia selecionado */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dayOrders.map(ord => {
                              const st = STATUS_CONFIG[ord.status || 'pending'] || STATUS_CONFIG.pending;
                              return (
                                <div
                                  key={ord.id}
                                  onClick={() => setSelectedOrderForModal(ord)}
                                  className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex justify-between items-center gap-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-gray-900 text-white">
                                        #{ord.id.slice(-5).toUpperCase()}
                                      </span>
                                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded border", st.bg, st.text, st.border)}>
                                        {st.icon} {st.label}
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-500">
                                        {ord.orderType === 'pickup' ? '🛍️ Retirada' : '🛵 Delivery'}
                                      </span>
                                    </div>
                                    <h5 className="font-black text-sm text-gray-900">{ord.customerName}</h5>
                                    <p className="text-xs text-gray-500 line-clamp-1">
                                      {ord.items.map(it => `${it.quantity}x ${it.title}`).join(', ')}
                                    </p>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-base font-black text-gray-900 block" style={{ color: settings?.primaryColor || '#865d39' }}>
                                      {currencySymbol} {ord.total.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-[10px] font-extrabold text-blue-600 underline">
                                      Ver Detalhes 👁️
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {dayOrders.length === 0 && (
                              <div className="col-span-full p-8 text-center text-gray-400 text-xs bg-white/50 rounded-2xl border border-dashed border-gray-200">
                                Nenhum pedido registrado para este dia.
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Barra de Filtro de Status Rápido */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1">Entrega:</span>
                  {[
                    { id: 'all', label: 'Todos', count: orders.length },
                    { id: 'pending', label: '⏳ A Entregar', count: orders.filter(o => !o.status || o.status !== 'delivered').length },
                    { id: 'delivered', label: '✓ Entregue', count: orders.filter(o => o.status === 'delivered').length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOrderStatusFilter(tab.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        orderStatusFilter === tab.id
                          ? "bg-gray-900 text-white shadow-sm"
                          : "bg-white/70 hover:bg-white text-gray-600 border border-black/5"
                      )}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}

                  <span className="text-gray-300 mx-1">|</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1">Pagamento:</span>
                  {[
                    { id: 'pay_not_received', label: '❌ Não Rec.', count: orders.filter(o => !o.paymentStatus || o.paymentStatus === 'pending' || o.paymentStatus === 'not_received').length },
                    { id: 'pay_half', label: '🪙 50%', count: orders.filter(o => o.paymentStatus === 'half' || o.paymentStatus === '50%').length },
                    { id: 'pay_paid', label: '✓ Integral', count: orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'integral').length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOrderStatusFilter(orderStatusFilter === tab.id ? 'all' : tab.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        orderStatusFilter === tab.id
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white/70 hover:bg-white text-gray-600 border border-black/5"
                      )}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                {selectedCalendarDate && (
                  <div className="flex items-center gap-2 text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-xl font-bold border border-amber-300">
                    <span>📅 Filtrando dia: {selectedCalendarDate.split('-').reverse().join('/')} ({filteredOrders.length} pedidos)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDate(null)}
                      className="text-amber-800 hover:text-black font-extrabold ml-1 cursor-pointer"
                    >
                      ✕ Limpar Filtro
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Busca de Pedido & Alternador de Formato (Tabela, Cards, Kanban) */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, telefone ou ID..."
                  className="w-full p-2.5 pl-10 rounded-xl border border-gray-300 text-sm bg-white text-gray-900"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                />
              </div>

              {/* Alternador de Formato de Visualização: Tabela (Padrão) / Cards / Kanban */}
              <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-200 shadow-2xs self-stretch md:self-auto justify-center">
                <button
                  type="button"
                  onClick={() => setOrderViewFormat('table')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    orderViewFormat === 'table'
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  )}
                  title="Formato Tabela de Pedidos (Padrão)"
                >
                  <LayoutList size={14} /> Tabela
                </button>
                <button
                  type="button"
                  onClick={() => setOrderViewFormat('cards')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    orderViewFormat === 'cards'
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  )}
                  title="Formato Cards de Pedidos"
                >
                  <LayoutGrid size={14} /> Cards
                </button>
                <button
                  type="button"
                  onClick={() => setOrderViewFormat('kanban')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    orderViewFormat === 'kanban'
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  )}
                  title="Formato Kanban por Status"
                >
                  <Kanban size={14} /> Kanban
                </button>
              </div>
            </div>

            {showBatchSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="glass p-6 rounded-2xl space-y-4">
                  <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Total de Itens
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(batchSummary.items).length > 0 ? (
                      Object.entries(batchSummary.items).map(([title, qty]) => (
                        <div key={title} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/20">
                          <span className="font-bold">{title}</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">{qty}x</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center opacity-40 py-4">Nenhum item no período</p>
                    )}
                  </div>
                </div>

                <div className="glass p-6 rounded-2xl space-y-4">
                  <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                    <Plus size={20} className="text-green-600" />
                    Total de Acompanhamentos
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(batchSummary.sides).length > 0 ? (
                      Object.entries(batchSummary.sides).map(([name, qty]) => (
                        <div key={name} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/20">
                          <span className="font-bold">{name}</span>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">{qty}x</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center opacity-40 py-4">Nenhum acompanhamento no período</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* --- 1. FORMATO TABELA DE PEDIDOS (IMAGEM 2 & CLIQUE ABRE O POPUP DETALHADO) --- */}
                {orderViewFormat === 'table' && (
                  <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/90 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          <th className="py-3 px-4"># Pedido</th>
                          <th className="py-3 px-4">Data / Horário</th>
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4">Tipo & Entrega</th>
                          <th className="py-3 px-4">Itens</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-center">Pagamento</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredOrders.map(order => {
                          const statusKey = order.status || 'pending';
                          const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
                          const isPaid = order.paymentStatus === 'paid' || order.paymentStatus === 'integral';
                          const isHalf = order.paymentStatus === 'half' || order.paymentStatus === '50%';
                          const shortId = order.id ? `#${order.id.slice(-5).toUpperCase()}` : '';
                          const totalItems = order.items.reduce((s, it) => s + it.quantity, 0);

                          return (
                            <tr
                              key={order.id}
                              onClick={() => setSelectedOrderForModal(order)}
                              className="hover:bg-amber-50/50 transition-colors cursor-pointer group"
                            >
                              {/* # Pedido */}
                              <td className="py-3.5 px-4 font-mono font-black text-xs">
                                <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-white shadow-2xs group-hover:bg-blue-600 transition-colors">
                                  {shortId}
                                </span>
                              </td>

                              {/* Data / Horário */}
                              <td className="py-3.5 px-4 text-xs text-gray-600 font-medium whitespace-nowrap">
                                <div>
                                  {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                                  <span className="text-gray-400 ml-1">
                                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                {order.pickupDate && (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                    📅 {order.pickupDate}
                                  </span>
                                )}
                              </td>

                              {/* Cliente */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                  {order.isB2B || order.isPJ ? (order.b2bCompanyName || order.customerName) : order.customerName}
                                </div>
                                <div className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
                                  <span>{order.phone}</span>
                                  {isBirthdayThisWeek(order.birthday, order.orderLanguage) && (
                                    <span className="px-1.5 py-0.2 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-full">
                                      🎂 Niver
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Tipo & Entrega */}
                              <td className="py-3.5 px-4 text-xs">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border",
                                  order.orderType === 'pickup'
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                  {order.orderType === 'pickup' ? <ShoppingBag size={11} /> : <Truck size={11} />}
                                  {order.orderType === 'pickup' ? 'Retirada' : 'Delivery'}
                                </span>
                                {order.address && (
                                  <div className="text-gray-500 text-[11px] truncate max-w-[200px] mt-0.5">
                                    {order.address}
                                  </div>
                                )}
                              </td>

                              {/* Itens */}
                              <td className="py-3.5 px-4 text-xs max-w-[240px]">
                                <span className="font-bold text-blue-600 mr-1">{totalItems}x</span>
                                <span className="text-gray-700 truncate inline-block max-w-[190px] align-bottom">
                                  {order.items.map(it => `${it.quantity}x ${it.title}`).join(', ')}
                                </span>
                              </td>

                              {/* Total */}
                              <td className="py-3.5 px-4 text-right font-black text-gray-900 whitespace-nowrap text-sm" style={{ color: settings?.primaryColor || '#865d39' }}>
                                {currencySymbol} {order.total.toFixed(2).replace('.', ',')}
                              </td>

                              {/* Pagamento */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-black border",
                                  isPaid
                                    ? "bg-green-100 text-green-800 border-green-300"
                                    : isHalf
                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                      : "bg-red-100 text-red-700 border-red-300"
                                )}>
                                  {isPaid ? '✓ Integral' : isHalf ? '🪙 50%' : '❌ Não Rec.'}
                                </span>
                                {order.paymentMethod && (
                                  <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                                    {order.paymentMethod}
                                  </div>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 border shadow-2xs",
                                  statusConfig.bg, statusConfig.text, statusConfig.border
                                )}>
                                  <span>{statusConfig.icon}</span>
                                  <span>{statusConfig.label}</span>
                                </span>
                              </td>

                              {/* Ações */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderForModal(order)}
                                    className="p-1.5 rounded-lg bg-gray-900 hover:bg-black text-white shadow-2xs transition-all cursor-pointer"
                                    title="Ver Pedido Detalhado no Pop-up"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => sendWhatsAppMessage(order, 'open')}
                                    className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white shadow-2xs transition-all cursor-pointer"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => printOrder(order)}
                                    className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 shadow-2xs transition-all cursor-pointer"
                                    title="Imprimir Comanda"
                                  >
                                    <Printer size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteOrder(order.id)}
                                    className="p-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white shadow-2xs transition-all cursor-pointer"
                                    title="Excluir Pedido"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* --- 2. FORMATO CARDS DE PEDIDOS --- */}
                {orderViewFormat === 'cards' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map(order => {
                      const statusKey = order.status || 'pending';
                      const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
                      const isPaid = order.paymentStatus === 'paid' || order.paymentStatus === 'integral';
                      const isHalf = order.paymentStatus === 'half' || order.paymentStatus === '50%';
                      const shortId = order.id ? `#${order.id.slice(-5).toUpperCase()}` : '';
                      const totalItems = order.items.reduce((s, it) => s + it.quantity, 0);

                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrderForModal(order)}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-gray-900 text-white">
                              {shortId}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-lg text-xs font-black border", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                              {statusConfig.icon} {statusConfig.label}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-black text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                              {order.customerName}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono">{order.phone}</p>
                            <p className="text-xs text-gray-700 line-clamp-2 pt-1">
                              <span className="font-bold text-blue-600">{totalItems}x:</span>{' '}
                              {order.items.map(it => `${it.quantity}x ${it.title}`).join(', ')}
                            </p>
                            {order.pickupDate && (
                              <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded mt-1">
                                📅 Agendado: {order.pickupDate}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                            <div>
                              <span className="text-lg font-black text-gray-900" style={{ color: settings?.primaryColor || '#865d39' }}>
                                {currencySymbol} {order.total.toFixed(2).replace('.', ',')}
                              </span>
                              <span className={cn(
                                "block text-[10px] font-extrabold",
                                isPaid ? "text-green-700" : isHalf ? "text-amber-700" : "text-red-600"
                              )}>
                                {isPaid ? '✓ Integral' : isHalf ? '🪙 50%' : '❌ Não Rec.'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteOrder(order.id);
                                }}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 transition-all cursor-pointer shadow-2xs"
                                title="Excluir Pedido"
                              >
                                <Trash2 size={13} />
                              </button>
                              <span className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold shadow-2xs group-hover:bg-blue-600 transition-colors flex items-center gap-1">
                                Ver Detalhes <Eye size={13} />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* --- 3. FORMATO KANBAN POR STATUS --- */}
                {orderViewFormat === 'kanban' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                    {[
                      { id: 'pending', title: '⏳ A Entregar', color: 'border-amber-400 bg-amber-50/50' },
                      { id: 'delivered', title: '✓ Entregue', color: 'border-emerald-400 bg-emerald-50/50' },
                    ].map(col => {
                      const colOrders = filteredOrders.filter(o => col.id === 'delivered' ? o.status === 'delivered' : o.status !== 'delivered');

                      return (
                        <div key={col.id} className={cn("rounded-2xl p-3 border flex flex-col min-h-[350px]", col.color)}>
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 font-black text-xs text-gray-800">
                            <span>{col.title}</span>
                            <span className="px-2 py-0.5 rounded-full bg-white text-gray-800 shadow-2xs">
                              {colOrders.length}
                            </span>
                          </div>

                          <div className="space-y-2 flex-grow overflow-y-auto max-h-[500px]">
                            {colOrders.map(ord => (
                              <div
                                key={ord.id}
                                onClick={() => setSelectedOrderForModal(ord)}
                                className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-1.5 text-left"
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-mono font-black px-1.5 py-0.5 rounded bg-gray-900 text-white">
                                    #{ord.id.slice(-5).toUpperCase()}
                                  </span>
                                  <span className="font-bold text-gray-500">
                                    {ord.orderType === 'pickup' ? '🛍️' : '🛵'}
                                  </span>
                                </div>
                                <div className="font-bold text-xs text-gray-900 truncate">{ord.customerName}</div>
                                <div className="text-[10px] text-gray-500 line-clamp-1">
                                  {ord.items.map(it => `${it.quantity}x ${it.title}`).join(', ')}
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                                  <span className="font-black text-gray-900" style={{ color: settings?.primaryColor || '#865d39' }}>
                                    {currencySymbol} {ord.total.toFixed(2).replace('.', ',')}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteOrder(ord.id);
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                      title="Excluir Pedido"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                    <span className="text-[10px] text-blue-600 font-bold">Ver 👁️</span>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {colOrders.length === 0 && (
                              <div className="p-4 text-center text-gray-400 text-xs italic my-auto">
                                Nenhum pedido
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {filteredOrders.length === 0 && (
                  <div className="glass p-12 rounded-2xl text-center text-gray-500">
                    Nenhum pedido encontrado com os filtros aplicados.
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* --- POP-UP MODAL DO PEDIDO DETALHADO (IDÊNTICO À IMAGEM DO CLIENTE) --- */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md p-3 sm:p-5 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-7 space-y-4 my-auto max-h-[92vh] overflow-y-auto border border-gray-200 text-left"
          >
            {/* Topo do Pop-up (Exatamente como a imagem) */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#f6efe6] text-[#b88e5d] border border-[#e8d7c3]/80 font-serif font-black text-2xl flex items-center justify-center shrink-0 shadow-2xs">
                  #
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-gray-900 leading-tight">
                    Detalhes do Pedido
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    ID: #{selectedOrderForModal.id.slice(-6).toUpperCase()} • Criado em {selectedOrderForModal.createdAt?.toDate ? selectedOrderForModal.createdAt.toDate().toLocaleDateString('pt-BR') + ', ' + selectedOrderForModal.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedOrderForModal(null);
                  setIsEditingPickupDate(false);
                }}
                className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-800 rounded-full transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* 1. Cartão do Cliente */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#865d39]/10 text-[#865d39] flex items-center justify-center shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-serif font-black text-gray-900 leading-tight">
                      {selectedOrderForModal.isB2B || selectedOrderForModal.isPJ ? (selectedOrderForModal.b2bCompanyName || selectedOrderForModal.customerName) : selectedOrderForModal.customerName}
                    </h4>
                    {isBirthdayThisWeek(selectedOrderForModal.birthday, selectedOrderForModal.orderLanguage) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full mt-0.5">
                        🎂 Aniversariante esta semana!
                      </span>
                    )}
                  </div>
                </div>

                {/* Botão WhatsApp estilo Pill Verde com Telefone */}
                <button
                  type="button"
                  onClick={() => sendWhatsAppMessage(selectedOrderForModal, 'open')}
                  className="bg-[#00c05a] hover:bg-[#00ab50] text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <MessageCircle size={16} />
                  <span>{formatPhoneNumber(selectedOrderForModal.phone)}</span>
                </button>
              </div>

              {selectedOrderForModal.email && (
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium pt-1 border-t border-gray-100">
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  <span>{selectedOrderForModal.email}</span>
                </div>
              )}
            </div>

            {/* 2. Grid Data da Entrega / Retirada & Horário e Modalidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card Data da Entrega */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500">
                    <Calendar size={13} className="text-blue-500" />
                    <span>DATA DA ENTREGA / RETIRADA</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPickupDate(!isEditingPickupDate);
                      setNewPickupDate(toDateInputFormat(selectedOrderForModal.pickupDate));
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    ✎ Alterar Data
                  </button>
                </div>

                {isEditingPickupDate ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="date"
                      value={newPickupDate}
                      onChange={e => setNewPickupDate(e.target.value)}
                      className="p-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 font-bold text-gray-900 focus:outline-blue-500"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newPickupDate) return;
                        try {
                          const formattedForSave = toBrazilianDateFormat(newPickupDate);
                          await updateDoc(doc(db, 'pedidos', selectedOrderForModal.id), { pickupDate: formattedForSave });
                          setSelectedOrderForModal({ ...selectedOrderForModal, pickupDate: formattedForSave });
                          setIsEditingPickupDate(false);
                          toast.success('Data atualizada com sucesso!');
                        } catch (e) {
                          toast.error('Erro ao atualizar data');
                        }
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPickupDate(false)}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="font-black text-base sm:text-lg text-gray-900 mt-1">
                    {toBrazilianDateFormat(selectedOrderForModal.pickupDate)}
                  </p>
                )}
              </div>

              {/* Card Horário & Modalidade com botão de alteração rápida */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500">
                    <Clock size={13} className="text-purple-500" />
                    <span>HORÁRIO & MODALIDADE</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextType = selectedOrderForModal.orderType === 'pickup' ? 'delivery' : 'pickup';
                      try {
                        await updateDoc(doc(db, 'pedidos', selectedOrderForModal.id), { orderType: nextType });
                        setSelectedOrderForModal({ ...selectedOrderForModal, orderType: nextType });
                        toast.success(`Modalidade alterada para ${nextType === 'pickup' ? 'Retirada' : 'Delivery'}!`);
                      } catch (e) {
                        toast.error('Erro ao atualizar modalidade');
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Alternar modalidade entre Delivery e Retirada"
                  >
                    ✎ Mudar para {selectedOrderForModal.orderType === 'pickup' ? 'Delivery' : 'Retirada'}
                  </button>
                </div>
                <div className="flex items-center gap-2 font-black text-base sm:text-lg text-gray-900 mt-1">
                  {selectedOrderForModal.orderType === 'pickup' ? (
                    <>
                      <ShoppingBag size={18} className="text-purple-600" />
                      <span>Retirada no Local</span>
                    </>
                  ) : (
                    <>
                      <Truck size={18} className="text-blue-600" />
                      <span>Delivery</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Endereço de Entrega */}
            {selectedOrderForModal.address && (
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500">
                    <MapPin size={13} className="text-red-500" />
                    <span>ENDEREÇO DE ENTREGA</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrderForModal.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-0.5"
                  >
                    Ver no Maps <ExternalLink size={11} />
                  </a>
                </div>
                <p className="text-xs sm:text-sm text-gray-800 font-semibold mt-1">
                  {selectedOrderForModal.address}
                </p>
              </div>
            )}

            {/* 4. Itens Solicitados */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-serif font-bold text-lg text-gray-900">
                <Package size={20} className="text-[#865d39]" />
                <span>Itens Solicitados</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4">
                {selectedOrderForModal.items.map((item, idx) => (
                  <div key={idx} className={cn("space-y-2", idx > 0 && "pt-3 border-t border-gray-100")}>
                    <div className="flex items-center justify-between font-bold text-base text-gray-900">
                      <span>
                        {item.quantity}x {item.title}
                        {item.selectedSize ? ` - ${item.selectedSize.name}` : ''}
                      </span>
                      <span className="font-black">
                        {currencySymbol} {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Caixa Amarela/Creme de Sabores Escolhidos / Personalizações (Idêntica à imagem) */}
                    {(item.cakeOptions || item.sandwichOptions || item.mealOptions || item.notes) && (
                      <div className="bg-[#fffbf0] border border-[#fde8b3] rounded-xl p-3 text-xs text-gray-800 space-y-1">
                        <div className="font-black text-[11px] text-[#946114] uppercase tracking-wide">
                          SABORES ESCOLHIDOS NO COMBO:
                        </div>
                        <div className="space-y-0.5 pl-1">
                          {item.cakeOptions && (
                            <>
                              {item.cakeOptions.size && <div>• Tamanho: {item.cakeOptions.size}</div>}
                              {item.cakeOptions.dough && <div>• Massa: {item.cakeOptions.dough}</div>}
                              {item.cakeOptions.fillings?.map((f, i) => <div key={i}>• Recheio: {f}</div>)}
                              {item.cakeOptions.topping && <div>• Cobertura: {item.cakeOptions.topping}</div>}
                              {item.cakeOptions.topper && <div>• Topper: {item.cakeOptions.topper}</div>}
                            </>
                          )}
                          {item.mealOptions && (
                            <>
                              {item.mealOptions.sides?.map((s, i) => <div key={i}>• {s.name}</div>)}
                              {item.mealOptions.removals?.map((r, i) => <div key={i} className="text-red-700">• Sem {r}</div>)}
                            </>
                          )}
                          {item.sandwichOptions && item.sandwichOptions.fillings?.map((f, i) => <div key={i}>• {f}</div>)}
                          {item.notes && <div>• Obs do item: {item.notes}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Observação do Cliente se houver */}
                {selectedOrderForModal.observation && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 mt-3">
                    <span className="font-bold block text-[10px] uppercase text-amber-800 mb-0.5">Observações do Cliente:</span>
                    <p className="font-medium italic">{selectedOrderForModal.observation}</p>
                  </div>
                )}

                {/* Resumo Financeiro & Total do Pedido (Limpando qualquer 0 residual) */}
                <div className="pt-3 border-t border-gray-200 space-y-1.5">
                  {((Boolean(selectedOrderForModal.deliveryFee) && Number(selectedOrderForModal.deliveryFee) > 0) ||
                    (Boolean(selectedOrderForModal.discount) && Number(selectedOrderForModal.discount) > 0) ||
                    (Boolean(selectedOrderForModal.subtotal) && Number(selectedOrderForModal.subtotal) > 0)) ? (
                    <div className="text-xs text-gray-600 space-y-1 pb-1">
                      <div className="flex justify-between">
                        <span>Subtotal dos itens:</span>
                        <span className="font-semibold">
                          {currencySymbol} {(selectedOrderForModal.subtotal || selectedOrderForModal.items.reduce((s, it) => s + (it.price * it.quantity), 0)).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {selectedOrderForModal.deliveryFee && selectedOrderForModal.deliveryFee > 0 ? (
                        <div className="flex justify-between text-blue-700">
                          <span>Taxa de Entrega:</span>
                          <span className="font-semibold">+ {currencySymbol} {selectedOrderForModal.deliveryFee.toFixed(2).replace('.', ',')}</span>
                        </div>
                      ) : null}
                      {selectedOrderForModal.discount && selectedOrderForModal.discount > 0 ? (
                        <div className="flex justify-between text-green-700">
                          <span>Desconto:</span>
                          <span className="font-semibold">- {currencySymbol} {selectedOrderForModal.discount.toFixed(2).replace('.', ',')}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="font-serif font-bold text-base sm:text-lg text-gray-800">
                      Total do Pedido:
                    </span>
                    <span className="font-serif font-black text-2xl sm:text-3xl text-gray-900">
                      {currencySymbol} {selectedOrderForModal.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Grid Status da Entrega & Status do Pagamento (Exatamente como na Imagem 2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Card Status da Entrega */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                  STATUS DA ENTREGA
                </span>
                <div className="flex items-center gap-2.5">
                  {/* Botão: A Entregar */}
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrderForModal.id, 'pending')}
                    className={cn(
                      "flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                      (!selectedOrderForModal.status || selectedOrderForModal.status !== 'delivered')
                        ? "bg-[#fff4d2] text-[#92400e] border-2 border-[#f59e0b] shadow-xs"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span>⏳</span>
                    <span>A Entregar</span>
                  </button>

                  {/* Botão: Entregue */}
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrderForModal.id, 'delivered')}
                    className={cn(
                      "flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                      selectedOrderForModal.status === 'delivered'
                        ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-500 shadow-xs"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span>✓</span>
                    <span>Entregue</span>
                  </button>
                </div>
              </div>

              {/* Card Status do Pagamento */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                  STATUS DO PAGAMENTO
                </span>
                
                {/* 3 Botões de Pagamento: Não Rec., 50%, Integral */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Não Rec. */}
                  <button
                    type="button"
                    onClick={() => updatePaymentStatus(selectedOrderForModal.id, 'pending')}
                    className={cn(
                      "py-2 px-1 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs",
                      (!selectedOrderForModal.paymentStatus || selectedOrderForModal.paymentStatus === 'pending' || selectedOrderForModal.paymentStatus === 'not_received')
                        ? "bg-red-50 text-red-700 border-2 border-red-500 shadow-xs"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span>❌</span>
                    <span className="truncate">Não Rec.</span>
                  </button>

                  {/* 50% */}
                  <button
                    type="button"
                    onClick={() => updatePaymentStatus(selectedOrderForModal.id, 'half')}
                    className={cn(
                      "py-2 px-1 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs",
                      selectedOrderForModal.paymentStatus === 'half' || selectedOrderForModal.paymentStatus === '50%'
                        ? "bg-amber-50 text-amber-800 border-2 border-amber-500 shadow-xs"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span>🪙</span>
                    <span>50%</span>
                  </button>

                  {/* Integral */}
                  <button
                    type="button"
                    onClick={() => updatePaymentStatus(selectedOrderForModal.id, 'paid')}
                    className={cn(
                      "py-2 px-1 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs",
                      selectedOrderForModal.paymentStatus === 'paid' || selectedOrderForModal.paymentStatus === 'integral'
                        ? "bg-[#00a859] text-white border-2 border-[#00924c] shadow-xs"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span>✓</span>
                    <span>Integral</span>
                  </button>
                </div>

                {/* Botão Azul: PEDIDO VALIDADO PARA PRODUÇÃO */}
                <button
                  type="button"
                  onClick={async () => {
                    const nextVal = !selectedOrderForModal.isValidatedForProduction;
                    try {
                      await updateDoc(doc(db, 'pedidos', selectedOrderForModal.id), { isValidatedForProduction: nextVal });
                      setSelectedOrderForModal({ ...selectedOrderForModal, isValidatedForProduction: nextVal });
                      toast.success(nextVal ? 'Pedido validado para produção!' : 'Validação de produção desmarcada');
                    } catch (e) {
                      toast.error('Erro ao atualizar validação');
                    }
                  }}
                  className={cn(
                    "w-full py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm tracking-wide text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2",
                    selectedOrderForModal.isValidatedForProduction
                      ? "bg-[#1b64ff] hover:bg-[#1553d6] ring-2 ring-blue-300 shadow-md"
                      : "bg-[#1b64ff] hover:bg-[#1553d6]"
                  )}
                >
                  <span>🚀</span>
                  <span>PEDIDO VALIDADO PARA PRODUÇÃO</span>
                </button>
              </div>
            </div>

            {/* 6. Barra de Ações */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => printOrder(selectedOrderForModal)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm shadow-xs transition-all cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Imprimir Comanda</span>
                </button>

                <button
                  type="button"
                  onClick={() => sendWhatsAppMessage(selectedOrderForModal, 'resend')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00a859] hover:bg-[#00924c] text-white font-bold text-sm shadow-xs transition-all cursor-pointer"
                  title="Reenviar pedido atualizado com novo resumo e valor"
                >
                  <MessageCircle size={16} />
                  <span>Reenviar Pedido</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrderForModal;
                    setSelectedOrderForModal(null);
                    setIsEditingOrder(ord);
                    setEditOrderForm(ord);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all cursor-pointer"
                >
                  <Edit2 size={15} />
                  <span>Editar Pedido</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedOrderForModal) {
                      deleteOrder(selectedOrderForModal.id);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-bold text-sm shadow-xs transition-all cursor-pointer"
                  title="Excluir este pedido definitivamente"
                >
                  <Trash2 size={15} />
                  <span>Excluir Pedido</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderForModal(null)}
                className="px-6 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm transition-all cursor-pointer ml-auto"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- MODAL DE ADICIONAR PEDIDO MANUAL --- */}
      {isCreatingManualOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-7 space-y-5 my-8 max-h-[90vh] overflow-y-auto border border-gray-100"
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-green-100 text-green-700">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-gray-900">Novo Pedido Manual</h3>
                  <p className="text-xs text-gray-500">Cadastre um pedido recebido por WhatsApp, balcão ou telefone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingManualOrder(false)}
                className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-4">
              {/* Dados do Cliente */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-600">1. Dados do Cliente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Nome do Cliente *</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                      placeholder="Ex: Maria Silva"
                      value={manualOrderForm.customerName}
                      onChange={e => setManualOrderForm({ ...manualOrderForm, customerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Telefone / WhatsApp (EUA)</label>
                    <input
                      type="text"
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                      placeholder="(555) 000-0000"
                      value={manualOrderForm.phone}
                      onChange={e => setManualOrderForm({ ...manualOrderForm, phone: formatUSPhoneInput(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Tipo de Pedido</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setManualOrderForm({ ...manualOrderForm, orderType: 'delivery' })}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                          manualOrderForm.orderType === 'delivery'
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        🛵 Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualOrderForm({ ...manualOrderForm, orderType: 'pickup' })}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                          manualOrderForm.orderType === 'pickup'
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        🛍️ Retirada
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Data Agendada / Entrega</label>
                    <input
                      type="date"
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                      value={manualOrderForm.pickupDate}
                      onChange={e => setManualOrderForm({ ...manualOrderForm, pickupDate: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">
                      {manualOrderForm.orderType === 'delivery' ? 'Endereço de Entrega (Rua, Número, Bairro, Cidade)' : 'Endereço / Ponto de Retirada'}
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                      placeholder="Ex: Rua das Flores, 123, Apto 4, Centro"
                      value={manualOrderForm.address}
                      onChange={e => setManualOrderForm({ ...manualOrderForm, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Status e Pagamento */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-600">2. Status & Pagamento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Status da Entrega</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 cursor-pointer"
                      value={manualOrderForm.status}
                      onChange={e => setManualOrderForm({ ...manualOrderForm, status: e.target.value as any })}
                    >
                      <option value="pending">⏳ A Entregar</option>
                      <option value="delivered">✓ Entregue</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Forma de Pagamento</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 cursor-pointer"
                      value={manualOrderForm.paymentMethod}
                      onChange={e => setManualOrderForm({ ...manualOrderForm, paymentMethod: e.target.value })}
                    >
                      <option value="Pix">💠 Pix</option>
                      <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                      <option value="Cartão de Débito">💳 Cartão de Débito</option>
                      <option value="Dinheiro">💵 Dinheiro</option>
                      <option value="A Combinar">🤝 A Combinar</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Status do Pagamento</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 cursor-pointer"
                      value={manualOrderForm.paymentStatus}
                      onChange={e => setManualOrderForm({ ...manualOrderForm, paymentStatus: e.target.value as any })}
                    >
                      <option value="pending">❌ Não Rec.</option>
                      <option value="half">🪙 50%</option>
                      <option value="paid">✓ Integral</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-600">3. Itens do Pedido</h4>
                
                {/* Formulário para adicionar item */}
                <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">Selecione o Produto</label>
                      <select
                        className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                        value={manualSelectedProductId}
                        onChange={e => {
                          const pId = e.target.value;
                          setManualSelectedProductId(pId);
                          setManualSelectedSizeId('');
                          setManualItemCustomTitle('');
                          if (pId) {
                            const prod = products.find(p => p.id === pId);
                            if (prod) {
                              if (prod.sizes && prod.sizes.length > 0) {
                                setManualSelectedSizeId(prod.sizes[0].id);
                                setManualItemCustomPrice(String(prod.sizes[0].price));
                              } else {
                                const pr = (prod.price && prod.price > 0) ? prod.price : (prod.oldPrice || 0);
                                setManualItemCustomPrice(String(pr));
                              }
                            }
                          }
                        }}
                      >
                        <option value="">-- Escolher do Catálogo --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} {p.price ? `(${currencySymbol} ${p.price.toFixed(2)})` : ''}
                          </option>
                        ))}
                        <option value="custom">✏️ Item Avulso / Personalizado</option>
                      </select>
                    </div>

                    {manualSelectedProductId === 'custom' ? (
                      <div className="sm:col-span-6">
                        <label className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">Nome do Item Avulso</label>
                        <input
                          type="text"
                          placeholder="Ex: Porção extra de arroz"
                          className="w-full p-2 rounded-lg border border-gray-300 text-xs"
                          value={manualItemCustomTitle}
                          onChange={e => setManualItemCustomTitle(e.target.value)}
                        />
                      </div>
                    ) : (
                      (() => {
                        const prod = products.find(p => p.id === manualSelectedProductId);
                        if (prod && prod.sizes && prod.sizes.length > 0) {
                          return (
                            <div className="sm:col-span-6">
                              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">Tamanho / Opção</label>
                              <select
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white"
                                value={manualSelectedSizeId}
                                onChange={e => {
                                  setManualSelectedSizeId(e.target.value);
                                  const sz = prod.sizes?.find(s => s.id === e.target.value);
                                  if (sz) setManualItemCustomPrice(String(sz.price));
                                }}
                              >
                                {prod.sizes.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({currencySymbol} {s.price.toFixed(2)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">Qtd</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 rounded-lg border border-gray-300 text-xs text-center font-bold"
                        value={manualItemQuantity}
                        onChange={e => setManualItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-4">
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">Preço Unitário ({currencySymbol})</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold text-green-700"
                        value={manualItemCustomPrice}
                        onChange={e => setManualItemCustomPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          let title = '';
                          let selectedSizeObj = undefined;
                          let price = parseFloat(manualItemCustomPrice) || 0;

                          if (manualSelectedProductId === 'custom') {
                            if (!manualItemCustomTitle.trim()) {
                              toast.error('Informe o nome do item avulso');
                              return;
                            }
                            title = manualItemCustomTitle.trim();
                          } else if (manualSelectedProductId) {
                            const prod = products.find(p => p.id === manualSelectedProductId);
                            if (!prod) return;
                            title = prod.title;
                            if (manualSelectedSizeId && prod.sizes) {
                              selectedSizeObj = prod.sizes.find(s => s.id === manualSelectedSizeId);
                            }
                          } else {
                            toast.error('Selecione um produto ou escolha item avulso');
                            return;
                          }

                          const newItem = {
                            title,
                            quantity: manualItemQuantity,
                            price,
                            selectedSize: selectedSizeObj,
                            notes: manualItemNotes.trim()
                          };

                          setManualOrderForm({
                            ...manualOrderForm,
                            items: [...manualOrderForm.items, newItem]
                          });

                          setManualSelectedProductId('');
                          setManualSelectedSizeId('');
                          setManualItemCustomTitle('');
                          setManualItemCustomPrice('');
                          setManualItemNotes('');
                          setManualItemQuantity(1);
                          toast.success(`Item adicionado: ${title}`);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus size={14} /> Adicionar Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Itens já Adicionados */}
                {manualOrderForm.items.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {manualOrderForm.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 text-xs">
                        <div>
                          <span className="font-bold">{item.quantity}x {item.title}</span>
                          {item.selectedSize && <span className="text-gray-500 font-medium ml-1">({item.selectedSize.name})</span>}
                          {item.notes && <p className="text-[10px] text-gray-500 italic">{item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-800">
                            {currencySymbol} {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setManualOrderForm({
                                ...manualOrderForm,
                                items: manualOrderForm.items.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            title="Remover item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic text-center py-2">Nenhum item adicionado ainda.</p>
                )}
              </div>

              {/* Valores & Totais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Taxa de Entrega ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 rounded-xl border border-gray-300 text-xs bg-white"
                    value={manualOrderForm.deliveryFee}
                    onChange={e => setManualOrderForm({ ...manualOrderForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Desconto ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 rounded-xl border border-gray-300 text-xs bg-white"
                    value={manualOrderForm.discount}
                    onChange={e => setManualOrderForm({ ...manualOrderForm, discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-[10px] font-black uppercase text-gray-500">Total do Pedido:</span>
                  <span className="text-xl font-black text-gray-900" style={{ color: settings?.primaryColor || '#865d39' }}>
                    {currencySymbol} {Math.max(0, manualOrderForm.items.reduce((acc, it) => acc + (it.price * it.quantity), 0) + (Number(manualOrderForm.deliveryFee) || 0) - (Number(manualOrderForm.discount) || 0)).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">Observações do Pedido</label>
                <textarea
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white"
                  placeholder="Instruções de entrega, troco, preferências do cliente..."
                  value={manualOrderForm.observation}
                  onChange={e => setManualOrderForm({ ...manualOrderForm, observation: e.target.value })}
                />
              </div>

              {/* Botões do modal */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingManualOrder(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar Pedido Manual
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {activeTab === 'customers' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-3xl font-serif font-bold">Clientes</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setShowBirthdaysOnly(!showBirthdaysOnly)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                  showBirthdaysOnly ? "bg-pink-500 text-white shadow-md" : "bg-white border border-gray-300 text-gray-600"
                )}
              >
                <Cake size={18} /> Aniversários da Semana
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <input 
              type="text" 
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueCustomers
              .filter(c => {
                const matchesSearch = 
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  c.phone.includes(customerSearch) ||
                  c.email.toLowerCase().includes(customerSearch.toLowerCase());
                
                let matchesBirthday = true;
                if (showBirthdaysOnly) {
                  matchesBirthday = isBirthdayThisWeek(c.birthday, c.orderLanguage);
                }
                
                return matchesSearch && matchesBirthday;
              })
              .sort((a, b) => {
                const timeA = a.lastOrder?.toDate ? a.lastOrder.toDate().getTime() : 0;
                const timeB = b.lastOrder?.toDate ? b.lastOrder.toDate().getTime() : 0;
                return timeB - timeA;
              })
              .map((customer, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-6 rounded-[2rem] space-y-4 relative overflow-hidden group border border-gray-200 shadow-sm hover:shadow-md transition-all"
                >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-grow pr-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-serif font-bold text-black">{customer.name}</h3>
                            {customer.isB2B && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded-md border border-amber-200 uppercase tracking-wider">
                                PJ
                              </span>
                            )}
                          </div>
                          <a 
                            href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá, ${customer.name}! Tudo bem? Gostaria de falar com você sobre seu cadastro no ${settings?.brandName || 'Dendê Foods'}.`
                            )}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm opacity-60 hover:text-green-600 transition-colors"
                          >
                            <MessageCircle size={14} />
                            <span className="text-black">{customer.phone}</span>
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button 
                            onClick={() => setViewingCustomerOrders(customer)}
                            className="bg-[#865d39]/10 hover:bg-[#865d39]/20 text-[#865d39] px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap cursor-pointer transition-all border border-[#865d39]/10"
                            title="Ver Histórico de Pedidos"
                          >
                            {customer.totalOrders} {customer.totalOrders === 1 ? 'Pedido' : 'Pedidos'}
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingCustomer(customer);
                              setEditCustomerForm({
                                name: customer.name,
                                phone: customer.phone,
                                email: customer.email,
                                birthday: customer.birthday,
                                address: customer.address,
                                isB2B: customer.isB2B,
                                managerName: customer.managerName,
                                street: customer.street,
                                number: customer.number,
                                zipCode: customer.zipCode,
                                city: customer.city,
                                frequency: customer.frequency
                              });
                            }}
                            className="p-1.5 text-blue-650 hover:bg-blue-50 hover:text-blue-700 bg-white shadow-sm border border-black/5 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                            title="Editar Cliente"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                  isOpen: true,
                                  title: 'Excluir Cliente',
                                  message: `Tem certeza que deseja excluir o cliente ${customer.name} e todos os seus ${customer.totalOrders} pedidos?`,
                                  onConfirm: () => deleteCustomer(customer)
                              });
                            }}
                            className="p-1.5 text-red-650 hover:bg-red-50 hover:text-red-700 bg-white shadow-sm border border-black/5 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                            title="Excluir Cliente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {customer.email && (
                          <div className="flex items-center gap-2 opacity-70">
                            <span className="font-bold text-black">E-mail:</span>
                            <span className="text-black">{customer.email}</span>
                          </div>
                        )}
                        {customer.birthday && (() => {
                          const isBdayUpcoming = isBirthdayThisWeek(customer.birthday, customer.orderLanguage);
                          return (
                            <div className="space-y-2">
                              {isBdayUpcoming ? (
                                <>
                                  <div className="flex items-center gap-2 text-pink-600 font-bold">
                                    <Cake size={14} />
                                    <span>Aniversário: {customer.birthday} (Esta semana! 🎉)</span>
                                  </div>
                                  <div className="flex flex-col gap-1.5 p-3 bg-pink-500/10 border border-pink-500/20 rounded-2xl mt-1.5">
                                    <span className="text-[10px] uppercase font-black text-pink-800 tracking-wider">
                                      🎁 Enviar Mensagem de Feliz Aniversário:
                                    </span>
                                    <div className="w-full">
                                      <a 
                                        href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                          `Parabéns, ${customer.name}! 🎉 A equipe do ${settings?.brandName || 'Dendê Foods'} te deseja um feliz aniversário! Que o seu dia seja repleto de alegria, paz e muito sabor. Como nosso presente para comemorar seu dia, preparamos uma oferta especial com surpresa no seu próximo pedido! 🎂🎁`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-green-650 hover:bg-green-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm border border-green-700/20"
                                      >
                                        <MessageCircle size={13} className="text-white" />
                                        <span>WhatsApp</span>
                                      </a>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 opacity-70">
                                  <span className="font-bold text-black">Aniversário:</span>
                                  <span className="text-black">{customer.birthday}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {customer.address && (
                          <div className="flex items-start gap-2 opacity-70">
                            <span className="font-bold text-black">Endereço:</span>
                            <span className="line-clamp-2 text-black">{customer.address}</span>
                          </div>
                        )}
                      </div>

                  <div className="pt-4 border-t border-white/20 flex justify-between items-center text-xs opacity-50">
                    <span>Último pedido:</span>
                    <span>
                      {customer.lastOrder?.toDate 
                        ? customer.lastOrder.toDate().toLocaleDateString('en-US') 
                        : 'N/A'}
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      )}
      </main>

      <AnimatePresence>
        {isEditingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-gray-200 text-gray-900"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-2xl font-serif font-black text-gray-900">Editar Cliente</h3>
                <button onClick={() => setIsEditingCustomer(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-800 transition-colors cursor-pointer">
                  <X size={22} />
                </button>
              </div>
              
              <form onSubmit={updateCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Nome do Cliente</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      value={editCustomerForm.name || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">WhatsApp / Telefone (EUA)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      placeholder="(555) 000-0000"
                      value={editCustomerForm.phone || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, phone: formatUSPhoneInput(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">E-mail</label>
                    <input 
                      type="email" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      value={editCustomerForm.email || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Aniversário (MM/DD)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      value={editCustomerForm.birthday || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, birthday: e.target.value})}
                      placeholder="MM/DD"
                    />
                  </div>
                </div>
                {editCustomerForm.isB2B ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Nome do Responsável</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.managerName || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, managerName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Frequência de Pedidos</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.frequency || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, frequency: e.target.value})}
                          placeholder="Ex: Semanal, Mensal"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700">Endereço Corporativo</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                        value={editCustomerForm.address || ''}
                        onChange={e => setEditCustomerForm({...editCustomerForm, address: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">CEP</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 font-mono bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.zipCode || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, zipCode: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Cidade / Estado</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.city || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, city: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Rua / Logradouro</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.street || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, street: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Número</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.number || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, number: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">CEP</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 font-mono bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.zipCode || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, zipCode: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Cidade / Estado</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                          value={editCustomerForm.city || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, city: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700">Endereço Completo</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                        value={editCustomerForm.address || ''}
                        onChange={e => setEditCustomerForm({...editCustomerForm, address: e.target.value})}
                      />
                    </div>
                  </>
                )}
                 <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isEditingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-gray-200 text-gray-900"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-2xl font-serif font-black text-gray-900">Editar Pedido</h3>
                <button onClick={() => setIsEditingOrder(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-800 transition-colors cursor-pointer">
                  <X size={22} />
                </button>
              </div>
              
              <form onSubmit={handleEditOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Nome do Cliente</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      value={editOrderForm.customerName || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, customerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">WhatsApp / Telefone (EUA)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      placeholder="(555) 000-0000"
                      value={editOrderForm.phone || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, phone: formatUSPhoneInput(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Email</label>
                    <input 
                      type="email" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      value={editOrderForm.email || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, email: e.target.value})}
                    />
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Aniversário (MM/DD)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      value={editOrderForm.birthday || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, birthday: e.target.value})}
                      placeholder="MM/DD"
                    />
                  </div>
                </div>

                {/* Modalidade do Pedido (Delivery ou Retirada) */}
                <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <label className="text-xs font-bold uppercase text-gray-700 block">Modalidade do Pedido</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditOrderForm({ ...editOrderForm, orderType: 'delivery' })}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2",
                        (editOrderForm.orderType === 'delivery' || (!editOrderForm.orderType && editOrderForm.address && !editOrderForm.address.toLowerCase().includes('retirada') && !editOrderForm.address.toLowerCase().includes('pickup')))
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      )}
                    >
                      <span>🛵</span>
                      <span>Delivery (Entrega)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditOrderForm({ ...editOrderForm, orderType: 'pickup' })}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2",
                        (editOrderForm.orderType === 'pickup' || (!editOrderForm.orderType && editOrderForm.address && (editOrderForm.address.toLowerCase().includes('retirada') || editOrderForm.address.toLowerCase().includes('pickup'))))
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      )}
                    >
                      <span>🛍️</span>
                      <span>Retirada (Pickup)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-700">Endereço</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                    value={editOrderForm.address || ''}
                    onChange={e => setEditOrderForm({...editOrderForm, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Data de Entrega (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-medium"
                      value={editOrderForm.pickupDate || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, pickupDate: e.target.value})}
                      placeholder="MM/DD/AAAA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Preço Final (Total)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold opacity-40">{currencySymbol}</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="w-full p-3 pl-12 rounded-xl border border-gray-300 bg-white font-bold text-blue-600 text-sm"
                        value={editOrderForm.total || 0}
                        onChange={e => setEditOrderForm({...editOrderForm, total: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>

                {/* Status da Entrega e Pagamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Status da Entrega</label>
                    <select
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-bold cursor-pointer"
                      value={editOrderForm.status || 'pending'}
                      onChange={e => setEditOrderForm({...editOrderForm, status: e.target.value as any})}
                    >
                      <option value="pending">⏳ A Entregar</option>
                      <option value="delivered">✓ Entregue</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Status do Pagamento</label>
                    <select
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-bold cursor-pointer"
                      value={editOrderForm.paymentStatus || 'pending'}
                      onChange={e => setEditOrderForm({...editOrderForm, paymentStatus: e.target.value as any})}
                    >
                      <option value="pending">❌ Não Rec.</option>
                      <option value="half">🪙 50%</option>
                      <option value="paid">✓ Integral</option>
                    </select>
                  </div>
                </div>

                {/* --- SEÇÃO DE ITENS DO PEDIDO --- */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">Itens do Pedido</h4>
                  
                  {editOrderForm.items && editOrderForm.items.length > 0 ? (
                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                      {editOrderForm.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200 gap-3 text-gray-900">
                          <div className="flex-grow">
                            <p className="font-bold text-sm text-gray-900">{item.title}</p>
                            {item.selectedSize && (
                              <p className="text-xs text-gray-600 font-semibold">Tamanho: {item.selectedSize.name}</p>
                            )}
                            {item.sandwichOptions && item.sandwichOptions.fillings && item.sandwichOptions.fillings.length > 0 && (
                              <div className="text-xs text-gray-600 space-y-0.5 mt-0.5">
                                <p>Recheios: {item.sandwichOptions.fillings.join(', ')}</p>
                              </div>
                            )}
                            {item.cakeOptions && (
                              <div className="text-xs text-gray-600 space-y-0.5 mt-0.5">
                                {item.cakeOptions.size && <p>Tamanho: {item.cakeOptions.size}</p>}
                                {item.cakeOptions.dough && <p>Massa: {item.cakeOptions.dough}</p>}
                                {item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0 && (
                                  <p>Recheios: {item.cakeOptions.fillings.join(', ')}</p>
                                )}
                                {item.cakeOptions.topping && <p>Cobertura: {item.cakeOptions.topping}</p>}
                                {item.cakeOptions.topper && <p>Topper: {item.cakeOptions.topper}</p>}
                              </div>
                            )}
                            {item.mealOptions && (
                              <div className="text-xs text-gray-600 space-y-0.5 mt-0.5">
                                {item.mealOptions.removals && item.mealOptions.removals.length > 0 && (
                                  <p className="text-red-600">Sem: {item.mealOptions.removals.join(', ')}</p>
                                )}
                                {item.mealOptions.sides && item.mealOptions.sides.length > 0 && (
                                  <p>Extras: {item.mealOptions.sides.map(s => s.name).join(', ')}</p>
                                )}
                              </div>
                            )}
                            
                            {/* Editable price input for high usability */}
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                              <span className="font-bold text-gray-600">Preço: {currencySymbol}</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                className="w-20 px-2 py-0.5 rounded-lg border border-gray-300 bg-white text-gray-900 font-bold text-xs" 
                                value={item.price} 
                                onChange={e => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  const updatedItems = [...(editOrderForm.items || [])];
                                  updatedItems[index].price = newPrice;
                                  updateOrderFormWithItems(updatedItems);
                                }} 
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = [...(editOrderForm.items || [])];
                                  if (updatedItems[index].quantity > 1) {
                                    updatedItems[index].quantity -= 1;
                                    updateOrderFormWithItems(updatedItems);
                                  }
                                }}
                                className="px-2.5 py-1 hover:bg-gray-100 font-bold border-r border-gray-200 text-gray-800 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 font-bold text-sm min-w-[24px] text-center text-gray-900">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = [...(editOrderForm.items || [])];
                                  updatedItems[index].quantity += 1;
                                  updateOrderFormWithItems(updatedItems);
                                }}
                                className="px-2.5 py-1 hover:bg-gray-100 font-bold border-l border-gray-200 text-gray-800 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedItems = (editOrderForm.items || []).filter((_, idx) => idx !== index);
                                updateOrderFormWithItems(updatedItems);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                              title="Excluir item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm opacity-60 italic text-gray-600">Nenhum item neste pedido.</p>
                  )}

                  {/* Add item interface */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-800">Adicionar Novo Item ao Pedido</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={selectedProductId}
                        onChange={e => setSelectedProductId(e.target.value)}
                        className="flex-grow p-3 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 font-medium cursor-pointer"
                      >
                        <option value="">-- Selecione um produto --</option>
                        {products.map(p => {
                          const activePrice = p.hasSizes && p.sizes && p.sizes.length > 0 
                            ? Math.min(...p.sizes.map(s => s.price)) 
                            : ((p.price && p.price > 0) ? p.price : (p.oldPrice || 0));
                          return (
                            <option key={p.id} value={p.id}>
                              {p.title} ({currencySymbol} {activePrice.toFixed(2)})
                            </option>
                          );
                        })}
                      </select>
                      
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          className="w-16 p-3 rounded-xl border border-gray-300 text-center font-bold text-gray-900 bg-white"
                          value={addItemQuantity}
                          onChange={e => setAddItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProductId) return;
                            const prod = products.find(p => p.id === selectedProductId);
                            if (!prod) return;
                            
                            const activePrice = prod.hasSizes && prod.sizes && prod.sizes.length > 0 
                              ? Math.min(...prod.sizes.map(s => s.price)) 
                              : ((prod.price && prod.price > 0) ? prod.price : (prod.oldPrice || 0));
                            
                            const newItem = {
                              title: prod.title,
                              quantity: addItemQuantity,
                              price: activePrice,
                              cakeOptions: {},
                              mealOptions: {
                                removals: [],
                                sides: []
                              }
                            };
                            
                            const updatedItems = [...(editOrderForm.items || []), newItem];
                            updateOrderFormWithItems(updatedItems);
                            
                            // Reset selection
                            setSelectedProductId('');
                            setAddItemQuantity(1);
                          }}
                          disabled={!selectedProductId}
                          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap uppercase tracking-wider cursor-pointer"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-700">Observações</label>
                  <textarea 
                    className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white text-gray-900 text-sm font-medium"
                    rows={3}
                    value={editOrderForm.observation || ''}
                    onChange={e => setEditOrderForm({...editOrderForm, observation: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 rounded-xl font-bold text-lg shadow-lg cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {viewingCustomerOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-gray-200 text-gray-900"
            >
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div className="space-y-1">
                  <span className="text-xs uppercase font-extrabold tracking-widest bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                    Histórico do Cliente
                  </span>
                  <h3 className="text-2xl font-serif font-black text-gray-900">{viewingCustomerOrders.name}</h3>
                  <p className="text-sm font-semibold text-gray-600">
                    {viewingCustomerOrders.phone} | {viewingCustomerOrders.email || 'Sem e-mail'}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingCustomerOrders(null)} 
                  className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-800 rounded-full cursor-pointer transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-xs uppercase tracking-wider text-gray-500">
                  Pedidos Realizados ({viewingCustomerOrders.orders.length})
                </h4>
                
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {viewingCustomerOrders.orders.map((order: Order, index: number) => (
                    <div 
                      key={order.id} 
                      className="p-5 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white hover:border-gray-300 transition-all shadow-xs"
                    >
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gray-900 text-white rounded">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('pt-BR') : 'N/A'}
                          </span>
                          {order.pickupDate && (
                            <span 
                              className="text-[10px] font-black px-2 py-0.5 rounded-md text-white whitespace-nowrap"
                              style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                            >
                              🚚 Entrega: {order.pickupDate}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between font-semibold text-gray-800">
                              <span>{item.quantity}x {item.title}</span>
                              <span className="text-gray-600">{currencySymbol} {((item.price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                          
                          {Boolean(order.total > 0 && order.taxAmount && order.taxAmount > 0) && (
                            <div className="border-t border-gray-200 pt-2 space-y-1 text-xs text-gray-600 font-semibold">
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{currencySymbol} {(order.subtotal || (order.total - (order.taxAmount || 0))).toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="flex justify-between text-amber-900">
                                <span>Tax ({order.taxRate || 8.25}%):</span>
                                <span>+ {currencySymbol} {(order.taxAmount || 0).toFixed(2).replace('.', ',')}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {order.observation && (
                          <p className="text-xs italic bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200">
                            <strong className="font-bold">Obs:</strong> {order.observation}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-gray-200 pt-3 md:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Valor</span>
                          <span className="text-lg font-black" style={{ color: settings?.primaryColor || '#865d39' }}>
                            {currencySymbol} {order.total.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => printOrder(order)}
                            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 shadow-xs cursor-pointer"
                            title="Imprimir"
                          >
                            <Printer size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingOrder(order);
                              setEditOrderForm(order);
                              setViewingCustomerOrders(null);
                            }}
                            className="p-2 bg-white border border-gray-200 rounded-xl text-blue-600 hover:bg-blue-50 shadow-xs cursor-pointer"
                            title="Editar Pedido"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center space-y-6 border border-gray-200 text-gray-900"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-black text-gray-900">{confirmModal.title}</h3>
                <p className="text-sm text-gray-600 font-medium">{confirmModal.message}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-800 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
