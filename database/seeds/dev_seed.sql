-- USER 1 PASSWORD: password
-- USER 2 PASSWORD: password

USE gradus;

-- users
INSERT INTO users (email, forename, surname, password_hash)
VALUES
(
	'john@email.com',
	'John',
	'Smith',
	'$2b$12$Cf.xZ3Z09x8WS/S2DCibXuDKVbVbZQwGFDNYSGrWWZms0Yuf3SJza'
),
(
	'jane@email.com',
	'Jane',
	'Doe',
	'$2b$12$Cf.xZ3Z09x8WS/S2DCibXuDKVbVbZQwGFDNYSGrWWZms0Yuf3SJza'
);

-- semesters
INSERT INTO semesters (user_id, name, start_date, end_date, availability)
VALUES
(
	1,
	'Year 2 Semester 1',
	'2025-09-01',
	'2025-12-20',
	UNHEX('A1F3B5C7D9E1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6')
),
(
	1,
	'Year 2 Semester 2',
	'2026-01-15',
	'2026-05-30',
	UNHEX('0F1E2D3C4B5A69788796A5B4C3D2E1F0A9B8C7D6E5')
),
(
	2,
	'Year 4 Semester 1',
	'2025-09-10',
	'2025-12-22',
	UNHEX('FFFFFFFF00000000AAAAAAAA55555555BBBBCCCCDD')
);

-- settings
INSERT INTO user_settings (user_id, active_semester_id, theme)
VALUES
(
	1,
	1,
	'light'
),
(
	2,
	3,
	'dark'
);

-- modules
INSERT INTO modules (semester_id, name, credits, colour)
VALUES
(1, 'Data Structures & Algorithms', 5, '#3498DB'),
(1, 'Database Systems', 5, '#2ECC71'),
(1, 'Software Engineering Principles', 5, '#E74C3C'),
(2, 'Web Application Development', 5, '#9B59B6'),
(2, 'Operating Systems', 5, '#F1C40F'),
(2, 'Computer Networks', 5, '#1ABC9C'),
(3, 'Financial Accounting', 10, '#E67E22'),
(3, 'Management Accounting', 10, '#34495E'),
(3, 'Corporate Finance', 10, '#16A085');

-- assignments
INSERT INTO assignments (module_id, name, description, status, weight, confidence, deadline)
VALUES
(	
	1, 
	'CA1: Algorithm Analysis Report',
	'Big-O analysis and written report with example implementations.',
	'active',
	30,
	3,
	'2026-03-15 23:59:59'
),
(	2,
	'Lab: Normalisation & ERD',
	'Design an ERD and normalise a sample dataset to 3NF.',
 	'active',
	20,
	4,
	'2026-03-05 23:59:59'
),
(
	3, 
	'Project Retrospective',
	'Short retrospective on team workflow, lessons learned, and improvements.',
 	'completed', 
	10, 
	5, 
	'2025-12-01 23:59:59'
),
(	
	7,
	'Financial Statements Assignment',
	'Prepare and analyse financial statements for a case study company.',
 	'active',
	40,
	3,
	'2026-03-20 23:59:59'
),
(	
	8,
	'Costing Case Study',
 	'Absorption vs marginal costing comparison with recommendations.',
 	'active',
	30,
	4,
	'2026-03-10 23:59:59'
),
(
	9,
	'Corporate Finance Quiz 1',
 	'Quiz covering NPV, IRR, and cost of capital basics.',
 	'completed',
	10,
	5,
	'2025-11-15 23:59:59'
);

-- tasks
INSERT INTO tasks
(assignment_id, name, description, status, deadline, etc_minutes, atc_minutes)
VALUES
(
	1,
	'Read lecture notes',
	'Review lecture slides and highlight key concepts.',
 	'todo',
	'2026-03-01 20:00:00', 
	60,
	NULL
),
(
	1,
	'Implement practice problems',
 	'Solve coding exercises from tutorial sheet.',
 	'doing',
	'2026-03-02 22:00:00',
	120,
	NULL
),
(
	1,
	'Write summary notes',
	'Condense key ideas into revision notes.',
	'done',
	'2026-02-25 18:00:00',
	90,
	80
),
(
	2,
	'Design ER diagram',
	'Create initial ERD draft for project dataset.',
	'todo',
	'2026-03-05 21:00:00',
	75,
	NULL
),
(
	4,
	'Read case study',
	'Review company financial statements.',
	'todo',
	'2026-03-03 19:00:00',
	45,
	NULL
),
(
	4,
	'Calculate financial ratios',
	'Compute liquidity and profitability ratios.',
	'doing',
	'2026-03-04 20:30:00',
	90,
	NULL
),
(
	4,
	'Prepare analysis report',
 	'Write summary interpretation of ratios.',
 	'done',
	'2026-02-28 17:00:00',
	120,
	110
),
(
	5,
	'Prepare costing worksheet',
	'Draft absorption costing calculations.',
	'todo',
	'2026-03-07 21:00:00',
	60,
	NULL
);
