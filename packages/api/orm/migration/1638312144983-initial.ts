import { MigrationInterface, QueryRunner } from "typeorm";

export class initial1638312144983 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const sql = `    
    SET statement_timeout = 0;
    SET lock_timeout = 0;
    SET idle_in_transaction_session_timeout = 0;
    SET client_encoding = 'UTF8';
    SET standard_conforming_strings = on;
    SELECT pg_catalog.set_config('search_path', '', false);
    SET check_function_bodies = false;
    SET xmloption = content;
    SET client_min_messages = warning;
    SET row_security = off;
    
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    CREATE TYPE provisioning_status_enum AS ENUM (
        'not_started',
        'in_progress',
        'failed',
        'complete'
    );
    
    CREATE TYPE csp_enum AS ENUM (
        'CSP A',
        'CSP B'
    );
    
    CREATE TYPE file_scan_status_enum AS ENUM (
        'pending',
        'accepted',
        'rejected'
    );
    
    CREATE TABLE application (
        id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_application" PRIMARY KEY,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "provisioningStatus" provisioning_status_enum DEFAULT 'not_started'::provisioning_status_enum NOT NULL,
        administrators character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        contributors character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        "readOnlyOperators" character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        name character varying(100) NOT NULL,
        description character varying(300),
        "portfolioId" uuid,
        CONSTRAINT "fk_application_portfolio" FOREIGN KEY ("portfolioId") REFERENCES portfolio(id)
    );
    
    ALTER TABLE application OWNER TO atat_api_admin;
    
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
    
    CREATE TABLE environment (
        id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_environment" PRIMARY KEY,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "provisioningStatus" provisioning_status_enum DEFAULT 'not_started'::provisioning_status_enum NOT NULL,
        administrators character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        contributors character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        "readOnlyOperators" character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        name character varying(100) NOT NULL,
        "applicationId" uuid,
        CONSTRAINT "fk_environment_application" FOREIGN KEY ("applicationId") REFERENCES application(id)
    );
    
    ALTER TABLE environment OWNER TO atat_api_admin;
    
    CREATE TABLE portfolio (
        id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_portfolio" PRIMARY KEY,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "provisioningStatus" provisioning_status_enum DEFAULT 'not_started'::provisioning_status_enum NOT NULL,
        administrators character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        contributors character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        "readOnlyOperators" character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        name character varying(100) NOT NULL,
        description character varying(300),
        owner character varying NOT NULL,
        csp csp_enum NOT NULL,
        "dodComponents" character varying[] NOT NULL,
        "portfolioManagers" character varying[] NOT NULL
    );
    
    ALTER TABLE portfolio OWNER TO atat_api_admin;
    
    CREATE TABLE task_order (
        id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_task_order" PRIMARY KEY,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "taskOrderNumber" character varying(17) NOT NULL,
        "fileId" uuid NOT NULL,
        "fileName" character varying(256) NOT NULL,
        "fileSize" integer,
        "fileScanStatus" file_scan_status_enum DEFAULT 'pending'::file_scan_status_enum NOT NULL,
        "portfolioId" uuid,
        CONSTRAINT "fk_task_order_portfolio" FOREIGN KEY ("portfolioId") REFERENCES portfolio(id)
    );
    
    ALTER TABLE task_order OWNER TO atat_api_admin;
    
    CREATE TABLE typeorm_metadata (
        type character varying NOT NULL,
        database character varying,
        schema character varying,
        "table" character varying,
        name character varying,
        value text
    );
    
    ALTER TABLE typeorm_metadata OWNER TO atat_api_admin;
    `;
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
