export type RequireAtLeastOne<
  T extends {},
  Keys extends keyof T = keyof T
> = Omit<T, Keys> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
  }[Keys];
