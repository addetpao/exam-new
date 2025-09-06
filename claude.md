```xml
<ProjectGuide>
  <Title>claude.md</Title>
  <Description>Comprehensive guidance for contributors working on the ExamPrep Platform (CompTIA A+).</Description>

  <Section title="Critical Global Rules - READ FIRST">
    <Rule priority="HIGHEST">DO NOT ASSUME. ASK. If any requirement, variable name, file path, configuration, or implementation detail is unclear or ambiguous, ALWAYS ask for clarification rather than making assumptions.</Rule>
    <Rule priority="CRITICAL">Variable Name Verification: Before accessing, using, or writing any variable, environment variable, configuration key, or property name, DOUBLE-CHECK the exact spelling, casing, and format. Verify against existing code, configuration files, and documentation. One character difference can break entire systems.</Rule>
  </Section>

  <Section title="Core Development Philosophy">
    <Point>Lean &amp; Incremental: Build MVP quickly with essential features, then expand in phases.</Point>
    <Point>Quality-first: Prioritize exam fidelity and teaching quality over speed.</Point>
    <Point>Separation of Concerns: Each component/service should have one clear purpose.</Point>
    <Point>Scalable Foundation: Ready for long-term growth (multi-exam, enterprise compliance).</Point>
    <Point>Accessibility: WCAG baseline compliance at MVP.</Point>
  </Section>

  <Section title="Claude Code Sub-Agent System">
    <Protocol>Agents must identify themselves using 🎯 [AGENT NAME] Agent: [Message]</Protocol>
    <Invocation>
      <Example>Task(subagent_type="database", description="Create Supabase schema")</Example>
    </Invocation>
    <Agents>
      <Core>
        <Agent name="database" role="Supabase/Postgres schema, migrations, RLS" />
        <Agent name="frontend" role="Next.js App Router, Tailwind, shadcn/ui" />
        <Agent name="backend" role="API routes, GA4 events, business logic" />
        <Agent name="authentication" role="Supabase Auth, email/OAuth, RBAC" />
        <Agent name="payments" role="Stripe subscriptions and webhooks" />
        <Agent name="storage" role="Supabase Storage for PBQ media" />
      </Core>
      <Quality>
        <Agent name="qa" role="Unit/integration/E2E testing" />
        <Agent name="shield" role="Security validation and protections" />
        <Agent name="devops" role="CI/CD, Vercel deploys, migrations" />
      </Quality>
    </Agents>
  </Section>

  <Section title="Agent Coordination System">
    <Files>
      <File>.claude/coordination/agent-state.json</File>
      <File>changes.log</File>
      <File>protocols.md</File>
    </Files>
    <Flow>Database → Authentication → Backend → Frontend → QA</Flow>
  </Section>

  <Section title="MCP Integration Layer">
    <GlobalRule>
      <Priority>ALWAYS utilize available MCP servers instead of manual implementation</Priority>
      <Principle>When an MCP server exists for a task (DB operations, payments, deployments, etc.), use the MCP server rather than direct API calls or manual processes</Principle>
      <Enforcement>Before implementing any feature, check if an MCP server can handle the task first</Enforcement>
    </GlobalRule>
    <Integrated>
      <MCP name="Supabase MCP" usage="DB/Auth/Storage" config="supabasemcp-config.json" />
      <MCP name="Stripe MCP" usage="Billing" config="stripemcp-config.json" />
      <MCP name="GitHub MCP" usage="Repo/CI" config="githubmcp-config.json" />
      <MCP name="Task Master AI" usage="Coordination" config="taskmastermcp-config.json" />
      <MCP name="Vercel MCP" usage="Deployments/Hosting" config="vercelmcp-config.json" />
    </Integrated>
    <Matrix>
      <Row agent="database" primary="Supabase MCP" secondary="Task Master AI" />
      <Row agent="frontend" primary="Vercel MCP" secondary="GitHub MCP" />
      <Row agent="backend" primary="Supabase MCP, Stripe MCP" secondary="GitHub MCP" />
      <Row agent="auth" primary="Supabase MCP" secondary="Task Master AI" />
      <Row agent="payments" primary="Stripe MCP" secondary="Supabase MCP" />
      <Row agent="storage" primary="Supabase MCP" secondary="Task Master AI" />
      <Row agent="devops" primary="Vercel MCP, GitHub MCP" secondary="Task Master AI" />
    </Matrix>
  </Section>

  <Section title="Project Architecture &amp; Structure">
    <RepoLayout>
      <Folder>/app</Folder>
      <Folder>/components</Folder>
      <Folder>/lib</Folder>
      <Folder>/public/data</Folder>
      <Folder>/tests</Folder>
    </RepoLayout>
    <Technologies>
      <Frontend>Next.js 14, Tailwind, shadcn/ui</Frontend>
      <Backend>Supabase + Next.js API</Backend>
      <Payments>Stripe Checkout + webhooks</Payments>
      <Hosting>Vercel</Hosting>
      <Analytics>GA4</Analytics>
    </Technologies>
  </Section>

  <Section title="Development Environment">
    <PackageManager>npm</PackageManager>
    <Scripts>
      <Script name="dev">npm run dev</Script>
      <Script name="build">npm run build</Script>
      <Script name="lint">npm run lint</Script>
      <Script name="typecheck">npm run typecheck</Script>
    </Scripts>
  </Section>

  <Section title="Style &amp; Conventions">
    <Rules>
      <Rule>Double quotes for strings</Rule>
      <Rule>Semicolons required</Rule>
      <Rule>camelCase variables, PascalCase components</Rule>
    </Rules>
  </Section>

  <Section title="Testing Strategy">
    <Unit>Jest/React Testing Library</Unit>
    <Integration>Supabase + Stripe APIs</Integration>
    <E2E>Playwright exam flow</E2E>
  </Section>

  <Section title="Error Handling &amp; Logging">
    <Validation>Zod schemas</Validation>
    <Logging>Pino</Logging>
  </Section>

  <Section title="Configuration Management">
    <EnvVars>
      <Var>NEXT_PUBLIC_APP_URL</Var>
      <Var>SUPABASE_URL</Var>
      <Var>SUPABASE_ANON_KEY</Var>
      <Var>STRIPE_SECRET_KEY</Var>
      <Var>STRIPE_WEBHOOK_SECRET</Var>
    </EnvVars>
  </Section>

  <Section title="Data Models">
    <Table name="Users" />
    <Table name="Subscriptions" />
    <Table name="Questions" />
    <Table name="Choices" />
    <Table name="Attempts" />
    <Table name="Progress" />
    <Table name="PBQ Assets" />
    <Table name="Blog Posts" />
  </Section>

  <Section title="Git Workflow">
    <Branch main="production" feature="feature/*" />
    <Commit format="Conventional Commits" />
  </Section>

  <Section title="Security Best Practices">
    <Practice>No secrets in repo</Practice>
    <Practice>Use env vars</Practice>
    <Practice>HTTPS enforced</Practice>
    <Practice>Stripe PCI compliance</Practice>
  </Section>

  <Section title="Monitoring &amp; Observability">
    <Logging>Pino</Logging>
    <ErrorTracking>Sentry (future)</ErrorTracking>
    <Metrics>GA4 events</Metrics>
  </Section>

  <Section title="Performance">
    <Requirement>Exam load &lt; 2s</Requirement>
    <Requirement>Question fetch &lt; 300ms</Requirement>
    <Requirement>Autosave latency &lt; 2s</Requirement>
  </Section>

  <Section title="Resources">
    <Link>https://nextjs.org/docs</Link>
    <Link>https://supabase.com/docs</Link>
    <Link>https://stripe.com/docs</Link>
    <Link>https://support.google.com/analytics</Link>
  </Section>

  <Notes>
    <Note>Never commit .env files</Note>
    <Note>Keep dependencies updated</Note>
    <Note>PR reviews required for merges into main</Note>
  </Notes>

  <TaskMasterAI>
    <Instruction>Import Task Master AI workflow commands as if included</Instruction>
  </TaskMasterAI>
</ProjectGuide>
```
