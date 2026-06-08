import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Copy, User, Clock, RefreshCw, Upload, Download, History, RotateCcw } from 'lucide-react'
import { useSyncStore } from '@/store/syncStore'
import { deriveSyncToken } from '@/lib/crypto'
import { toast } from '@/hooks/use-toast'
import { getTimeAgo } from '@/lib/utils'

type SyncVersion = { id: string; bytes: number; created_at: string }

export function AccountSection() {
    const { auth, syncToRemote, syncFromRemote, forceMirrorState, isSyncing, lastSyncedAt, setDisplayName, serverUrl } = useSyncStore()

    const [copied, setCopied] = useState(false)

    // ── Version History state ──────────────────────────────
    const [versions, setVersions] = useState<SyncVersion[]>([])
    const [vOpen, setVOpen] = useState(false)
    const [vLoading, setVLoading] = useState(false)
    const [restoringId, setRestoringId] = useState<string | null>(null)

    if (!auth.isAuthenticated) {
        return (
            <section>
                <div className="p-4 rounded-xl border bg-card/50 text-sm text-muted-foreground text-center py-8">
                    Cloud Sync not connected. Log in to manage your account.
                </div>
            </section>
        )
    }

    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(auth.id)
            setCopied(true)
            toast({ title: "Copied UUID", description: "Account UUID copied to clipboard." })
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy ID:', err)
            toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy ID to clipboard." })
        }
    }

    // ── Version History helpers ────────────────────────────
    // Mirror syncStore's URL construction so this works same-origin and remote.
    const apiBase = () => {
        const baseUrl = serverUrl || '/api'
        return baseUrl.startsWith('http') ? `${baseUrl}/api` : baseUrl
    }

    const fmtBytes = (n: number) =>
        n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB`
            : n >= 1024 ? `${(n / 1024).toFixed(0)} KB`
                : `${n} B`

    const loadVersions = async () => {
        setVLoading(true)
        try {
            const token = await deriveSyncToken(auth.password)
            const res = await fetch(`${apiBase()}/sync/${auth.id}/versions`, {
                headers: { 'x-sync-password': token }
            })
            if (!res.ok) throw new Error(`Server returned ${res.status}`)
            const data = await res.json()
            setVersions(Array.isArray(data.versions) ? data.versions : [])
        } catch (e) {
            toast({ variant: "destructive", title: "Couldn't load history", description: (e as Error).message })
        } finally {
            setVLoading(false)
        }
    }

    const toggleVersions = () => {
        const next = !vOpen
        setVOpen(next)
        if (next && versions.length === 0) loadVersions()
    }

    const restore = async (id: string) => {
        if (!confirm('Restore this save? Your current cloud state is archived first, then replaced — so this is undoable. The app will then pull the restored data.')) return
        setRestoringId(id)
        try {
            const token = await deriveSyncToken(auth.password)
            const res = await fetch(`${apiBase()}/sync/${auth.id}/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-sync-password': token },
                body: JSON.stringify({ versionId: id })
            })
            if (!res.ok) {
                const d = await res.json().catch(() => ({} as any))
                throw new Error(d.error || `Server returned ${res.status}`)
            }
            toast({ title: "Restored", description: "Mirroring the restored data into the app…" })
            // Strict mirror (ignores timestamps) — re-adds deleted accounts that a
            // normal pull would skip because the local state looks "newer".
            await forceMirrorState()
            // Re-stamp the restored state as current so it durably wins future syncs.
            await syncToRemote()
            // Refresh the list — the just-replaced state is now archived too.
            await loadVersions()
        } catch (e) {
            toast({ variant: "destructive", title: "Restore failed", description: (e as Error).message })
        } finally {
            setRestoringId(null)
        }
    }

    return (
        <section className="space-y-4">
            <div className="p-4 rounded-xl border bg-card/50 space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Display Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Your Name"
                            className="pl-10 h-10 bg-background/50 border-muted focus:bg-background transition-colors"
                            value={auth.name}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>
                </div>

                {/* ID Display */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Your UUID</Label>
                    <div className="flex gap-2">
                        <Input value={auth.id} readOnly className="font-mono bg-muted/50 text-xs h-9" />
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={copyId} title="Copy UUID">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Sync Status */}
                <div className="flex items-center justify-between text-sm bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Authenticated</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last Sync
                        </span>
                        <span className="font-bold text-xs">
                            {lastSyncedAt ? getTimeAgo(new Date(lastSyncedAt)) : 'Never'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                    <div className="p-3 rounded-lg border bg-primary/10 border-primary/20">
                        <p className="text-[11px] text-primary font-medium leading-relaxed">
                            Cloud Sync is active. Every change you make is instantly saved to the server.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="default" className="shadow-lg shadow-primary/20" onClick={() => syncToRemote()} disabled={isSyncing}>
                            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Push to Cloud
                        </Button>
                        <Button variant="outline" onClick={() => syncFromRemote()} disabled={isSyncing}>
                            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Pull from Cloud
                        </Button>
                    </div>
                </div>

                {/* Version History */}
                <div className="space-y-3 pt-4 border-t border-muted/40">
                    <button
                        type="button"
                        onClick={toggleVersions}
                        className="flex items-center justify-between w-full text-sm font-semibold"
                    >
                        <span className="flex items-center gap-2">
                            <History className="h-4 w-4" /> Version History
                        </span>
                        <span className="text-xs text-muted-foreground">{vOpen ? 'Hide' : 'Show'}</span>
                    </button>

                    {vOpen && (
                        <div className="space-y-2">
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Each cloud save is archived (last 20 kept). A large size is a full backup;
                                tiny entries are likely empty or failed saves. Restoring is undoable — your
                                current state is archived before it's replaced.
                            </p>
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" className="h-8" onClick={loadVersions} disabled={vLoading}>
                                    <RefreshCw className={`mr-2 h-3 w-3 ${vLoading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </div>

                            {vLoading && versions.length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-4">Loading…</div>
                            ) : versions.length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-4">No saved versions yet.</div>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                    {versions.map((v) => (
                                        <div key={v.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-background/40">
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium">{getTimeAgo(new Date(v.created_at))}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                    {new Date(v.created_at).toLocaleString()} · {fmtBytes(v.bytes)}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 shrink-0"
                                                onClick={() => restore(v.id)}
                                                disabled={restoringId !== null}
                                            >
                                                {restoringId === v.id
                                                    ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                                    : <RotateCcw className="mr-1 h-3 w-3" />}
                                                Restore
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
