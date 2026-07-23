import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import MenuBrowser from '@/components/MenuBrowser';
import ChatPanel from '@/components/ChatPanel';
import ServicesPanel from '@/components/ServicesPanel';
import { Coffee, MessageSquare, Scissors, BellRing, User, Settings } from 'lucide-react';
import ServiceUpdateForm from '@/components/ServiceUpdateForm';
import StylistProfileDialog from '@/components/StylistProfileDialog';
import { useStylistNotifications } from '@/hooks/useStylistNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import Swipeable from '@/components/Swipeable';
import AnimatedTabContent from '@/components/AnimatedTabContent';
import { useTabScrollRestoration } from '@/hooks/useTabScrollRestoration';
import { useUrlModal } from '@/hooks/useUrlModal';

export default function StylistView() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useUrlModal('edit-profile');
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'coffee';
  });

  useStylistNotifications(user);
  const unreadCount = useUnreadMessages('stylist', user);
  const scrollRef = useTabScrollRestoration(activeTab);

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

  const displayName = user?.display_name || user?.full_name || user?.email || 'Stylist';

  const tabs = ['coffee', 'chat', 'services', 'service-update'];

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 flex flex-col overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full glass-card flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-heading text-xl font-semibold">{displayName}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Edit Profile</span>
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="glass-header fixed bottom-0 left-0 right-0 z-30 h-16 border-t safe-area-bottom justify-around rounded-none flex w-full md:relative md:flex-wrap md:h-auto md:border md:justify-start md:rounded-lg md:w-auto md:shadow-lg">
          <TabsTrigger value="coffee" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><Coffee className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Order</span></TabsTrigger>
          <TabsTrigger value="chat" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none relative">
            <MessageSquare className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Chat</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 md:top-1 md:right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </TabsTrigger>
          <TabsTrigger value="services" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><Scissors className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">My Services</span></TabsTrigger>
          <TabsTrigger value="service-update" className="flex-col gap-0.5 h-full flex-1 md:flex-row md:gap-0 md:h-auto md:flex-none"><BellRing className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Service Update</span></TabsTrigger>
        </TabsList>
        <Swipeable tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} className="mt-6 flex-1 min-h-0 flex flex-col">
          <AnimatedTabContent value="coffee"><MenuBrowser mode="stylist" user={user} salonId={user?.salon_id} /></AnimatedTabContent>
          <AnimatedTabContent value="chat" className="flex-1 min-h-0 flex flex-col"><ChatPanel mode="stylist" user={user} /></AnimatedTabContent>
          <AnimatedTabContent value="services"><ServicesPanel mode="stylist" user={user} /></AnimatedTabContent>
          <AnimatedTabContent value="service-update"><ServiceUpdateForm user={user} /></AnimatedTabContent>
        </Swipeable>
      </Tabs>
      <StylistProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}