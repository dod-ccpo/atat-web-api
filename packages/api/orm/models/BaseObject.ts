export interface BaseObject {
  updatedAt: string;
  createdAt: string;
  archivedAt: string;
  id: string;
}
/*
BaseObject:
      type: object
      properties:
        updatedAt:
          type: string
          format: "date-time"
          readOnly: true
        createdAt:
          type: string
          format: "date-time"
          readOnly: true
        archivedAt:
          type: string
          format: "date-time"
          readOnly: true
        id:
          type: string
          readOnly: true
      additionalProperties: false
      description: "Base model common to all first-class objects (those with IDs)"
      */
