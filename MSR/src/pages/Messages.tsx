import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConversationItem {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  listing_title: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string | null;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    const fetchConversations = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (!convs || convs.length === 0) { setLoading(false); return; }

      const items: ConversationItem[] = [];
      for (const conv of convs) {
        const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
        const [{ data: profile }, { data: listing }, { data: lastMsg }] = await Promise.all([
          supabase.from("profiles").select("display_name, avatar_url").eq("user_id", otherId).single(),
          supabase.from("listings").select("title").eq("id", conv.listing_id).single(),
          supabase.from("messages").select("content").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).single(),
        ]);
        items.push({
          id: conv.id,
          listing_id: conv.listing_id,
          buyer_id: conv.buyer_id,
          seller_id: conv.seller_id,
          updated_at: conv.updated_at,
          listing_title: listing?.title || "Listing",
          other_user_name: profile?.display_name || "User",
          other_user_avatar: profile?.avatar_url || null,
          last_message: lastMsg?.content || null,
        });
      }
      setConversations(items);
      setLoading(false);
    };
    fetchConversations();
  }, [user]);

  if (loading) return <div className="container py-16 text-center font-display uppercase tracking-wider text-muted-foreground">Loading...</div>;

  return (
    <div className="container max-w-2xl py-12 px-4 animate-fade-in">
      <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-8 text-foreground">Messages</h1>
      {conversations.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border">
          <MessageSquare className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
          <p className="font-display uppercase tracking-wider text-muted-foreground">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const initials = conv.other_user_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Link key={conv.id} to={`/messages/${conv.id}`}>
                <Card className="flex items-center gap-4 p-4 rounded-none border-border hover:border-foreground transition-colors">
                  <Avatar className="rounded-none">
                    <AvatarImage src={conv.other_user_avatar || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-display rounded-none">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-display font-medium text-sm uppercase tracking-wide truncate text-foreground">{conv.other_user_name}</p>
                      <span className="text-xs text-muted-foreground font-display tracking-wider">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-display uppercase tracking-wider">Re: {conv.listing_title}</p>
                    {conv.last_message && <p className="text-sm text-muted-foreground truncate mt-0.5">{conv.last_message}</p>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
