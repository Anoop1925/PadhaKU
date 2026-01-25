-- Add test data for user: 1032220350@tcetmumbai.in
-- Run this in your database to populate analytics data

-- 1. Ensure user exists
INSERT INTO users (email, display_name) 
VALUES ('1032220350@tcetmumbai.in', 'Chitra Pandey')
ON CONFLICT (email) DO UPDATE SET display_name = 'Chitra Pandey';

-- 2. Add user points
INSERT INTO user_points (user_email, points, total_chapters_completed, total_courses_completed, last_updated) 
VALUES ('1032220350@tcetmumbai.in', 250, 25, 3, NOW())
ON CONFLICT (user_email) DO UPDATE SET
  points = 250,
  total_chapters_completed = 25,
  total_courses_completed = 3,
  last_updated = NOW();

-- 3. Delete old history for this user (if any)
DELETE FROM points_history WHERE user_email = '1032220350@tcetmumbai.in';

-- 4. Add points history for last 30 days (varied activity)
INSERT INTO points_history (user_email, points_earned, reason, earned_at) VALUES
-- Last 7 days (recent activity)
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Introduction to React', NOW() - INTERVAL '1 day'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: React Hooks', NOW() - INTERVAL '1 day'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: State Management', NOW() - INTERVAL '2 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Component Lifecycle', NOW() - INTERVAL '3 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Props and Events', NOW() - INTERVAL '4 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: JSX Basics', NOW() - INTERVAL '5 days'),
('1032220350@tcetmumbai.in', 50, 'Course completed bonus', NOW() - INTERVAL '5 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: JavaScript ES6', NOW() - INTERVAL '6 days'),

-- Week 2
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Async/Await', NOW() - INTERVAL '8 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Promises', NOW() - INTERVAL '9 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Fetch API', NOW() - INTERVAL '10 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Array Methods', NOW() - INTERVAL '12 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Object Methods', NOW() - INTERVAL '13 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Destructuring', NOW() - INTERVAL '14 days'),

-- Week 3
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Spread Operator', NOW() - INTERVAL '15 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Template Literals', NOW() - INTERVAL '17 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Arrow Functions', NOW() - INTERVAL '18 days'),
('1032220350@tcetmumbai.in', 50, 'Course completed bonus', NOW() - INTERVAL '18 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Classes', NOW() - INTERVAL '20 days'),

-- Week 4
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Modules', NOW() - INTERVAL '22 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Error Handling', NOW() - INTERVAL '24 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: DOM Manipulation', NOW() - INTERVAL '25 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Event Listeners', NOW() - INTERVAL '27 days'),
('1032220350@tcetmumbai.in', 10, 'Completed chapter: Local Storage', NOW() - INTERVAL '28 days'),
('1032220350@tcetmumbai.in', 50, 'Course completed bonus', NOW() - INTERVAL '28 days');

-- 5. Add user progress (assuming course IDs 1 and 2 exist)
-- Delete old progress
DELETE FROM user_progress WHERE user_email = '1032220350@tcetmumbai.in';

-- Add progress for course 1 (completed)
INSERT INTO user_progress (user_email, course_id, chapter_index, chapter_name, is_completed, completed_at) VALUES
('1032220350@tcetmumbai.in', 1, 0, 'Introduction to React', true, NOW() - INTERVAL '1 day'),
('1032220350@tcetmumbai.in', 1, 1, 'React Hooks', true, NOW() - INTERVAL '1 day'),
('1032220350@tcetmumbai.in', 1, 2, 'State Management', true, NOW() - INTERVAL '2 days'),
('1032220350@tcetmumbai.in', 1, 3, 'Component Lifecycle', true, NOW() - INTERVAL '3 days'),
('1032220350@tcetmumbai.in', 1, 4, 'Props and Events', true, NOW() - INTERVAL '4 days');

-- Add progress for course 2 (in progress)
INSERT INTO user_progress (user_email, course_id, chapter_index, chapter_name, is_completed, completed_at) VALUES
('1032220350@tcetmumbai.in', 2, 0, 'JavaScript ES6', true, NOW() - INTERVAL '6 days'),
('1032220350@tcetmumbai.in', 2, 1, 'Async/Await', true, NOW() - INTERVAL '8 days'),
('1032220350@tcetmumbai.in', 2, 2, 'Promises', true, NOW() - INTERVAL '9 days');

-- Verify the data
SELECT 'User Points:' as info, * FROM user_points WHERE user_email = '1032220350@tcetmumbai.in';
SELECT 'Points History Count:' as info, COUNT(*) as count FROM points_history WHERE user_email = '1032220350@tcetmumbai.in';
SELECT 'User Progress Count:' as info, COUNT(*) as count FROM user_progress WHERE user_email = '1032220350@tcetmumbai.in';
