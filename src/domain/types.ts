export type RequirementType = "UR" | "SR" | "FEATURE";

export type RequirementPriority = "R" | "O";

/** Editable fields shared between add and edit flows */
export type ItemEditFields = {
  content: string;       // Description
  name?: string;         // SR display name
  priority?: RequirementPriority;
  protocol?: string;     // Communication protocol (e.g. REST, gRPC)
  dataFormat?: string;   // Data format (e.g. JSON, Protobuf)
  payload?: string;      // Payload schema or description
  tags?: string[];        // Searchable labels shared by UR/SR/Feature
};

export type RequirementItem = {
  id: string;
  type: RequirementType;
  index: number;
  content: string;
  name?: string;
  priority?: RequirementPriority;
  protocol?: string;
  dataFormat?: string;
  payload?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type RequirementLinkType = "UR_TO_SR" | "SR_TO_FEATURE";

export type RequirementLink = {
  id: string;
  type: RequirementLinkType;
  sourceId: string;
  targetId: string;
  createdAt: string;
};

export type ProjectData = {
  project: {
    id: string;
    name: string;
    version: string;
    updatedAt: string;
  };
  items: RequirementItem[];
  links: RequirementLink[];
};

export type TraceabilityWarningCode =
  | "UR_WITHOUT_SR"
  | "SR_WITHOUT_UR"
  | "SR_WITHOUT_FEATURE"
  | "FEATURE_WITHOUT_SR";

export type TraceabilityWarning = {
  code: TraceabilityWarningCode;
  itemId: string;
  label: string;
};

export type ValidationError =
  | { kind: "DUPLICATE_LINK"; linkId: string }
  | { kind: "INVALID_LINK_TYPES"; linkId: string }
  | { kind: "DANGLING_LINK"; linkId: string };
