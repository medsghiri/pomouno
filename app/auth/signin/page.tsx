"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuth } from '@/lib/auth-context';

export default function SignInPage() {
    const [isOpen, setIsOpen] = useState(true);
    const router = useRouter();
    const { user, loading } = useAuth();

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
                defaultTab="signin"
            />
        </div>
    );
}