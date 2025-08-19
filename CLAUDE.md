# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Style
- Maintain a professional, neutral tone in all communications
- Use exclamation points sparingly and only when genuinely necessary
- Approach problems with the measured perspective of an experienced software engineer
- Keep a level head when discussing technical challenges and solutions
- Focus on clear, factual explanations without unnecessary enthusiasm

## Development requirements
To develop Dory, follow the below requirements every time you do a task:
1. Clean code is paramount—make sure it is easy to understand and follow
2. Do not overengineer if you can help it—only add what is required.
3. Do not remove or modify existing functionally UNLESS you have to and UNLESS you can justify it.
4. Do not change existing variable names UNLESS absolutely necessary.
5. Do not leave unused code lying around.
6. Ask as many questions as you have to in order to understand your task.
7. You MUST use multiple subagents wherever possible to help you accomplish your task faster.

## Project Overview

Dory is a lightweight static site generator for technical documentation, published as `@clidey/dory` on npm. It uses Preact, Vite, TypeScript, and Tailwind CSS.

## Essential Commands

```bash
# Install dependencies
pnpm install

# Development server with hot reload
pnpm run dev

# Build the project (includes TypeScript checking)
pnpm run build

# Preview built site
pnpm run preview

# Publish to npm
pnpm run publish

# CLI commands (after build)
node bin/dory.js build    # Build documentation site
node bin/dory.js preview  # Serve built site
```

## High-Level Architecture

### Core Technologies
- **Frontend**: Preact (React-compatible)
- **Build**: Vite with custom plugins
- **Styling**: Tailwind CSS v4 + SCSS
- **Content**: MDX (Markdown + JSX)
- **Language**: TypeScript (strict mode)

### Key Directories
- `bin/` - CLI tool implementation
- `src/components/` - UI components (Header, Footer, Search, etc.)
- `src/mdx/` - MDX-specific components (Code, Tabs, Mermaid)
- `src/plugins/` - Custom Vite plugins for LLM support
- `docs/` - Documentation content (MDX files)

### Important Files
- `dory.json` - Site configuration (navigation, branding)
- `vite.config.ts` - Build configuration with custom plugins
- `src/main.tsx` - Application entry point
- `src/store.ts` - Global state management

### Custom Vite Plugins
1. **llm-txt-generator**: Generates `llms.txt` files for AI consumption
2. **llm-txt-dev-server**: Serves LLM-friendly content in development
3. **remarkSafeVars**: Sanitizes MDX content for security

### Development Patterns
- Functional components with hooks
- MDX Provider pattern for content rendering
- Custom store for state management (dark mode, search)
- Tailwind utilities for styling
- No test framework currently configured

### Key Features to Maintain
- MDX support with custom components
- Client-side search with FlexSearch
- API Playground for OpenAPI specs
- Mermaid diagram rendering
- LaTeX math with KaTeX
- Dark mode toggle
- Responsive navigation

When making changes:
- Ensure TypeScript strict mode compliance
- Follow existing component patterns in `src/components/`
- Update `dory.json` for navigation changes
- Test both light and dark modes
- Verify MDX content renders correctly

## Common Command Guidelines

### Git Commands
```bash
# Check current status before making changes
git status

# View uncommitted changes
git diff
git diff --staged  # for staged changes

# Stage and commit changes
git add -A  # Stage all changes
git commit -m "feat(component): add new feature"  # Use conventional commits

# Branch operations
git checkout -b feature/new-feature  # Create and switch to new branch
git push -u origin feature/new-feature  # Push new branch to remote

# View recent commits
git log --oneline -10  # Last 10 commits
```

### npm/pnpm Commands
```bash
# Always use pnpm in this project (not npm or yarn)
pnpm install  # Install dependencies
pnpm add <package>  # Add new dependency
pnpm add -D <package>  # Add dev dependency
pnpm remove <package>  # Remove dependency

# Check for outdated packages
pnpm outdated

# Run scripts from package.json
pnpm run <script-name>
```

### Bash/Shell Commands
```bash
# Navigate directories
cd src/components  # Change to components directory
pwd  # Show current directory

# File operations
ls -la  # List all files with details
mkdir -p src/new-feature  # Create directories recursively
rm -rf dist  # Remove build directory (be careful!)

# Search and find
grep -r "searchTerm" src/  # Search in source files
find . -name "*.tsx" -type f  # Find all TSX files

# Process management
lsof -i :5173  # Check what's using the dev server port
kill -9 <PID>  # Force kill a process if needed
```

### Development Workflow Commands
```bash
# Start fresh development session
git pull origin main
pnpm install
pnpm run dev

# Before committing
pnpm run build  # Ensure build passes
git status  # Review changes
git diff  # Check modifications

# After making changes
git add -A
git commit -m "type(scope): description"
git push

# Publishing new version
pnpm version patch/minor/major
pnpm run build
pnpm run publish
```