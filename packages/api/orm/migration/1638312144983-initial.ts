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
    
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
    
    CREATE TYPE public.application_provisioningstatus_enum AS ENUM (
        'not_started',
        'in_progress',
        'failed',
        'complete'
    );
    
    ALTER TYPE public.application_provisioningstatus_enum OWNER TO atat_api_admin;
    
    CREATE TYPE public.application_status_enum AS ENUM (
        'not_started',
        'in_progress',
        'failed',
        'complete'
    );
    
    ALTER TYPE public.application_status_enum OWNER TO atat_api_admin;
    
    CREATE TYPE public.environment_provisioningstatus_enum AS ENUM (
        'not_started',
        'in_progress',
        'failed',
        'complete'
    );
    
    ALTER TYPE public.environment_provisioningstatus_enum OWNER TO atat_api_admin;
    
    CREATE TYPE public.environment_status_enum AS ENUM (
        'not_started',
        'in_progress',
        'failed',
        'complete'
    );
    
    ALTER TYPE public.environment_status_enum OWNER TO atat_api_admin;
    
    CREATE TYPE public.portfolio_csp_enum AS ENUM (
        'CSP A',
        'CSP B'
    );
    
    ALTER TYPE public.portfolio_csp_enum OWNER TO atat_api_admin;
    
    CREATE TYPE public.portfolio_provisioningstatus_enum AS ENUM (
        'not_started',
        'in_progress',
        'failed',
        'complete'
    );
    
    ALTER TYPE public.portfolio_provisioningstatus_enum OWNER TO atat_api_admin;
    
    CREATE TYPE public.portfolio_status_enum AS ENUM (
        'not_started',
        'in_progress',
        'failed',
        'complete'
    );
    
    ALTER TYPE public.portfolio_status_enum OWNER TO atat_api_admin;
    
    CREATE TYPE public.task_order_filescanstatus_enum AS ENUM (
        'pending',
        'accepted',
        'rejected'
    );
    
    ALTER TYPE public.task_order_filescanstatus_enum OWNER TO atat_api_admin;
    
    SET default_tablespace = '';
    SET default_table_access_method = heap;
    
    CREATE TABLE public.application (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "provisioningStatus" public.application_provisioningstatus_enum DEFAULT 'not_started'::public.application_provisioningstatus_enum NOT NULL,
        administrators character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        contributors character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        "readOnlyOperators" character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        name character varying(100) NOT NULL,
        description character varying(300),
        "portfolioId" uuid
    );
    
    ALTER TABLE public.application OWNER TO atat_api_admin;
    
    CREATE TABLE public.clin (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "clinNumber" character varying(4) NOT NULL,
        "idiqClin" character varying NOT NULL,
        "totalClinValue" money NOT NULL,
        "obligatedFunds" money NOT NULL,
        "popStartDate" date NOT NULL,
        "popEndDate" date NOT NULL,
        "taskOrderId" uuid
    );
    
    ALTER TABLE public.clin OWNER TO atat_api_admin;
    
    CREATE TABLE public.environment (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "provisioningStatus" public.environment_provisioningstatus_enum DEFAULT 'not_started'::public.environment_provisioningstatus_enum NOT NULL,
        administrators character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        contributors character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        "readOnlyOperators" character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        name character varying(100) NOT NULL,
        "applicationId" uuid
    );
    
    ALTER TABLE public.environment OWNER TO atat_api_admin;
    
    CREATE TABLE public.portfolio (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "provisioningStatus" public.portfolio_provisioningstatus_enum DEFAULT 'not_started'::public.portfolio_provisioningstatus_enum NOT NULL,
        administrators character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        contributors character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        "readOnlyOperators" character varying[] DEFAULT '{}'::character varying[] NOT NULL,
        name character varying(100) NOT NULL,
        description character varying(300),
        owner character varying NOT NULL,
        csp public.portfolio_csp_enum NOT NULL,
        "dodComponents" character varying[] NOT NULL,
        "portfolioManagers" character varying[] NOT NULL
    );
    
    ALTER TABLE public.portfolio OWNER TO atat_api_admin;
    
    CREATE TABLE public.task_order (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        "archivedAt" timestamp without time zone,
        "taskOrderNumber" character varying(17) NOT NULL,
        "fileId" uuid NOT NULL,
        "fileName" character varying(256) NOT NULL,
        "fileSize" integer,
        "fileScanStatus" public.task_order_filescanstatus_enum DEFAULT 'pending'::public.task_order_filescanstatus_enum NOT NULL,
        "portfolioId" uuid
    );
    
    ALTER TABLE public.task_order OWNER TO atat_api_admin;
    
    CREATE TABLE public.typeorm_metadata (
        type character varying NOT NULL,
        database character varying,
        schema character varying,
        "table" character varying,
        name character varying,
        value text
    );
    
    
    ALTER TABLE public.typeorm_metadata OWNER TO atat_api_admin;
    
    ALTER TABLE ONLY public.task_order
        ADD CONSTRAINT "PK_15e973a09676013165565bc6243" PRIMARY KEY (id);
    
    ALTER TABLE ONLY public.application
        ADD CONSTRAINT "PK_569e0c3e863ebdf5f2408ee1670" PRIMARY KEY (id);
    
    ALTER TABLE ONLY public.portfolio
        ADD CONSTRAINT "PK_6936bb92ca4b7cda0ff28794e48" PRIMARY KEY (id);
    
    ALTER TABLE ONLY public.clin
        ADD CONSTRAINT "PK_e32ec78a5e701ad41d0ceeba73d" PRIMARY KEY (id);
    
    ALTER TABLE ONLY public.environment
        ADD CONSTRAINT "PK_f0ec97d0ac5e0e2f50f7475699f" PRIMARY KEY (id);
    
    ALTER TABLE ONLY public.application
        ADD CONSTRAINT "FK_1462a81e180a036f207e96e0f93" FOREIGN KEY ("portfolioId") REFERENCES public.portfolio(id);
    
    ALTER TABLE ONLY public.task_order
        ADD CONSTRAINT "FK_446ee9f80c83b0de3fd2d9891b9" FOREIGN KEY ("portfolioId") REFERENCES public.portfolio(id);
    
    ALTER TABLE ONLY public.environment
        ADD CONSTRAINT "FK_4934116062d67f9aef3725972ff" FOREIGN KEY ("applicationId") REFERENCES public.application(id);
    
    ALTER TABLE ONLY public.clin
        ADD CONSTRAINT "FK_b919a2f2b8cc2d03fbc3d3d9456" FOREIGN KEY ("taskOrderId") REFERENCES public.task_order(id);
    
    `;
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
