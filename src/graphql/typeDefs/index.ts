import { IExecutableSchemaDefinition } from "@graphql-tools/schema";
import userTypeDefs from "./user";
import conversationTypeDefs from "./conversation";
import messagesTypeDefs from "./messages";

const typeDefs: IExecutableSchemaDefinition["typeDefs"] = [
  userTypeDefs,
  conversationTypeDefs,
  messagesTypeDefs,
];

export default typeDefs;
