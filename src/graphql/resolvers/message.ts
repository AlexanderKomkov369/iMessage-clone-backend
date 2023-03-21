import { GraphQLError } from "graphql/error";
import {
  CONVERSATION_NOT_FOUND,
  NOT_AUTHORIZED_ERROR,
} from "../../util/constants";
import { Prisma } from "@prisma/client";
import { MESSAGE_SENT } from "../../pubsub/constants";
import { GraphQLContext, Resolvers } from "../types/general";
import {
  MessagePopulated,
  MessageSentSubscriptionPayload,
  SendGetMessagesArguments,
  SendMessageArguments,
} from "../types/messages";
import { withFilter } from "graphql-subscriptions";
import { conversationPopulated } from "./conversation";
import { userIsConversationParticipant } from "../../util/functions";
import { instanceOf } from "graphql/jsutils/instanceOf";

export const resolvers: Resolvers = {
  Query: {
    messages: async (
      _: any,
      args: SendGetMessagesArguments,
      context
    ): Promise<MessagePopulated[]> => {
      const { session, prisma } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      const {
        user: { id: userId },
      } = session;

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: userId,
        },
        include: conversationPopulated,
      });

      if (!conversation) {
        throw new GraphQLError(CONVERSATION_NOT_FOUND);
      }

      const isAllowedToView = userIsConversationParticipant(
        conversation.participants,
        userId
      );

      if (!isAllowedToView) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      try {
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: messagePopulated,
          orderBy: {
            createdAt: "desc",
          },
        });

        return messages;
      } catch (error) {
        console.log("Messages error: ", error);
        const errorMessage = error instanceof Error ? error.message : "";
        throw new GraphQLError(errorMessage);
      }
    },
  },
  Mutation: {
    sendMessage: async (
      _: any,
      args: SendMessageArguments,
      context
    ): Promise<boolean> => {
      const { prisma, session, pubsub } = context;
      const { id: messageId, senderId, conversationId, body } = args;

      if (!session?.user) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      const { id: userId } = session.user;

      if (userId !== senderId) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      try {
        // create new message entity
        const newMessage = await prisma.message.create({
          data: {
            id: messageId,
            senderId,
            conversationId,
            body,
          },
          include: messagePopulated,
        });

        // update conversation entity
        const conversation = await prisma.conversation.update({
          where: {
            id: senderId,
          },
          data: {
            latestMessageId: newMessage.id,
            participants: {
              update: {
                where: {
                  id: senderId,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              updateMany: {
                where: {
                  NOT: {
                    id: senderId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
        });

        pubsub.publish(MESSAGE_SENT, { messageSent: newMessage });
        // pubsub.publish(CONVERSATION_UPDATED, {
        //   conversationUpdated: {
        //     conversation,
        //   },
        // });
      } catch (error) {
        console.log("sendMessage error: ", error);
        throw new GraphQLError("Error sending message");
      }

      return true;
    },
  },
  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (_, __, context: GraphQLContext) => {
          const { pubsub } = context;

          return pubsub.asyncIterator(["MESSAGE_SENT"]);
        },
        (
          payload: MessageSentSubscriptionPayload,
          args: SendGetMessagesArguments
        ) => {
          return payload.messageSent.conversationId === args.conversationId;
        }
      ),
    },
  },
};

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});

export default resolvers;
