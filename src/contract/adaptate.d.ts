declare module "@adaptate/utils/ssr" {
  import type { ZodType } from "zod";

  export function getDereferencedOpenAPIDocument(params: {
    location: "filesystem" | "web";
    callSiteURL?: string;
    relativePathToSpecFile?: string;
    webURL?: string;
  }): Promise<{
    components?: {
      schemas?: Record<string, unknown>;
    };
  }>;

  export function openAPISchemaToZod(schema: unknown): ZodType;
}

declare module "@adaptate/core" {
  import type { ZodType } from "zod";

  export function transformSchema(schema: ZodType, config: Record<string, unknown>): ZodType;

  export function makeConditionalSchemaTransformer(data: unknown): (
    schema: ZodType,
    config: Record<string, unknown>,
  ) => {
    run: () => unknown;
    schema: ZodType;
    staticConfig: Record<string, unknown>;
  };
}
