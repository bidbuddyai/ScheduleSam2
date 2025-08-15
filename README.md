# Adams & Grand Demolition - Weekly Progress Meetings

A production-ready web application for managing weekly construction progress meetings with AI-powered assistance via Poe's OpenAI-compatible API.

## Features

- **Project Management**: Create and manage multiple construction projects
- **Meeting Management**: Sequential meeting creation with automatic agenda seeding
- **9-Topic Agenda Structure**: Standardized agenda with discussion and decision tracking
- **Attendance Tracking**: Digital attendance with presence indicators
- **Action Items**: Comprehensive action item management with status tracking
- **RFI Management**: Request for Information tracking with status and impact analysis
- **Submittal Tracking**: Construction submittal management and review status
- **Fabrication Monitoring**: Component fabrication timeline and risk tracking
- **Open Items Log**: Project-level issue tracking and resolution
- **Distribution Lists**: Meeting minutes distribution with delivery confirmation
- **AI Assistant**: Poe-powered AI for meeting assistance, summarization, and automation
- **Export Capabilities**: Meeting export in multiple formats (JSON, with DOCX/PDF planned)
- **Carry-Forward Logic**: Automatic action item inheritance between meetings
- **Real-time Updates**: Live collaboration features for meeting participants

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling with Adams & Grand brand colors
- **Shadcn/UI** component library
- **React Hook Form** with Zod validation
- **TanStack Query** for data fetching and state management
- **Wouter** for client-side routing

### Backend
- **Express.js** server with TypeScript
- **In-memory storage** for MVP (MemStorage implementation)
- **Zod** for request validation
- **RESTful API** design

### AI Integration
- **Poe OpenAI-compatible API** for LLM functionality
- **Custom tool calling system** (app-level implementation)
- **JSON-based function contracts** for AI actions
- **Streaming responses** support

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Poe API key (get from https://poe.com/api_key)

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd adams-grand-meetings
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Required environment variables**
   ```env
   POE_API_KEY=your_poe_api_key_here
   SESSION_SECRET=your_random_session_secret
   PORT=5000
   NODE_ENV=development
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:5000
   - The app includes sample project data for testing

## API Reference

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details

### Meetings
- `GET /api/projects/:id/meetings` - List project meetings
- `POST /api/projects/:id/meetings?carryForward=true` - Create meeting with action item carry-forward
- `GET /api/projects/:projectId/meetings/:seq` - Get specific meeting

### Meeting Data
- `GET /api/meetings/:id/attendance` - Get meeting attendance
- `POST /api/meetings/:id/attendance` - Add attendee
- `GET /api/meetings/:id/agenda` - Get agenda items
- `PUT /api/agenda/:id` - Update agenda item
- `GET /api/meetings/:id/actions` - Get action items
- `POST /api/meetings/:id/actions` - Create action item
- `GET /api/meetings/:id/rfis` - Get RFIs
- `POST /api/meetings/:id/rfis` - Create RFI
- `GET /api/meetings/:id/submittals` - Get submittals
- `POST /api/meetings/:id/submittals` - Create submittal
- `GET /api/meetings/:id/fabrication` - Get fabrication items
- `POST /api/meetings/:id/fabrication` - Create fabrication item
- `GET /api/meetings/:id/distribution` - Get distribution list
- `POST /api/meetings/:id/distribution` - Add recipient

### AI & Export
- `POST /api/ai/chat` - AI assistant chat endpoint
- `GET /api/meetings/:id/export?format=json` - Export meeting data
- `POST /api/meetings/:id/distribute` - Distribute meeting minutes

## AI Assistant Usage

The AI assistant supports several tool-based actions:

### Available Tools
- **insertActionItems**: Create action items from discussion
- **createRFI**: Generate RFIs from meeting content
- **updateAgendaDiscussion**: Update agenda topics
- **distributeMinutes**: Send meeting minutes to recipients
- **summarizeMeeting**: Generate meeting summaries

### Example Queries
