import express from 'express';

import * as authController from '@src/controllers/authController';
import {
  saveAcademicDetails,
  updateAcademicDetails,
  getAcademicDetails,
} from '@src/controllers/userController';

const router = express.Router();

// Authentication routes
router.post('/emailReg', authController.emailReg);
router.post('/emailVerify', authController.emailVerify);
router.post('/signup', authController.signup);
router.put('/signupdetails', authController.signupDetails);
router.put('/signupinterest', authController.signupInterests);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
// router.post('/logout', authController.logout); // ! Use POST instead of GET for logout
router.get('/info', authController.protect, authController.fetchUser);

// Password-related routes
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch(
  '/updatePassword',
  authController.protect,
  authController.updatePassword,
);

// User academic/education details routes
router.post(
  '/useracademicdetails',
  authController.protect,
  saveAcademicDetails,
);
router.put('/useracademicdetails', updateAcademicDetails);
router.get('/useracademicdetails', getAcademicDetails);

export default router;
