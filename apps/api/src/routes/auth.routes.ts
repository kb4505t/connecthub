import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authRateLimiter } from "../middlewares/rateLimiter";
import { asyncHandler } from "../middlewares/errorHandler";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@connecthub/shared-types";

export const authRouter = Router();

// Public endpoints — the stricter authRateLimiter guards against credential
// stuffing / brute force / registration spam.
authRouter.post("/register", authRateLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.post("/verify-email", validate({ body: verifyEmailSchema }), asyncHandler(authController.verifyEmail));
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword)
);
authRouter.post("/reset-password", validate({ body: resetPasswordSchema }), asyncHandler(authController.resetPassword));

// Protected endpoints — require a valid access token
authRouter.get("/me", authenticate, asyncHandler(authController.me));
authRouter.post("/resend-verification", authenticate, asyncHandler(authController.resendVerification));
authRouter.post("/logout-all", authenticate, asyncHandler(authController.logoutAll));
