-- Dashboard tables: audit_log and review_items
-- Run this after init_db.sql to add tables the dashboard depends on

-- audit_log: tracks all state transitions and field changes
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_document_id (document_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
);

-- review_items: individual field-level review items per document
CREATE TABLE IF NOT EXISTS review_items (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  extracted_value TEXT,
  confidence FLOAT,
  review_status VARCHAR(20) DEFAULT 'pending',
  resolved_value TEXT DEFAULT NULL,
  resolved_by VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  INDEX idx_document_id (document_id),
  INDEX idx_review_status (review_status)
);

-- review_queue: documents flagged for human review
CREATE TABLE IF NOT EXISTS review_queue (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  resolved_by VARCHAR(255) DEFAULT NULL,
  INDEX idx_document_id (document_id),
  INDEX idx_resolved (resolved_at)
);
