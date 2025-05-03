// user/dto/user.dto.ts
export interface UserDto {
    id: number;
    oAuthProvider: string;
    oAuthId: string;
    nicknameHash: string;
    encryptedNickname: string;
    ivNickname: string;
    lastConnectedAt: Date;
  }

  export interface CreateUserInput {
    oauthId: string;
    provider: string;
    nicknameHash: string;
    encryptedNickname: string;
    iv: string;
  }
  