// Cloud sync helpers for DecisionNode Cloud Sync (Pro) subscribers
// Provides cloud authentication, sync, and embedding services

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import http from 'http';
import { exec } from 'child_process';

// Cloud configuration file location
const CLOUD_CONFIG_DIR = path.join(os.homedir(), '.decisionnode');
const CLOUD_CONFIG_FILE = path.join(CLOUD_CONFIG_DIR, 'cloud.json');

// Supabase/Marketplace URLs
const SUPABASE_URL = process.env.DECISIONNODE_SUPABASE_URL || '';
const MARKETPLACE_URL = process.env.DECISIONNODE_MARKETPLACE_URL || 'https://decisionnode.dev';

interface CloudConfig {
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: number;
    anon_key?: string;
    user_id?: string;
    username?: string;
    email?: string;
    subscription_tier?: 'free' | 'pro';
    subscription_expires_at?: string;
    last_sync?: string;
}

/**
 * Load cloud configuration from disk
 * Automatically refreshes token if expired
 */
export async function loadCloudConfig(): Promise<CloudConfig> {
    try {
        const content = await fs.readFile(CLOUD_CONFIG_FILE, 'utf-8');
        let config: CloudConfig = JSON.parse(content);

        // Check if token needs refresh
        if (config.access_token && config.refresh_token && config.token_expires_at) {
            // Refresh if expired or expiring in less than 5 minutes
            const now = Math.floor(Date.now() / 1000);
            if (now >= config.token_expires_at - 300) {
                config = await refreshToken(config);
            }
        }

        return config;
    } catch {
        return {};
    }
}

/**
 * Refresh access token using refresh token
 */
async function refreshToken(config: CloudConfig): Promise<CloudConfig> {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.anon_key || '',
            },
            body: JSON.stringify({ refresh_token: config.refresh_token }),
        });

        if (!response.ok) {
            console.error('Token refresh failed (logging out):', await response.text());
            // Clear invalid tokens to prevent 401 loops and force re-login
            config.access_token = undefined;
            config.refresh_token = undefined;
            config.token_expires_at = undefined;
            await saveCloudConfig(config);
            return config;
        }

        const data = await response.json();

        // Update config with new tokens
        const newConfig = {
            ...config,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            token_expires_at: data.expires_at || Math.floor(Date.now() / 1000) + data.expires_in,
        };

        await saveCloudConfig(newConfig);
        return newConfig;
    } catch (error) {
        console.error('Token refresh error (logging out):', error);
        // Clear tokens on network/other errors if we suspect token is bad? 
        // Safer to just keep old config on network error, but if it was 4xx (above) we clear.
        // For network error, maybe we shouldn't clear, just fail. 
        // But if token IS expired, we can't use it anyway.
        return config;
    }
}

/**
 * Save cloud configuration to disk
 */
export async function saveCloudConfig(config: CloudConfig): Promise<void> {
    await fs.mkdir(CLOUD_CONFIG_DIR, { recursive: true });
    await fs.writeFile(CLOUD_CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Check if user is authenticated with cloud
 */
export async function isCloudAuthenticated(): Promise<boolean> {
    const config = await loadCloudConfig();
    if (!config.access_token) return false;

    // Check if subscription expired (for Pro features)
    if (config.subscription_tier === 'pro' && config.subscription_expires_at) {
        const expiresAt = new Date(config.subscription_expires_at);
        if (expiresAt < new Date()) {
            // Subscription expired, downgrade to free locally
            config.subscription_tier = 'free';
            await saveCloudConfig(config);
        }
    }

    return true;
}

/**
 * Check if user has Pro subscription
 */
export async function isProSubscriber(): Promise<boolean> {
    const config = await loadCloudConfig();
    if (config.subscription_tier !== 'pro') return false;

    // Check expiration
    if (config.subscription_expires_at) {
        const expiresAt = new Date(config.subscription_expires_at);
        if (expiresAt < new Date()) return false;
    }

    return true;
}

/**
 * Get cloud embedding for a query (Pro only)
 * Falls back to null if not available
 */
export async function getCloudEmbedding(text: string, projectName?: string): Promise<number[] | null> {
    const config = await loadCloudConfig();

    if (!config.access_token) {
        return null;
    }

    // Check Pro status (cloud embedding requires Pro)
    if (config.subscription_tier !== 'pro') {
        return null;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/embed-query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.access_token}`,
                'apikey': config.anon_key || '',
            },
            body: JSON.stringify({ query: text, project_name: projectName }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 402) {
                // Payment required - subscription issue
                console.error('Cloud embedding requires Pro subscription');
            }
            return null;
        }

        const data = await response.json();
        return data.embedding || null;
    } catch (error) {
        console.error('Cloud embedding error:', error);
        return null;
    }
}

/**
 * Sync decisions to cloud (Pro only)
 */
export async function syncDecisionsToCloud(
    projectName: string,
    decisions: any[]
): Promise<{ success: boolean; synced: string[]; failed: string[]; errors?: Record<string, string>; embedded: number } | null> {
    const config = await loadCloudConfig();

    if (!config.access_token || config.subscription_tier !== 'pro') {
        return null;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-decisions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.access_token}`,
                'apikey': config.anon_key || '',
            },
            body: JSON.stringify({ project_name: projectName, decisions }),
        });

        if (!response.ok) {
            console.error('Sync failed:', await response.text());
            return null;
        }

        const result = await response.json();

        // Update last sync time
        config.last_sync = new Date().toISOString();
        await saveCloudConfig(config);

        return result;
    } catch (error) {
        console.error('Sync error:', error);
        return null;
    }
}

/**
 * Get cloud sync status - which decisions are synced
 */
export async function getCloudSyncStatus(projectName: string): Promise<{
    synced: string[];
    total_in_cloud: number;
} | null> {
    const config = await loadCloudConfig();

    if (!config.access_token || config.subscription_tier !== 'pro') {
        return null;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.access_token}`,
                'apikey': config.anon_key || '',
            },
            body: JSON.stringify({ project_name: projectName }),
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Open URL in default browser
 */
function openBrowser(url: string): void {
    let command: string;

    if (process.platform === 'win32') {
        // On Windows, start requires a title argument if the URL is quoted
        // escaping & is handled by the quotes
        command = `start "" "${url}"`;
    } else if (process.platform === 'darwin') {
        command = `open "${url}"`;
    } else {
        command = `xdg-open "${url}"`;
    }

    exec(command, (error) => {
        if (error) {
            console.error('Failed to open browser:', error);
            console.log(`\nPlease open this URL manually:\n${url}\n`);
        }
    });
}

/**
 * Login to cloud service
 * Opens browser for authentication, waits for callback
 */
export async function loginToCloud(): Promise<boolean> {
    console.log('\n🔐 DecisionNode Login');
    console.log('━'.repeat(40));

    // Generate a random auth code for this session
    const authCode = Math.random().toString(36).substring(2, 15);
    const port = 19283; // Random high port for callback

    return new Promise((resolve) => {
        // Create local server to receive callback
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url || '', `http://localhost:${port}`);

            if (url.pathname === '/callback') {
                const token = url.searchParams.get('token');
                const refreshToken = url.searchParams.get('refresh_token');
                const tokenExpiresAt = url.searchParams.get('token_expires_at');
                const anonKey = url.searchParams.get('anon_key');
                const userId = url.searchParams.get('user_id');
                const username = url.searchParams.get('username');
                const email = url.searchParams.get('email');
                const tier = url.searchParams.get('tier') as 'free' | 'pro';
                const expiresAt = url.searchParams.get('expires_at');

                if (token) {
                    // Save the config
                    await saveCloudConfig({
                        access_token: token,
                        refresh_token: refreshToken || undefined,
                        token_expires_at: tokenExpiresAt ? parseInt(tokenExpiresAt) : undefined,
                        anon_key: anonKey || undefined,
                        user_id: userId || undefined,
                        username: username || undefined,
                        email: email || undefined,
                        subscription_tier: tier || 'free',
                        subscription_expires_at: expiresAt || undefined,
                    });

                    // Send success response
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                                       background: #09090b; color: white; display: flex; 
                                       justify-content: center; align-items: center; height: 100vh; }
                                .success { text-align: center; }
                                h1 { color: #22c55e; }
                            </style>
                        </head>
                        <body>
                            <div class="success">
                                <h1>✅ Logged In!</h1>
                                <p>You can close this window and return to the CLI.</p>
                            </div>
                        </body>
                        </html>
                    `);

                    server.close();

                    console.log('\n✅ Login successful!');
                    console.log(`   Logged in as: ${username || email || 'Unknown'}`);
                    console.log(`   Subscription: ${tier === 'pro' ? '⭐ Pro' : 'Free'}\n`);

                    resolve(true);
                } else {
                    res.writeHead(400);
                    res.end('Missing token');
                }
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(port, () => {
            const authUrl = `${MARKETPLACE_URL}/cli-auth?code=${authCode}&callback=http://localhost:${port}/callback`;

            console.log('\nOpening browser for authentication...');
            console.log(`\nIf browser doesn't open, visit:\n  ${authUrl}\n`);

            openBrowser(authUrl);
        });

        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            console.log('\n❌ Login timed out. Please try again.\n');
            resolve(false);
        }, 5 * 60 * 1000);
    });
}

/**
 * Logout from cloud service
 */
export async function logoutFromCloud(): Promise<void> {
    await saveCloudConfig({});
    console.log('✅ Logged out from DecisionNode');
}

/**
 * Get cloud status with detailed info
 */
export async function getCloudStatus(): Promise<{
    authenticated: boolean;
    isPro: boolean;
    userId?: string;
    username?: string;
    email?: string;
    expiresAt?: string;
    lastSync?: string;
}> {
    const config = await loadCloudConfig();
    return {
        authenticated: await isCloudAuthenticated(),
        isPro: await isProSubscriber(),
        userId: config.user_id,
        username: config.username,
        email: config.email,
        expiresAt: config.subscription_expires_at,
        lastSync: config.last_sync,
    };
}

/**
 * Refresh user profile from cloud (updates subscription status)
 */
export async function refreshCloudProfile(): Promise<boolean> {
    const config = await loadCloudConfig();

    if (!config.access_token) {
        return false;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'apikey': config.anon_key || '',
            },
        });

        if (!response.ok) {
            return false;
        }

        const profile = await response.json();

        // Update local config with fresh data
        config.subscription_tier = profile.subscription_tier || 'free';
        config.subscription_expires_at = profile.subscription_expires_at;
        config.username = profile.username;
        config.email = profile.email;

        await saveCloudConfig(config);
        return true;
    } catch {
        return false;
    }
}

/**
 * Delete a decision from cloud (Pro only)
 */
export async function deleteDecisionFromCloud(decisionId: string): Promise<boolean> {
    const config = await loadCloudConfig();

    if (!config.access_token || config.subscription_tier !== 'pro') {
        return false;
    }

    try {
        // Use Supabase REST API directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/user_decisions?decision_id=eq.${decisionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'apikey': config.anon_key || config.access_token, // RLS requires authenticated user, prefer anon key if available
            },
        });

        return response.ok;
    } catch (error) {
        console.error('Delete error:', error);
        return false;
    }
}

/**
 * Pull decisions from cloud (Pro only)
 */
export async function pullDecisionsFromCloud(projectName: string): Promise<any[] | null> {
    const config = await loadCloudConfig();

    if (!config.access_token || config.subscription_tier !== 'pro') {
        return null;
    }

    try {
        // Use Edge Function "get-decisions" which handles auth manually (deployed with --no-verify-jwt)
        // This avoids issues with Gateway JWT verification for potentially expired but refreshable tokens
        // or just weird gateway behavior.
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-decisions?project_name=${encodeURIComponent(projectName)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'apikey': config.anon_key || '',
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            console.error('Pull failed:', await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Pull error:', error);
        return null;
    }
}

// ============================================================================
// PHASE 1: Two-Way Sync with Conflict Detection
// ============================================================================

/**
 * Cloud decision structure (from Supabase)
 */
export interface CloudDecision {
    id: string;
    user_id: string;
    project_name: string;
    decision_id: string;
    scope: string;
    decision: string;
    rationale: string | null;
    constraints: string[] | null;
    status: string;
    synced_at: string;
    updated_at: string;
    embedding?: number[];
}

/**
 * Sync conflict between local and cloud versions
 */
export interface SyncConflict {
    decisionId: string;
    scope: string;
    localDecision: string;
    cloudDecision: string;
    localUpdatedAt: string;
    cloudUpdatedAt: string;
}

/**
 * Sync metadata for a single decision
 */
interface DecisionSyncMeta {
    syncedAt: string;
    cloudUpdatedAt?: string;
    localUpdatedAt?: string;
}

/**
 * Sync metadata file structure
 */
interface SyncMetadata {
    lastSyncAt: string;
    decisions: Record<string, DecisionSyncMeta>;
}

/**
 * Get sync metadata file path for current project
 */
function getSyncMetadataPath(projectRoot: string): string {
    return path.join(projectRoot, 'sync-metadata.json');
}

/**
 * Load sync metadata from disk
 */
export async function loadSyncMetadata(projectRoot: string): Promise<SyncMetadata> {
    try {
        const content = await fs.readFile(getSyncMetadataPath(projectRoot), 'utf-8');
        return JSON.parse(content);
    } catch {
        return { lastSyncAt: '', decisions: {} };
    }
}

/**
 * Save sync metadata to disk
 */
export async function saveSyncMetadata(projectRoot: string, metadata: SyncMetadata): Promise<void> {
    await fs.writeFile(getSyncMetadataPath(projectRoot), JSON.stringify(metadata, null, 2));
}

/**
 * Get auto-sync setting
 */
export async function getAutoSyncEnabled(): Promise<boolean> {
    const config = await loadCloudConfig();
    return (config as any).auto_sync === true;
}

/**
 * Set auto-sync setting
 */
export async function setAutoSyncEnabled(enabled: boolean): Promise<void> {
    const config = await loadCloudConfig();
    (config as any).auto_sync = enabled;
    await saveCloudConfig(config);
}

/**
 * Detect conflicts between local and cloud decisions
 * Returns decisions that need to be pushed, pulled, or have conflicts
 */
export async function detectConflicts(
    projectRoot: string,
    localDecisions: Array<{ id: string; decision: string; updatedAt?: string; scope: string }>,
    cloudDecisions: CloudDecision[]
): Promise<{
    toPush: string[];
    toPull: CloudDecision[];
    conflicts: SyncConflict[];
}> {
    const metadata = await loadSyncMetadata(projectRoot);

    const toPush: string[] = [];
    const toPull: CloudDecision[] = [];
    const conflicts: SyncConflict[] = [];

    // Build maps for comparison
    const localMap = new Map(localDecisions.map(d => [d.id, d]));
    const cloudMap = new Map(cloudDecisions.map(d => [d.decision_id, d]));

    // Check each local decision
    for (const local of localDecisions) {
        const cloud = cloudMap.get(local.id);
        const syncMeta = metadata.decisions[local.id];

        if (!cloud) {
            // Not in cloud - needs push
            toPush.push(local.id);
        } else {
            // Exists in both - check for conflicts
            const localUpdated = local.updatedAt ? new Date(local.updatedAt) : new Date(0);
            const cloudUpdated = new Date(cloud.updated_at);
            const lastSynced = syncMeta?.syncedAt ? new Date(syncMeta.syncedAt) : new Date(0);
            const lastCloudUpdate = syncMeta?.cloudUpdatedAt ? new Date(syncMeta.cloudUpdatedAt) : lastSynced;

            // Robust Change Detection:
            // 1. Local Change: simple timestamp check (relative to local clock)
            const localModifiedSinceSync = localUpdated > lastSynced;

            // 2. Cloud Change:
            let cloudModifiedSinceSync = false;

            if (syncMeta?.cloudUpdatedAt) {
                // Modern metadata: Trust the stored server-timestamp
                const lastCloudUpdate = new Date(syncMeta.cloudUpdatedAt);
                cloudModifiedSinceSync = cloudUpdated.getTime() > lastCloudUpdate.getTime();
            } else {
                // Legacy metadata (missing cloudUpdatedAt): 
                // We CANNOT trust lastSynced vs cloudUpdated if clock was skewed.
                // Fallback: If local hasn't changed, but content differs, assume Cloud changed.
                // This covers the case where user pulled/synced, clock was ahead, so lastSynced > cloudUpdated,
                // causing us to miss future updates.
                if (!localModifiedSinceSync && local.decision !== cloud.decision) {
                    cloudModifiedSinceSync = true;
                } else if (cloudUpdated > lastSynced) {
                    // Standard check (if clock happens to be fine)
                    cloudModifiedSinceSync = true;
                }
            }

            // 3. Content Identity Optimization
            // If timestamps say changed, but content is identical, ignore it (reduces noise)
            if (cloudModifiedSinceSync && local.decision === cloud.decision) {
                cloudModifiedSinceSync = false;
            }

            if (localModifiedSinceSync && cloudModifiedSinceSync) {
                // Both modified AND content specific differs (checked above)
                conflicts.push({
                    decisionId: local.id,
                    scope: local.scope,
                    localDecision: local.decision,
                    cloudDecision: cloud.decision,
                    localUpdatedAt: local.updatedAt || '',
                    cloudUpdatedAt: cloud.updated_at,
                });
            } else if (localModifiedSinceSync) {
                // Only local modified - needs push
                toPush.push(local.id);
            } else if (cloudModifiedSinceSync) {
                // Only cloud modified - needs pull
                toPull.push(cloud);
            }
            // If neither modified, no action needed
        }
    }

    // Check for cloud-only decisions (not in local)
    for (const cloud of cloudDecisions) {
        if (!localMap.has(cloud.decision_id)) {
            toPull.push(cloud);
        }
    }

    return { toPush, toPull, conflicts };
}

/**
 * Save incoming changes from fetch command
 */
export async function saveIncomingChanges(
    projectRoot: string,
    changes: { toPull: CloudDecision[], conflicts: SyncConflict[] }
): Promise<void> {
    const filePath = path.join(projectRoot, 'incoming.json');
    await fs.writeFile(filePath, JSON.stringify({
        fetchedAt: new Date().toISOString(),
        ...changes
    }, null, 2));
}

/**
 * Remove specific decisions from incoming changes list (after sync)
 */
export async function removeIncomingChanges(
    projectRoot: string,
    syncedIds: string[]
): Promise<void> {
    const filePath = path.join(projectRoot, 'incoming.json');
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        const pulledSet = new Set(syncedIds);

        // Filter out synced items
        data.toPull = (data.toPull || []).filter((d: any) => !pulledSet.has(d.decision_id || d.id));
        data.conflicts = (data.conflicts || []).filter((c: any) => !pulledSet.has(c.decisionId));

        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch {
        // Ignore if file doesn't exist
    }
}

/**
 * Resolve a conflict by choosing local or cloud version
 */
export async function resolveConflict(
    projectRoot: string,
    decisionId: string,
    resolution: 'local' | 'cloud',
    cloudDecision?: CloudDecision
): Promise<boolean> {
    const metadata = await loadSyncMetadata(projectRoot);

    if (resolution === 'local') {
        // Mark as needing push (will be handled by next sync)
        // Just clear the conflict by updating sync metadata
        metadata.decisions[decisionId] = {
            syncedAt: new Date().toISOString(),
            localUpdatedAt: new Date().toISOString(),
        };
    } else if (resolution === 'cloud' && cloudDecision) {
        // Cloud wins - update sync metadata
        // The actual update to local store is done by the caller
        metadata.decisions[decisionId] = {
            syncedAt: new Date().toISOString(),
            cloudUpdatedAt: cloudDecision.updated_at,
        };
    }

    await saveSyncMetadata(projectRoot, metadata);
    return true;
}

/**
 * Update sync metadata after successful sync
 */
export async function updateSyncMetadata(
    projectRoot: string,
    syncedIds: string[],
    cloudDecisions: CloudDecision[]
): Promise<void> {
    const metadata = await loadSyncMetadata(projectRoot);
    const now = new Date().toISOString();

    metadata.lastSyncAt = now;

    // Update metadata for synced decisions
    for (const id of syncedIds) {
        const cloud = cloudDecisions.find(d => d.decision_id === id);
        metadata.decisions[id] = {
            syncedAt: now,
            cloudUpdatedAt: cloud?.updated_at,
        };
    }

    await saveSyncMetadata(projectRoot, metadata);
}
