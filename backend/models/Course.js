const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true } // Lưu tên tác giả để truy vấn nhanh
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);