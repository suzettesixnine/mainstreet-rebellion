import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Camera } from "lucide-react";

export default function ProfilePhotoEditor() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const coverPhotoUrl = profile?.cover_photo_url ?? null;
  const galleryImages = profile?.gallery_images ?? [];

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/cover.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingCover(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ cover_photo_url: publicUrl }).eq("user_id", user.id);
    await refreshProfile();
    setUploadingCover(false);
    toast({ title: "Cover photo updated!" });
  };

  const handleRemoveCover = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ cover_photo_url: null }).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: "Cover photo removed" });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    if (galleryImages.length + files.length > 6) {
      toast({ title: "Maximum 6 gallery photos", variant: "destructive" });
      return;
    }
    setUploadingGallery(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) continue;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      newUrls.push(publicUrl);
    }
    const updated = [...galleryImages, ...newUrls];
    await supabase.from("profiles").update({ gallery_images: updated }).eq("user_id", user.id);
    await refreshProfile();
    setUploadingGallery(false);
    toast({ title: `${newUrls.length} photo${newUrls.length !== 1 ? "s" : ""} added!` });
  };

  const handleRemoveGalleryImage = async (index: number) => {
    if (!user) return;
    const updated = galleryImages.filter((_, i) => i !== index);
    await supabase.from("profiles").update({ gallery_images: updated }).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: "Photo removed" });
  };

  return (
    <Card className="border-foreground/20 mt-6">
      <CardHeader>
        <CardTitle className="font-display uppercase tracking-wider text-sm flex items-center gap-2">
          <Camera className="h-4 w-4" /> Profile photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cover photo */}
        <div className="space-y-2">
          <Label className="uppercase tracking-wider text-xs font-display">Cover photo</Label>
          <div className="relative h-40 rounded-sm overflow-hidden bg-muted border border-border">
            {coverPhotoUrl ? (
              <>
                <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No cover photo
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-foreground/0 hover:bg-foreground/20 cursor-pointer transition-colors group">
              <ImagePlus className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
            </label>
          </div>
          {uploadingCover && <p className="text-xs text-muted-foreground">Uploading...</p>}
        </div>

        {/* Gallery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="uppercase tracking-wider text-xs font-display">Photo gallery</Label>
            <span className="text-xs text-muted-foreground">{galleryImages.length}/6</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {galleryImages.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-sm overflow-hidden border border-border bg-muted">
                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryImage(i)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {galleryImages.length < 6 && (
              <label className="relative aspect-square rounded-sm overflow-hidden border border-dashed border-foreground/30 bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGalleryUpload}
                  disabled={uploadingGallery}
                />
              </label>
            )}
          </div>
          {uploadingGallery && <p className="text-xs text-muted-foreground">Uploading...</p>}
        </div>
      </CardContent>
    </Card>
  );
}
