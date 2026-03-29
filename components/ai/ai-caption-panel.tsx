"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  X,
  Wand2,
  Hash,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  Zap
} from "lucide-react"
import { useAI } from "@/hooks/use-ai"
import { GlassCard } from "@/components/ui/premium/glass-card"
import { AnimatedButton } from "@/components/ui/premium/animated-button"
import { cn } from "@/lib/utils"

const PLATFORMS = [
  "instagram",
  "facebook",
  "twitter",
  "linkedin",
  "tiktok",
  "youtube",
  "telegram",
  "discord",
  "reddit",
  "pinterest",
  "bluesky"
]

const TONES = ["casual", "professional", "funny", "inspirational", "educational", "promotional"]

const IMPROVEMENTS = [
  "Make it more engaging",
  "Add a call-to-action",
  "Make it shorter",
  "Make it more professional",
  "Add humor",
  "Make it viral-worthy"
]

interface AICaptionPanelProps {
  currentContent: string
  selectedPlatforms: string[]
  onApply: (caption: string) => void
  onClose: () => void
}

export function AICaptionPanel({
  currentContent,
  selectedPlatforms,
  onApply,
  onClose
}: AICaptionPanelProps) {
  const [prompt, setPrompt] = useState(currentContent || "")
  const [platform, setPlatform] = useState(selectedPlatforms[0] || "instagram")
  const [tone, setTone] = useState("casual")
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [includeEmojis, setIncludeEmojis] = useState(true)
  const [generatedCaption, setGeneratedCaption] = useState("")
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"generate" | "improve" | "hashtags">("generate")
  const [improvementInstr, setImprovementInstr] = useState(IMPROVEMENTS[0])

  const { isLoading, generateCaption, improveCaption, generateHashtags } = useAI()

  const handleGenerate = async () => {
    const result = await generateCaption(prompt, platform, tone)
    if (result) setGeneratedCaption(result)
  }

  const handleImprove = async () => {
    const base = currentContent || generatedCaption
    if (!base) return
    const result = await improveCaption(base, improvementInstr)
    if (result) setGeneratedCaption(result)
  }

  const handleHashtags = async () => {
    const base = currentContent || generatedCaption || prompt
    const result = await generateHashtags(base, platform, 10)
    if (result) setGeneratedHashtags(result)
  }

  const handleCopy = () => {
    const text = activeTab === "hashtags" ? generatedHashtags.join(" ") : generatedCaption
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = () => {
    if (activeTab === "hashtags") {
      onApply((currentContent + "\n\n" + generatedHashtags.join(" ")).trim())
    } else {
      onApply(generatedCaption)
    }
    onClose()
  }

  const output = activeTab === "hashtags" ? generatedHashtags.join(" ") : generatedCaption

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-2xl"
      >
        <GlassCard variant="elevated" className="overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">AI Caption Studio</h2>
                <p className="text-xs text-muted-foreground">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex border-b border-border px-5">
            {[
              { id: "generate", label: "Generate", icon: Zap },
              { id: "improve", label: "Improve", icon: Wand2 },
              { id: "hashtags", label: "Hashtags", icon: Hash }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                  activeTab === id
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {activeTab === "generate" && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Topic / Idea
                  </label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="What's your post about? Describe your idea..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Platform
                    </label>
                    <select
                      value={platform}
                      onChange={e => setPlatform(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 capitalize"
                    >
                      {PLATFORMS.map(p => (
                        <option key={p} value={p} className="capitalize">
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Tone
                    </label>
                    <select
                      value={tone}
                      onChange={e => setTone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 capitalize"
                    >
                      {TONES.map(t => (
                        <option key={t} value={t} className="capitalize">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHashtags}
                      onChange={e => setIncludeHashtags(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground"># Hashtags</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEmojis}
                      onChange={e => setIncludeEmojis(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">😊 Emojis</span>
                  </label>
                </div>

                <AnimatedButton
                  variant="gradient"
                  size="md"
                  loading={isLoading}
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="w-full"
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Generate Caption
                </AnimatedButton>
              </>
            )}

            {activeTab === "improve" && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Current Caption
                  </label>
                  <div className="px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground min-h-[60px]">
                    {currentContent || generatedCaption || (
                      <span className="italic">
                        No caption yet — generate one first or type in the editor
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    How to improve?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {IMPROVEMENTS.map(imp => (
                      <button
                        key={imp}
                        onClick={() => setImprovementInstr(imp)}
                        className={cn(
                          "text-left px-3 py-2 rounded-lg text-xs border transition-all",
                          improvementInstr === imp
                            ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : "border-border hover:border-purple-300 text-foreground"
                        )}
                      >
                        {imp}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatedButton
                  variant="gradient"
                  size="md"
                  loading={isLoading}
                  onClick={handleImprove}
                  disabled={!currentContent && !generatedCaption}
                  className="w-full"
                  icon={<Wand2 className="w-4 h-4" />}
                >
                  Improve Caption
                </AnimatedButton>
              </>
            )}

            {activeTab === "hashtags" && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p} value={p} className="capitalize">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <AnimatedButton
                  variant="gradient"
                  size="md"
                  loading={isLoading}
                  onClick={handleHashtags}
                  className="w-full"
                  icon={<Hash className="w-4 h-4" />}
                >
                  Generate 10 Hashtags
                </AnimatedButton>

                {generatedHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                    {generatedHashtags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            <AnimatePresence>
              {output && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Result</label>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground leading-relaxed border border-border">
                    {output}
                  </div>
                  <div className="flex gap-2">
                    <AnimatedButton
                      variant="gradient"
                      size="sm"
                      onClick={handleApply}
                      className="flex-1"
                    >
                      ✓ Apply to Post
                    </AnimatedButton>
                    <button
                      onClick={() =>
                        activeTab === "generate"
                          ? handleGenerate()
                          : activeTab === "improve"
                          ? handleImprove()
                          : handleHashtags()
                      }
                      className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}

