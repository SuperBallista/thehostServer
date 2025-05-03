export interface GoogleUserInfo {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  userId: number;
  nickname: string;
  accessToken: string;
  refreshToken: string;
  isNew: boolean;
}

export interface changeNicknameInfo {
  nickname: string;
  isNew: boolean | undefined;
  token: string | undefined;
}
