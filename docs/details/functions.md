---
title: Functions
---

## Function Declarations

Functions can be retrieved from source files, other namespaces, or function bodies:

```typescript
const functions = sourceFile.getFunctions();
const function1 = sourceFile.getFunction("Function1");
const firstFunctionWithChildFunction = sourceFile.getFunction(f => f.getFunctions().length > 0);
```

Most of the information you can get about functions is covered in other sections.

### Add/Insert

Add or insert enums to a source file, namespace, or function like declarations by calling `addFunction()`, `addFunctions()`, `insertFunction()`, or `insertFunctions()`.

```typescript
const functionDeclaration = sourceFile.addFunction({
    name: "FunctionName"
});
```

### Remove

Call `.remove()`:

```typescript
functionDeclaration.remove();
```

### Overloads

By default, in ambient contexts or for ambient nodes, all overloads will be returned. In non-ambient contexts, only the implementation will be returned.

Get the overloads by calling:

```typescript
const overloads = functionDeclaration.getOverloads(); // returns: FunctionDeclaration[]
```

Or tell if the current declaration is an overload by calling either:

```typescript
functionDeclaration.isOverload();
functionDeclaration.isImplementation();
```

From the overloads, get the implementation by calling:

```typescript
const implementation = overload.getImplementation();
```

#### Add/Insert

Add or insert overloads by using either the `.addOverload()`, `.addOverloads()`, `.insertOverload()`, or `insertOverloads()` methods.

#### Remove

Call `.remove()` on the overload:

```typescript
overload.remove();
```

### Set body text

The body text can be set via the `.setBodyText()` method:

```typescript
functionDeclaration.setBodyText("const myNumber = 5;");
```

Or alternatively, write the body text with [code-block-writer](https://github.com/dsherret/code-block-writer):

```typescript
functionDeclaration.setBodyText(writer => writer.writeLine("const myNumber = 5;")
    .write("if (myNumber === 5)").block(() => {
        writer.writeLine("console.log('yes')");
    }));
```

Using the writer is very useful because it will write code out using the indentation and newline settings of the AST. It's also easier to use.

### Unwrap

A function declaration can be replaced with its body using the `.unwrap()` method.

Given the following code:

```typescript
function someFunction() {
    function innerFunction() {
    }

    const someDeclaration = 5;
}
```

Calling `.unwrap()` on the function will change the code to the following:

```typescript
function innerFunction() {
}

const someDeclaration = 5;
```

## Function Expressions

They exist in an expression:

```typescript
const add = function(a: number, b: number) { return a + b; };
```

In this case, it can be retrieved via the variable declaration's [initializer](initializers).

```typescript
const functionExpression = sourceFile.getVariableDeclarationOrThrow("add").getInitializerIfKindOrThrow(ts.SyntaxKind.FunctionExpression);
```
