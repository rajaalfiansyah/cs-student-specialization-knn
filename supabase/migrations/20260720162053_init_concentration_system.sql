/*
# Initialize Student Concentration Recommendation System

1. Overview
   Multi-tenant app with sign-in (Admin / Kaprodi). The system recommends a
   concentration (Rekayasa Perangkat Lunak, Jaringan, or Sistem Cerdas) for
   students based on 9 course grades + IPK semester 4 using K-Nearest Neighbors
   (K=5) with Min-Max normalization and Euclidean distance.

2. New Tables
   - `admins`: application users (Admin / Kaprodi). Mirrors auth.users via
     a 1:1 link; stores role + display name.
   - `dataset_mahasiswa`: training dataset (350 rows). Each row has 9 course
     grades, IPK, and the labeled concentration.
   - `prediksi_riwayat`: history of predictions made by users. Stores the
     input values, predicted concentration, probability distribution, and
     the 5 nearest neighbors used.

3. Security
   - RLS enabled on every table.
   - `admins`: only authenticated users can read; only an Admin can insert
     (Kaprodi cannot create new users through RLS — admin seeding is done
     via service role in the backend).
   - `dataset_mahasiswa`: authenticated users can SELECT, INSERT, UPDATE,
     DELETE (shared dataset across the org).
   - `prediksi_riwayat`: owner-scoped — each user only sees/edits their own
     prediction history.

4. Notes
   - `user_id` columns default to `auth.uid()` so inserts that omit it
     still satisfy the WITH CHECK ownership predicate.
   - Email confirmation stays OFF.
*/

-- ---------- admins ----------
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'kaprodi')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_own" ON admins;
CREATE POLICY "admins_select_own" ON admins FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_update_own" ON admins;
CREATE POLICY "admins_update_own" ON admins FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- dataset_mahasiswa ----------
CREATE TABLE IF NOT EXISTS dataset_mahasiswa (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nim text,
  nama text,
  pemrograman_dasar numeric,
  struktur_data numeric,
  basis_data numeric,
  pemrograman_berorientasi_objek numeric,
  algoritma_dan_pemrograman numeric,
  jaringan_komputer numeric,
  sistem_operasi numeric,
  kecerdasan_buatan numeric,
  rekayasa_perangkat_lunak numeric,
  ipk numeric,
  konsentrasi text NOT NULL CHECK (konsentrasi IN ('RPL', 'Jaringan', 'Sistem Cerdas')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dataset_mahasiswa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dataset_select_auth" ON dataset_mahasiswa;
CREATE POLICY "dataset_select_auth" ON dataset_mahasiswa FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "dataset_insert_auth" ON dataset_mahasiswa;
CREATE POLICY "dataset_insert_auth" ON dataset_mahasiswa FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "dataset_update_auth" ON dataset_mahasiswa;
CREATE POLICY "dataset_update_auth" ON dataset_mahasiswa FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dataset_delete_auth" ON dataset_mahasiswa;
CREATE POLICY "dataset_delete_auth" ON dataset_mahasiswa FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_dataset_konsentrasi ON dataset_mahasiswa(konsentrasi);

-- ---------- prediksi_riwayat ----------
CREATE TABLE IF NOT EXISTS prediksi_riwayat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  input jsonb NOT NULL,
  hasil text NOT NULL CHECK (hasil IN ('RPL', 'Jaringan', 'Sistem Cerdas')),
  probabilitas jsonb NOT NULL,
  tetangga jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prediksi_riwayat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "riwayat_select_own" ON prediksi_riwayat;
CREATE POLICY "riwayat_select_own" ON prediksi_riwayat FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "riwayat_insert_own" ON prediksi_riwayat;
CREATE POLICY "riwayat_insert_own" ON prediksi_riwayat FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "riwayat_update_own" ON prediksi_riwayat;
CREATE POLICY "riwayat_update_own" ON prediksi_riwayat FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "riwayat_delete_own" ON prediksi_riwayat;
CREATE POLICY "riwayat_delete_own" ON prediksi_riwayat FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_riwayat_user_created ON prediksi_riwayat(user_id, created_at DESC);
