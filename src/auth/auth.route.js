import { Router } from "express";
import {
  loginUser,
  registerUser,
  verifyEmail,
  logoutUser,
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

export default router;
