ALTER TABLE public.profiles
ADD COLUMN cover_photo_url text,
ADD COLUMN gallery_images text[] DEFAULT '{}'::text[];