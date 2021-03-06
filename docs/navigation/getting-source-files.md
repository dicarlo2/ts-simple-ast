---
title: Getting Source Files
---

## Getting Source Files

After source files are added, you will need to get them in order to navigate or make changes.

### All

Get all the source files:

```typescript
const sourceFiles = ast.getSourceFiles();
```

Or filter by glob:

```typescript
// single
const testSourceFiles = ast.getSourceFiles("**/src/test/**/*.ts");
// or multiple
const nonTestSourceFiles = ast.getSourceFiles([
    "**/src/**/*.ts",
    "!**/src/test/**/*.ts"
);
```

### By file path

Will return the first source file that matches the end of the provided file path:

```typescript
const personFile = ast.getSourceFile("Models/Person.ts");
```

### By condition

Will return the first source file that matches the provided condition:

```typescript
const fileWithFiveClasses = ast.getSourceFile(f => f.getClasses().length === 5);
```
