import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: [
      process.env.BASE_URL,
      "http://127.0.0.1:5173",
      "http://localhost:5173/signup",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Set-Cookie", "*"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

import userRouter from "./auth/auth.route.js";

app.use("/api/v1/users", userRouter);
export default app;
