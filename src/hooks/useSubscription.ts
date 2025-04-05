import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// Create a custom event for subscription updates
export const SUBSCRIPTION_UPDATED_EVENT = 'subscription_updated';

export type SubscriptionPlan = 'basic' | 'silver' | 'gold';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  is_yearly: boolean;
  amount_paid: number;
  currency: string;
  payment_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  end_date: string;
}

export interface SubscriptionStatus {
  isLoading: boolean;
  subscription: Subscription | null;
  isActive: boolean;
  plan: SubscriptionPlan;
  allowedModels: string[];
  summariesPerDay: number;
  error: string | null;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Define allowed models and limits based on subscription plan
  const getModelsForPlan = (plan: SubscriptionPlan): string[] => {
    switch (plan) {
      case 'basic':
        return ['gemini'];
      case 'silver':
        return ['gemini', 'openai', 'mistral'];
      case 'gold':
        return ['gemini', 'openai', 'mistral', 'claude'];
      default:
        return ['gemini'];
    }
  };

  const getSummariesPerDay = (plan: SubscriptionPlan): number => {
    switch (plan) {
      case 'basic':
        return 5;
      case 'silver':
        return 20;
      case 'gold':
        return 50;
      default:
        return 5;
    }
  };

  // Function to fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching subscription data for user:', user.id);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no subscription found, user is on basic plan
        if (error.code === 'PGRST116') {
          setSubscription(null);
        } else {
          console.error('Error fetching subscription:', error);
          setError(error.message);
        }
      } else {
        // Check if subscription is expired
        const now = new Date();
        const expiresAt = new Date(data.end_date);
        
        if (now > expiresAt) {
          // Subscription has expired, update it in the database
          await supabase
            .from('user_subscriptions')
            .update({ active: false })
            .eq('id', data.id);
          
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Function to manually refresh subscription data
  const refreshSubscription = useCallback(async () => {
    console.log('Manually refreshing subscription data');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Listen for subscription update events
  useEffect(() => {
    const handleSubscriptionUpdated = () => {
      console.log('Subscription updated event received');
      refreshSubscription();
    };

    // Add event listener
    window.addEventListener(SUBSCRIPTION_UPDATED_EVENT, handleSubscriptionUpdated);

    // Clean up
    return () => {
      window.removeEventListener(SUBSCRIPTION_UPDATED_EVENT, handleSubscriptionUpdated);
    };
  }, [refreshSubscription]);

  // Fetch subscription data when component mounts, user changes, or refresh is triggered
  useEffect(() => {
    fetchSubscription();
  }, [user, refreshTrigger, fetchSubscription]);

  // Determine current plan and status
  const plan = subscription?.plan || 'basic';
  const isActive = !!subscription?.active;
  const allowedModels = getModelsForPlan(plan);
  const summariesPerDay = getSummariesPerDay(plan);

  return {
    isLoading,
    subscription,
    isActive,
    plan,
    allowedModels,
    summariesPerDay,
    error,
    refreshSubscription
  };
}
