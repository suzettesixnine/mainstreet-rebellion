import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileDown, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { GUILDS } from "@/lib/guilds";
import { getTierLimits } from "@/lib/tiers";

const CATEGORIES = GUILDS.map((g) => ({ value: g.key, label: `${g.label} — ${g.description}` }));

export default function CreateListing() {
  const { user, profile, sellerTier } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tierLimits = getTierLimits(sellerTier);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("other");
  const [deliveryOption, setDeliveryOption] = useState("pickup");
  const [zipCode, setZipCode] = useState(profile?.zip_code || "");
  const [quantity, setQuantity] = useState("1");
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [acceptsExternal, setAcceptsExternal] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDigital, setIsDigital] = useState(false);
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [digitalFileName, setDigitalFileName] = useState("");
  const [activeListingCount, setActiveListingCount] = useState<number | null>(null);

  const atListingLimit = tierLimits.maxListings !== Infinity && activeListingCount !== null && activeListingCount >= tierLimits.maxListings;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "active")
      .then(({ count }) => setActiveListingCount(count ?? 0));
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    if (images.length + files.length > tierLimits.maxPhotos) {
      toast({ title: `Max ${tierLimits.maxPhotos} photos on your plan`, description: sellerTier === "free" ? "Upgrade for more photos" : undefined, variant: "destructive" });
      return;
    }
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("listings").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from("listings").getPublicUrl(path);
      newUrls.push(publicUrl);
    }
    setImages(prev => [...prev, ...newUrls]);
    setUploading(false);
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleDigitalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 50MB", variant: "destructive" });
      return;
    }
    setDigitalFile(file);
    setDigitalFileName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (atListingLimit) {
      toast({ title: "Listing limit reached", description: "Upgrade your plan to post more listings", variant: "destructive" });
      return;
    }
    setLoading(true);

    let digitalFileUrl: string | null = null;
    if (isDigital && digitalFile) {
      const ext = digitalFile.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("digital-products").upload(path, digitalFile);
      if (uploadErr) {
        toast({ title: "File upload failed", description: uploadErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      digitalFileUrl = path;
    }

    const { data, error } = await supabase.from("listings").insert({
      seller_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      category: category as any,
      delivery_option: isDigital ? "delivery" as any : deliveryOption as any,
      zip_code: zipCode,
      quantity: parseInt(quantity) || 1,
      accepts_cash: acceptsCash,
      accepts_external_payment: acceptsExternal,
      images,
      is_digital: isDigital,
      digital_file_url: digitalFileUrl,
    }).select("id").single();
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Listing created!" });
      navigate(`/listings/${data.id}`);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="container max-w-2xl py-8 px-4 animate-fade-in">
      <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 text-foreground">
        Create a listing
      </h1>

      {atListingLimit && (
        <Card className="rounded-none border-2 border-destructive mb-6 bg-destructive/5">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-display font-bold uppercase tracking-wide text-sm text-foreground">
                Listing limit reached ({tierLimits.maxListings}/{tierLimits.maxListings})
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your free plan allows {tierLimits.maxListings} active listings. Upgrade for unlimited listings.
              </p>
              <Button asChild size="sm" className="mt-3 rounded-none font-display uppercase tracking-wider text-xs">
                <Link to="/pricing">View plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-none border-2 border-foreground shadow-none">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photos */}
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wide text-xs font-bold">
                Photos (up to {tierLimits.maxPhotos})
              </Label>
              <div className="flex flex-wrap gap-3">
                {images.map((url, i) => (
                  <div key={i} className="relative h-24 w-24 overflow-hidden rounded-none border-2 border-foreground">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-none bg-destructive p-0.5 text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < tierLimits.maxPhotos && (
                  <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-none border-2 border-dashed border-foreground hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wide text-xs font-bold">Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} placeholder="What are you selling?" className="rounded-none border-2 border-foreground focus-visible:ring-primary" />
            </div>

            {/* Digital product toggle */}
            <div className="flex items-center justify-between rounded-none border-2 border-foreground p-4">
              <div className="space-y-0.5">
                <Label className="font-display uppercase tracking-wide text-xs font-bold">Digital product</Label>
                <p className="text-sm text-muted-foreground">This is a downloadable file (PDF, ZIP, etc.)</p>
              </div>
              <Switch checked={isDigital} onCheckedChange={(checked) => { setIsDigital(checked); if (checked) setCategory("digital_goods"); }} />
            </div>

            {isDigital && (
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wide text-xs font-bold">Digital file (max 50MB)</Label>
                {digitalFileName ? (
                  <div className="flex items-center gap-2 rounded-none border-2 border-foreground p-3">
                    <FileDown className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm truncate font-mono">{digitalFileName}</span>
                    <button type="button" onClick={() => { setDigitalFile(null); setDigitalFileName(""); }} className="rounded-none bg-destructive p-0.5 text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-dashed border-foreground p-6 hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground font-display uppercase tracking-wide">Choose a file</span>
                    <input type="file" className="hidden" onChange={handleDigitalFileSelect} accept=".pdf,.zip,.rar,.epub,.mp3,.mp4,.mov,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt" />
                  </label>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wide text-xs font-bold">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe your item or service..." className="rounded-none border-2 border-foreground focus-visible:ring-primary" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wide text-xs font-bold">Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required placeholder="0.00" className="rounded-none border-2 border-foreground focus-visible:ring-primary" />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wide text-xs font-bold">Quantity</Label>
                <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="rounded-none border-2 border-foreground focus-visible:ring-primary" />
              </div>
            </div>

            <div className={`grid gap-4 ${isDigital ? "" : "sm:grid-cols-2"}`}>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wide text-xs font-bold">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-none border-2 border-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-foreground">
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="rounded-none">{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!isDigital && (
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wide text-xs font-bold">Delivery option</Label>
                  <Select value={deliveryOption} onValueChange={setDeliveryOption}>
                    <SelectTrigger className="rounded-none border-2 border-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-foreground">
                      <SelectItem value="pickup" className="rounded-none">Pickup only</SelectItem>
                      <SelectItem value="delivery" className="rounded-none">Delivery</SelectItem>
                      <SelectItem value="both" className="rounded-none">Pickup & delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wide text-xs font-bold">Zip code</Label>
              <Input value={zipCode} onChange={e => setZipCode(e.target.value)} required maxLength={10} className="rounded-none border-2 border-foreground focus-visible:ring-primary" />
            </div>

            <div className="space-y-3">
              <Label className="font-display uppercase tracking-wide text-xs font-bold">Accepted payment methods</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <Checkbox checked={acceptsCash} onCheckedChange={v => setAcceptsCash(v === true)} className="rounded-none border-2 border-foreground" />
                  <span className="text-sm">Cash</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={acceptsExternal} onCheckedChange={v => setAcceptsExternal(v === true)} className="rounded-none border-2 border-foreground" />
                  <span className="text-sm">Venmo / PayPal / Cash App</span>
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full rounded-none font-display uppercase tracking-wider text-sm font-bold h-12 border-2 border-foreground" disabled={loading || uploading || atListingLimit}>
              {loading ? "Creating..." : atListingLimit ? "Listing limit reached" : "Create listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
