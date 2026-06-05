import { useState, useEffect, useMemo, useCallback } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import EventComments from "@/components/EventComments";
import MapFilter, { MapPin as MapPinType } from "@/components/MapFilter";
import { geocodeZips } from "@/lib/geocode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Plus, Clock, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import EventFormDialog, { EVENT_CATEGORIES } from "@/components/EventFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  location: string | null;
  zip_code: string;
  event_date: string;
  event_end_date: string | null;
  category: string;
  image_url: string | null;
  created_at: string;
  rsvp_count?: number;
  user_rsvped?: boolean;
  creator_name?: string;
}

export default function Events() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [coordsMap, setCoordsMap] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  const fetchEvents = async () => {
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    if (!eventsData) { setLoading(false); return; }

    const eventIds = eventsData.map(e => e.id);
    const creatorIds = [...new Set(eventsData.map(e => e.creator_id))];

    const [rsvpRes, profilesRes, userRsvpRes] = await Promise.all([
      supabase.from("event_rsvps").select("event_id").in("event_id", eventIds),
      supabase.from("profiles").select("user_id, display_name").in("user_id", creatorIds),
      user ? supabase.from("event_rsvps").select("event_id").eq("user_id", user.id).in("event_id", eventIds) : Promise.resolve({ data: [] }),
    ]);

    const rsvpCounts: Record<string, number> = {};
    rsvpRes.data?.forEach(r => { rsvpCounts[r.event_id] = (rsvpCounts[r.event_id] || 0) + 1; });

    const profileMap: Record<string, string> = {};
    profilesRes.data?.forEach(p => { profileMap[p.user_id] = p.display_name || "Anonymous"; });

    const userRsvpSet = new Set(userRsvpRes.data?.map(r => r.event_id));

    const enriched = eventsData.map(e => ({
      ...e,
      rsvp_count: rsvpCounts[e.id] || 0,
      user_rsvped: userRsvpSet.has(e.id),
      creator_name: profileMap[e.creator_id] || "Anonymous",
    }));

    setEvents(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [user]);

  // Geocode zip codes for map pins
  useEffect(() => {
    const zips = events.map((e) => e.zip_code);
    if (zips.length === 0) return;
    geocodeZips(zips).then(setCoordsMap);
  }, [events]);

  const mapPins: MapPinType[] = useMemo(
    () =>
      events
        .filter((e) => coordsMap.has(e.zip_code))
        .map((e) => ({
          id: e.id,
          lat: coordsMap.get(e.zip_code)!.lat,
          lng: coordsMap.get(e.zip_code)!.lng,
          label: e.title,
        })),
    [events, coordsMap]
  );

  const userCenter = useMemo(() => {
    if (profile?.zip_code && coordsMap.has(profile.zip_code)) return coordsMap.get(profile.zip_code);
    return undefined;
  }, [profile, coordsMap]);

  const handleBoundsChange = useCallback((bounds: typeof mapBounds) => setMapBounds(bounds), []);

  const filtered = useMemo(() => {
    let result = filterCategory === "all" ? events : events.filter(e => e.category === filterCategory);
    if (mapBounds) {
      result = result.filter((e) => {
        const c = coordsMap.get(e.zip_code);
        if (!c) return false;
        return c.lat >= mapBounds.south && c.lat <= mapBounds.north && c.lng >= mapBounds.west && c.lng <= mapBounds.east;
      });
    }
    return result;
  }, [events, filterCategory, mapBounds, coordsMap]);

  if (authLoading) return null;


  const handleRsvp = async (eventId: string, hasRsvped: boolean) => {
    if (!user) { toast({ title: "Please sign in to RSVP", variant: "destructive" }); return; }
    if (hasRsvped) {
      await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
    } else {
      await supabase.from("event_rsvps").insert({ event_id: eventId, user_id: user.id });
    }
    fetchEvents();
  };

  const handleDelete = async () => {
    if (!deleteEventId) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteEventId);
    if (error) {
      toast({ title: "Error deleting event", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted" });
      fetchEvents();
    }
    setDeleteEventId(null);
  };

  const openEdit = (event: Event) => {
    setEditEvent(event);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditEvent(null);
    setDialogOpen(true);
  };

  return (
    <div className="container px-4 py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter text-foreground">Events</h1>
          <p className="text-muted-foreground mt-2 tracking-tight">Local gatherings, markets, and meetups near you</p>
        </div>
        {user && (
          <Button onClick={openCreate} className="uppercase tracking-wider font-display text-xs"><Plus className="mr-2 h-4 w-4" />Create Event</Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-4 py-2 text-xs font-display font-medium uppercase tracking-wider border transition-colors ${filterCategory === "all" ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:bg-foreground hover:text-background hover:border-foreground"}`}
        >All</button>
        {EVENT_CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilterCategory(c.value)}
            className={`px-4 py-2 text-xs font-display font-medium uppercase tracking-wider border transition-colors ${filterCategory === c.value ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:bg-foreground hover:text-background hover:border-foreground"}`}
          >{c.label}</button>
        ))}
      </div>

      <MapFilter pins={mapPins} center={userCenter} onBoundsChange={handleBoundsChange} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-[4/3] bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-lg font-display uppercase tracking-wider text-muted-foreground">No upcoming events</p>
          {user && <p className="mt-2 text-sm text-muted-foreground">Be the first to create one!</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(event => {
            const isOwner = user?.id === event.creator_id;
            return (
              <Card key={event.id} className="overflow-hidden border-foreground/10 hover:border-foreground/30 transition-colors">
                {event.image_url ? (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-display uppercase tracking-wider leading-tight">{event.title}</CardTitle>
                    <span className="shrink-0 text-[10px] font-display uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5">{EVENT_CATEGORIES.find(c => c.value === event.category)?.label || event.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">by {event.creator_name}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.description && <p className="text-sm text-foreground line-clamp-2">{event.description}</p>}
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{format(new Date(event.event_date), "EEE, MMM d · h:mm a")}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      <span>{event.rsvp_count} attending</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={event.user_rsvped ? "secondary" : "default"}
                      size="sm"
                      className="flex-1 uppercase tracking-wider font-display text-xs"
                      onClick={() => handleRsvp(event.id, !!event.user_rsvped)}
                    >
                      {event.user_rsvped ? "Cancel RSVP" : "RSVP"}
                    </Button>
                    {isOwner && (
                      <>
                        <Button variant="outline" size="sm" className="border-foreground/20" onClick={() => openEdit(event)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-foreground/20" onClick={() => setDeleteEventId(event.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <EventComments eventId={event.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchEvents}
        editEvent={editEvent}
      />

      <AlertDialog open={!!deleteEventId} onOpenChange={open => !open && setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase tracking-wider">Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All RSVPs will also be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="uppercase tracking-wider font-display text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 uppercase tracking-wider font-display text-xs">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
