// Database types for Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export type SubscriptionTier = 'free' | 'pro';

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    username: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    bio: string | null;
                    is_admin: boolean;
                    subscription_tier: SubscriptionTier;
                    subscription_expires_at: string | null;
                    stripe_customer_id: string | null;
                    stripe_connect_id: string | null;
                    stripe_account_status: string | null;
                    stripe_status_checked_at: string | null;
                    username_changed_at: string | null;
                    username_change_count: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    username: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    subscription_tier?: SubscriptionTier;
                    subscription_expires_at?: string | null;
                    stripe_customer_id?: string | null;
                    stripe_connect_id?: string | null;
                };
                Update: {
                    username?: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    subscription_tier?: SubscriptionTier;
                    subscription_expires_at?: string | null;
                    stripe_customer_id?: string | null;
                    stripe_connect_id?: string | null;
                };
            };
            packs: {
                Row: {
                    id: string;
                    slug: string;
                    name: string;
                    description: string;
                    scope: string;
                    author_id: string;
                    version: string;
                    decisions: Json;
                    vectors: Json;
                    tags: string[];
                    downloads: number;
                    is_featured: boolean;
                    is_published: boolean;
                    is_embedded: boolean;
                    is_paid: boolean;
                    price_cents: number;
                    preview_decisions: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    slug: string;
                    name: string;
                    description: string;
                    scope: string;
                    author_id: string;
                    version?: string;
                    decisions: Json;
                    vectors?: Json;
                    tags?: string[];
                    is_featured?: boolean;
                    is_published?: boolean;
                    is_embedded?: boolean;
                    is_paid?: boolean;
                    price_cents?: number;
                    preview_decisions?: number;
                };
                Update: {
                    name?: string;
                    description?: string;
                    scope?: string;
                    version?: string;
                    decisions?: Json;
                    vectors?: Json;
                    tags?: string[];
                    is_featured?: boolean;
                    is_published?: boolean;
                    is_embedded?: boolean;
                    is_paid?: boolean;
                    price_cents?: number;
                    preview_decisions?: number;
                };
            };
            ratings: {
                Row: {
                    id: string;
                    pack_id: string;
                    user_id: string;
                    score: number;
                    review: string | null;
                    created_at: string;
                };
                Insert: {
                    pack_id: string;
                    user_id: string;
                    score: number;
                    review?: string | null;
                };
                Update: {
                    score?: number;
                    review?: string | null;
                };
            };
            favorites: {
                Row: {
                    user_id: string;
                    pack_id: string;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    pack_id: string;
                };
                Update: never;
            };
            embedding_publishes: {
                Row: {
                    id: string;
                    user_id: string;
                    pack_id: string;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    pack_id: string;
                };
                Update: never;
            };
            pack_views: {
                Row: {
                    id: string;
                    pack_id: string;
                    user_id: string | null;
                    created_at: string;
                };
                Insert: {
                    pack_id: string;
                    user_id?: string | null;
                };
                Update: never;
            };
            pack_purchases: {
                Row: {
                    id: string;
                    user_id: string | null;
                    pack_id: string | null;
                    amount_cents: number;
                    platform_fee_cents: number;
                    creator_amount_cents: number;
                    stripe_payment_id: string | null;
                    stripe_checkout_session_id: string | null;
                    status: 'pending' | 'completed' | 'refunded';
                    created_at: string;
                };
                Insert: {
                    user_id?: string | null;
                    pack_id?: string | null;
                    amount_cents: number;
                    platform_fee_cents: number;
                    creator_amount_cents: number;
                    stripe_payment_id?: string | null;
                    stripe_checkout_session_id?: string | null;
                    status?: 'pending' | 'completed' | 'refunded';
                };
                Update: {
                    status?: 'pending' | 'completed' | 'refunded';
                    stripe_payment_id?: string | null;
                };
            };
            user_decisions: {
                Row: {
                    id: string;
                    user_id: string;
                    project_name: string;
                    decision_id: string;
                    scope: string;
                    decision: string;
                    rationale: string | null;
                    applies_to: string[] | null;
                    constraints: string[] | null;
                    tags: string[] | null;
                    status: 'active' | 'deprecated' | 'overridden';
                    embedding: number[] | null;
                    synced_at: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    project_name: string;
                    decision_id: string;
                    scope: string;
                    decision: string;
                    rationale?: string | null;
                    applies_to?: string[] | null;
                    constraints?: string[] | null;
                    tags?: string[] | null;
                    status?: 'active' | 'deprecated' | 'overridden';
                    embedding?: number[] | null;
                };
                Update: {
                    decision?: string;
                    rationale?: string | null;
                    applies_to?: string[] | null;
                    constraints?: string[] | null;
                    tags?: string[] | null;
                    status?: 'active' | 'deprecated' | 'overridden';
                    embedding?: number[] | null;
                    synced_at?: string;
                    updated_at?: string;
                };
            };
        };
        Views: {
            packs_with_ratings: {
                Row: {
                    id: string;
                    slug: string;
                    name: string;
                    description: string;
                    scope: string;
                    author_id: string;
                    version: string;
                    decisions: Json;
                    vectors: Json;
                    tags: string[];
                    downloads: number;
                    is_featured: boolean;
                    is_published: boolean;
                    is_embedded: boolean;
                    is_paid: boolean;
                    price_cents: number;
                    preview_decisions: number;
                    created_at: string;
                    updated_at: string;
                    avg_rating: number;
                    rating_count: number;
                    author_username: string;
                    author_display_name: string | null;
                    author_avatar: string | null;
                };
            };
        };
        Functions: {
            increment_downloads: {
                Args: { pack_slug: string };
                Returns: void;
            };
            get_weekly_embedding_count: {
                Args: { p_user_id: string };
                Returns: number;
            };
            user_owns_pack: {
                Args: { p_user_id: string; p_pack_id: string };
                Returns: boolean;
            };
            search_user_decisions: {
                Args: {
                    p_user_id: string;
                    p_project_name: string;
                    p_query_embedding: number[];
                    p_limit?: number;
                };
                Returns: {
                    id: string;
                    decision_id: string;
                    scope: string;
                    decision: string;
                    rationale: string | null;
                    similarity: number;
                }[];
            };
            get_secure_pack_details: {
                Args: { p_slug: string };
                Returns: {
                    id: string;
                    slug: string;
                    name: string;
                    description: string;
                    scope: string;
                    author_id: string;
                    version: string;
                    decisions: Json;
                    vectors: Json;
                    tags: string[];
                    downloads: number;
                    is_featured: boolean;
                    is_published: boolean;
                    is_embedded: boolean;
                    is_paid: boolean;
                    price_cents: number;
                    preview_decisions: number;
                    created_at: string;
                    updated_at: string;
                    avg_rating: number;
                    rating_count: number;
                    author_username: string;
                    author_display_name: string | null;
                    author_avatar: string | null;
                    total_decisions_count: number;
                    user_has_access: boolean;
                }[];
            };
        };
    };
};


// Decision types (matching main DecisionNode)
export interface DecisionNode {
    id: string;
    scope: string;
    decision: string;
    rationale?: string;

    constraints?: string[];
    status: 'active' | 'deprecated' | 'overridden';
    createdAt: string;
    updatedAt?: string;
}

// Extended pack type with ratings
export type PackWithRating = Database['public']['Views']['packs_with_ratings']['Row'];
export type SecurePackDetails = Database['public']['Functions']['get_secure_pack_details']['Returns'][0];
export type Pack = Database['public']['Tables']['packs']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Rating = Database['public']['Tables']['ratings']['Row'];
export type EmbeddingPublish = Database['public']['Tables']['embedding_publishes']['Row'];
export type PackPurchase = Database['public']['Tables']['pack_purchases']['Row'];
export type UserDecision = Database['public']['Tables']['user_decisions']['Row'];

// Constants
export const FREE_TIER_WEEKLY_EMBEDDING_LIMIT = 3;
export const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%

