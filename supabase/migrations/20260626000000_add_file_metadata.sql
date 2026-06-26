-- Migration: Add file_metadata table for Cloudflare R2 file tracking

CREATE TABLE IF NOT EXISTS public.file_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    r2_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    homework_id UUID REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('teacher_material', 'homework_submission', 'student_material', 'preview')),
    expiry_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

-- Select policy: Users can view files associated with them or if they are admin/super_admin/hr
DROP POLICY IF EXISTS "Users can view file_metadata associated with them" ON public.file_metadata;
CREATE POLICY "Users can view file_metadata associated with them"
    ON public.file_metadata FOR SELECT
    USING (
        auth.uid() = student_id 
        OR auth.uid() = teacher_id 
        OR auth.uid() = uploaded_by 
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr')
        )
    );

-- Insert policy: Any logged-in user can insert metadata for files they upload
DROP POLICY IF EXISTS "Users can insert file_metadata for themselves" ON public.file_metadata;
CREATE POLICY "Users can insert file_metadata for themselves"
    ON public.file_metadata FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

-- Update policy: Users can update their own metadata or admins/super_admins
DROP POLICY IF EXISTS "Users can update their own file_metadata" ON public.file_metadata;
CREATE POLICY "Users can update their own file_metadata"
    ON public.file_metadata FOR UPDATE
    USING (
        auth.uid() = uploaded_by 
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Add worksheet_url to homework_assignments for tracking teacher uploads
ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS worksheet_url TEXT;

