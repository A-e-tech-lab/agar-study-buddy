REVOKE EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shared_group_user_ids(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_invite_token() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_group_owner_as_member() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shared_group_user_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_token() TO authenticated;