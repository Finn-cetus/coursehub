const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Course = require('../models/Course');

// @route   GET api/courses
// @desc    Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find().sort({ createdAt: -1 }); // Mới nhất lên đầu
        res.json(courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/courses
// @desc    Add a new course
// @access  Private
router.post('/', auth, async (req, res) => {
    const { title, link, category, description } = req.body;

    try {
        const newCourse = new Course({
            title,
            link,
            category,
            description,
            author: req.user.id,
            authorName: req.user.username
        });

        const course = await newCourse.save();
        res.json(course);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;