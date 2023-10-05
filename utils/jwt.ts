import { IUser } from "../models/user.model";
import { Response } from "express";
import { redis } from "./redis";
import jwt, { Secret } from "jsonwebtoken";

require("dotenv").config();
interface ITokenOption {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite?: "lax" | "strict";
  secure?: boolean;
}

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = jwt.sign(
    { id: user._id },
    (process.env.ACCESS_TOKEN as Secret) || ""
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    (process.env.REFRESH_TOKEN as Secret) || ""
  );

  //upload session to redis
  redis.set(user._id, JSON.stringify(user as any));

  // parse environment variable integrate with fallback value
  const accessTokenExpire = parseInt(
    process.env.ACCESS_TOKEN_EXPIRE || "300",
    10
  );

  const refreshTokenExpire = parseInt(
    process.env.REFRESH_TOKEN_EXPIRE || "1200",
    10
  );

  //options for cookies
  const accessTokenOptions: ITokenOption = {
    expires: new Date(Date.now() + accessTokenExpire * 10000),
    maxAge: accessTokenExpire * 10000,
    httpOnly: true,
    sameSite: "lax",
  };

  const refreshTokenOptions: ITokenOption = {
    expires: new Date(Date.now() + refreshTokenExpire * 100000),
    maxAge: refreshTokenExpire * 100000,
    httpOnly: true,
    sameSite: "lax",
  };

  //only set secure to true in production
  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};