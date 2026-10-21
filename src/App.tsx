import React, { useState, useEffect } from 'react';
import Menu from './components/Menu';
import Admin from './components/Admin';
import Footer from './components/Footer';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Settings } from './types';
import { Toaster } from 'sonner';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    logo: 'https://i.ibb.co/5XY0BDRS/Whats-App-Image-2026-10-06-at-7-33-45-AM.jpg',
    primaryColor: '#865d39',
    whatsappNumber: '',
    whatsappCountryCode: '+1',
    slug: 'sou-brazil',
    brandName: 'Sou Brazil',
    slogan: 'Alimentação saudável, marmitas fit e pratos deliciosos.',
    whatsappClosingMessage: 'Obrigada pelo pedido, aguarde que entraremos em contato para confirmação!',
    backgroundImage: 'https://i.ibb.co/X0vYy7L/cakes.png',
    glassColor: 'rgba(255, 255, 255, 0.4)',
    textColor: '#000000',
    language: 'pt',
    currency: 'BRL',
    introEnabled: true,
    introTitle: 'Sou Brazil',
    introSubtitle: 'Alimentação Saudável e Balanceada',
    introDescription: 'Pratos nutritivos, marmitas fitness e opções saborosas para o seu dia.',
    introButtonText: 'INICIAR MINHA JORNADA',
    introBottomText: '100% ARTESANAL & FIT',
    selectorEnabled: true,
    selectorTitle: 'Sou Brazil',
    selectorSubtitle: 'Escolha sua experiência',
    pickupAddress: '',
    catalog1Title: 'Cardápio Principal',
    catalog1Image: 'https://i.ibb.co/X0vYy7L/cakes.png',
    catalog1Desc: 'Nossos pratos fitness e refeições tradicionais saudáveis.',
    catalog1Slogan: 'Refeições equilibradas feitas com amor',
    catalog1Active: true,
    catalog1MinItems: 8,
    catalog2Title: 'Bebidas & Doces Fit',
    catalog2Image: 'https://i.ibb.co/X0vYy7L/cakes.png',
    catalog2Desc: 'Sucos naturais, smoothies e sobremesas sem açúcar.',
    catalog2Slogan: 'Refrescância e dulçor saudável para o seu dia',
    catalog2Active: true,
    catalog2MinItems: 8,
    catalog3Title: 'Dietas Low Carb',
    catalog3Image: 'https://i.ibb.co/X0vYy7L/cakes.png',
    catalog3Desc: 'Pratos com baixo teor de carboidratos e ricos em proteínas.',
    catalog3Slogan: 'Mais foco na sua saúde e energia',
    catalog3Active: true,
    catalog3MinItems: 2,
    catalog4Title: 'Dietas Hipertróficas',
    catalog4Image: 'https://i.ibb.co/X0vYy7L/cakes.png',
    catalog4Desc: 'Refeições com alto teor calórico saudável e ricas em proteínas para ganho de massa.',
    catalog4Slogan: 'Combustível de alta qualidade para o seu treino',
    catalog4Active: true,
    catalog4MinItems: 2,
    printerFormat: 'rongta80',
    printerModel: 'Rongta POS 3.150 in (80mm) com Cortador Automático',
    printerAutoCut: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL for admin path
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/admin' || hash === '#/admin' || hash === '#admin') {
      setIsAdmin(true);
    }

    // Load settings for global styles
    const unsub = onSnapshot(doc(db, 'configuracoes', 'geral'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setSettings(prev => ({ ...prev, ...data }));
        setLoading(false);

        // Update Page Title
        if (data.brandName) {
          document.title = data.brandName;
        }

        // Update Theme Color
        const themeColorMeta = document.getElementById('theme-color');
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', data.primaryColor || '#865d39');
        }

        // Set Glass Color CSS Variable
        const glassColor = data.glassColor || 'rgba(255, 255, 255, 0.4)';
        const finalGlassColor = (glassColor.startsWith('#') && glassColor.length === 7) 
          ? `${glassColor}66` 
          : glassColor;
        document.documentElement.style.setProperty('--glass-color', finalGlassColor);

        // Set Text Color CSS Variable
        if (data.textColor) {
          document.documentElement.style.setProperty('--text-color', data.textColor);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const glassColor = settings?.glassColor || 'rgba(255, 255, 255, 0.4)';
  const finalGlassColor = (glassColor.startsWith('#') && glassColor.length === 7) 
    ? `${glassColor}66` 
    : glassColor;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#ece6db]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#865d39] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#865d39] font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <Toaster position="top-center" richColors />
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${settings?.backgroundImage || 'https://i.ibb.co/X0vYy7L/cakes.png'}")` }}
      />
      
      {/* Glass Overlay */}
      <div 
        className="fixed inset-0 z-[-1] pointer-events-none" 
        style={{ 
          backgroundColor: finalGlassColor,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      />

      {/* Content */}
      <div className="relative z-0 flex flex-col min-h-screen">
        {isAdmin ? (
          <Admin settings={settings} setSettings={setSettings} setIsAdmin={setIsAdmin} />
        ) : (
          <>
            <Menu settings={{ ...settings, language: settings.language || 'pt', currency: settings.currency || 'BRL' }} />
            <Footer />
          </>
        )}
      </div>
    </div>
  );
}
