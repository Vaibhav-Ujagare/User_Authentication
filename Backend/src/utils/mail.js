import Mailgen from "mailgen";
import nodemailer from "nodemailer";

export const sendMail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://mailgen.js/",
    },
  });

  const emailText = mailGenerator.generatePlaintext(options.mailGenContent);
  const emailHTML = mailGenerator.generate(options.mailGenContent);
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.MAILTRAP_SENDER_EMAIL, // sender address
    to: options.email, // list of receivers
    subject: options.subject, // Subject line
    text: emailText, // plain text body
    html: emailHTML,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Email Failed", error);
  }
};

export const emailVerificationMailGenContent = (name, verificationLink) => {
  return {
    body: {
      name: name,
      intro:
        "Welcome to Task Manager App! We're very excited to have you on board",
      action: {
        instruction: "To get started with our App, please click here",
        button: {
          color: "#22BC66",
          text: "Verify your account",
          link: verificationLink,
        },
      },
      outro: "Need Help, or have questions? just reply to this email",
    },
  };
};

export const resendEmailVerificationMailGenContent = (
  name,
  verificationLink
) => {
  return {
    body: {
      name: name,
      intro: "We got a request to resend the verification email",
      action: {
        instruction: "To get started with our App, please click here",
        button: {
          color: "#22BC66",
          text: "Verify your account",
          link: verificationLink,
        },
      },
      outro: "Need Help, or have questions? just reply to this email",
    },
  };
};

export const resetPasswordVerificationMailGenContent = (
  name,
  verificationLink
) => {
  return {
    body: {
      name: name,
      intro: "Click to reset your password",
      action: {
        instruction: "To get started with our App, please click here",
        button: {
          color: "#22BC66",
          text: "Reset Password",
          link: verificationLink,
        },
      },
      outro: "Need Help, or have questions? just reply to this email",
    },
  };
};
