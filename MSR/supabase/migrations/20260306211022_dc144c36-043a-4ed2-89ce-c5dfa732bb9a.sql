
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  zip_code TEXT,
  payment_venmo TEXT,
  payment_paypal TEXT,
  payment_cashapp TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Listing categories enum
CREATE TYPE public.listing_category AS ENUM (
  'produce', 'baked_goods', 'crafts', 'services', 'prepared_foods', 'clothing', 'home_goods', 'other'
);

CREATE TYPE public.listing_status AS ENUM ('active', 'reserved', 'sold');
CREATE TYPE public.delivery_option AS ENUM ('pickup', 'delivery', 'both');

-- Listings table
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category public.listing_category NOT NULL DEFAULT 'other',
  status public.listing_status NOT NULL DEFAULT 'active',
  delivery_option public.delivery_option NOT NULL DEFAULT 'pickup',
  zip_code TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  accepts_cash BOOLEAN DEFAULT true,
  accepts_external_payment BOOLEAN DEFAULT false,
  accepts_stripe BOOLEAN DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Users can create their own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update their own listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Users can delete their own listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);

CREATE INDEX idx_listings_category ON public.listings(category);
CREATE INDEX idx_listings_zip_code ON public.listings(zip_code);
CREATE INDEX idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX idx_listings_status ON public.listings(status);

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, buyer_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
));
CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
));

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id AND auth.uid() != seller_id);

CREATE INDEX idx_reviews_seller_id ON public.reviews(seller_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Listing images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Users can upload listing images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update listing images" ON storage.objects FOR UPDATE USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete listing images" ON storage.objects FOR DELETE USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);
