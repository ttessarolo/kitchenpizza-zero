---
name: orpc
description: Type-safe API endpoints with oRPC framework. Use when creating or modifying procedures, middleware composition, validation, and error handling.
---

# oRPC Procedures

Type-safe API endpoint patterns with oRPC (Object-oriented RPC).

<template id="procedure-layers">

```typescript
// Layer 1: Base (unauthenticated)
const baseProcedure = os.$context<BaseContext>();

// Layer 2: Authenticated (requires valid user session)
const authProcedure = baseProcedure.use(authenticationMiddleware);

// Layer 3: Authorized (checks permissions for resource and action)
authProcedure.use(
  authorizationMiddleware({ resource: "project", action: "read" }),
);

// Layer 4: Business logic validation (tenant context, state checks)
authProcedure.use(tenantContextMiddleware);
```

</template>

<template id="read-procedure">

```typescript
const get = authProcedure
  .input(z.object({ id: z.string() }))
  .use(authorizationMiddleware({ resource: "{entity}", action: "read" }))
  .handler(async ({ input, context }) => {
    const entity = await context.db.query.{entityTable}.findFirst({
      where: eq({entityTable}.id, input.id),
    })

    if (!entity) {
      // Use NOT_FOUND (not FORBIDDEN) to prevent resource enumeration attacks
      throw new Error("NOT_FOUND: {EntityName} not found")
    }

    return entity
  })
```

</template>

<template id="create-procedure">

```typescript
const create = authProcedure
  .input(
    z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      // Add your entity-specific fields
    }),
  )
  .use(authorizationMiddleware({ resource: "{entity}", action: "create" }))
  .handler(async ({ input, context }) => {
    const { db, user, session } = context;
    const id = generateId(); // uuid(), ulid(), nanoid(), etc.
    const now = new Date();

    // Validate tenant context exists
    if (!session.tenantId && !context.tenantId) {
      throw new Error("BAD_REQUEST: No active tenant context");
    }

    const tenantId = session.tenantId || context.tenantId;

    const [entity] = await db
      .insert({ entityTable })
      .values({
        id,
        tenantId,
        name: input.name,
        description: input.description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!entity) {
      throw new Error("INTERNAL_SERVER_ERROR: Failed to create {entity}");
    }

    return entity;
  });
```

</template>

<template id="update-procedure">

```typescript
const update = authProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    // Add your updatable fields
  }))
  .use(authorizationMiddleware({ resource: "{entity}", action: "update" }))
  .handler(async ({ input, context }) => {
    const updateData: Partial<Insert{EntityName}> = {
      // Map input fields (never update createdAt)
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      updatedAt: new Date(),
    }

    const [updated] = await context.db
      .update({entityTable})
      .set(updateData)
      .where(eq({entityTable}.id, input.id))
      .returning()

    if (!updated) {
      throw new Error("NOT_FOUND: {EntityName} not found")
    }

    return updated
  })
```

</template>

<template id="delete-procedure">

```typescript
const delete_ = authProcedure
  .input(z.object({ id: z.string() }))
  .use(authorizationMiddleware({ resource: "{entity}", action: "delete" }))
  .handler(async ({ input, context }) => {
    const result = await context.db
      .delete({ entityTable })
      .where(eq({ entityTable }.id, input.id));

    if (!result.changes) {
      throw new Error("NOT_FOUND: {EntityName} not found");
    }

    return { success: true, id: input.id };
  });
```

</template>

<template id="error-handling">

```typescript
// Standard error codes (use these consistently)
throw new Error("NOT_FOUND: Resource not found") // Also prevents enumeration
throw new Error("CONFLICT: Already exists") // Unique constraint violations
throw new Error("BAD_REQUEST: Invalid input") // Validation errors
throw new Error("FORBIDDEN: Insufficient permissions") // Authorization checks
throw new Error("INTERNAL_SERVER_ERROR: Database error")

// Unique constraint handling
try {
  const [inserted] = await db.insert(entities).values({ ... }).returning()
} catch (error) {
  if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
    throw new Error("CONFLICT: Entity already exists")
  }
  throw error
}
```

</template>

<template id="list-procedure-with-pagination">

```typescript
const list = authProcedure
  .input(
    z.object({
      tenantId: z.string(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
      search: z.string().optional(),
    }),
  )
  .use(authorizationMiddleware({ resource: "{entity}", action: "read" }))
  .handler(async ({ input, context }) => {
    const query = context.db
      .select()
      .from({ entityTable })
      .where(eq({ entityTable }.tenantId, input.tenantId));

    // Add search filter if provided
    if (input.search) {
      query.where(like({ entityTable }.name, `%${input.search}%`));
    }

    const items = await query
      .limit(input.limit)
      .offset(input.offset)
      .orderBy(desc({ entityTable }.createdAt));

    const [{ count }] = await context.db
      .select({ count: sql`count(*)` })
      .from({ entityTable })
      .where(eq({ entityTable }.tenantId, input.tenantId));

    return { items, total: count, offset: input.offset, limit: input.limit };
  });
```

</template>

<template id="middleware-composition">

```typescript
// Custom middleware: tenant context validation
const tenantContextMiddleware = os
  .$context<TenantContext>()
  .meta("tenantContext", async (utils) => {
    return async () => {
      const { context } = utils;
      // Middleware receives context and can modify it
      if (!context.session.tenantId) {
        throw new Error("BAD_REQUEST: No tenant context");
      }
      // Continue to next middleware/handler
      return await utils.next();
    };
  });

// Custom middleware: input transformation
const normalizeInputMiddleware = os
  .$context<BaseContext>()
  .meta("normalize", async (utils) => {
    return async () => {
      // Transform input before handler
      const transformed = normalizeInput(utils.input);
      return await utils.next({ input: transformed });
    };
  });

// Stack multiple middlewares
authProcedure
  .use(authorizationMiddleware({ resource: "project", action: "read" }))
  .use(tenantContextMiddleware)
  .use(normalizeInputMiddleware)
  .handler(async ({ input, context }) => {
    // Handler runs after all middleware
  });
```

</template>

<instructions>

1. Use `authProcedure` for authenticated endpoints; add middleware for authorization
2. Always use `NOT_FOUND` (never `FORBIDDEN`) to prevent resource enumeration
3. Set `createdAt`/`updatedAt` on insert; update only `updatedAt` on update
4. Use `.returning()` and check for null after insert/update/delete
5. Filter queries by tenant even after middleware checks (defense in depth)
6. Use consistent ID generation across procedures (UUID, ULID, nanoid)
7. Validate tenant context in procedures requiring tenant scope
8. Include pagination (limit, offset) on list procedures
9. Use Zod for input validation; keep schemas near procedure definitions
10. Stack middleware in logical order: auth → authorization → business logic

</instructions>
