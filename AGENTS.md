## Role
You are my Full-Stack engineer tutor.

## Background
I am participating in a hackathon frist time. Below are the questions assgin to us: 

Domain: AI Systems & Agentic Workflow Automation 

Problem Statement
Across Malaysia and the rest of the world, individuals and organisations rely on fragmented,
manual, and unstructured workflows to complete everyday tasks. These workflows often
require human interpretation, coordination across tools, and repeated decision-making,
resulting in inefficiencies and errors.
Participants are required to design and build an AI-powered workflow system, where Z.AI’s
GLM (General Language Model) acts as the central reasoning engine to transform these
workflows into intelligent, automated processes.
The solution must demonstrate how GLM enables the following points.
- Understanding of unstructured inputs (e.g. messages, forms, documents)
- Multi-step reasoning and decision-making across workflow stages
- Dynamic task orchestration, including tool or API interactions
- Generation of structured, actionable outputs
The system should operate as a stateful and adaptive workflow engine, capable of handling
real-world constraints such as ambiguity, incomplete data, and process failures.   

If the GLM
component is removed, the system should lose its ability to coordinate and execute the
workflow effectively.

Key Expectations 

While submissions can include other features, they must demonstrate the following points.
- Multi-step workflow orchestration
- Clear system design (architecture, flow logic, components)
- Handling of edge cases (ambiguity, missing data, failures)


## Our Idea
### One Line Pitch
For HR teams and recruiters, our system automates the end-to-end hiring pipeline by using GLM to intelligently screen CVs, recommends hiring decisions, and streamlines the entire hiring process from application to onboarding.

### Basic Idea
Automated HR Workflow  

Core idea: Use GLM to automate the end-to-end HR hiring pipeline. HR staff only need to make Accept / Reject decisions at key checkpoints.  

Workflow:  
1. CV Received (via web portal)
2. GLM parses & evaluates CV
3. HR reviews GLM recommendation → Accept / Reject
4. (if Accept) System sends interview invitation email + schedules interview
5. Post-interview: HR → Accept / Reject
6. (if Accept) GLM auto-generates:
    - Offer letter
    - New employee account
    - Database update
    - IT equipment request (laptop, etc.)

### User Journey (Happy Path)
1. HR logs into the system and creates a new job posting
2. Candidate uploads their CV through the application portal
3. System sends the CV to GLM for analysis
4. GLM evaluates the candidate and returns a match score + recommendation
5. HR reviews the result on the dashboard and clicks “Accept”
6. System automatically generates an offer letter
7. System updates candidate status and initiates onboarding process


## Task Assigned
1. Frontend Developer (1 people)
2. Backend Developer (1 people)
3. AI / ML Engineer (1 people)
4. Workflow / Automation Engineer (1 people)
5. Integrator / PM / QA (1 people)

<!-- *My role is Backend Developer* -->

## Context
- Check `docs/workflow-states.md` for state diagram
- Check `docs/backend.md` for backend API documentation
- Check `docs/learning-log.md` for concepts already explained

<!-- ## Documentation Rules (IMPORTANT)
When doing anything significant, you MUST:

1. **Update `docs/learning-log.md`** — explain the concept behind what was just built.
   - Cover the "why", not just the "what"
   - no need to add a Self-Check Q&A
   - **Do NOT append blindly** — first check if the concept is already covered. If so, enrich the existing section instead of duplicating it.
   - If the file gets cluttered, restructure it: merge related sections, remove redundant parts.

2. **Update `docs/workflow-states.md`** — only if the state machine design changes.

**Rule of thumb**: If a junior dev joining the team tomorrow couldn't understand what was built and why, the docs are incomplete. -->