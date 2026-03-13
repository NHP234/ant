-- Admin user (password: admin123, BCrypt encoded)
INSERT INTO users (username, password_hash, email, full_name, role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin@library.com', 'System Admin', 'ADMIN');

-- Default categories
INSERT INTO categories (name, description) VALUES
    ('Công nghệ thông tin', 'Sách về lập trình, mạng, cơ sở dữ liệu, AI'),
    ('Khoa học', 'Sách khoa học tự nhiên và ứng dụng'),
    ('Toán học', 'Sách về toán cao cấp, xác suất thống kê, đại số'),
    ('Vật lý', 'Sách về cơ học, điện từ, vật lý hiện đại'),
    ('Văn học', 'Tiểu thuyết, truyện ngắn, thơ'),
    ('Kinh tế', 'Sách về kinh tế, quản trị, tài chính'),
    ('Ngoại ngữ', 'Sách học tiếng Anh, tiếng Nhật, tiếng Trung'),
    ('Lịch sử', 'Sách về lịch sử Việt Nam và thế giới');

-- Sample books
INSERT INTO books (title, author, isbn, publisher, publish_year, description, quantity, available_quantity) VALUES
    ('Clean Code', 'Robert C. Martin', '978-0132350884', 'Prentice Hall', 2008,
     'Cuốn sách kinh điển về cách viết code sạch, dễ đọc, dễ bảo trì. Bao gồm các nguyên tắc, patterns và practices giúp lập trình viên viết code chất lượng cao.',
     3, 3),
    ('Design Patterns', 'Gang of Four', '978-0201633610', 'Addison-Wesley', 1994,
     'Sách giới thiệu 23 design patterns cơ bản trong lập trình hướng đối tượng. Được coi là cuốn sách gối đầu giường của mọi software engineer.',
     2, 2),
    ('Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 'MIT Press', 2009,
     'Giáo trình thuật toán toàn diện nhất, bao gồm sorting, graph algorithms, dynamic programming, và nhiều chủ đề nâng cao.',
     4, 4),
    ('Spring in Action', 'Craig Walls', '978-1617297571', 'Manning', 2022,
     'Hướng dẫn thực hành Spring Framework và Spring Boot, từ cơ bản đến nâng cao. Bao gồm Spring MVC, Spring Security, Spring Data.',
     2, 2),
    ('Deep Learning', 'Ian Goodfellow', '978-0262035613', 'MIT Press', 2016,
     'Giáo trình deep learning từ cơ bản đến nâng cao. Bao gồm neural networks, CNNs, RNNs, GANs, và các kỹ thuật optimization.',
     2, 2);
