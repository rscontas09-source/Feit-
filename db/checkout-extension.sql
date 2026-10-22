-- Executar depois de db/schema.sql.
-- Sessão anônima somente com token aleatório em cookie HttpOnly.
CREATE TABLE IF NOT EXISTS checkout_sessions (
 id uuid PRIMARY KEY,
 token_hash text NOT NULL UNIQUE,
 store_id text NOT NULL REFERENCES stores(id),
 sku text NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0),
 customer_email text,
 current_order_id text,
 current_status text,
 attempt integer NOT NULL DEFAULT 0,
 last_body text,
 last_idempotency_key text,
 last_reference text,
 last_error_code text,
 last_error_message text,
 voucher jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_sessions_order_idx ON checkout_sessions(current_order_id);
