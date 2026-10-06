import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDereferencedOpenAPIDocument, openAPISchemaToZod } from "@adaptate/utils/ssr";
import type { ZodType } from "zod";

export type ProposalesSchemas = {
  proposal: ZodType;
  company: ZodType;
  createRfpRequest: ZodType;
  createProposalRequest: ZodType;
  proposalMutationResponse: ZodType;
  createRfpResponse: ZodType;
  proposalSearchResult: ZodType;
};

const componentNames = {
  proposal: "Proposal",
  company: "Company",
  createRfpRequest: "CreateRfpRequest",
  createProposalRequest: "CreateProposalRequest",
  proposalMutationResponse: "ProposalMutationResponse",
  createRfpResponse: "CreateRfpResponse",
  proposalSearchResult: "ProposalSearchResult",
} as const;

let cachedSchemas: Promise<ProposalesSchemas> | undefined;

export function proposalesSchemas(): Promise<ProposalesSchemas> {
  cachedSchemas ??= loadProposalesSchemas();
  return cachedSchemas;
}

async function loadProposalesSchemas(): Promise<ProposalesSchemas> {
  const specPath = path.resolve(process.cwd(), "../.firecrawl/openapi.json");
  const callSiteURL = pathToFileURL(path.join(process.cwd(), "package.json")).href;
  const relativePathToSpecFile = path.relative(process.cwd(), specPath);
  const document = await getDereferencedOpenAPIDocument({
    location: "filesystem",
    callSiteURL,
    relativePathToSpecFile,
  });
  const componentSchemas = document.components?.schemas;
  if (componentSchemas === undefined) {
    throw new Error("Dereferenced OpenAPI document has no component schemas.");
  }

  return {
    proposal: openAPISchemaToZod(requiredComponent(componentSchemas, componentNames.proposal)),
    company: openAPISchemaToZod(requiredComponent(componentSchemas, componentNames.company)),
    createRfpRequest: openAPISchemaToZod(
      requiredComponent(componentSchemas, componentNames.createRfpRequest),
    ),
    createProposalRequest: openAPISchemaToZod(
      requiredComponent(componentSchemas, componentNames.createProposalRequest),
    ),
    proposalMutationResponse: openAPISchemaToZod(
      requiredComponent(componentSchemas, componentNames.proposalMutationResponse),
    ),
    createRfpResponse: openAPISchemaToZod(
      requiredComponent(componentSchemas, componentNames.createRfpResponse),
    ),
    proposalSearchResult: openAPISchemaToZod(
      requiredComponent(componentSchemas, componentNames.proposalSearchResult),
    ),
  };
}

function requiredComponent(componentSchemas: Record<string, unknown>, name: string): unknown {
  const schema = componentSchemas[name];
  if (schema === undefined) {
    throw new Error(`OpenAPI component schema ${name} is missing.`);
  }
  return schema;
}
