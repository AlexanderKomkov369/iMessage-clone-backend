import { IExecutableSchemaDefinition } from "@graphql-tools/schema";
import userResolvers from "./user";
import conversationResolvers from "./conversation";
import messageResolvers from "./message";
import merge from "lodash.merge";
import scalarsResolvers from "./scalars";

const resolvers: IExecutableSchemaDefinition["resolvers"] = merge(
  {},
  userResolvers,
  conversationResolvers,
  messageResolvers,
  scalarsResolvers
);

export default resolvers;
