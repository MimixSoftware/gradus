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
	'Year 3 Semester 1',
	'2025-09-01',
	'2025-12-20',
	UNHEX('A1F3B5C7D9E1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6')
),
(
	1,
	'Year 3 Semester 2',
	'2026-01-15',
	'2026-05-30',
	UNHEX('0F1E2D3C4B5A69788796A5B4C3D2E1F0A9B8C7D6E5')
),
(
	2,
	'Year 1 Semester 1',
	'2025-09-01',
	'2025-12-20',
	UNHEX('11223344556677889900AABBCCDDEEFF0102030405')
),
(
	2,
	'Year 1 Semester 2',
	'2026-01-15',
	'2026-05-30',
	UNHEX('FFEEDDCCBBAA009988776655443322110A0B0C0D0E')
);

-- settings
INSERT INTO user_settings (user_id, active_semester_id, theme)
VALUES
(1, 2, 'light'),
(2, 4, 'system');

-- modules
INSERT INTO modules (semester_id, name, credits, colour)
VALUES
-- John (Software Engineering) - Year 3 Semester 1
(1, 'Algorithms & Data Structures', 5, '#3B82F6'),
(1, 'Database Systems',            5, '#22C55E'),
(1, 'Software Testing',            5, '#F97316'),
(1, 'Web Application Development', 5, '#A855F7'),

-- John (Software Engineering) - Year 3 Semester 2
(2, 'Distributed Systems',         5, '#14B8A6'),
(2, 'Cloud Computing',             5, '#6366F1'),
(2, 'Mobile Application Development', 5, '#EC4899'),
(2, 'Software Engineering Project',   10, '#EAB308'),

-- Jane (Business) - Year 1 Semester 1
(3, 'Accounting Fundamentals',     5, '#EF4444'),
(3, 'Microeconomics',              5, '#84CC16'),
(3, 'Business Communication',      5, '#3B82F6'),
(3, 'Quantitative Methods',        5, '#22C55E'),

-- Jane (Business) - Year 1 Semester 2
(4, 'Marketing Principles',        5, '#F97316'),
(4, 'Management & Organisations',  5, '#A855F7'),
(4, 'Business Law',                5, '#14B8A6'),
(4, 'Financial Accounting 2',      5, '#6366F1');

-- assignments
INSERT INTO assignments (module_id, name, description, status, weight, confidence, deadline)
VALUES
-- John Y3 S1 - Algorithms & Data Structures (module_id = 1) [COMPLETED]
(1, 'Big-O Worksheet', 'Complexity analysis questions + short proofs.', 'completed', 10, 4, '2025-09-25 23:59:00'),
(1, 'Sorting Lab', 'Implement and benchmark quicksort/mergesort with report.', 'completed', 20, 3, '2025-10-18 23:59:00'),
(1, 'Graph Algorithms CA', 'Shortest path + MST implementation and write-up.', 'completed', 30, 4, '2025-11-22 23:59:00'),

-- John Y3 S1 - Database Systems (module_id = 2) [COMPLETED]
(2, 'ERD + Normalisation', 'Design ERD and normalise to 3NF with justification.', 'completed', 15, 4, '2025-10-05 23:59:00'),
(2, 'SQL Queries Pack', 'Joins, subqueries, views, and indexes practice set.', 'completed', 20, 3, '2025-11-01 23:59:00'),
(2, 'Database Mini-Project', 'Schema + CRUD + constraints + sample data.', 'completed', 35, 4, '2025-12-10 23:59:00'),

-- John Y3 S1 - Software Testing (module_id = 3) [COMPLETED]
(3, 'Unit Testing Assignment', 'Write Jest tests with mocks/stubs for services.', 'completed', 25, 4, '2025-10-28 23:59:00'),
(3, 'Integration Test Plan', 'Test strategy, test cases, coverage goals.', 'completed', 15, 3, '2025-11-15 23:59:00'),
(3, 'CI Pipeline Exercise', 'Add lint + test + coverage reporting in CI.', 'completed', 20, 4, '2025-12-05 23:59:00'),

-- John Y3 S1 - Web Application Development (module_id = 4) [COMPLETED]
(4, 'EJS + Express CRUD', 'Small app with auth, validation, and flash errors.', 'completed', 25, 4, '2025-10-20 23:59:00'),
(4, 'Accessibility Audit', 'Audit pages and fix contrast/labels/keyboard nav.', 'completed', 10, 3, '2025-11-18 23:59:00'),
(4, 'Final Web CA', 'Responsive dashboard + REST API endpoints.', 'completed', 35, 4, '2025-12-18 23:59:00'),

-- John Y3 S2 - Distributed Systems (module_id = 5) [ACTIVE]
(5, 'RPC Basics Lab', 'Implement a simple client/server with request retries.', 'active', 15, 3, '2026-03-10 23:59:00'),
(5, 'Consensus Reading Summary', 'Short summary + notes on leader election.', 'active', 10, 2, '2026-03-24 23:59:00'),
(5, 'Distributed CA', 'Build a small replicated service + failure handling.', 'active', 35, 4, '2026-04-28 23:59:00'),

-- John Y3 S2 - Cloud Computing (module_id = 6) [ACTIVE]
(6, 'Dockerise an API', 'Containerise Node API + compose for local dev.', 'active', 20, 4, '2026-03-18 23:59:00'),
(6, 'Cloud Deployment', 'Deploy to cloud + env config + secrets handling.', 'active', 30, 3, '2026-04-15 23:59:00'),
(6, 'Cost & Scaling Report', 'Basic cost estimate + autoscaling discussion.', 'active', 10, 2, '2026-05-06 23:59:00'),

-- John Y3 S2 - Mobile Application Development (module_id = 7) [ACTIVE]
(7, 'UI Prototype', 'Prototype 4 screens with navigation and state.', 'active', 15, 3, '2026-03-12 23:59:00'),
(7, 'Local Storage Feature', 'Persist user settings + offline mode behaviour.', 'active', 20, 3, '2026-04-09 23:59:00'),
(7, 'Mobile CA', 'Polished app + demo video + short report.', 'active', 35, 4, '2026-05-20 23:59:00'),

-- John Y3 S2 - Software Engineering Project (module_id = 8) [ACTIVE]
(8, 'Project Proposal', 'Scope, milestones, risks, and success criteria.', 'active', 10, 4, '2026-03-01 23:59:00'),
(8, 'Architecture + DFD', 'System design, DFD, threat considerations.', 'active', 20, 3, '2026-03-29 23:59:00'),
(8, 'Sprint 1 Deliverable', 'Working increment + changelog + demo notes.', 'active', 20, 4, '2026-04-26 23:59:00'),

-- Jane Y1 S1 - Accounting Fundamentals (module_id = 9) [COMPLETED]
(9, 'Ledger Exercises', 'Double-entry bookkeeping practice set.', 'completed', 20, 3, '2025-10-03 23:59:00'),
(9, 'Trial Balance CA', 'Prepare trial balance from transactions.', 'completed', 25, 4, '2025-11-07 23:59:00'),
(9, 'Final Accounting Test', 'In-class test covering weeks 1–10.', 'completed', 30, 3, '2025-12-12 12:00:00'),

-- Jane Y1 S1 - Microeconomics (module_id = 10) [COMPLETED]
(10, 'Supply/Demand Worksheet', 'Elasticity and equilibrium calculations.', 'completed', 15, 3, '2025-09-27 23:59:00'),
(10, 'Market Structures Essay', 'Short essay: perfect competition vs monopoly.', 'completed', 20, 4, '2025-10-25 23:59:00'),
(10, 'Microeconomics Exam Prep', 'Past paper answers + reflection.', 'completed', 10, 2, '2025-12-06 23:59:00'),

-- Jane Y1 S1 - Business Communication (module_id = 11) [COMPLETED]
(11, 'Professional Email Pack', 'Write email responses for 6 business scenarios.', 'completed', 15, 4, '2025-10-10 23:59:00'),
(11, 'Presentation Slides', '5-minute presentation + speaker notes.', 'completed', 20, 3, '2025-11-14 23:59:00'),
(11, 'CV + Cover Letter', 'Targeted CV + tailored cover letter.', 'completed', 25, 4, '2025-12-04 23:59:00'),

-- Jane Y1 S1 - Quantitative Methods (module_id = 12) [COMPLETED]
(12, 'Stats Quiz 1', 'Mean/median/std dev questions.', 'completed', 10, 3, '2025-09-20 23:59:00'),
(12, 'Regression Worksheet', 'Basic linear regression + interpretation.', 'completed', 20, 3, '2025-11-02 23:59:00'),
(12, 'Quant Methods CA', 'Data set analysis + short report.', 'completed', 30, 4, '2025-12-16 23:59:00'),

-- Jane Y1 S2 - Marketing Principles (module_id = 13) [ACTIVE]
(13, 'Brand Analysis', 'Analyse a brand using STP + 4Ps.', 'active', 20, 4, '2026-03-14 23:59:00'),
(13, 'Consumer Behaviour Notes', 'Weekly notes + 1-page summary.', 'active', 10, 2, '2026-03-28 23:59:00'),
(13, 'Marketing CA', 'Campaign proposal + budget + KPIs.', 'active', 35, 3, '2026-05-08 23:59:00'),

-- Jane Y1 S2 - Management & Organisations (module_id = 14) [ACTIVE]
(14, 'Teamwork Reflection', 'Reflective piece on group roles and conflict.', 'active', 15, 3, '2026-03-09 23:59:00'),
(14, 'Case Study Write-up', 'Analyse management decisions in provided case.', 'active', 25, 3, '2026-04-12 23:59:00'),
(14, 'Group Presentation', 'Short presentation on leadership styles.', 'active', 20, 4, '2026-05-18 14:00:00'),

-- Jane Y1 S2 - Business Law (module_id = 15) [ACTIVE]
(15, 'Contract Law Quiz', 'MCQ + short answers on formation and terms.', 'active', 15, 2, '2026-03-20 23:59:00'),
(15, 'Negligence Scenario', 'Apply tort principles to a scenario.', 'active', 20, 3, '2026-04-24 23:59:00'),
(15, 'Law CA', 'Short report referencing legislation and cases.', 'active', 30, 3, '2026-05-22 23:59:00'),

-- Jane Y1 S2 - Financial Accounting 2 (module_id = 16) [ACTIVE]
(16, 'Adjusting Entries Practice', 'Accruals, prepayments, depreciation.', 'active', 20, 3, '2026-03-16 23:59:00'),
(16, 'Cash Flow Statement', 'Prepare cash flow from given accounts.', 'active', 25, 4, '2026-04-18 23:59:00'),
(16, 'Final Accounts CA', 'Prepare final accounts + commentary.', 'active', 35, 3, '2026-05-27 23:59:00');

-- tasks
INSERT INTO tasks (assignment_id, name, description, status, deadline, etc_minutes, atc_minutes)
VALUES
(22, 'Define scope & objectives', 'Write clear scope boundaries and success criteria.', 'done', '2026-02-20 23:59:00', 90, 85),
(22, 'Draft milestones timeline', 'Create milestone list with expected delivery dates.', 'doing', '2026-02-26 18:00:00', 120, NULL),
(22, 'Identify risks', 'List key project risks and mitigation strategies.', 'todo', NULL, 60, NULL),
(22, 'Write project overview', 'One-page summary of problem, solution, and value.', 'done', NULL, 75, 70),
(22, 'Gather references', 'Collect academic and technical sources.', 'doing', NULL, NULL, NULL),
(22, 'Document assumptions', 'Capture assumptions about users, tools, and constraints.', 'todo', NULL, NULL, NULL),
(22, 'Final proofread', 'Check formatting, grammar, and rubric compliance.', 'todo', '2026-02-28 20:00:00', 45, NULL),
(40, 'Outline reflection structure', 'Plan sections and key talking points.', 'done', '2026-03-01 21:00:00', 40, 35),
(40, 'Collect teamwork examples', 'Gather real examples from the project.', 'doing', NULL, 60, NULL),
(40, 'Write role & contribution section', 'Describe responsibilities and personal impact.', 'todo', '2026-03-05 23:59:00', 75, NULL),
(40, 'Write conflict reflection', 'Reflect on disagreements and resolution.', 'todo', NULL, NULL, NULL),
(40, 'Link to teamwork theory', 'Connect experiences to teamwork models.', 'doing', '2026-03-07 18:00:00', 50, NULL),
(40, 'Edit for clarity', 'Improve tone, structure, and flow.', 'todo', '2026-03-08 20:00:00', 45, NULL),
(40, 'Final submission check', 'Spellcheck, formatting, and rubric review.', 'done', '2026-03-09 21:30:00', NULL, 25);