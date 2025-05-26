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

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    // set: {
    //   refreshToken: undefined,
    // },
    //better approach
    $unset: {
      refreshToken: 1,
    },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out!"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshAccessToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token Is Expired Or Used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  // const user = await User.findOne({ email });

  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  // user.emailVerificationToken = emailVerificationToken;

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        emailVerificationToken: emailVerificationToken,
        emailVerificationExpiry: Date.now() + 20 * 60 * 1000,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(401, "User not registered");
  }

  await user.save();

  sendMail({
    email: email,
    subject: "Verify your email",
    mailGenContent: resendEmailVerificationMailGenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/users/verify/${emailVerificationToken}`
    ),
  });

  return res
    .status(201)
    .json(new ApiResponse(200, user, "Resend Email Successfully"));
});

export const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const { hashedToken, tokenExpiry } = await user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordTokenExpiry = tokenExpiry;

  await user.save();
  sendMail({
    email: email,
    subject: "Reset Password",
    mailGenContent: resetPasswordVerificationMailGenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/users/reset-password/${hashedToken}`
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user }, "Reset Password link send on given email ")
    );
});

export const resetPasswordController = asyncHandler(async (req, res) => {
  const { hashedToken } = req.params;
  const { password, confPassword } = req.body;

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or has expired");
  }

  if (password !== confPassword) {
    throw new ApiError(400, "Password mismatch");
  }

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;
  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Password reset Successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  console.log("USER: ", req.user);

  return res
    .status(200)
    .setHeader("Authorization", `Bearer ${req.cookies.accessToken}`)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully"));
});
