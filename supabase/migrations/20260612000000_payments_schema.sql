-- Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    billing_month INTEGER NOT NULL CHECK (billing_month >= 1 AND billing_month <= 12),
    billing_year INTEGER NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('razorpay', 'upi_qr')),
    transaction_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    receipt_number TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Students can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Operations and Super Admin manage all payments" ON public.payments;

-- Policy: Students can view their own payment history
CREATE POLICY "Students can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = student_id);

-- Policy: Students can insert their own payment attempts
CREATE POLICY "Students can insert own payments"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Policy: Operations and Super Admin have full management access
CREATE POLICY "Operations and Super Admin manage all payments"
    ON public.payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('operations', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('operations', 'super_admin')
        )
    );
