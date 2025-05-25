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

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullname } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exist");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path || "";

  const avatar = await uploadOnCloudinary(avatarLocalPath);

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

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(401, "Invalid Token");
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(401, "Verification Token Expired");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();
  return res
    .status(201)
    .json(new ApiResponse(200, user, "User Verified Successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "Invalid Username of Password");
  }
  const isMatch = await user.isPasswordCorrect(password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid Username of Password");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(401, "User Not Verified");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    maxAge: 24 * 60 * 60 * 1000,
  };
  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        accessToken,
        refreshToken,
      },
      "User Logged In Successfully"
    )
  );
});
