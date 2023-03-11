import { NOT_AUTHORIZED_ERROR } from "../../util/constants";
import { Prisma } from "@prisma/client";
import { CONVERSATION_CREATED } from "../../pubsub/constants";
import { withFilter } from "graphql-subscriptions";
import { GraphQLError } from "graphql/error";
import { GraphQLContext, Resolvers } from "../types/general";
import {
  ConversationCreatedSubscriptionPayload,
  ConversationPopulated,
} from "../types/conversations";

const resolvers: Resolvers = {
  Query: {
    conversations: async (
      _,
      __,
      context
    ): Promise<ConversationPopulated[] | undefined> => {
      const { prisma, session } = context;

      if (!session?.user) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const allConversations = await prisma.conversation.findMany({
          /*
           * query below not working =(
           */
          // where: {
          //   participants: {
          //     some: {
          //       userId: {
          //         equals: userId,
          //       },
          //     },
          //   },
          // },
          include: conversationPopulated,
        });

        const conversations = allConversations.filter((conversation) =>
          conversation.participants.find(
            (participant) => participant.userId === userId
          )
        );

        return conversations;
      } catch (error) {
        console.log("conversations error: ", error);
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
      }
    },
  },
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: string[] },
      context
    ): Promise<{ conversationId: string } | undefined> => {
      const { prisma, session, pubsub } = context;
      const { participantIds } = args;

      if (!session?.user) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
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

        // emit pubsub event
        pubsub.publish(CONVERSATION_CREATED, {
          conversationCreated: conversation,
        } as ConversationCreatedSubscriptionPayload);

        return {
          conversationId: conversation.id,
        };
      } catch (error) {
        console.log("createConversation error: ", error);
        if (error instanceof Error) {
          throw new GraphQLError("Error creating conversation");
        }
      }
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (_, __, context) => {
          const { pubsub } = context;

          return pubsub.asyncIterator([CONVERSATION_CREATED]);
        },
        (
          payload: ConversationCreatedSubscriptionPayload,
          _,
          context: GraphQLContext
        ) => {
          const { session } = context;
          const {
            conversationCreated: { participants },
          } = payload;

          const userIsParticipant = !!participants.find(
            (participant) => participant.userId === session?.user?.id
          );

          return userIsParticipant;
        }
      ),
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
