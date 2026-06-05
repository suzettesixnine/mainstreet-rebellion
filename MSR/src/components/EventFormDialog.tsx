import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const EVENT_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "garage_sale", label: "Garage Sale" },
  { value: "farmers_market", label: "Farmers Market" },
  { value: "workshop", label: "Workshop" },
  { value: "meetup", label: "Meetup" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "sports", label: "Sports" },
  { value: "arts", label: "Arts & Culture" },
];

export interface EventFormData {
  title: string;
  description: string;
  location: string;
  event_date: string;
  event_end_date: string;
  category: string;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editEvent?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    event_date: string;
    event_end_date: string | null;
    category: string;
    image_url: string | null;
  } | null;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EventFormDialog({ open, onOpenChange, onSuccess, editEvent }: EventFormDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<EventFormData>({
    title: "",
    description: "",
    location: "",
    event_date: "",
    event_end_date: "",
    category: "general",
  });

  useEffect(() => {
    if (editEvent) {
      setForm({
        title: editEvent.title,
        description: editEvent.description || "",
        location: editEvent.location || "",
        event_date: toLocalDatetime(editEvent.event_date),
        event_end_date: editEvent.event_end_date ? toLocalDatetime(editEvent.event_end_date) : "",
        category: editEvent.category,
      });
      setImagePreview(editEvent.image_url || null);
      setImageFile(null);
    } else {
      setForm({ title: "", description: "", location: "", event_date: "", event_end_date: "", category: "general" });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [editEvent, open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (eventId: string): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `${user.id}/${eventId}.${ext}`;
    const { error } = await supabase.storage.from("events").upload(path, imageFile, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("events").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.zip_code) {
      toast({ title: "Please complete your profile with a zip code first", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const payload = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      event_date: new Date(form.event_date).toISOString(),
      event_end_date: form.event_end_date ? new Date(form.event_end_date).toISOString() : null,
      category: form.category,
    };

    if (editEvent) {
      // Update existing
      const { error } = await supabase.from("events").update(payload).eq("id", editEvent.id);
      if (error) {
        toast({ title: "Error updating event", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      if (imageFile) {
        const imageUrl = await uploadImage(editEvent.id);
        if (imageUrl) {
          await supabase.from("events").update({ image_url: imageUrl }).eq("id", editEvent.id);
        }
      } else if (!imagePreview && editEvent.image_url) {
        // Image was removed
        await supabase.from("events").update({ image_url: null }).eq("id", editEvent.id);
      }
      toast({ title: "Event updated!" });
    } else {
      // Create new
      const { data: newEvent, error } = await supabase.from("events").insert({
        ...payload,
        creator_id: user.id,
        zip_code: profile.zip_code,
      }).select("id").single();

      if (error || !newEvent) {
        toast({ title: "Error creating event", description: error?.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      if (imageFile) {
        const imageUrl = await uploadImage(newEvent.id);
        if (imageUrl) {
          await supabase.from("events").update({ image_url: imageUrl }).eq("id", newEvent.id);
        }
      }
      toast({ title: "Event created!" });
    }

    onOpenChange(false);
    setSubmitting(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editEvent ? "Edit Event" : "Create an Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Cover Image</Label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            {imagePreview ? (
              <div className="relative mt-2 rounded-lg overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-sm">Add a cover photo</span>
              </button>
            )}
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Community Center, 123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date & Time *</Label>
              <Input type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} required />
            </div>
            <div>
              <Label>End Date & Time</Label>
              <Input type="datetime-local" value={form.event_end_date} onChange={e => setForm(f => ({ ...f, event_end_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (editEvent ? "Saving..." : "Creating...") : (editEvent ? "Save Changes" : "Create Event")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
