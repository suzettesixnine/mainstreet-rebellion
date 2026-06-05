import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export default function Conversation() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ name: string; avatar: string | null }>({ name: "User", avatar: null });
  const [listingTitle, setListingTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) { navigate("/login"); return; }

    const fetchData = async () => {
      const { data: conv } = await supabase.from("conversations").select("*").eq("id", id).single();
      if (!conv) return;
      const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
      const [{ data: profile }, { data: listing }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url").eq("user_id", otherId).single(),
        supabase.from("listings").select("title").eq("id", conv.listing_id).single(),
        supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }),
      ]);
      if (profile) setOtherUser({ name: profile.display_name || "User", avatar: profile.avatar_url });
      if (listing) setListingTitle(listing.title);
      if (msgs) setMessages(msgs);
    };
    fetchData();

    const channel = supabase
      .channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => setMessages(prev => [...prev, payload.new as Tables<"messages">])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !id) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  };

  const initials = otherUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-none" onClick={() => navigate("/messages")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8 rounded-none">
          <AvatarImage src={otherUser.avatar || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-display rounded-none">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display font-medium text-sm uppercase tracking-wide text-foreground">{otherUser.name}</p>
          {listingTitle && <p className="text-xs text-muted-foreground font-display uppercase tracking-wider">Re: {listingTitle}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"}`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-border p-4 flex gap-2">
        <Input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-none border-foreground font-display"
        />
        <Button type="submit" size="icon" className="rounded-none" disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
