import {
  emailReg,
  emailVerify,
  forgotPassword,
  login,
  logout,
  protect,
  resetPassword,
  signup,
  signupDetails,
  signupInterests,
  updatePassword,
} from '#src/controllers/authController.js';
import { getAcademicDetails, saveAcademicDetails, updateAcademicDetails } from '#src/controllers/userController.js';
import express from 'express';

const router = express.Router();

// Authentication routes
router.post('/emailReg', emailReg);
router.post('/emailVerify', emailVerify);
router.post('/signup', signup);
router.put('/signupdetails', signupDetails);
router.put('/signupinterest', signupInterests);
router.post('/login', login);
router.post('/logout', logout);

// Password-related routes
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);
router.patch('/updatePassword', protect, updatePassword);

// User academic/education details routes
router.post('/useracademicdetails', protect, saveAcademicDetails);
router.put('/useracademicdetails', updateAcademicDetails);
router.get('/useracademicdetails', getAcademicDetails);

export { router as userAuthRoutes };
