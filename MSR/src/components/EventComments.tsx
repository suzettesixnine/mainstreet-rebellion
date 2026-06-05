import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  event_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

interface EventCommentsProps {
  eventId: string;
}

export default function EventComments({ eventId }: EventCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("event_comments")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map(c => c.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", authorIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.display_name || "Anonymous"; });

      setComments(data.map(c => ({ ...c, author_name: profileMap[c.author_id] || "Anonymous" })));
    } else {
      setComments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (expanded) fetchComments();
  }, [expanded, eventId]);

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;
    if (newComment.trim().length > 500) {
      toast({ title: "Comment too long", description: "Max 500 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("event_comments").insert({
      event_id: eventId,
      author_id: user.id,
      content: newComment.trim(),
    });
    if (error) {
      toast({ title: "Error posting comment", description: error.message, variant: "destructive" });
    } else {
      setNewComment("");
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("event_comments").delete().eq("id", commentId);
    if (!error) fetchComments();
  };

  return (
    <div className="border-t border-foreground/10 mt-3 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Notes{comments.length > 0 ? ` (${comments.length})` : ""}</span>
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="h-8 bg-muted animate-pulse" />
          ) : comments.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-2 text-sm group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xs font-bold uppercase tracking-wider">{comment.author_name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-foreground/80 break-words">{comment.content}</p>
                  </div>
                  {user?.id === comment.author_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 self-start mt-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          )}

          {user && (
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a note..."
                rows={1}
                maxLength={500}
                className="rounded-none border-foreground/20 text-sm min-h-[36px] resize-none focus-visible:ring-primary"
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
                className="rounded-none shrink-0 h-9 w-9"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
