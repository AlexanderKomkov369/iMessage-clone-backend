import { Resolvers } from "../types/types";

const resolvers: Resolvers = {
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: string[] },
      context
    ) => {
      console.log("INSIDE CREATE CONVERSATION");
    },
  },
};

export default resolvers;
