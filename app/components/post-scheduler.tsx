
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Calendar, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  platform_user_id: string;
}

interface MediaFile {
  id: string;
  cdn_url: string;
  thumbnail_url?: string;
  mimetype: string;
}

interface PostSchedulerProps {
  className?: string;
}

export default function PostScheduler({ className }: PostSchedulerProps) {
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConnectedAccounts();
    loadDraft();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (caption || mediaFiles.length > 0) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [caption, selectedPlatforms, mediaFiles]);

  async function loadConnectedAccounts() {
    try {
      const token = localStorage.getItem('token'); // Assuming auth
      // In dev/demo mode, we might not have a token or it might be optional
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(`${API_URL}/api/integrations`, { headers });
      const data = await response.json();
      
      if (data.success) {
        setConnectedAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load connected accounts.",
        variant: "destructive",
      });
    }
  }

  async function loadDraft() {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(`${API_URL}/api/drafts`, { headers });
      const data = await response.json();
      
      if (data.success && data.draft) {
        setCaption(data.draft.content || '');
        setSelectedPlatforms(data.draft.platforms || []);
        // Note: loading media from draft requires resolving media IDs to URLs, 
        // which might need an extra API call or updated draft structure.
        // For now we skip media hydration from draft to keep it simple.
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }

  async function saveDraft() {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      await fetch(`${API_URL}/api/drafts/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: caption,
          platforms: selectedPlatforms,
          mediaIds: mediaFiles.map(m => m.id)
        })
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  async function uploadMedia(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_URL}/api/media/upload-multiple`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setMediaFiles(prev => [...prev, ...data.media]);
        toast({
          title: "Success",
          description: "Media uploaded successfully.",
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload media.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function generateCaption(prompt: string) {
    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/ai/generate-caption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          prompt,
          platform: selectedPlatforms[0] || 'instagram',
          tone: 'casual',
          length: 'medium',
          includeHashtags: true,
          includeEmojis: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCaption(data.caption);
        toast({
          title: "AI Generated",
          description: "Caption generated successfully!",
        });
      }
    } catch (error) {
      console.error('AI error:', error);
      toast({
        title: "Error",
        description: "Failed to generate caption.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function improveCaption() {
    if (!caption) return;
    setAiLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/ai/improve-caption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          caption,
          improvement: 'make it more engaging'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCaption(data.caption);
        toast({
          title: "AI Improved",
          description: "Caption improved successfully!",
        });
      }
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setAiLoading(false);
    }
  }

  async function schedulePost() {
    if (!caption && mediaFiles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add a caption or media.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one platform.",
        variant: "destructive",
      });
      return;
    }

    setPublishing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          content: caption,
          platformIds: selectedPlatforms,
          mediaUrls: mediaFiles.map(m => m.cdn_url), // Passing URLs as per backend expectation
          scheduledAt: scheduledDate || null,
          status: scheduledDate ? 'scheduled' : 'publishing'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: scheduledDate ? "Scheduled" : "Published",
          description: scheduledDate ? `Post scheduled for ${new Date(scheduledDate).toLocaleString()}` : "Post published successfully!",
        });
        // Reset form
        setCaption('');
        setMediaFiles([]);
        setSelectedPlatforms([]);
        setScheduledDate('');
      } else {
        throw new Error(data.error || 'Failed to schedule post');
      }
    } catch (error: any) {
      console.error('Publishing error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule post.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Post</h1>
      </div>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Platforms</CardTitle>
          <CardDescription>Choose where you want to publish this post.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {connectedAccounts.length > 0 ? (
              connectedAccounts.map(account => (
                <Button
                  key={account.id}
                  variant={selectedPlatforms.includes(account.platform) ? "default" : "outline"}
                  onClick={() => togglePlatform(account.platform)}
                  className="capitalize"
                >
                  {account.platform}
                  <span className="ml-2 text-xs opacity-70">@{account.username}</span>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No accounts connected. Please connect accounts in Settings.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Caption */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Caption</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prompt = window.prompt('What should this post be about?');
                if (prompt) generateCaption(prompt);
              }}
              disabled={aiLoading}
            >
              {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-purple-500" />}
              AI Generate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={improveCaption}
              disabled={aiLoading || !caption}
            >
               {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4 text-indigo-500" />}
              AI Improve
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption here... (AI can help! ✨)"
            className="min-h-[150px] resize-y"
          />
          <div className="mt-2 text-xs text-muted-foreground text-right">
            {caption.length} characters
          </div>
        </CardContent>
      </Card>

      {/* Media Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <CardDescription>Add photos or videos to your post.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <label className="md:col-span-1 cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => uploadMedia(e.target.files)}
                className="hidden"
              />
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 h-32 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload Media</span>
                  </>
                )}
              </div>
            </label>

            {mediaFiles.map(media => (
              <div key={media.id} className="relative group md:col-span-1 h-32">
                <img
                  src={media.thumbnail_url || media.cdn_url}
                  alt="Media"
                  className="w-full h-full object-cover rounded-lg border"
                />
                <button
                  onClick={() => setMediaFiles(prev => prev.filter(m => m.id !== media.id))}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Pick a time to publish or leave empty to publish now.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="max-w-[300px]"
            />
            {scheduledDate && (
              <Button variant="ghost" onClick={() => setScheduledDate('')}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button
          onClick={schedulePost}
          disabled={publishing || (!caption && mediaFiles.length === 0) || selectedPlatforms.length === 0}
          className="flex-1"
          size="lg"
        >
          {publishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : scheduledDate ? (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule for {new Date(scheduledDate).toLocaleString()}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Publish Now
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            setCaption('');
            setMediaFiles([]);
            setSelectedPlatforms([]);
            setScheduledDate('');
          }}
        >
          Clear Form
        </Button>
      </div>
    </div>
  );
}
