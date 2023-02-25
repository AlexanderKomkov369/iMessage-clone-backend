import { IExecutableSchemaDefinition } from "@graphql-tools/schema";
import userResolvers from "./user";
import conversationResolvers from "./conversation";
import merge from "lodash.merge";

const resolvers: IExecutableSchemaDefinition["resolvers"] = merge(
  {},
  userResolvers,
  conversationResolvers
);

export default resolvers;
