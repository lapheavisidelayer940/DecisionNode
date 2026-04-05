import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type StripeStatusValue = 'loading' | 'not_connected' | 'incomplete' | 'pending' | 'active';

export interface StripeStatus {
    status: StripeStatusValue;
    message?: string;
    cached?: boolean;
    checked_at?: string;
}

export function useStripeStatus(activeTab?: string, searchParams?: URLSearchParams) {
    const { user } = useAuth();
    const [stripeStatus, setStripeStatus] = useState<StripeStatus>({ status: 'loading' });
    const [refreshing, setRefreshing] = useState(false);

    const fetchStripeStatus = useCallback(async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-stripe-status${forceRefresh ? '?forceRefresh=true' : ''}`;
            const response = await fetch(
                url,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                }
            );

            const data = await response.json();
            if (response.ok) {
                setStripeStatus({
                    status: data.status,
                    message: data.message,
                    cached: data.cached,
                    checked_at: data.checked_at
                });
            } else {
                setStripeStatus({ status: 'not_connected', message: data.error });
            }
        } catch (error) {
            console.error('Error fetching Stripe status:', error);
            setStripeStatus({ status: 'not_connected' });
        } finally {
            if (forceRefresh) setRefreshing(false);
        }
    }, []);

    // Initial fetch based on URL params / tab
    useEffect(() => {
        if (!user) return;

        // If an activeTab is provided, only fetch when it's payments
        if (activeTab && activeTab !== 'payments') return;

        let shouldForceRefresh = false;
        if (searchParams) {
            const connectStatus = searchParams.get('connect');
            shouldForceRefresh = connectStatus === 'success' || connectStatus === 'refresh';
        }

        fetchStripeStatus(shouldForceRefresh);
    }, [user, activeTab, searchParams, fetchStripeStatus]);

    // Set up realtime subscription to listen for backend webhook updates
    useEffect(() => {
        if (!user) return;

        const channelID = `profile-stripe-status-${user.id}`;
        const channel = supabase
            .channel(channelID)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    const newProfile = payload.new as any;
                    const oldProfile = payload.old as any;

                    // If the stripe_account_status changes on the profile (e.g. via Stripe webhook),
                    // automatically force refresh the detailed status so the frontend updates immediately
                    if (newProfile.stripe_account_status !== oldProfile.stripe_account_status ||
                        newProfile.stripe_connect_id !== oldProfile.stripe_connect_id) {
                        fetchStripeStatus(true);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to profile realtime updates for Stripe status');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchStripeStatus]);

    // Optional: Add a polling interval if status is pending, since sometimes
    // webhooks or realtime might get delayed or missed, and user wants rapid feedback.
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (stripeStatus.status === 'pending' || stripeStatus.status === 'incomplete') {
            // Poll every 10 seconds if in a transient state
            interval = setInterval(() => {
                fetchStripeStatus(true);
            }, 10000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [stripeStatus.status, fetchStripeStatus]);

    return {
        stripeStatus,
        refreshing,
        fetchStripeStatus
    };
}
