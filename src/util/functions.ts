import { ParticipantPopulated } from "../graphql/types/conversations";

export function userIsConversationParticipant(
  participants: ParticipantPopulated[],
  userId: ParticipantPopulated["id"]
): boolean {
  return !!participants.find((participant) => participant.userId === userId);
}
