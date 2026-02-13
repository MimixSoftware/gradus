USE gradus;
CREATE TABLE assignments (
	id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	module_id INT UNSIGNED NOT NULL,
	name VARCHAR(100) NOT NULL,
	description VARCHAR(500) NULL,
	status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
	weight TINYINT UNSIGNED NULL,
	confidence TINYINT UNSIGNED NULL,
	deadline TIMESTAMP NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	CONSTRAINT fk_assignments_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
	CONSTRAINT uq_assignments_module_name UNIQUE (module_id, name),
	CONSTRAINT chk_assignments_weight CHECK (weight IS NULL OR weight BETWEEN 1 AND 100),
	CONSTRAINT chk_assignments_confidence CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5)
);
