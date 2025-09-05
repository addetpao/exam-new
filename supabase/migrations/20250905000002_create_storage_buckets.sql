-- Migration: Create storage buckets for ExamPrep platform
-- Created: 2025-09-05
-- Description: Create and configure storage buckets for PBQ assets, content media, and temp uploads

-- Create bucket for PBQ (Performance-Based Question) assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'pbq-assets',
    'pbq-assets',
    true,  -- Public bucket for published PBQ assets
    52428800,  -- 50MB file size limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/json', 'text/plain']
);

-- Create bucket for content media (blog posts, general media)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'content-media',
    'content-media',
    true,  -- Public bucket for published content
    104857600,  -- 100MB file size limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'application/pdf']
);

-- Create bucket for temporary uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'temp-uploads',
    'temp-uploads',
    false,  -- Private bucket for temporary uploads
    209715200,  -- 200MB file size limit for import packages
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/json', 'application/zip', 'text/plain', 'text/csv']
);

-- Storage policies for pbq-assets bucket
-- Allow public read access for all published PBQ assets
CREATE POLICY "Public read access for PBQ assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pbq-assets');

-- Only content editors and admins can upload to PBQ assets
CREATE POLICY "Content editors can upload PBQ assets"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'pbq-assets'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_editor')
    )
);

-- Only admins can update PBQ assets (prevent overwrite of published content)
CREATE POLICY "Admins can update PBQ assets"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'pbq-assets'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- Only admins can delete PBQ assets (with restrictions)
CREATE POLICY "Admins can delete PBQ assets"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'pbq-assets'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
    -- Additional safety: prevent deletion of files in 'published' folders
    AND NOT (name LIKE '%/published/%')
);

-- Storage policies for content-media bucket
-- Allow public read access for published content media
CREATE POLICY "Public read access for content media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'content-media');

-- Content editors and admins can upload content media
CREATE POLICY "Content editors can upload content media"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'content-media'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_editor')
    )
);

-- Content editors and admins can update content media
CREATE POLICY "Content editors can update content media"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'content-media'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_editor')
    )
);

-- Only admins can delete content media
CREATE POLICY "Admins can delete content media"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'content-media'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- Storage policies for temp-uploads bucket
-- Users can only access their own temp uploads
CREATE POLICY "Users can access own temp uploads"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'temp-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload to their own temp folder
CREATE POLICY "Users can upload to own temp folder"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'temp-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own temp uploads
CREATE POLICY "Users can update own temp uploads"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'temp-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own temp uploads
CREATE POLICY "Users can delete own temp uploads"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'temp-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins have full access to temp-uploads for cleanup
CREATE POLICY "Admins have full access to temp uploads"
ON storage.objects
FOR ALL
USING (
    bucket_id = 'temp-uploads'
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- Create function to generate signed URLs with proper TTL
CREATE OR REPLACE FUNCTION generate_signed_url(
    bucket_name TEXT,
    object_path TEXT,
    expires_in_seconds INTEGER DEFAULT 3600
)
RETURNS TEXT AS $$
DECLARE
    signed_url TEXT;
BEGIN
    -- This function would typically call Supabase's storage API
    -- For now, return a placeholder that the application can use
    -- to make the actual signed URL request
    RETURN format('signed_url_request:%s:%s:%s', bucket_name, object_path, expires_in_seconds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired temp uploads
CREATE OR REPLACE FUNCTION cleanup_expired_temp_uploads()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- This function will be called by a scheduled job
    -- to clean up temp uploads older than 24 hours
    -- Implementation will use storage API calls
    
    -- For now, return 0 as this is a placeholder
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION generate_signed_url IS 'Generate signed URL for temporary access to private storage objects';
COMMENT ON FUNCTION cleanup_expired_temp_uploads IS 'Clean up temporary uploads older than 24 hours (called by scheduled job)';