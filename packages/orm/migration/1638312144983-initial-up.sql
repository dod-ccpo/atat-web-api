CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE provisioning_status_enum AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETE',
  'FAILED'
);
CREATE TYPE csp_enum AS ENUM ('CSP A', 'CSP B');
CREATE TYPE file_scan_status_enum AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE dod_component_enum AS ENUM (
  'AIR_FORCE',
  'ARMY',
  'MARINE_CORPS',
  'NAVY',
  'SPACE_FORCE',
  'COMBATANT_COMMAND',
  'JOINT_STAFF',
  'DAFA',
  'OSD_PSAS',
  'NSA'
);
CREATE TABLE portfolio (
  id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_portfolio" PRIMARY KEY,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
  "archivedAt" timestamp without time zone,
  "provisioningStatus" provisioning_status_enum DEFAULT 'PENDING'::provisioning_status_enum NOT NULL,
  administrators character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  contributors character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  "readOnlyOperators" character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  name character varying(100) NOT NULL,
  description character varying(300),
  owner character varying NOT NULL,
  csp csp_enum NOT NULL,
  "dodComponents" dod_component_enum [] NOT NULL,
  "portfolioManagers" character varying [] NOT NULL
);
ALTER TABLE portfolio OWNER TO atat_api_admin;
CREATE TABLE application (
  id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_application" PRIMARY KEY,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
  "archivedAt" timestamp without time zone,
  "provisioningStatus" provisioning_status_enum DEFAULT 'PENDING'::provisioning_status_enum NOT NULL,
  administrators character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  contributors character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  "readOnlyOperators" character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  name character varying(100) NOT NULL,
  description character varying(300),
  "portfolioId" uuid,
  CONSTRAINT "fk_application_portfolio" FOREIGN KEY ("portfolioId") REFERENCES portfolio(id)
);
ALTER TABLE application OWNER TO atat_api_admin;
CREATE TABLE environment (
  id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_environment" PRIMARY KEY,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
  "archivedAt" timestamp without time zone,
  "provisioningStatus" provisioning_status_enum DEFAULT 'PENDING'::provisioning_status_enum NOT NULL,
  administrators character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  contributors character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  "readOnlyOperators" character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  name character varying(100) NOT NULL,
  "applicationId" uuid,
  CONSTRAINT "fk_environment_application" FOREIGN KEY ("applicationId") REFERENCES application(id)
);
ALTER TABLE environment OWNER TO atat_api_admin;
CREATE TABLE task_order (
  id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_task_order" PRIMARY KEY,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
  "archivedAt" timestamp without time zone,
  "taskOrderNumber" character varying(17) NOT NULL,
  "fileId" uuid NOT NULL,
  "fileName" character varying(256) NOT NULL,
  "fileSize" integer,
  "fileScanStatus" file_scan_status_enum DEFAULT 'PENDING'::file_scan_status_enum NOT NULL,
  "portfolioId" uuid,
  CONSTRAINT "fk_task_order_portfolio" FOREIGN KEY ("portfolioId") REFERENCES portfolio(id)
);
ALTER TABLE task_order OWNER TO atat_api_admin;
CREATE TABLE clin (
  id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_clin" PRIMARY KEY,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
  "archivedAt" timestamp without time zone,
  "clinNumber" character varying(4) NOT NULL,
  "idiqClin" character varying NOT NULL,
  "totalClinValue" money NOT NULL,
  "obligatedFunds" money NOT NULL,
  "popStartDate" date NOT NULL,
  "popEndDate" date NOT NULL,
  "taskOrderId" uuid,
  CONSTRAINT "fk_clin_task_order" FOREIGN KEY ("taskOrderId") REFERENCES task_order(id)
);
ALTER TABLE clin OWNER TO atat_api_admin;