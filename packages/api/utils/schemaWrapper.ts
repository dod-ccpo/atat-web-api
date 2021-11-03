export function wrapSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const wrappedSchema = {
    type: "object",
    required: ["body"],
    properties: {
      body: schema,
    },
  };
  return wrappedSchema;
}
