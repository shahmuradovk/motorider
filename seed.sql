-- Demo Users (password: 123456 for all)
INSERT INTO users (first_name, last_name, email, phone, password_hash, birth_date, moto_brand, moto_model, moto_cc, avatar_color, bio, is_verified) VALUES
('Əli', 'Həsənov', 'ali@test.com', '+994501234567', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1995-03-15', 'Yamaha', 'MT-07', 689, '#ff6b35', 'Bakı küçələrinin sevimli sürücüsü', true),
('Tural', 'Məmmədov', 'tural@test.com', '+994502345678', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1993-07-22', 'Honda', 'CB650R', 649, '#3366ff', 'Weekend rider, kofe həvəskarı', true),
('Kamran', 'Əliyev', 'kamran@test.com', '+994503456789', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1990-11-08', 'BMW', 'R1250GS', 1254, '#00d68f', 'ADV rider, uzun yolların aşiqi', true),
('Nicat', 'Hüseynov', 'nicat@test.com', '+994504567890', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1997-01-30', 'Ducati', 'Monster', 937, '#ff3333', 'Sürət və estetika', true),
('Orxan', 'Quliyev', 'orxan@test.com', '+994505678901', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1994-05-12', 'Kawasaki', 'Z900', 948, '#ffaa00', 'Serpantin kralı', true),
('Fərid', 'Babayev', 'ferid@test.com', '+994506789012', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1999-09-25', 'KTM', 'Duke 390', 373, '#9966ff', 'Yeni başlayan, öyrənirəm', true),
('Rəşad', 'İsmayılov', 'reshad@test.com', '+994507890123', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1992-12-03', 'Suzuki', 'GSX-S750', 749, '#ff6b35', 'Track day fanati', true),
('Elvin', 'Nəsibov', 'elvin@test.com', '+994508901234', '$2a$10$XKwGKCxZXHCGg.GhF7qLOOcSvZI1aHzYPIH0zR6B1jSQxVxZvKKCi', '1991-06-18', 'Harley-Davidson', 'Iron 883', 883, '#ffaa00', 'Cruiser lifestyle', true);

-- Demo Events (use subquery to get creator IDs)
INSERT INTO events (creator_id, title, description, event_date, start_location, start_lat, start_lng, end_location, end_lat, end_lng)
SELECT id, 'Mərdəkana axşam sürüşü', 'Axşam saat 7-də yığışırıq, Mərdəkana qədər gözəl sürüş edib kofe içirik. Hər kəs dəvətlidir!', '2026-06-25 19:00:00+04', 'Bakı, 28 Mall', 40.4097, 49.8672, 'Mərdəkan', 40.5250, 50.0167 FROM users WHERE email = 'ali@test.com';

INSERT INTO events (creator_id, title, description, event_date, start_location, start_lat, start_lng, end_location, end_lat, end_lng)
SELECT id, 'Şamaxı serpantini', 'Şamaxı yolunun serpantinlərini birlikdə keçək! Təcrübəli sürücülər üçün.', '2026-06-28 10:00:00+04', 'Bakı, Koroğlu metrosu', 40.4198, 49.9312, 'Şamaxı', 40.6317, 48.6367 FROM users WHERE email = 'kamran@test.com';

INSERT INTO events (creator_id, title, description, event_date, start_location, start_lat, start_lng, end_location, end_lat, end_lng)
SELECT id, 'Sahil boyunca kofe sürüşü', 'Sahil yolu ilə rahat sürüş, Bilgəh çimərliyinə qədər. Əla mənzərə qarantidir!', '2026-07-01 08:00:00+04', 'Dənizkənarı Park', 40.3567, 49.8394, 'Bilgəh', 40.5582, 50.0649 FROM users WHERE email = 'tural@test.com';

INSERT INTO events (creator_id, title, description, event_date, start_location, start_lat, start_lng, end_location, end_lat, end_lng)
SELECT id, 'Quba macərası', 'Qubaya 2 günlük sürüş! Gecə qalmaq planlaşdırılır. Çadır götürün.', '2026-07-05 07:00:00+04', 'Bakı', 40.4093, 49.8671, 'Quba', 41.3611, 48.5133 FROM users WHERE email = 'nicat@test.com';

-- Demo Alerts
INSERT INTO alerts (creator_id, type, description, lat, lng, expires_at)
SELECT id, 'construction', 'Nərimanov metrosu yaxınlığında yol təmiri. Sağ zolaq bağlıdır.', 40.4143, 49.8747, NOW() + INTERVAL '2 hours' FROM users WHERE email = 'ali@test.com';

INSERT INTO alerts (creator_id, type, description, lat, lng, expires_at)
SELECT id, 'pothole', 'Xətai prospektində böyük çuxur. Ehtiyatlı olun!', 40.3873, 49.8580, NOW() + INTERVAL '2 hours' FROM users WHERE email = 'orxan@test.com';

INSERT INTO alerts (creator_id, type, description, lat, lng, expires_at)
SELECT id, 'accident', 'Bakı-Sumqayıt yolunda qəza. Tıxac var.', 40.4589, 49.8961, NOW() + INTERVAL '2 hours' FROM users WHERE email = 'tural@test.com';

-- Demo Active Locations
INSERT INTO locations (user_id, lat, lng, message, share_mode, is_riding)
SELECT id, 40.3594, 49.8214, 'Flame Towers-da mənzərəyə baxıram 🔥', 'community', false FROM users WHERE email = 'ali@test.com';

INSERT INTO locations (user_id, lat, lng, message, share_mode, is_riding)
SELECT id, 40.3663, 49.8372, 'İçərişəhərdə gəzirəm', 'community', false FROM users WHERE email = 'tural@test.com';

INSERT INTO locations (user_id, lat, lng, message, share_mode, is_riding)
SELECT id, 40.3761, 49.8445, 'Port Baku-da kofe içirəm ☕', 'community', false FROM users WHERE email = 'kamran@test.com';

INSERT INTO locations (user_id, lat, lng, message, share_mode, is_riding, distance_km)
SELECT id, 40.3873, 49.8580, NULL, 'community', true, 12.5 FROM users WHERE email = 'nicat@test.com';

INSERT INTO locations (user_id, lat, lng, message, share_mode, is_riding)
SELECT id, 40.3616, 49.8445, 'Bulvarda rahat gəzinti 🌊', 'community', false FROM users WHERE email = 'orxan@test.com';

-- Demo Friendships (accepted)
INSERT INTO friendships (user_id, friend_id, status)
SELECT u1.id, u2.id, 'accepted' FROM users u1, users u2 WHERE u1.email = 'ali@test.com' AND u2.email = 'tural@test.com';
INSERT INTO friendships (user_id, friend_id, status)
SELECT u1.id, u2.id, 'accepted' FROM users u1, users u2 WHERE u1.email = 'ali@test.com' AND u2.email = 'kamran@test.com';
INSERT INTO friendships (user_id, friend_id, status)
SELECT u1.id, u2.id, 'accepted' FROM users u1, users u2 WHERE u1.email = 'tural@test.com' AND u2.email = 'nicat@test.com';
INSERT INTO friendships (user_id, friend_id, status)
SELECT u1.id, u2.id, 'accepted' FROM users u1, users u2 WHERE u1.email = 'kamran@test.com' AND u2.email = 'orxan@test.com';

-- Demo Event Participants
INSERT INTO event_participants (event_id, user_id)
SELECT e.id, u.id FROM events e, users u WHERE e.title = 'Mərdəkana axşam sürüşü' AND u.email IN ('ali@test.com', 'tural@test.com', 'nicat@test.com');
INSERT INTO event_participants (event_id, user_id)
SELECT e.id, u.id FROM events e, users u WHERE e.title = 'Şamaxı serpantini' AND u.email IN ('kamran@test.com', 'orxan@test.com');
