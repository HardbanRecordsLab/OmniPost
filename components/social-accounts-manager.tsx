"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertCircle, Key, Clock, Trash2, Shield, Eye, EyeOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-purple-500 to-pink-500' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'from-blue-600 to-blue-700' },
  { id: 'twitter', name: 'Twitter (X)', icon: '🐦', color: 'from-sky-400 to-sky-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'from-blue-700 to-blue-900' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-black to-teal-500' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'from-red-600 to-red-700' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'from-blue-400 to-blue-500' },
  { id: 'discord', name: 'Discord', icon: '🎮', color: 'from-indigo-500 to-purple-600' },
  { id: 'reddit', name: 'Reddit', icon: '🔴', color: 'from-orange-500 to-red-600' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: 'from-red-500 to-red-600' },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋', color: 'from-blue-400 to-blue-600' }
];

interface Account {
  id: string;
  platform: string;
  username: string;
  connectedAt: string;
}

interface VaultEntry {
  id: string;
  platform: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  cookieCount: number;
}

interface CaptureSession {
  sessionId: string;
  platform: string;
  status: 'pending' | 'capturing' | 'completed' | 'failed' | 'timeout';
  progress?: number;
  message?: string;
  loginUrl?: string;
}

export default function SocialAccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [captureSessions, setCaptureSessions] = useState<CaptureSession[]>([]);
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedPlatform) {
      loadVaultEntries(selectedPlatform);
    }
  }, [selectedPlatform]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getIntegrations();
      if (response.success) {
        setAccounts(response.accounts || []);
      } else {
        setError(response.error || 'Failed to load accounts');
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVaultEntries = async (platform?: string) => {
    try {
      const response = await api.getVaultEntries(platform);
      if (response.entries) {
        setVaultEntries(response.entries);
      }
    } catch (err) {
      console.error('Failed to load vault entries:', err);
    }
  };

  const connectAccount = async (platform: string) => {
    try {
      const response = await api.connectPlatform(platform);
      if (response.authUrl) {
        window.open(response.authUrl, '_blank', 'width=800,height=600');
        // Poll for connection status
        const checkConnection = setInterval(async () => {
          await loadAccounts();
        }, 2000);
        setTimeout(() => clearInterval(checkConnection), 30000);
      }
    } catch (err) {
      console.error('Failed to connect account:', err);
      setError('Failed to connect account');
    }
  };

  const disconnectAccount = async (platform: string, accountId: string) => {
    try {
      await api.disconnectPlatform(platform, accountId);
      await loadAccounts();
    } catch (err) {
      console.error('Failed to disconnect account:', err);
      setError('Failed to disconnect account');
    }
  };

  const startSessionCapture = async (platform: string) => {
    try {
      const loginUrl = getLoginUrl(platform);
      const response = await api.startCaptureSession(platform, loginUrl);
      if (response.sessionId) {
        const newSession: CaptureSession = {
          sessionId: response.sessionId,
          platform,
          status: 'pending',
          progress: 0
        };
        setCaptureSessions(prev => [...prev, newSession]);
        pollCaptureStatus(response.sessionId);
      }
    } catch (err) {
      console.error('Failed to start capture session:', err);
      setError('Failed to start capture session');
    }
  };

  const pollCaptureStatus = async (sessionId: string) => {
    try {
      const response = await api.getCaptureSession(sessionId);
      setCaptureSessions(prev => 
        prev.map(session => 
          session.sessionId === sessionId 
            ? { ...session, ...response }
            : session
        )
      );
      
      if (response.status === 'completed' || response.status === 'failed') {
        // Reload vault entries if completed
        if (response.status === 'completed' && selectedPlatform) {
          await loadVaultEntries(selectedPlatform);
        }
      } else {
        // Continue polling
        setTimeout(() => pollCaptureStatus(sessionId), 2000);
      }
    } catch (err) {
      console.error('Failed to poll capture status:', err);
    }
  };

  const deleteVaultEntry = async (entryId: string) => {
    try {
      await api.deleteVaultEntry(entryId);
      if (selectedPlatform) {
        await loadVaultEntries(selectedPlatform);
      }
    } catch (err) {
      console.error('Failed to delete vault entry:', err);
      setError('Failed to delete vault entry');
    }
  };

  const getLoginUrl = (platform: string): string => {
    const urls: Record<string, string> = {
      instagram: 'https://www.instagram.com/accounts/login/',
      facebook: 'https://www.facebook.com/login',
      twitter: 'https://twitter.com/login',
      linkedin: 'https://www.linkedin.com/login',
      tiktok: 'https://www.tiktok.com/login',
      youtube: 'https://accounts.google.com/signin',
      telegram: 'https://web.telegram.org',
      discord: 'https://discord.com/login',
      reddit: 'https://www.reddit.com/login',
      pinterest: 'https://www.pinterest.com/login',
      bluesky: 'https://bsky.app/login'
    };
    return urls[platform] || '#';
  };

  const getVaultEntriesForPlatform = (platform: string) => {
    return vaultEntries.filter(entry => entry.platform === platform);
  };

  const getActiveCaptureSession = (platform: string) => {
    return captureSessions.find(
      session => session.platform === platform && (session.status === 'pending' || session.status === 'capturing')
    );
  };

  const connectedAccounts = accounts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadAccounts}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Media Integrations</h2>
          <p className="text-muted-foreground">Connect your social media accounts for automated posting</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {connectedAccounts.length} / {PLATFORMS.length} connected
        </Badge>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map(platform => {
          const isConnected = connectedAccounts.some(acc => acc.platform === platform.id);
          const vaultEntriesCount = getVaultEntriesForPlatform(platform.id).length;
          const activeSession = getActiveCaptureSession(platform.id);

          return (
            <Card key={platform.id} className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
              isConnected ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''
            }`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-5`} />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="font-semibold">{platform.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {vaultEntriesCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        {vaultEntriesCount}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConnected ? (
                  <div className="space-y-3">
                    <div className="text-sm text-green-800 dark:text-green-300 font-medium">
                      ✓ Connected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPlatform(platform.id);
                          setShowVaultDialog(true);
                        }}
                        className="flex-1"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Session Vault
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const account = connectedAccounts.find(acc => acc.platform === platform.id);
                          if (account) disconnectAccount(platform.id, account.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Not connected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPlatform(platform.id);
                          setShowVaultDialog(true);
                        }}
                        className="flex-1"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Session Vault
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startSessionCapture(platform.id)}
                        disabled={!!activeSession}
                        className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
                      >
                        <Key className="w-4 h-4 mr-1" />
                        {activeSession ? 'Capturing...' : 'Capture Session'}
                      </Button>
                    </div>
                  </div>
                )}

                {activeSession && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Session Capture in Progress</span>
                    </div>
                    <div className="w-full bg-blue-100 dark:bg-blue-900 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${activeSession.progress || 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Session ID: {activeSession.sessionId}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connected Count */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900">
        <CardContent className="p-6 text-center">
          <p className="text-blue-800 dark:text-blue-300">
            <span className="font-bold text-2xl">{connectedAccounts.length}</span> / {PLATFORMS.length} accounts connected
          </p>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-100 dark:border-yellow-900">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">Tips & Requirements</h4>
          </div>
          <ul className="grid md:grid-cols-2 gap-2 text-sm text-yellow-800 dark:text-yellow-300">
            <li>• Instagram requires a Business/Creator account connected to a Facebook Page</li>
            <li>• TikTok posts will be private until app approval</li>
            <li>• Some platforms require periodic re-authentication (every 60-90 days)</li>
            <li>• You can connect multiple accounts for the same platform</li>
          </ul>
        </CardContent>
      </Card>

      {/* Session Vault Dialog */}
      <Dialog open={showVaultDialog} onOpenChange={setShowVaultDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Session Vault - {selectedPlatform && PLATFORMS.find(p => p.id === selectedPlatform)?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlatform && (
            <div className="space-y-6">
              {/* Active Capture Session */}
              {(() => {
                const activeSession = getActiveCaptureSession(selectedPlatform);
                return activeSession ? (
                  <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                        Active Capture Session
                        <Badge variant="outline">
                          {activeSession.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm">
                        <p><strong>Session ID:</strong> {activeSession.sessionId}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
