USE gradus;
CREATE TABLE tasks (
	id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	assignment_id INT UNSIGNED NOT NULL,
	name VARCHAR(100) NOT NULL,
	description VARCHAR(500) NULL,
	status ENUM('todo', 'doing', 'done') NOT NULL DEFAULT 'todo',
	deadline TIMESTAMP NULL,
    etc_minutes INT UNSIGNED NULL,
    atc_minutes INT UNSIGNED NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tasks_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT uq_tasks_assignment_name UNIQUE (assignment_id, name),
    CONSTRAINT chk_tasks_etc_minutes CHECK (etc_minutes IS NULL OR etc_minutes >= 1),
    CONSTRAINT chk_tasks_atc_minutes CHECK (atc_minutes IS NULL OR atc_minutes >= 1)
);
