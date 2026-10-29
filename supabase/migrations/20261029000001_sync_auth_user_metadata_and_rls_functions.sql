-- ============================================================================
-- MIGRATION: SYNC AUTH USER METADATA AND FIX RLS FUNCTION SECURITY (BR-01, BR-02)
-- ============================================================================

-- 1. Perbarui fungsi get_user_branch_id agar selalu membaca dari public.profiles dengan aman (tanpa rekursi RLS)
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS UUID 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_cabang_id UUID;
BEGIN
    -- Utamakan data riil terkini di public.profiles
    SELECT cabang_id INTO v_cabang_id 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_cabang_id IS NOT NULL THEN
        RETURN v_cabang_id;
    END IF;

    -- Fallback ke klaim JWT jika data profiles belum terbaca
    BEGIN
        RETURN (auth.jwt() -> 'user_metadata' ->> 'cabang_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$;

-- 2. Perbarui fungsi is_owner agar konsisten membaca dari public.profiles dengan aman
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND peran = 'owner' AND aktif = true
    ) INTO v_is_owner;

    IF v_is_owner IS TRUE THEN
        RETURN true;
    END IF;

    IF (auth.jwt() -> 'user_metadata' ->> 'peran') = 'owner' THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- 3. Trigger otomatis sinkronisasi perubahan profiles -> auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'nama_lengkap', NEW.nama_lengkap,
            'peran', NEW.peran,
            'cabang_id', NEW.cabang_id
        )
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated_sync_auth ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_auth
    AFTER UPDATE OF peran, cabang_id, nama_lengkap ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_to_auth_user();

-- 4. Sinkronkan semua data akun pengguna yang sudah ada saat ini
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'nama_lengkap', p.nama_lengkap,
        'peran', p.peran,
        'cabang_id', p.cabang_id
    )
FROM public.profiles p
WHERE u.id = p.id;
