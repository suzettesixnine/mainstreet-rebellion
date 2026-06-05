import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Clock, MessageCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Reply {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export default function DiscussionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussion, setDiscussion] = useState<any>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    const { data: disc } = await supabase.from("discussions").select("*").eq("id", id).single();
    if (!disc) { setLoading(false); return; }

    const { data: repliesData } = await supabase
      .from("discussion_replies")
      .select("*")
      .eq("discussion_id", id)
      .order("created_at", { ascending: true });

    const authorIds = [...new Set([disc.author_id, ...(repliesData || []).map(r => r.author_id)])];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds);

    const profileMap: Record<string, string> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p.display_name || "Anonymous"; });

    setDiscussion({ ...disc, author_name: profileMap[disc.author_id] || "Anonymous" });
    setReplies((repliesData || []).map(r => ({ ...r, author_name: profileMap[r.author_id] || "Anonymous" })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    const { error } = await supabase.from("discussion_replies").insert({
      discussion_id: id,
      author_id: user.id,
      content: replyText,
    });
    if (error) {
      toast({ title: "Error posting reply", variant: "destructive" });
    } else {
      setReplyText("");
      fetchData();
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    await supabase.from("discussion_replies").delete().eq("id", replyId);
    fetchData();
  };

  if (loading) return <div className="container px-4 py-8"><div className="animate-pulse h-48 bg-muted border border-border" /></div>;
  if (!discussion) return <div className="container px-4 py-8 text-center font-display uppercase tracking-wider text-muted-foreground">Discussion not found</div>;

  const initials = (discussion.author_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="container px-4 py-12 max-w-3xl animate-fade-in">
      <Button variant="ghost" size="sm" asChild className="mb-6 rounded-none font-display uppercase tracking-wider text-xs">
        <Link to="/discussions"><ArrowLeft className="mr-1 h-4 w-4" />Back to Board</Link>
      </Button>

      <Card className="mb-8 rounded-none border-foreground">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0 rounded-none">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-display rounded-none">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground uppercase tracking-tighter">{discussion.title}</h1>
                <Badge variant="secondary" className="text-xs rounded-none font-display uppercase tracking-wider">{discussion.category}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 font-display tracking-wider">
                <span>{discussion.author_name}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}</span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{discussion.content}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="font-display text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
      </h2>

      <div className="space-y-2 mb-8">
        {replies.map(r => {
          const ri = (r.author_name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
          return (
            <Card key={r.id} className="rounded-none border-border hover:border-foreground transition-colors">
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0 rounded-none">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-display rounded-none">{ri}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-display font-medium text-foreground uppercase tracking-wide">{r.author_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{r.content}</p>
                  </div>
                  {user?.id === r.author_id && (
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-none" onClick={() => handleDeleteReply(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {user ? (
        <form onSubmit={handleReply} className="space-y-3">
          <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." rows={3} required className="rounded-none border-foreground" />
          <Button type="submit" size="sm" className="rounded-none font-display uppercase tracking-wider">Post Reply</Button>
        </form>
      ) : (
        <p className="text-muted-foreground text-center font-display uppercase tracking-wider text-sm">
          <Link to="/login" className="text-primary underline">Sign in</Link> to reply
        </p>
      )}
    </div>
  );
}
