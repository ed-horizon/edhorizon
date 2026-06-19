-- Migration: Add class column to public.leads table
ALTER TABLE public.leads ADD COLUMN class text;
