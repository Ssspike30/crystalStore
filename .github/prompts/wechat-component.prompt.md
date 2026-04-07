---
description: "Generate WeChat mini-program components with proper TypeScript types and lifecycle methods"
name: "WeChat Component Generator"
argument-hint: "Component name and features (e.g., 'login-form with validation')"
agent: "agent"
---

Generate a complete WeChat mini-program component based on the provided specification. Follow these guidelines:

## Component Structure
Create the following files in the appropriate directory:
- `{componentName}.wxml` - Template markup
- `{componentName}.wxss` - Styles
- `{componentName}.ts` - TypeScript logic with proper types
- `{componentName}.json` - Component configuration

## Requirements
- Use TypeScript with proper interfaces for data and properties
- Implement all relevant lifecycle methods (onLoad, onShow, onHide, onUnload)
- Handle network requests with proper error handling and loading states
- Follow WeChat mini-program best practices
- Include comments for complex logic
- Use camelCase for variables, PascalCase for component names

## Output Format
Provide the complete code for each file, ready to copy into the project. Include any necessary imports and type definitions.

Component specification: {user_input}