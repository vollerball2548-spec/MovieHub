import { loginUser, registerUser, revokeRefreshSession, rotateRefreshSession } from "./auth.service.js";
import { config } from "../../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "lax",
  path: "/api",
  maxAge: config.refreshTokenTtlMs,
};

export async function register(req, res) {
  res.status(201).json(await registerUser(req.body));
}

export async function login(req, res) {
  const result = await loginUser(req.body);
  res.cookie("moviehub_refresh", result.refreshToken, cookieOptions);
  res.json({ token: result.accessToken, username: result.username, email: result.email });
}

export async function refresh(req, res) {
  const result = await rotateRefreshSession(req.cookies?.moviehub_refresh);
  res.cookie("moviehub_refresh", result.refreshToken, cookieOptions);
  res.json({ token: result.accessToken });
}

export async function logout(req, res) {
  await revokeRefreshSession(req.cookies?.moviehub_refresh);
  res.clearCookie("moviehub_refresh", { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
}
