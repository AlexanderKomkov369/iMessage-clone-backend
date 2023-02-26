import { RequireAtLeastOne } from "../../../util/helpers";

export type CreateUsernameResponse = RequireAtLeastOne<{
  success: Boolean;
  error: String;
}>;
