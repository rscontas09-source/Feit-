CREATE TABLE IF NOT EXISTS stores (id text PRIMARY KEY, name text NOT NULL, currency text NOT NULL, gateway text NOT NULL);
INSERT INTO stores(id,name,currency,gateway) VALUES ('fabrica-portugal','Fábrica Portugal','EUR','broski'),('loja-brasil','Loja Brasil','BRL','pix') ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS events (id bigserial PRIMARY KEY,store_id text NOT NULL REFERENCES stores(id),event_type text NOT NULL,path text,received_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS events_store_idx ON events(store_id,received_at);
CREATE TABLE IF NOT EXISTS orders (
 id text PRIMARY KEY,store_id text NOT NULL REFERENCES stores(id),external_reference text,method text,currency text NOT NULL,amount integer NOT NULL DEFAULT 0,amount_refunded integer NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'pending',customer_name text,customer_email text,tracking_code text,carrier text,shipping_status text NOT NULL DEFAULT 'not_shipped',updated_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS orders_store_idx ON orders(store_id,created_at);
CREATE TABLE IF NOT EXISTS webhook_events (id text PRIMARY KEY, received_at timestamptz DEFAULT now());
