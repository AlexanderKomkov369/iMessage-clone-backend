import { PrismaClient } from "@prisma/client";
import { Session } from "next-auth";
import { IExecutableSchemaDefinition } from "@graphql-tools/schema/typings";
import { RequireAtLeastOne } from "../../util/helpers";

export interface GraphQLContext {
  session: Session | null;
  prisma: PrismaClient;
}

export type SchemaKeys = "Query" | "Mutation" | "Subscription";

export type Resolvers = RequireAtLeastOne<
  Partial<
    Record<SchemaKeys, IExecutableSchemaDefinition<GraphQLContext>["resolvers"]>
  >
>;
