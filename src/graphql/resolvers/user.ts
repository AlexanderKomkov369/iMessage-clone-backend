import { GraphQLContext, Resolvers } from "../types/types";
import { CreateUsernameResponse } from "../types/user/types";
import { User } from "@prisma/client";
import { NOT_AUTHORIZED_ERROR } from "../../util/constants";
import { GraphQLError } from "graphql/error";

const resolvers: Resolvers = {
  Query: {
    searchUsers: async (
      _: any,
      args: { username: string },
      context
    ): Promise<User[] | undefined> => {
      const { username: searchedUsername } = args;
      const { prisma, session } = context;

      if (!session?.user) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      const {
        user: { username: myUsername },
      } = session;

      try {
        const users: User[] = await prisma.user.findMany({
          where: {
            username: {
              contains: searchedUsername,
              not: myUsername,
              mode: "insensitive",
            },
          },
        });

        return users;
      } catch (error) {
        console.log("searchUsers error: ", error);
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
      }
    },
  },
  Mutation: {
    createUsername: async (
      _: any,
      args: { username: string },
      context: GraphQLContext
    ): Promise<CreateUsernameResponse> => {
      const { username } = args;
      const { prisma, session } = context;

      if (!session?.user) {
        return {
          error: NOT_AUTHORIZED_ERROR,
        };
      }

      const { id: userId } = session.user;

      try {
        // Check that username is not taken

        const existingUser = await prisma.user.findUnique({
          where: {
            username: username,
          },
        });

        if (existingUser) {
          return {
            error: "Username already taken. Try another",
          };
        }

        // Update user
        await prisma.user.update({
          where: { id: userId },
          data: {
            username,
          },
        });

        return { success: true };
      } catch (error: any) {
        console.log("createUsername error: ", error);
        return {
          error: error.message,
        };
      }
    },
  },
};

export default resolvers;
