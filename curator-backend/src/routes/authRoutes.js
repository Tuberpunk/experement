const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register); // [2]
router.post('/login', authController.login); // [35]

module.exports = router;