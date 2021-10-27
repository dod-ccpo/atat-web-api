import * as fs from "fs";
import * as yaml from "js-yaml";
import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";
import * as utils from "./util";
import $RefParser from "@apidevtools/json-schema-ref-parser";

export async function convertSchema(): Promise<void> {
  try {
    const parser = new $RefParser();
    const schema = utils.packageRoot() + "/../atat_provisioning_wizard_api.yaml";
    const fileContents = fs.readFileSync(schema, { encoding: "utf8" });
    const data = yaml.load(fileContents, {
      onWarning: console.log,
    });
    // data is now loaded, we can now convert it to json schema with toJsonSchema
    const convertedSchema = toJsonSchema(data as any);
    // now we need to resolve any $refs so our middleware schema validator can properly parse the schema
    const resolvedSchema = await parser.dereference(convertedSchema);
    // due to a typescript quirk, we can't directly reference the resolvedSchema.components.schemas, this is the work around
    const schemaToExport = resolvedSchema as any;
    const exportedSchemaDestination = utils.packageRoot() + "/api/models/schema.json";
    // create a schema.json file, only containing the schemas
    fs.writeFileSync(exportedSchemaDestination, JSON.stringify(schemaToExport.components.schemas));
  } catch (e) {
    console.log(e);
  }
}
