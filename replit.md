# Overview

MeetBud is a production-ready web application designed for managing construction project meetings. The system provides structured meeting workflows with a standardized 6-topic agenda format, comprehensive tracking of action items, site safety, and project progress. The application integrates AI assistance through Poe's OpenAI-compatible API to help automate meeting tasks, generate summaries, and assist with project management workflows.

# User Preferences

Preferred communication style: Simple, everyday language.

## Schedule Management Features
- **CPM Schedule Upload & Processing**: AI-powered parsing of construction schedules to extract activities, durations, and dependencies
- **3-Week Lookahead Generation**: Automatic generation of 3-week lookaheads from CPM schedules with activity filtering
- **Meeting-Driven Updates**: AI analyzes meeting discussions to automatically update schedule activities and statuses
- **File Upload System**: Direct upload of schedules, documents, and recordings with automatic content extraction
- **Schedule Integration**: Seamless integration between meetings and project schedules for real-time updates

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Styling**: Tailwind CSS with MeetBud brand colors (orange and blue theme), using Shadcn/UI component library for consistent design system
- **State Management**: TanStack Query for server state management and caching, React Hook Form with Zod validation for form handling
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js server using TypeScript
- **Data Storage**: Currently uses in-memory storage (MemStorage) for MVP, with Drizzle ORM configured for future PostgreSQL migration
- **API Design**: RESTful API with Zod schema validation for request/response handling
- **Authentication**: Basic structure in place, currently using simple session-based approach

## Database Design
- **Schema**: Drizzle ORM with PostgreSQL schema definitions including projects, meetings, attendance, agenda items, action items, RFIs, submittals, fabrication tracking, and distribution lists
- **Migration Strategy**: Drizzle Kit for database migrations and schema management
- **Current State**: In-memory storage for development, ready for PostgreSQL deployment

## AI Integration Architecture
- **LLM Provider**: Poe's OpenAI-compatible API endpoint (https://api.poe.com/v1)
- **Function Calling**: Custom app-level implementation since Poe doesn't support native tool calling
- **Assistant Tools**: Structured JSON schema for meeting operations (insertActionItems, createRFI, updateAgendaDiscussion, distributeMinutes, summarizeMeeting)
- **Model Support**: Multiple models including gemini-2.5-pro, Claude-Sonnet-4, Grok-4, Llama-3.1-405B
- **Streaming**: OpenAI-compatible streaming responses for real-time interactions

## Meeting Workflow Architecture
- **Sequential Meetings**: Automatic meeting numbering and carry-forward logic for action items
- **6-Topic Construction Agenda**: Standardized agenda structure tailored for construction projects:
  1. Welcome & Introductions
  2. Site Safety
  3. Project Schedule
  4. Ongoing Project Details
  5. Open Discussion
  6. Action Items & Next Steps
- **Status Tracking**: Comprehensive status management for action items, safety incidents, and project milestones
- **Export System**: JSON export capability with planned DOCX/PDF support

## Data Flow Patterns
- **Client-Server**: Standard REST API communication with JSON payloads
- **Real-time Features**: Foundation for live collaboration (WebSocket integration planned)
- **Validation**: Dual validation with Zod schemas on both client and server
- **Caching**: TanStack Query provides client-side caching and background updates

# External Dependencies

## Core Infrastructure
- **Poe API**: Primary LLM service requiring POE_API_KEY environment variable
- **PostgreSQL**: Target database (currently using Neon serverless for deployment)
- **Google Cloud Storage**: File storage integration for meeting attachments and audio files

## Development & Build Tools
- **Vite**: Frontend build tool and development server
- **Replit**: Development environment with specific plugins for error handling and cartographer
- **Uppy**: File upload components for handling meeting attachments

## UI & Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Icon library for consistent UI elements

## Form & Validation
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation library used across client and server

## Data Management
- **TanStack Query**: Server state management and caching
- **Drizzle ORM**: Type-safe database toolkit and query builder
- **Drizzle Kit**: Database migration and introspection tools

## Authentication & Security
- **Environment Variables**: POE_API_KEY and DATABASE_URL management
- **CORS Configuration**: Express.js CORS setup for API security

## File Processing
- **Uppy Ecosystem**: File upload handling with AWS S3 integration, drag-drop interface, and progress tracking
- **Object Storage Integration**: Direct file uploads to Replit object storage with presigned URLs
- **Schedule File Processing**: AI-powered extraction of activities from CPM schedules and lookaheads
- **Meeting File Analysis**: Automatic extraction of action items from uploaded meeting documents