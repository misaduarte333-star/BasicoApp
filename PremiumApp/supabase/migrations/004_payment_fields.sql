-- Migration: Add payment and CRM fields to citas table
-- Desc: Allows tracking final price paid, payment method, and internal CRM/Marketing notes.

ALTER TABLE citas
ADD COLUMN monto_pagado DECIMAL(10,2),
ADD COLUMN metodo_pago VARCHAR(50), -- efectivo, tarjeta, transferencia
ADD COLUMN notas_crm TEXT;

-- Index for payment analytics
CREATE INDEX idx_citas_pago ON citas(metodo_pago, monto_pagado);
