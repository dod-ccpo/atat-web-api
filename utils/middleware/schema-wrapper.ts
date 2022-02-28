export function wrapSchema(schema: Record<string, unknown>): Record<string, unknown> {
  return {
    type: "object",
    required: ["body"],
    properties: {
      body: schema,
    },
  };
}
