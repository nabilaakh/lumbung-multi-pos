'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface SignOutButtonProps {
  className?: string;
  variant?: 'outline' | 'default' | 'ghost' | 'destructive';
}

export function SignOutButton({ className, variant = 'outline' }: SignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleSignOut}
      disabled={isLoading}
      className={className}
    >
      <LogOut className="h-4 w-4 mr-2" />
      {isLoading ? 'Keluar...' : 'Keluar'}
    </Button>
  );
}
