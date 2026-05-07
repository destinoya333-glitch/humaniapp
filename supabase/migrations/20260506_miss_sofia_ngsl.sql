-- =====================================================================
-- Miss Sofia — NGSL (New General Service List) tracker
-- Fecha: 2026-05-06
--
-- Counter directo a Mario Montes ("memoriza las 100 palabras del 80%").
-- Sofia NO te hace memorizar — MIDE cuáles palabras del NGSL ya USAS
-- en tu vida real (cada vez que las dices en audio o texto).
--
-- NGSL: 2,801 palabras que cubren ~92% del texto general en inglés.
-- Top 100 ≈ 50% · Top 500 ≈ 75% · Top 1000 ≈ 80% · Top 2801 ≈ 92%.
--
-- Aquí seedeamos el TOP 100 (suficiente para el pitch counter-Mario).
-- Top 500 y Top 1000 se sembrarán después via script si Percy lo aprueba.
-- =====================================================================

-- 1. Tabla maestra de palabras NGSL
CREATE TABLE IF NOT EXISTS mse_ngsl_words (
  id integer PRIMARY KEY,            -- = rank de frecuencia
  word text NOT NULL UNIQUE,         -- lema en lowercase
  tier smallint NOT NULL,            -- 1 = top100, 2 = top500, 3 = top1000
  pos text                           -- part of speech opcional (n/v/adj/...)
);

CREATE INDEX IF NOT EXISTS mse_ngsl_words_tier_idx ON mse_ngsl_words (tier);

COMMENT ON TABLE mse_ngsl_words IS
  'NGSL master list. Tier 1 = top 100 lemas más frecuentes (cubren ~50% texto).';

-- 2. Tracking de uso REAL por user (no "estudio")
CREATE TABLE IF NOT EXISTS mse_user_ngsl_usage (
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  word_id integer NOT NULL REFERENCES mse_ngsl_words(id) ON DELETE CASCADE,
  uses_count integer NOT NULL DEFAULT 1 CHECK (uses_count > 0),
  first_used_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  last_context text,                 -- frase donde se usó por última vez
  PRIMARY KEY (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS mse_user_ngsl_usage_user_idx
  ON mse_user_ngsl_usage (user_id, last_used_at DESC);

COMMENT ON TABLE mse_user_ngsl_usage IS
  'Cada palabra NGSL que el user USÓ (en audio o texto). Diferenciador clave vs Mario: medimos uso, no memorización.';

-- 3. Seed Top 100 NGSL (lemas, ordenados por frecuencia COCA/NGSL)
INSERT INTO mse_ngsl_words (id, word, tier, pos) VALUES
  (1,'the',1,'art'),(2,'be',1,'v'),(3,'and',1,'cnj'),(4,'of',1,'prep'),(5,'a',1,'art'),
  (6,'in',1,'prep'),(7,'to',1,'prep'),(8,'have',1,'v'),(9,'it',1,'pron'),(10,'i',1,'pron'),
  (11,'that',1,'cnj'),(12,'for',1,'prep'),(13,'you',1,'pron'),(14,'he',1,'pron'),(15,'with',1,'prep'),
  (16,'on',1,'prep'),(17,'do',1,'v'),(18,'say',1,'v'),(19,'this',1,'pron'),(20,'they',1,'pron'),
  (21,'at',1,'prep'),(22,'but',1,'cnj'),(23,'we',1,'pron'),(24,'his',1,'pron'),(25,'from',1,'prep'),
  (26,'not',1,'adv'),(27,'by',1,'prep'),(28,'she',1,'pron'),(29,'or',1,'cnj'),(30,'as',1,'cnj'),
  (31,'what',1,'pron'),(32,'go',1,'v'),(33,'their',1,'pron'),(34,'can',1,'mod'),(35,'who',1,'pron'),
  (36,'get',1,'v'),(37,'if',1,'cnj'),(38,'would',1,'mod'),(39,'her',1,'pron'),(40,'all',1,'det'),
  (41,'my',1,'pron'),(42,'make',1,'v'),(43,'about',1,'prep'),(44,'know',1,'v'),(45,'will',1,'mod'),
  (46,'up',1,'adv'),(47,'one',1,'num'),(48,'time',1,'n'),(49,'there',1,'adv'),(50,'year',1,'n'),
  (51,'so',1,'adv'),(52,'think',1,'v'),(53,'when',1,'cnj'),(54,'which',1,'pron'),(55,'them',1,'pron'),
  (56,'some',1,'det'),(57,'me',1,'pron'),(58,'people',1,'n'),(59,'take',1,'v'),(60,'out',1,'adv'),
  (61,'into',1,'prep'),(62,'just',1,'adv'),(63,'see',1,'v'),(64,'him',1,'pron'),(65,'your',1,'pron'),
  (66,'come',1,'v'),(67,'could',1,'mod'),(68,'now',1,'adv'),(69,'than',1,'cnj'),(70,'like',1,'v'),
  (71,'other',1,'adj'),(72,'how',1,'adv'),(73,'then',1,'adv'),(74,'its',1,'pron'),(75,'our',1,'pron'),
  (76,'two',1,'num'),(77,'more',1,'adv'),(78,'these',1,'pron'),(79,'want',1,'v'),(80,'way',1,'n'),
  (81,'look',1,'v'),(82,'first',1,'adj'),(83,'also',1,'adv'),(84,'new',1,'adj'),(85,'because',1,'cnj'),
  (86,'day',1,'n'),(87,'use',1,'v'),(88,'no',1,'det'),(89,'man',1,'n'),(90,'find',1,'v'),
  (91,'here',1,'adv'),(92,'thing',1,'n'),(93,'give',1,'v'),(94,'many',1,'det'),(95,'well',1,'adv'),
  (96,'only',1,'adv'),(97,'those',1,'pron'),(98,'tell',1,'v'),(99,'very',1,'adv'),(100,'even',1,'adv')
ON CONFLICT (id) DO NOTHING;

-- 4. RPC para incrementar uses_count en batch (evita N round-trips por mensaje)
CREATE OR REPLACE FUNCTION mse_bump_ngsl_usage(
  p_user_id uuid,
  p_word_ids integer[],
  p_context text
) RETURNS integer
LANGUAGE sql
AS $$
  UPDATE mse_user_ngsl_usage
     SET uses_count = uses_count + 1,
         last_used_at = now(),
         last_context = p_context
   WHERE user_id = p_user_id
     AND word_id = ANY(p_word_ids);
  SELECT array_length(p_word_ids, 1);
$$;

COMMENT ON FUNCTION mse_bump_ngsl_usage IS
  'Incrementa uses_count + last_used_at de un batch de palabras NGSL para un user.';
