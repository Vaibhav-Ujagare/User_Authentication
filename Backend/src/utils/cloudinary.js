import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({
  path: "./.env",
});

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;
  const response = await cloudinary.uploader.upload(localFilePath, {
    resource_type: "auto",
  });

  fs.unlinkSync(localFilePath);
  console.log(`File is uploaded on cloudinary, ${response.url}`);
  return response;
};

export { uploadOnCloudinary };
