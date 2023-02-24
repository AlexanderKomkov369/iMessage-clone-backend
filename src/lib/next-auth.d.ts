import "next-auth";
import { ISODateString } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: User;
    expires: ISODateString;
  }

  interface User {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image: string;
  }
}
