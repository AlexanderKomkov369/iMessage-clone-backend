import UserTypeDefs from "./user";
import { IExecutableSchemaDefinition } from "@graphql-tools/schema";

const typeDefs: IExecutableSchemaDefinition["typeDefs"] = [UserTypeDefs];

export default typeDefs;
