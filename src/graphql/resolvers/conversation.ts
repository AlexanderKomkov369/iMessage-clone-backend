import { Resolvers } from "../types/types";
import { ApolloError } from "apollo-server-core";
import { NOT_AUTHORIZED_ERROR } from "../../util/constants";
import { instanceOf } from "graphql/jsutils/instanceOf";
import { Prisma } from "@prisma/client";

const resolvers: Resolvers = {
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: string[] },
      context
    ): Promise<{ conversationId: string } | undefined> => {
      const { prisma, session } = context;
      const { participantIds } = args;

      if (!session?.user) {
        throw new ApolloError(NOT_AUTHORIZED_ERROR);
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId,
                })),
              },
            },
          },
          include: conversationPopulated,
        });

        return {
          conversationId: conversation.id,
        };
      } catch (error) {
        console.log("createConversation error: ", error);
        if (error instanceof Error) {
          throw new ApolloError("Error creating conversation");
        }
      }
    },
  },
};

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

export default resolvers;
