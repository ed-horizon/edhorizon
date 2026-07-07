-- Migration: Add 'sales_head' role to user_role type
-- Since PostgreSQL doesn't support ALTER TYPE ADD VALUE in a transaction block alongside other queries easily,
-- we run it individually. Note that PostgreSQL 12+ supports ADD VALUE IF NOT EXISTS.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'sales_head';
