import { IUser } from '#src/types/model.js';

export interface EmailRegBody {
  email: string;
}

export interface EmailVerifyBody {
  otp: string;
  email: string;
}

export interface SignupBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
  passwordChangedAt?: Date;
}

export interface SignupDetailsBody {
  userType: string;
  gender: string;
  institute: string;
  currentCity: string;
}

export interface SignupInterestsBody {
  interests: string[];
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface FetchUserBody {
  user: IUser;
}

export interface ProtectBody {
  user?: IUser;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  password: string;
  passwordConfirm: string;
}

export interface UpdatePasswordBody {
  currentPassword: string;
  updatedPassword: string;
  updatedPasswordConfirm: string;
}
