import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Scissors, Coffee, MessageSquare, QrCode, Shield, User } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user, authChecked } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');

  if (authChecked && isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/front-desk' : '/stylist'} replace />;
  }

  // Redirect invited users to the sign-up page
  if (emailParam) {
    return <Navigate to={`/register${window.location.search}`} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40 flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto px-6 pt-20 pb-12 text-center flex flex-col justify-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-card mb-6 self-center">
          <Scissors className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Salonflow
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Seamless communication between your front desk, stylists, and guests. Order drinks, chat in real time, and manage services — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link to="/login"><Shield className="w-5 h-5 mr-2" />Admin Login</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login"><User className="w-5 h-5 mr-2" />User Login</Link>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
        <div className="text-center glass-card p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <Coffee className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-heading font-semibold mb-1">Drink Ordering</h3>
          <p className="text-sm text-muted-foreground">Stylists and guests request drinks that arrive instantly at the front desk.</p>
        </div>
        <div className="text-center glass-card p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-heading font-semibold mb-1">Real-Time Chat</h3>
          <p className="text-sm text-muted-foreground">Stylists message the front desk directly with updates and requests.</p>
        </div>
        <div className="text-center glass-card p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-heading font-semibold mb-1">QR Guest Menu</h3>
          <p className="text-sm text-muted-foreground">Guests scan a QR code to browse the menu and request service from their seat.</p>
        </div>
      </div>
    </div>
  );
}