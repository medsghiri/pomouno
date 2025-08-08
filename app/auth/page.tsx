"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuth } from '@/lib/auth-context';

export default function AuthPage() {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  // Get default tab from URL params
  const mode = searchParams.get('mode');
  const defaultTab = mode === 'signin' ? 'signin' : 'signup';

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleClose = () => {
    setIsOpen(false);
    router.push('/');
  };

  const handleSuccess = () => {
    setIsOpen(false);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen">
      <AuthModal
        isOpen={isOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        defaultTab={defaultTab}
      />
    </div>
  );
}