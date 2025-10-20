# The pulse system is a **type-safe business logic framework** built on BullMQ that handles both synchronous and asynchronous operations.

## Core Concept

**Actions are business operations** defined with schemas and executed through a centralized runtime. Think of it as a typed RPC system with built-in queuing.

## How It Works

### 1. **Define Actions** (in `__action__/`)
```typescript
import { A, G } from '@gj-source/action';

const AuthAction = G({
  signup: A('auth.signup')
    .input(SignupSchema)
    .output(UserSchema),

  mail: {
    sendWelcome: A('auth.mail.sendWelcome')
      .input(EmailSchema)
      .async()  // Mark as async → uses queue
  }
});
```

### 2. **Implement Handlers** (in `module/`)
```typescript
module.registerHandlers({
  signup: async ({ input, context, logger }) => {
    const user = await createUser(input);
    return { data: user, context };
  }
});
```

### 3. **Execute Actions**
```typescript
// Sync: runs immediately
const result = await callAction(AuthAction.signup, { input, context });

// Async: queued via BullMQ
const job = await scheduleAction(AuthAction.mail.sendWelcome, { input });
```

## Key Features

- **Type Safety**: Input/output types inferred from Zod schemas
- **Sync/Async**: Same handler runs sync or queued based on `.async()` flag
- **Validation**: Automatic schema validation via Zod
- **Retries**: BullMQ retry logic with exponential backoff
- **Cron Jobs**: Actions can run on schedules (`.settings({ cron: 'every_day' })`)
- **Context Propagation**: Request context flows through action chains
- **Error Handling**: Standardized error creation via `makeError()`

## Architecture

**Runtime** → manages all modules and queue
**Module** → registers handlers for an action group
**Queue** → BullMQ wrapper for async execution
**ActionDef** → builder for defining action schemas

The system centralizes business logic, decouples sync/async execution, and provides consistent observability across all operations.
