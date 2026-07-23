import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import OrdersPanel from '@/components/OrdersPanel';
import MenuManager from '@/components/MenuManager';
import ChatPanel from '@/components/ChatPanel';
import ServicesPanel from '@/components/ServicesPanel';
import QRDisplay from '@/components/QRDisplay';
import StylistManager from '@/components/StylistManager';
import GuestMessagesPanel from '@/components/GuestMessagesPanel';
import DailyReport from '@/components/DailyReport';
import { ClipboardList, Coffee, MessageSquare, Scissors, QrCode, Users, Mail, BarChart3 } from 'lucide-react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import Swipeable from '@/components/Swipeable';
import AnimatedTabContent from '@/components/AnimatedTabContent';
import { useTabScrollRestoration } from '@/hooks/useTabScrollRestoration';

export default function FrontDeskDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'orders';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    navigate(`?tab=${value}`);
  };

  useAdminNotifications();
  const scrollRef = useTabScrollRestoration(activeTab);

  const tabs = ['orders', 'menu', 'chat', 'services', 'stylists', 'messages', 'qr', 'report'];

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 flex flex-col overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="glass-header fixed bottom-0 left-0 right-0 z-30 h-16 border-t safe-area-bottom justify-around rounded-none flex w-full md:relative md:flex-wrap md:h-auto md:border md:justify-start md:rounded-lg md:w-auto md:shadow-lg">
          <TabsTrigger value="orders" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><ClipboardList className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Orders</span></TabsTrigger>
          <TabsTrigger value="menu" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><Coffee className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Menu</span></TabsTrigger>
          <TabsTrigger value="chat" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><MessageSquare className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Chat</span></TabsTrigger>
          <TabsTrigger value="services" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><Scissors className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Services</span></TabsTrigger>
          <TabsTrigger value="stylists" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><Users className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Stylists</span></TabsTrigger>
          <TabsTrigger value="messages" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><Mail className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Messages</span></TabsTrigger>
          <TabsTrigger value="qr" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><QrCode className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">QR Code</span></TabsTrigger>
          <TabsTrigger value="report" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><BarChart3 className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Daily Report</span></TabsTrigger>
        </TabsList>
        <Swipeable tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} className="mt-6 flex-1 min-h-0 flex flex-col">
          <AnimatedTabContent value="orders"><OrdersPanel /></AnimatedTabContent>
          <AnimatedTabContent value="menu"><MenuManager /></AnimatedTabContent>
          <AnimatedTabContent value="chat" className="flex-1 min-h-0 flex flex-col"><ChatPanel mode="admin" user={user} /></AnimatedTabContent>
          <AnimatedTabContent value="services"><ServicesPanel mode="admin" user={user} /></AnimatedTabContent>
          <AnimatedTabContent value="stylists"><StylistManager /></AnimatedTabContent>
          <AnimatedTabContent value="messages"><GuestMessagesPanel /></AnimatedTabContent>
          <AnimatedTabContent value="qr"><QRDisplay /></AnimatedTabContent>
          <AnimatedTabContent value="report"><DailyReport /></AnimatedTabContent>
        </Swipeable>
      </Tabs>
    </div>
  );
}