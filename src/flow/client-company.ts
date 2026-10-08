import { z } from "zod";

export const companyRecordSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type ClientCompany = z.infer<typeof companyRecordSchema>;

export const clientCompanyFields = ["id", "name"] as const satisfies readonly (keyof ClientCompany)[];

export function companyForClient(company: ClientCompany): ClientCompany {
  const idField = clientCompanyFields[0];
  const nameField = clientCompanyFields[1];
  return companyRecordSchema.parse({
    [idField]: company[idField],
    [nameField]: company[nameField],
  });
}

export function companiesForClient(companies: readonly ClientCompany[]): ClientCompany[] {
  return companies.map(companyForClient);
}
