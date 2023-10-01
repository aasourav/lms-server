import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel from "../models/user.model";
import jwt, { Secret } from "jsonwebtoken";
import ErrorHandler from "../utils/ErrorHandler";
import sendMail from "../utils/sendmail";
dotenv.config();

//registration user
interface IActivationToken {
  token: string;
  activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};

interface IRegistration {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}
export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, password } = req.body as IRegistration;
      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exist", 400));
      }
      const user: IRegistration = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;

      const data = {
        username: user.name,
        activationCode,
      };

      await sendMail({
        email: user.email,
        subject: "Activation code",
        template: "activation-email.ejs",
        data,
      });

      res.status(200).json({
        success: true,
        message: "Please check your email for active your email",
        activationToken: activationToken.token,
      });
    } catch (error: any) {
      next(new ErrorHandler(error.message, 404));
    }
  }
);

interface IActivationRequest {
  activationToken: string;
  activationCode: string;
}
export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activationCode, activationToken } =
        req.body as IActivationRequest;
      const newUser: any = jwt.verify(
        activationToken,
        process.env.ACTIVATION_SECRET as string
      );
      if (newUser.activationCode !== activationCode) {
        return next(new ErrorHandler("Invalid Activation Code", 400));
      }

      const { name, email, password } = newUser.user;
      const isExistUser = await userModel.findOne({ email });
      if (isExistUser) {
        return new ErrorHandler("User already exist.", 400);
      }
      const user = await userModel.create({
        name,
        email,
        password,
      });
      res.status(200).json({ success: true });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);
