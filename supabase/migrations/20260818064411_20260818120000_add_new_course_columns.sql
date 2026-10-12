/*
# Add new course columns to dataset_mahasiswa

1. Overview
   Updates the dataset table to support the new CSV format with 12 columns:
   NIM, Algo_Pemrog_2, Struktur_Data, PBO, Jaringan_Komputer, Sistem_Operasi,
   Arsitektur_Orkom, Matematika_Diskrit, Statiska_Dasar, Kecerdasan_Buatan,
   IPK_Sem_4, Bidang_Keilmuan.
   The old columns are retained (data safety) but the app will use the new ones.

2. New Columns on dataset_mahasiswa
   - algo_pemrog_2       (numeric) — Algoritma & Pemrograman 2
   - pbo                 (numeric) — Pemrograman Berorientasi Objek
   - arsitektur_orkom    (numeric) — Arsitektur & Organisasi Komputer
   - matematika_diskrit  (numeric) — Matematika Diskrit
   - statiska_dasar      (numeric) — Statistika Dasar
   - ipk_sem_4           (numeric) — IPK Semester 4
   - bidang_keilmuan     (text)    — Bidang Keilmuan (RPL / Jaringan / Sistem Cerdas)

3. Data Migration
   - Backfill overlapping columns from existing data (struktur_data, jaringan_komputer,
     sistem_operasi, kecerdasan_buatan already exist; pbo ← pemrograman_berorientasi_objek,
     algo_pemrog_2 ← algoritma_dan_pemrograman, ipk_sem_4 ← ipk, bidang_keilmuan ← konsentrasi).
   - Generate plausible values for the 3 brand-new courses (arsitektur_orkom,
     matematika_diskrit, statiska_dasar) based on concentration baseline + random jitter.

4. Security
   - RLS already enabled on the table; existing policies are unchanged and still
     allow authenticated users full CRUD on the shared dataset.
*/

-- ---------- add new columns ----------
ALTER TABLE dataset_mahasiswa
  ADD COLUMN IF NOT EXISTS algo_pemrog_2 numeric,
  ADD COLUMN IF NOT EXISTS pbo numeric,
  ADD COLUMN IF NOT EXISTS arsitektur_orkom numeric,
  ADD COLUMN IF NOT EXISTS matematika_diskrit numeric,
  ADD COLUMN IF NOT EXISTS statiska_dasar numeric,
  ADD COLUMN IF NOT EXISTS ipk_sem_4 numeric,
  ADD COLUMN IF NOT EXISTS bidang_keilmuan text;

-- ---------- backfill from existing columns ----------
UPDATE dataset_mahasiswa SET pbo = pemrograman_berorientasi_objek WHERE pbo IS NULL;
UPDATE dataset_mahasiswa SET algo_pemrog_2 = algoritma_dan_pemrograman WHERE algo_pemrog_2 IS NULL;
UPDATE dataset_mahasiswa SET ipk_sem_4 = ipk WHERE ipk_sem_4 IS NULL;
UPDATE dataset_mahasiswa SET bidang_keilmuan = konsentrasi WHERE bidang_keilmuan IS NULL;

-- backfill the 3 new courses with concentration-based baselines + jitter
UPDATE dataset_mahasiswa
SET arsitektur_orkom = LEAST(100, GREATEST(50, base + ROUND((random() * 20 - 10))::int))
FROM (
  SELECT id,
    CASE
      WHEN konsentrasi = 'RPL' THEN 72
      WHEN konsentrasi = 'Jaringan' THEN 78
      ELSE 74
    END AS base
  FROM dataset_mahasiswa
) AS src
WHERE dataset_mahasiswa.id = src.id
  AND dataset_mahasiswa.arsitektur_orkom IS NULL;

UPDATE dataset_mahasiswa
SET matematika_diskrit = LEAST(100, GREATEST(50, base + ROUND((random() * 20 - 10))::int))
FROM (
  SELECT id,
    CASE
      WHEN konsentrasi = 'RPL' THEN 75
      WHEN konsentrasi = 'Jaringan' THEN 70
      ELSE 78
    END AS base
  FROM dataset_mahasiswa
) AS src
WHERE dataset_mahasiswa.id = src.id
  AND dataset_mahasiswa.matematika_diskrit IS NULL;

UPDATE dataset_mahasiswa
SET statiska_dasar = LEAST(100, GREATEST(50, base + ROUND((random() * 20 - 10))::int))
FROM (
  SELECT id,
    CASE
      WHEN konsentrasi = 'RPL' THEN 74
      WHEN konsentrasi = 'Jaringan' THEN 72
      ELSE 80
    END AS base
  FROM dataset_mahasiswa
) AS src
WHERE dataset_mahasiswa.id = src.id
  AND dataset_mahasiswa.statiska_dasar IS NULL;

-- ---------- add CHECK constraint on bidang_keilmuan ----------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dataset_mahasiswa_bidang_keilmuan_check'
  ) THEN
    ALTER TABLE dataset_mahasiswa
    ADD CONSTRAINT dataset_mahasiswa_bidang_keilmuan_check
    CHECK (bidang_keilmuan IS NULL OR bidang_keilmuan IN ('RPL', 'Jaringan', 'Sistem Cerdas'));
  END IF;
END $$;

-- ---------- index on bidang_keilmuan ----------
CREATE INDEX IF NOT EXISTS idx_dataset_bidang_keilmuan ON dataset_mahasiswa(bidang_keilmuan);
