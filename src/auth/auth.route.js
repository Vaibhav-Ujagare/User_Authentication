import { Router } from "express";
import {
  loginUser,
  registerUser,
  verifyEmail,
} from "../auth/auth.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

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
export default router;
