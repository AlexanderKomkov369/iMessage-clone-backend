import {
  CONVERSATION_CREATING_ERROR,
  CONVERSATION_DELETE_ERROR,
  CONVERSATION_MARK_AS_READ_ERROR,
  NOT_AUTHORIZED_ERROR,
  PARTICIPANT_ENTITY_NOT_FOUND,
} from "../../util/constants";
import { Prisma } from "@prisma/client";
import {
  CONVERSATION_CREATED,
  CONVERSATION_DELETED,
  CONVERSATION_UPDATED,
} from "../../pubsub/constants";
import { withFilter } from "graphql-subscriptions";
import { GraphQLError } from "graphql/error";
import { GraphQLContext, Resolvers } from "../types/general";
import {
  ConversationCreatedSubscriptionPayload,
  ConversationDeletedSubscriptionPayload,
  ConversationPopulated,
  ConversationUpdatedSubscriptionPayload,
} from "../types/conversations";
import { userIsConversationParticipant } from "../../util/functions";

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
          throw new GraphQLError(CONVERSATION_CREATING_ERROR);
        }
      }
    },
    markConversationAsRead: async (
      _: any,
      args: { userId: string; conversationId: string },
      context
    ): Promise<boolean> => {
      const { session, prisma } = context;
      const { userId, conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      try {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId,
            userId,
          },
        });

        if (!participant) {
          throw new GraphQLError(PARTICIPANT_ENTITY_NOT_FOUND);
        }

        await prisma.conversationParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            hasSeenLatestMessage: true,
          },
        });
      } catch (error) {
        console.log("markConversationAsRead error: ", error);
        if (error instanceof Error) {
          throw new GraphQLError(CONVERSATION_MARK_AS_READ_ERROR);
        }
      }

      return true;
    },
    deleteConversation: async (
      _: any,
      args: { conversationId: string },
      context
    ): Promise<boolean> => {
      const { session, prisma, pubsub } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError(NOT_AUTHORIZED_ERROR);
      }

      try {
        const [deletedConversation] = await prisma.$transaction([
          prisma.conversation.delete({
            where: {
              id: conversationId,
            },
            include: conversationPopulated,
          }),
          prisma.conversationParticipant.deleteMany({
            where: {
              conversationId,
            },
          }),
          prisma.message.deleteMany({
            where: {
              conversationId,
            },
          }),
        ]);

        pubsub.publish(CONVERSATION_DELETED, {
          conversationDeleted: deletedConversation,
        });
      } catch (error) {
        console.log("deleteConversation error: ", error);
        if (error instanceof Error) {
          throw new GraphQLError(CONVERSATION_DELETE_ERROR);
        }
      }

      return true;
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

          if (!session?.user) {
            throw new GraphQLError(NOT_AUTHORIZED_ERROR);
          }

          const userIsParticipant = userIsConversationParticipant(
            participants,
            session?.user?.id
          );

          return userIsParticipant;
        }
      ),
    },
    conversationUpdated: {
      subscribe: withFilter(
        (_, __, context) => {
          const { pubsub } = context;

          return pubsub.asyncIterator([CONVERSATION_UPDATED]);
        },
        (
          payload: ConversationUpdatedSubscriptionPayload,
          _,
          context: GraphQLContext
        ) => {
          const { session } = context;

          if (!session?.user) {
            throw new GraphQLError(NOT_AUTHORIZED_ERROR);
          }

          const { id: userId } = session.user;
          const {
            conversationUpdated: {
              conversation: { participants },
            },
          } = payload;

          return userIsConversationParticipant(participants, userId);
        }
      ),
    },
    conversationDeleted: {
      subscribe: withFilter(
        (_, __, context) => {
          const { pubsub } = context;

          return pubsub.asyncIterator([CONVERSATION_DELETED]);
        },
        (
          payload: ConversationDeletedSubscriptionPayload,
          _,
          context: GraphQLContext
        ) => {
          const { session } = context;

          if (!session?.user) {
            throw new GraphQLError(NOT_AUTHORIZED_ERROR);
          }

          const { id: userId } = session.user;
          const {
            conversationDeleted: { participants },
          } = payload;

          return userIsConversationParticipant(participants, userId);
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
