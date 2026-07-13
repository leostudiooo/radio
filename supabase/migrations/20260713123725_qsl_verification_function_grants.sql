-- Supabase projects with legacy default privileges may grant EXECUTE directly to
-- anon/authenticated. Reset every role explicitly before granting the intended API.
REVOKE ALL ON FUNCTION public.get_qso_by_verification_code(TEXT)
	FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_qso_by_code(TEXT)
	FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_qso_verification_code(UUID)
	FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_qso_verification_code(UUID, TEXT)
	FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_qso_by_verification_code(TEXT)
	TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_qso_by_code(TEXT)
	TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_qso_verification_code(UUID)
	TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_qso_verification_code(UUID, TEXT)
	TO authenticated;
