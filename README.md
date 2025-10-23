# the-pulse

The pulse system is a **type-safe business logic framework** built on BullMQ that handles both synchronous and asynchronous operations.

## Core Concept

**Actions are business operations** defined with schemas and executed through a centralized runtime. Think of it as a typed RPC system with built-in queuing.

## Setup

Install the package:

```bash
npm install the-pulse
```

Create a Pulse instance with your app config:

```typescript
import { Pulse } from 'the-pulse';

const pulse = new Pulse({
  appName: 'MyApp',
  actionConfigFactory: ({ name, module }) => ({
    // Custom config per action
  }),
  queue: {
    host: 'localhost',
    port: 6379,
    // Other ioredis options
  }
});
```

## How It Works

### 1. **Define Actions**
```typescript
import { A, G } from 'the-pulse';

const AuthAction = G({
  signup: A('auth.signup')
    .input(SignupSchema)
    .output(UserSchema)
    .sync(),  // Mark as sync → runs immediately

  mail: {
    sendWelcome: A('auth.mail.sendWelcome')
      .input(EmailSchema)
      .output(EmailResultSchema)
      // Default is async → uses queue
  }
});
```

### 2. **Implement Handlers**
```typescript
module.registerHandlers({
  signup: async ({ input }) => {
    const user = await createUser(input);
    return { output: user };
  },
  
  mail: {
    sendWelcome: async ({ input }) => {
      const result = await sendEmail(input);
      return { output: result };
    }
  }
});
```

### 3. **Execute Actions**
```typescript
import { callAction, scheduleAction } from 'the-pulse';

// Sync: runs immediately
const user = await callAction(AuthAction.signup, { input });

// Async: queued via BullMQ
const job = await scheduleAction(AuthAction.mail.sendWelcome, { input });
```

## Key Features

- **Type Safety**: Input/output types inferred from Zod schemas
- **Sync/Async**: Handlers run immediately (`.sync()`) or queued (default)
- **Validation**: Automatic schema validation via Zod
- **Retries**: BullMQ retry logic with exponential backoff
- **Cron Jobs**: Actions can run on schedules (`.settings({ cron: 'every_day' })`)
- **Simple API**: Handlers receive `{ input }` and return `{ output }`

## Architecture

**Pulse** → manages all modules and queue
**Module** → registers handlers for an action group
**Queue** → BullMQ wrapper for async execution
**ActionDef** → builder for defining action schemas

The system centralizes business logic, decouples sync/async execution, and provides consistent observability across all operations.
