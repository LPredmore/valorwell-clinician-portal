-- Complete Schema Migration: Standardize client_assigned_therapist as UUID
-- Phase 1: Drop ALL dependent RLS policies across all tables

-- Drop policies from clients table
DROP POLICY IF EXISTS "clients_access" ON public.clients;
DROP POLICY IF EXISTS "clinicians_assigned_clients" ON public.clients;

-- Drop policies from client_history tables
DROP POLICY IF EXISTS "Clinicians can view assigned client history" ON public.client_history;
DROP POLICY IF EXISTS "Users can view spouse info for accessible history" ON public.client_history_current_spouse;
DROP POLICY IF EXISTS "Users can view family info for accessible history" ON public.client_history_family;
DROP POLICY IF EXISTS "Users can view household info for accessible history" ON public.client_history_household;
DROP POLICY IF EXISTS "Users can view medication info for accessible history" ON public.client_history_medications;
DROP POLICY IF EXISTS "Users can view past spouses info for accessible history" ON public.client_history_spouses;
DROP POLICY IF EXISTS "Users can view treatment info for accessible history" ON public.client_history_treatments;

-- Drop policies from clinical_documents table
DROP POLICY IF EXISTS "Clinicians can insert documents for assigned clients" ON public.clinical_documents;
DROP POLICY IF EXISTS "Clinicians can view assigned client documents" ON public.clinical_documents;

-- Drop policies from eligibility_audit table
DROP POLICY IF EXISTS "Users can view eligibility audit for accessible clients" ON public.eligibility_audit;

-- Drop policies from session_notes table
DROP POLICY IF EXISTS "Clinicians can create session notes" ON public.session_notes;
DROP POLICY IF EXISTS "Clinicians can update session notes" ON public.session_notes;