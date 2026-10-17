-- ==============================================================================
-- Migration: Remove 'Family Data' from master_templates table
-- Since Family Data has been moved into its own dedicated form and tab,
-- remove it from Excel spreadsheet master templates.
-- ==============================================================================

DELETE FROM public.master_templates WHERE sheet_name = 'Family Data';
