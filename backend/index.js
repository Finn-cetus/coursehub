const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE GIẢ LẬP ---
const dbPath = path.join(__dirname, 'db.json');

let db = {
    users: {},
    courses: []
};

// Đọc dữ liệu từ db.json nếu file tồn tại
try {
    if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        db = JSON.parse(data);
    } else {
        // Nếu không có file, tạo dữ liệu mẫu
        db = {
            users: {
                'admin@coursehub.com': { id: 'admin01', username: 'Admin', email: 'admin@coursehub.com', password: 'adminpassword', role: 'ADMIN' },
                'subadmin@coursehub.com': { id: 'subadmin01', username: 'Phó Admin', email: 'subadmin@coursehub.com', password: 'subadminpassword', role: 'SUB_ADMIN' },
                'chung@coursehub.com': { id: 'user01', username: 'ChungHo', email: 'chung@coursehub.com', password: 'password123', role: 'MEMBER' }
            },
            courses: []
        };
        saveDbToFile(); // Lưu lại file
    }
} catch (err) {
    console.error("Lỗi khi đọc hoặc khởi tạo db.json:", err);
}


// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// Hàm trợ giúp để lưu dữ liệu vào file db.json
const saveDbToFile = () => {
    fs.writeFile(dbPath, JSON.stringify(db, null, 2), (err) => {
        if (err) console.error('Lỗi khi ghi file db.json:', err);
    });
};

// --- API ENDPOINTS ---

// [GET] Lấy danh sách tất cả người dùng
app.get('/api/users', (req, res) => {
    // Chuyển đổi object users thành mảng để dễ xử lý ở frontend
    const usersArray = Object.values(db.users);
    res.json(usersArray);
});

// [GET] Lấy danh sách tất cả khóa học
app.get('/api/courses', (req, res) => {
    res.json(db.courses);
});

// [POST] Đăng tải một khóa học mới
app.post('/api/courses', (req, res) => {
    const { title, link, category, ownerId, ownerUsername } = req.body;

    if (!title || !link || !category || !ownerId || !ownerUsername) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    }
    
    // Tìm vai trò của người đăng
    const ownerUser = Object.values(db.users).find(u => u.id === ownerId);
    const ownerRole = ownerUser ? ownerUser.role : 'MEMBER';


    const newCourse = {
        id: Date.now(),
        ownerId,
        ownerUsername,
        ownerRole, // Thêm vai trò của người đăng
        title,
        author: ownerUsername,
        views: 0,
        category,
        icon: "fas fa-book",
        link
    };

    db.courses.push(newCourse);
    saveDbToFile();
    res.status(201).json(newCourse);
});

// [DELETE] Xóa một khóa học
app.delete('/api/courses/:id', (req, res) => {
    const courseId = parseInt(req.params.id, 10);
    const { userId, userRole } = req.body;

    const courseIndex = db.courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
        return res.status(404).json({ message: 'Không tìm thấy khóa học.' });
    }

    const courseToDelete = db.courses[courseIndex];

    let canDelete = false;
    if (userRole === 'ADMIN') {
        canDelete = true;
    } else if (userRole === 'SUB_ADMIN' && courseToDelete.ownerRole !== 'ADMIN') {
        canDelete = true;
    } else if (courseToDelete.ownerId === userId) {
        canDelete = true;
    }

    if (canDelete) {
        db.courses.splice(courseIndex, 1);
        saveDbToFile();
        res.status(200).json({ message: 'Đã xóa khóa học thành công.' });
    } else {
        res.status(403).json({ message: 'Bạn không có quyền xóa khóa học này.' });
    }
});

// [PUT] Thăng cấp một thành viên lên Phó Admin
app.put('/api/users/:id/promote', (req, res) => {
    const { adminId, adminRole } = req.body;
    const targetUserId = req.params.id;

    if (adminRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    const targetUserEmail = Object.keys(db.users).find(key => db.users[key].id === targetUserId);
    if (!targetUserEmail) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    
    if (db.users[targetUserEmail].role === 'MEMBER') {
        db.users[targetUserEmail].role = 'SUB_ADMIN';
        saveDbToFile();
        res.status(200).json({ message: `Đã thăng cấp ${db.users[targetUserEmail].username} thành Phó Admin.` });
    } else {
        res.status(400).json({ message: 'Không thể thăng cấp cho người dùng này.' });
    }
});

// [POST] Đăng ký
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    }
    
    // Kiểm tra email hoặc username đã tồn tại chưa
    const emailExists = !!db.users[email];
    const usernameExists = Object.values(db.users).some(u => u.username.toLowerCase() === username.toLowerCase());

    if (emailExists) {
        return res.status(409).json({ message: 'Email này đã được sử dụng.' });
    }
    if (usernameExists) {
        return res.status(409).json({ message: 'Tên đăng nhập này đã tồn tại.' });
    }

    const newUser = {
        id: `user${Date.now()}`,
        username,
        email,
        password, // Lưu ý: Trong thực tế cần mã hóa mật khẩu!
        role: 'MEMBER'
    };

    db.users[email] = newUser;
    saveDbToFile();
    res.status(201).json({ message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
});


// [POST] Đăng nhập
app.post('/api/login', (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }

    // Tìm người dùng bằng email hoặc username
    let user = db.users[identifier]; // Tìm bằng email
    if (!user) {
        user = Object.values(db.users).find(u => u.username.toLowerCase() === identifier.toLowerCase()); // Tìm bằng username
    }

    if (user && user.password === password) {
        // Không gửi lại mật khẩu cho client
        const { password, ...userToSend } = user;
        res.json({ success: true, user: userToSend });
    } else {
        res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác.' });
    }
});


// --- KHỞI ĐỘNG SERVER ---
app.listen(PORT, () => {
    console.log(`Backend server đang chạy tại http://localhost:${PORT}`);
});