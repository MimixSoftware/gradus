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
 	'archived', 
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
 	'archived',
	10,
	5,
	'2025-11-15 23:59:59'
);