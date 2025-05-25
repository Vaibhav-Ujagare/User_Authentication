import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import crypto from "crypto";
import {
  sendMail,
  emailVerificationMailGenContent,
  resendEmailVerificationMailGenContent,
  resetPasswordVerificationMailGenContent,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullname } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exist");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path || "";

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  console.log(avatar);

  if (!avatar) {
    throw new ApiError(401, "Error while uploading file");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullname,
    avatar: avatar,
    emailVerificationExpiry: Date.now() + 20 * 60 * 1000,
  });

  if (!user) {
    throw new ApiError(401, "User not registered");
  }

  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = emailVerificationToken;
  await user.save();

  sendMail({
    email: email,
    subject: "Verify your email",
    mailGenContent: emailVerificationMailGenContent(
      username,
      `${process.env.BASE_URL}/api/v1/users/verify/${emailVerificationToken}`
    ),
  });

  return res
    .status(201)
    .json(new ApiResponse(200, user, "User Created Successfully"));
});
