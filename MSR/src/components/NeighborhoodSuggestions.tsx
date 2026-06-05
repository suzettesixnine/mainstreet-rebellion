import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, Trash2, Lightbulb } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { GUILDS, getGuild } from "@/lib/guilds";

interface Suggestion {
  id: string;
  zip_code: string;
  author_id: string;
  title: string;
  description: string | null;
  category: string | null;
  upvote_count: number;
  created_at: string;
  author_name?: string;
}

interface Props {
  zipCode: string;
}

export default function NeighborhoodSuggestions({ zipCode }: Props) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [zipCode, user]);

  const fetchSuggestions = async () => {
    setLoading(true);

    const { data: suggestionsData } = await supabase
      .from("neighborhood_suggestions")
      .select("*")
      .eq("zip_code", zipCode)
      .order("upvote_count", { ascending: false });

    const items = (suggestionsData || []) as Suggestion[];

    // Fetch author names
    const authorIds = [...new Set(items.map((s) => s.author_id))];
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", authorIds);
      const map = new Map((profiles || []).map((p) => [p.user_id, p.display_name]));
      items.forEach((s) => {
        s.author_name = map.get(s.author_id) || "Anonymous";
      });
    }

    setSuggestions(items);

    // Fetch user's upvotes
    if (user) {
      const { data: upvotes } = await supabase
        .from("suggestion_upvotes")
        .select("suggestion_id")
        .eq("user_id", user.id);
      setUserUpvotes(new Set((upvotes || []).map((u) => u.suggestion_id)));
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    const { error } = await supabase.from("neighborhood_suggestions").insert({
      zip_code: zipCode,
      author_id: user.id,
      title: trimmed,
      description: description.trim() || null,
      category: category || null,
    } as any);

    if (error) {
      toast({ title: "Error", description: "Couldn't post suggestion.", variant: "destructive" });
    } else {
      setTitle("");
      setDescription("");
      setCategory("");
      toast({ title: "Posted!", description: "Your suggestion is live." });
      fetchSuggestions();
    }
    setSubmitting(false);
  };

  const toggleUpvote = async (suggestionId: string) => {
    if (!user) return;
    const hasUpvoted = userUpvotes.has(suggestionId);

    // Optimistic update
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId
          ? { ...s, upvote_count: s.upvote_count + (hasUpvoted ? -1 : 1) }
          : s
      )
    );
    setUserUpvotes((prev) => {
      const next = new Set(prev);
      hasUpvoted ? next.delete(suggestionId) : next.add(suggestionId);
      return next;
    });

    if (hasUpvoted) {
      await supabase
        .from("suggestion_upvotes")
        .delete()
        .eq("suggestion_id", suggestionId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("suggestion_upvotes")
        .insert({ suggestion_id: suggestionId, user_id: user.id });
    }
  };

  const deleteSuggestion = async (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("neighborhood_suggestions").delete().eq("id", id);
    toast({ title: "Deleted", description: "Suggestion removed." });
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h ago`;
    return "just now";
  };

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">
          What Does Your Street Need?
        </h2>
      </div>

      {/* Suggestion form */}
      {user ? (
        <form onSubmit={handleSubmit} className="border-2 border-foreground p-4 mb-6 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Suggest something — e.g. "Coffee Roaster"'
            className="rounded-none border-foreground font-display"
            maxLength={100}
            required
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            className="rounded-none border-foreground font-display min-h-[60px]"
            maxLength={300}
          />
          <div>
            <p className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">Tag a guild (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              {GUILDS.map((g) => {
                const Icon = g.icon;
                const selected = category === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setCategory(selected ? "" : g.key)}
                    className={`flex items-center gap-1 border px-2 py-1 text-[10px] font-display uppercase tracking-wider transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting || !title.trim()}
            className="rounded-none uppercase tracking-wider font-display text-xs"
          >
            {submitting ? "Posting..." : "Post Suggestion"}
          </Button>
        </form>
      ) : (
        <div className="border-2 border-dashed border-border p-4 mb-6 text-center text-muted-foreground text-sm">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>{" "}
          to suggest what your neighborhood needs.
        </div>
      )}

      {/* Suggestion list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border">
          No suggestions yet. Be the first to say what your street needs!
        </p>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-3 border-2 border-foreground/20 bg-card p-4 transition-colors hover:border-foreground/40"
            >
              {/* Upvote button */}
              <button
                onClick={() => toggleUpvote(s.id)}
                disabled={!user}
                className={`flex flex-col items-center gap-0.5 pt-0.5 transition-colors ${
                  userUpvotes.has(s.id)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                } ${!user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title={user ? (userUpvotes.has(s.id) ? "Remove upvote" : "Upvote") : "Sign in to upvote"}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="text-xs font-display font-bold">{s.upvote_count}</span>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">
                    {s.title}
                  </h4>
                  {s.category && (() => {
                    const guild = getGuild(s.category);
                    const Icon = guild.icon;
                    return (
                      <Badge variant="outline" className="rounded-none text-[10px] font-display uppercase tracking-wider px-1.5 py-0 gap-1 border-primary/40 text-primary">
                        <Icon className="h-2.5 w-2.5" />
                        {guild.label}
                      </Badge>
                    );
                  })()}
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {s.author_name} · {timeAgo(s.created_at)}
                </p>
              </div>

              {/* Delete (own only) */}
              {user?.id === s.author_id && (
                <button
                  onClick={() => deleteSuggestion(s.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Delete suggestion"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
