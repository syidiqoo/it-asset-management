export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: FieldErrors;
};

export type AssetFormState = ActionState;

export type ImportRowError = {
  line: number;
  message: string;
};

export type AssetImportState = ActionState & {
  imported?: number;
  rowErrors?: ImportRowError[];
};
