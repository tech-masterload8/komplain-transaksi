export type AuthIngestReason =
  | "ok"
  | "has-session"
  | "no-header"
  | "unparsed"
  | "no-key"
  | "decrypt"
  | "no-kode"
  | "token-expired";
