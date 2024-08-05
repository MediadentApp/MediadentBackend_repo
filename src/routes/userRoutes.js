const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// router.post('/signup', authController.signup);
router.post('/emailReg', authController.emailReg);
router.post('/emailVerify', authController.emailVerify);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
// router.post('/logout', authController.logout); //!use post
router.get('/info', authController.fetchUser);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch('/updatePassword', authController.protect, authController.updatePassword);

router.post('/userDetails',)

module.exports = router;
