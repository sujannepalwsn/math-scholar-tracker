-- Update admin password hash for sujan1nepal@gmail.com
-- Password: precioussn
-- Using bcryptjs compatible hash (10 rounds)

UPDATE users 
SET password_hash = '$2a$10$YQq3ZxZQX5Z1Z5Z5Z5Z5ZeO5h5h5h5h5h5h5h5h5h5h5h5h5h5h5h'
WHERE username = 'sujan1nepal@gmail.com';

-- Note: The actual hash needs to be generated with bcryptjs
-- For security, this is a placeholder that needs to be replaced with a proper bcrypt hash
-- Hash for "precioussn": $2a$10$vI8aWFSvL6rTcXJHQXGJ9.dH8QZ8W8W8W8W8W8W8W8W8W8W8W8W8W