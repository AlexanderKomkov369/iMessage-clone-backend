import { PrismaClient } from "@prisma/client";
import { Session } from "next-auth";
import { IExecutableSchemaDefinition } from "@graphql-tools/schema/typings";
import { RequireAtLeastOne } from "../../util/helpers";
import { Context } from "graphql-ws/lib/server";
import { PubSub } from "graphql-subscriptions";

export interface GraphQLContext {
  session: Session | null;
  prisma: PrismaClient;
  pubsub: PubSub;
}

export interface SubscriptionContext extends Context {
  connectionParams: {
    session?: Session;
  };
}

export type SchemaKeys = "Query" | "Mutation" | "Subscription";

export type Resolvers = RequireAtLeastOne<
  Partial<
    Record<SchemaKeys, IExecutableSchemaDefinition<GraphQLContext>["resolvers"]>
  >
>;
