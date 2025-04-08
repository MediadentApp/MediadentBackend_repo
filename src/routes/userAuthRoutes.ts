import {
  emailReg,
  emailVerify,
  fetchUser,
  forgotPassword,
  login,
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
// router.get('/logout', logout);
// router.post('/logout', logout); // ! Use POST instead of GET for logout
router.get('/info', protect, fetchUser);

// Password-related routes
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);
router.patch('/updatePassword', protect, updatePassword);

// User academic/education details routes
router.post('/useracademicdetails', protect, saveAcademicDetails);
router.put('/useracademicdetails', updateAcademicDetails);
router.get('/useracademicdetails', getAcademicDetails);

export { router as userAuthRoutes };
