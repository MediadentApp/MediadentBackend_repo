const express = require('express');
const authController = require('../controllers/authController');
const academicProgramsRoutes = require('./academicProgramsRoutes');

const router = express.Router();

router.post('/emailReg', authController.emailReg);
router.post('/emailVerify', authController.emailVerify);
router.post('/signup', authController.signup);
router.put('/signupdetails', authController.signupDetails);
router.put('/signupinterest', authController.signupInterests);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
// router.post('/logout', authController.logout); //!use post
router.get('/info', authController.fetchUser);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch('/updatePassword', authController.protect, authController.updatePassword);

//? User's academic/education details routes
router.use('/academicprograms', academicProgramsRoutes);

module.exports = router;
