"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentProject = getCurrentProject;
exports.getProjectRoot = getProjectRoot;
exports.getDecisions = getDecisions;
exports.getUnembeddedIds = getUnembeddedIds;
exports.getReviewedIds = getReviewedIds;
exports.markAsReviewed = markAsReviewed;
exports.getUnreviewedIds = getUnreviewedIds;
exports.getUnreviewedCount = getUnreviewedCount;
exports.findSimilarDecisions = findSimilarDecisions;
exports.getCommitLog = getCommitLog;
exports.getCommit = getCommit;
exports.diffCommits = diffCommits;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
/**
 * Get project name from current workspace
 */
function getCurrentProject() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
    }
    return path.basename(workspaceFolders[0].uri.fsPath);
}
/**
 * Get the project root path for DecisionNode storage
 */
function getProjectRoot() {
    const project = getCurrentProject();
    if (!project) {
        return null;
    }
    const homeDir = os.homedir();
    return path.join(homeDir, '.decisionnode', '.decisions', project);
}
/**
 * Get all decisions from the store
 */
async function getDecisions() {
    const projectRoot = getProjectRoot();
    if (!projectRoot || !fs.existsSync(projectRoot)) {
        return [];
    }
    const decisions = [];
    const files = fs.readdirSync(projectRoot);
    for (const file of files) {
        if (file.endsWith('.json') && file !== 'vectors.json' && file !== 'sync-metadata.json') {
            try {
                const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
                const collection = JSON.parse(content);
                decisions.push(...collection.decisions);
            }
            catch {
                // Skip invalid files
            }
        }
    }
    return decisions;
}
/**
 * Get decision IDs that are missing embeddings OR have been modified since last embed
 * Compares decision updatedAt with vectors.json metadata
 */
function getUnembeddedIds() {
    const projectRoot = getProjectRoot();
    if (!projectRoot)
        return new Set();
    // Load vectors.json - now stores { id: { vector: [...], embeddedAt: "..." } } or just [...] for legacy
    const vectorsPath = path.join(projectRoot, 'vectors.json');
    let embeddedData = {};
    if (fs.existsSync(vectorsPath)) {
        try {
            const content = fs.readFileSync(vectorsPath, 'utf-8');
            embeddedData = JSON.parse(content);
        }
        catch {
            // Invalid vectors file
        }
    }
    // Get all decisions with their updatedAt timestamps
    const allDecisions = new Map(); // id -> updatedAt
    const files = fs.readdirSync(projectRoot);
    for (const file of files) {
        if (file.endsWith('.json') && file !== 'vectors.json' && file !== 'reviewed.json') {
            try {
                const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
                const collection = JSON.parse(content);
                collection.decisions.forEach(d => {
                    allDecisions.set(d.id, d.updatedAt || d.createdAt);
                });
            }
            catch {
                // Skip
            }
        }
    }
    // Return IDs that are NOT in vectors.json OR have been modified since embedding
    const unsynced = new Set();
    allDecisions.forEach((decisionTimestamp, id) => {
        const embedInfo = embeddedData[id];
        if (!embedInfo) {
            // Not embedded at all
            unsynced.add(id);
        }
        else if (typeof embedInfo === 'object' && !Array.isArray(embedInfo) && embedInfo.embeddedAt) {
            // New format with embeddedAt timestamp - check if decision was updated after embedding
            // Allow 2 second grace period for FS timestamp variations
            if (decisionTimestamp && (new Date(decisionTimestamp).getTime() - new Date(embedInfo.embeddedAt).getTime()) > 2000) {
                unsynced.add(id);
            }
        }
        // Legacy format (just array) - assume synced since we can't compare
    });
    return unsynced;
}
/**
 * Get IDs of decisions that user has reviewed (clicked on)
 */
function getReviewedIds() {
    const projectRoot = getProjectRoot();
    if (!projectRoot)
        return new Set();
    const reviewedPath = path.join(projectRoot, 'reviewed.json');
    if (!fs.existsSync(reviewedPath))
        return new Set();
    try {
        const content = fs.readFileSync(reviewedPath, 'utf-8');
        const data = JSON.parse(content);
        return new Set(data.reviewed || []);
    }
    catch {
        return new Set();
    }
}
/**
 * Mark a decision as reviewed
 */
function markAsReviewed(decisionId) {
    const projectRoot = getProjectRoot();
    if (!projectRoot)
        return;
    const reviewedPath = path.join(projectRoot, 'reviewed.json');
    let reviewed = [];
    if (fs.existsSync(reviewedPath)) {
        try {
            const content = fs.readFileSync(reviewedPath, 'utf-8');
            const data = JSON.parse(content);
            reviewed = data.reviewed || [];
        }
        catch {
            // Start fresh
        }
    }
    if (!reviewed.includes(decisionId)) {
        reviewed.push(decisionId);
        fs.writeFileSync(reviewedPath, JSON.stringify({ reviewed }, null, 2));
    }
}
/**
 * Get IDs of decisions that haven't been reviewed yet
 */
function getUnreviewedIds() {
    const projectRoot = getProjectRoot();
    if (!projectRoot)
        return new Set();
    const reviewedIds = getReviewedIds();
    const allIds = new Set();
    // Get all decision IDs
    const files = fs.readdirSync(projectRoot);
    for (const file of files) {
        if (file.endsWith('.json') && file !== 'vectors.json' && file !== 'reviewed.json' && file !== 'sync-metadata.json') {
            try {
                const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
                const collection = JSON.parse(content);
                collection.decisions.forEach(d => allIds.add(d.id));
            }
            catch {
                // Skip
            }
        }
    }
    // Return IDs that are NOT in reviewed
    const unreviewed = new Set();
    allIds.forEach(id => {
        if (!reviewedIds.has(id)) {
            unreviewed.add(id);
        }
    });
    return unreviewed;
}
/**
 * Get count of unreviewed decisions (for badge)
 */
function getUnreviewedCount() {
    return getUnreviewedIds().size;
}
/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
function findSimilarDecisions(decisionId, threshold = 0.85) {
    const projectRoot = getProjectRoot();
    if (!projectRoot)
        return [];
    // Load vectors
    const vectorsPath = path.join(projectRoot, 'vectors.json');
    if (!fs.existsSync(vectorsPath))
        return [];
    let vectors = {};
    try {
        const content = fs.readFileSync(vectorsPath, 'utf-8');
        vectors = JSON.parse(content);
    }
    catch {
        return [];
    }
    // Helper to extract vector from legacy or new format
    const getVector = (entry) => {
        if (Array.isArray(entry))
            return entry;
        if (entry && Array.isArray(entry.vector))
            return entry.vector;
        return null;
    };
    // Get target decision vector
    const targetVector = getVector(vectors[decisionId]);
    if (!targetVector)
        return [];
    // Load all decisions for names
    const allDecisions = new Map();
    const files = fs.readdirSync(projectRoot);
    for (const file of files) {
        if (file.endsWith('.json') && file !== 'vectors.json' && file !== 'sync-metadata.json') {
            try {
                const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
                const collection = JSON.parse(content);
                collection.decisions.forEach(d => allDecisions.set(d.id, d.decision));
            }
            catch {
                // Skip
            }
        }
    }
    // Find similar decisions
    const similar = [];
    for (const [id, rawEntry] of Object.entries(vectors)) {
        if (id === decisionId)
            continue; // Skip self
        const vector = getVector(rawEntry);
        if (!vector)
            continue;
        const similarity = cosineSimilarity(targetVector, vector);
        if (similarity >= threshold) {
            similar.push({
                id,
                decision: allDecisions.get(id) || 'Unknown',
                similarity
            });
        }
    }
    // Sort by similarity (highest first)
    return similar.sort((a, b) => b.similarity - a.similarity);
}
/**
 * Get commit history
 */
async function getCommitLog(projectRoot) {
    const commitsDir = path.join(projectRoot, 'history', 'commits');
    if (!fs.existsSync(commitsDir)) {
        return [];
    }
    const commits = [];
    const files = fs.readdirSync(commitsDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(commitsDir, file), 'utf-8');
                commits.push(JSON.parse(content));
            }
            catch {
                // Skip invalid files
            }
        }
    }
    // Sort by timestamp (newest first)
    commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return commits;
}
/**
 * Get a specific commit by ID
 */
async function getCommit(projectRoot, commitId) {
    const commitPath = path.join(projectRoot, 'history', 'commits', `${commitId}.json`);
    if (!fs.existsSync(commitPath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(commitPath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Compare two commit snapshots and return the diff
 */
function diffCommits(commitA, commitB) {
    const added = [];
    const removed = [];
    const changed = [];
    // Build map of decisions in commit A
    const decisionsA = new Map();
    for (const scope of Object.keys(commitA.snapshot)) {
        for (const decision of commitA.snapshot[scope].decisions) {
            decisionsA.set(decision.id, decision);
        }
    }
    // Build map of decisions in commit B
    const decisionsB = new Map();
    for (const scope of Object.keys(commitB.snapshot)) {
        for (const decision of commitB.snapshot[scope].decisions) {
            decisionsB.set(decision.id, decision);
        }
    }
    // Find added and changed
    for (const [id, decision] of decisionsB) {
        const prev = decisionsA.get(id);
        if (!prev) {
            added.push(decision);
        }
        else if (prev.decision !== decision.decision || prev.status !== decision.status) {
            changed.push({ before: prev, after: decision });
        }
    }
    // Find removed
    for (const [id, decision] of decisionsA) {
        if (!decisionsB.has(id)) {
            removed.push(decision);
        }
    }
    return { added, removed, changed };
}
//# sourceMappingURL=store.js.map