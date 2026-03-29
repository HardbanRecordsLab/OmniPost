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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

export function SocialAccountsManager() {
  const [connectedAccounts, setConnectedAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  
  // Session Vault state
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [captureSessions, setCaptureSessions] = useState<Record<string, CaptureSession>>({});
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loadingVault, setLoadingVault] = useState(false);

  useEffect(() => {
    loadConnectedAccounts();
    loadVaultEntries();

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      const platform = urlParams.get('platform');
      // Show success message
      alert(`Successfully connected ${platform}!`);
      // Clean URL
      window.history.replaceState({}, '', '/integrations');
      // Reload accounts
      loadConnectedAccounts();
    } else if (urlParams.get('error')) {
      alert(`Connection failed: ${urlParams.get('error')}`);
      window.history.replaceState({}, '', '/integrations');
    }
  }, []);

  // Session Vault functions
  async function loadVaultEntries() {
    try {
      setLoadingVault(true);
      const response = await api.get('/api/vault');
      setVaultEntries(response.data.entries || []);
    } catch (error) {
      console.error('Error loading vault entries:', error);
    } finally {
      setLoadingVault(false);
    }
  }

  async function startSessionCapture(platform: string) {
    try {
      const response = await api.post('/api/vault/capture', { platform });
      const session = response.data;
      
      setCaptureSessions(prev => ({
        ...prev,
        [session.sessionId]: session
      }));
      
      setSelectedPlatform(platform);
      setShowVaultDialog(true);
      
      // Start polling for results
      pollCaptureResult(session.sessionId);
      
      // Open login URL if provided
      if (session.loginUrl) {
        window.open(session.loginUrl, '_blank');
      }
    } catch (error) {
      console.error('Error starting session capture:', error);
      alert('Failed to start session capture. Please try again.');
    }
  }

  async function pollCaptureResult(sessionId: string) {
    const maxAttempts = 150; // 5 minutes with 2-second intervals
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setCaptureSessions(prev => ({
          ...prev,
          [sessionId]: { ...prev[sessionId], status: 'timeout', message: 'Capture timeout' }
        }));
        return;
      }
      
      try {
        const response = await api.get(`/api/vault/capture/${sessionId}`);
        const session = response.data;
        
        setCaptureSessions(prev => ({
          ...prev,
          [sessionId]: session
        }));
        
        if (session.status === 'completed') {
          loadVaultEntries(); // Refresh vault entries
        } else if (session.status === 'pending' || session.status === 'capturing') {
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Error polling capture result:', error);
        attempts++;
        setTimeout(poll, 2000);
      }
    };
    
    poll();
  }

  async function deleteVaultEntry(entryId: string) {
    if (!confirm('Are you sure you want to delete this session? This will remove all stored cookies.')) {
      return;
    }
    
    try {
      await api.delete(`/api/vault/${entryId}`);
      loadVaultEntries();
    } catch (error) {
      console.error('Error deleting vault entry:', error);
      alert('Failed to delete vault entry');
    }
  }

  const getVaultEntriesForPlatform = (platform: string) => {
    return vaultEntries.filter(entry => entry.platform === platform);
  };

  const getActiveCaptureSession = (platform: string) => {
    return Object.values(captureSessions).find(
      session => session.platform === platform && (session.status === 'pending' || session.status === 'capturing')
    );
  };

  async function loadConnectedAccounts() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setConnectedAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function connectAccount(platform: string) {
    setConnecting(platform);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/${platform}/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Redirect to OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get auth URL');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect account. Please try again.');
      setConnecting(null);
    }
  }

  async function disconnectAccount(accountId: string) {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Reload accounts
        loadConnectedAccounts();
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Failed to disconnect account');
    }
  }

  const isConnected = (platformId: string) => {
    return connectedAccounts.some(acc => acc.platform === platformId);
  };

  const getAccountInfo = (platformId: string) => {
    return connectedAccounts.find(acc => acc.platform === platformId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Connected Accounts</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your social media accounts to start scheduling posts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLATFORMS.map(platform => {
          const connected = isConnected(platform.id);
          const accountInfo = getAccountInfo(platform.id);

          return (
            <Card
              key={platform.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                connected ? 'border-green-500 bg-green-50/50 dark:bg-green-950/10' : ''
              }`}
            >
              <CardContent className="p-6">
                {/* Platform Icon & Name */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`text-3xl bg-gradient-to-br ${platform.color} w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white`}>
                    <span className="filter brightness-110">{platform.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl">{platform.name}</h3>
                    {connected && accountInfo && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        @{accountInfo.username}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status & Action */}
                <div className="space-y-4">
                  {connected ? (
                    <>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full w-fit">
                        <CheckCircle2 className="w-4 h-4" />
                        Connected
                      </div>
                      {accountInfo && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Connected {new Date(accountInfo.connectedAt).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => startSessionCapture(platform.id)}
                          disabled={!!getActiveCaptureSession(platform.id)}
                          className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          <Key className="w-4 h-4 mr-1" />
                          {getActiveCaptureSession(platform.id) ? 'Capturing...' : 'Capture Session'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedPlatform(platform.id);
                            setShowVaultDialog(true);
                          }}
                          className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-900 dark:text-purple-400 dark:hover:bg-purple-950/30"
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Manage Sessions
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => disconnectAccount(accountInfo!.id)}
                          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-gray-400 text-sm px-1">
                        <div className="w-2 h-2 bg-gray-300 rounded-full" />
                        Not Connected
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => connectAccount(platform.id)}
                          disabled={connecting === platform.id}
                          className={`flex-1 bg-gradient-to-r ${platform.color} text-white border-0 hover:opacity-90 transition-opacity`}
                        >
                          {connecting === platform.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => startSessionCapture(platform.id)}
                          disabled={!!getActiveCaptureSession(platform.id)}
                          className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          <Key className="w-4 h-4 mr-1" />
                          {getActiveCaptureSession(platform.id) ? 'Capturing...' : 'Capture Session'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
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

export default SocialAccountsManager;
