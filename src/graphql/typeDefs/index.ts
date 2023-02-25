import userTypeDefs from "./user";
import conversationTypeDefs from "./conversation";
import { IExecutableSchemaDefinition } from "@graphql-tools/schema";

const typeDefs: IExecutableSchemaDefinition["typeDefs"] = [
  userTypeDefs,
  conversationTypeDefs,
];

export default typeDefs;
