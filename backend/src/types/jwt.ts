export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}
