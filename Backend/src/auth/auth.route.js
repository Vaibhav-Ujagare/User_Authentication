import { Router } from "express";
import {
  loginUser,
  registerUser,
  verifyEmail,
  logoutUser,
  refreshAccessToken,
  forgotPasswordRequest,
  resetPasswordController,
  getCurrentUser,
  resendVerificationEmail,
} from "../auth/auth.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),

  registerUser
);

router.get("/verify/:token", verifyEmail);

router.route("/login").post(loginUser);

router.post("/logout", isLoggedIn, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.post("/verify/resend", resendVerificationEmail);

router.post("/logout", isLoggedIn, logoutUser);

router.post("/forgot-password", forgotPasswordRequest);

router.post("/reset-password/:hashedToken", resetPasswordController);

router.get("/profile", isLoggedIn, getCurrentUser);

export default router;
