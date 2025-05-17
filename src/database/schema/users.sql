CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nickname_hash VARCHAR(128) NOT NULL,
  encrypted_nickname VARCHAR(256) NOT NULL,
  iv_nickname VARCHAR(32) NOT NULL,
  oauth_provider VARCHAR(32) NOT NULL,
  oauth_id VARCHAR(128) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_connected_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_provider_oauth_id (oauth_provider, oauth_id)
);
