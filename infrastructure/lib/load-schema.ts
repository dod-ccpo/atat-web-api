import * as fs from "fs";
import { load } from "js-yaml";
import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";
import * as utils from "./util";
export function convertSchema(): void {
  try {
    const schema = utils.packageRoot() + "/../atat_provisioning_wizard_api.yaml";
    const fileContents = fs.readFileSync(schema, { encoding: "utf8" });
    const data = load(fileContents, {
      onWarning: console.log,
    });
    // console.log(data);
    // data is now loaded, we can now convert it to json schema with toJsonSchema
    const convertedSchema = toJsonSchema(data as any);
    const convertedSchemaDestination = utils.packageRoot() + "/api/models/schema.json";
    fs.writeFileSync(convertedSchemaDestination, JSON.stringify(convertedSchema));
  } catch (e) {
    console.log(e);
  }
}
