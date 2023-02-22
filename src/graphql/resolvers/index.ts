import { IExecutableSchemaDefinition } from "@graphql-tools/schema";
import userResolvers from "./user";
import merge from "lodash.merge";

const resolvers: IExecutableSchemaDefinition["resolvers"] = merge(
  {},
  userResolvers
);

export default resolvers;
