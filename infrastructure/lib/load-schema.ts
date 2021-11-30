import * as fs from "fs";
import * as yaml from "js-yaml";
import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";
import * as utils from "./util";
import $RefParser from "@apidevtools/json-schema-ref-parser";

export async function convertSchema(schemaName: string): Promise<void> {
  let schema = "";
  let exportedSchemaDestination = utils.packageRoot() + "/api/models/schema.json";
  try {
    const parser = new $RefParser();
    if (schemaName === "provisioning") {
      // Schema for old portfolioDraft API
      schema = utils.packageRoot() + "/../atat_provisioning_wizard_api.yaml";
      exportedSchemaDestination = utils.packageRoot() + "/api/models/schema.json";
    } else if (schemaName === "internal") {
      // Schema for new internal API
      schema = utils.packageRoot() + "/../atat_internal_api.yaml";
      exportedSchemaDestination = utils.packageRoot() + "/api/models/internalSchema.json";
    }
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
    // create a schema.json file, only containing the schemas
    fs.writeFileSync(exportedSchemaDestination, JSON.stringify(schemaToExport.components.schemas));
  } catch (e) {
    console.log(e);
  }
}
