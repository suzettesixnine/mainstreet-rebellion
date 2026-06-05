import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Plus, Pin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Discussion {
  id: string;
  author_id: string;
  title: string;
  content: string;
  zip_code: string;
  category: string;
  pinned: boolean;
  created_at: string;
  reply_count?: number;
  author_name?: string;
}

const DISCUSSION_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "announcement", label: "Announcement" },
  { value: "question", label: "Question" },
  { value: "recommendation", label: "Recommendation" },
  { value: "lost_found", label: "Lost & Found" },
  { value: "safety", label: "Safety" },
  { value: "help", label: "Help Needed" },
];

export default function Discussions() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({ title: "", content: "", category: "general" });

  const fetchDiscussions = async () => {
    const { data } = await supabase
      .from("discussions")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const authorIds = [...new Set(data.map(d => d.author_id))];
    const discussionIds = data.map(d => d.id);

    const [profilesRes, repliesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds),
      supabase.from("discussion_replies").select("discussion_id").in("discussion_id", discussionIds),
    ]);

    const profileMap: Record<string, string> = {};
    profilesRes.data?.forEach(p => { profileMap[p.user_id] = p.display_name || "Anonymous"; });

    const replyCounts: Record<string, number> = {};
    repliesRes.data?.forEach(r => { replyCounts[r.discussion_id] = (replyCounts[r.discussion_id] || 0) + 1; });

    setDiscussions(data.map(d => ({
      ...d,
      author_name: profileMap[d.author_id] || "Anonymous",
      reply_count: replyCounts[d.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchDiscussions(); }, []);

  if (authLoading) return null;


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.zip_code) {
      toast({ title: "Please complete your profile with a zip code first", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("discussions").insert({
      author_id: user.id,
      title: form.title,
      content: form.content,
      zip_code: profile.zip_code,
      category: form.category,
    });
    if (error) {
      toast({ title: "Error creating discussion", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Discussion posted!" });
      setDialogOpen(false);
      setForm({ title: "", content: "", category: "general" });
      fetchDiscussions();
    }
  };

  const filtered = filterCategory === "all" ? discussions : discussions.filter(d => d.category === filterCategory);

  return (
    <div className="container px-4 py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter text-foreground">Community Board</h1>
          <p className="text-muted-foreground mt-1 font-display uppercase tracking-wider text-xs">Announcements, questions & discussions</p>
        </div>
        {user && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-none font-display uppercase tracking-wider"><Plus className="mr-2 h-4 w-4" />New Post</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-none border-foreground">
              <DialogHeader>
                <DialogTitle className="font-display uppercase tracking-tighter text-2xl">Start a Discussion</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label className="font-display uppercase tracking-wider text-xs">Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="rounded-none border-foreground" />
                </div>
                <div>
                  <Label className="font-display uppercase tracking-wider text-xs">Content *</Label>
                  <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} required className="rounded-none border-foreground" />
                </div>
                <div>
                  <Label className="font-display uppercase tracking-wider text-xs">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="rounded-none border-foreground font-display uppercase tracking-wider text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISCUSSION_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value} className="font-display uppercase tracking-wider text-xs">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full rounded-none font-display uppercase tracking-wider">Post Discussion</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider border transition-colors ${filterCategory === "all" ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:border-foreground"}`}
        >All</button>
        {DISCUSSION_CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilterCategory(c.value)}
            className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider border transition-colors ${filterCategory === c.value ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:border-foreground"}`}
          >{c.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-20 bg-muted border border-border" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-display uppercase tracking-wider text-muted-foreground">No discussions yet</p>
          {user && <p className="mt-2 text-sm text-muted-foreground">Start the conversation!</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <Card
              key={d.id}
              className="cursor-pointer rounded-none border-border hover:border-foreground transition-colors"
              onClick={() => navigate(`/discussions/${d.id}`)}
            >
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {d.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <h3 className="font-display font-bold text-foreground truncate uppercase tracking-wide text-sm">{d.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{d.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-display tracking-wider">
                    <span>{d.author_name}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{d.reply_count} replies</span>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs rounded-none font-display uppercase tracking-wider">{DISCUSSION_CATEGORIES.find(c => c.value === d.category)?.label || d.category}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
