import { RequireAtLeastOne } from "../../../util/types";

export type CreateUsernameResponse = RequireAtLeastOne<{
  success: Boolean;
  error: String;
}>;
