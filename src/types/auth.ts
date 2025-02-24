export interface JwtPayload {
    user_id: number;
    name?: string;
    username?: string;
    role?: string;
    email: string;
    picture?: string;
    exp: number;
    iat: number;
  }
  
  export interface AuthUser {
    name: string;
    email: string;
    imageUrl: string;
  }