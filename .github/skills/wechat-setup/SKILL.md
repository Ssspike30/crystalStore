---
name: wechat-setup
description: 'Set up complete WeChat mini-program projects with frontend/backend structure, configuration files, and documentation. Use for initializing new WeChat projects or adding missing components to existing ones.'
argument-hint: 'Project features (e.g., "e-commerce with user auth")'
---

# WeChat Project Setup

## When to Use
- Initializing a new WeChat mini-program project
- Adding missing frontend or backend structure
- Setting up configuration files for WeChat development
- Creating documentation and CI/CD for WeChat projects

## Procedure

1. **Analyze Requirements**
   - Determine project scope (e-commerce, social, utility)
   - Identify required features (auth, payments, data storage)
   - Choose backend technology (Node.js recommended)

2. **Create Project Structure**
   - Set up `frontend/miniprogram/` directory with standard WeChat files
   - Create `backend/` directory with Node.js/Express structure
   - Add `docs/` for architecture and API documentation

3. **Generate Configuration Files**
   - Frontend: `app.json`, `project.config.json`, `tsconfig.json`
   - Backend: `package.json`, server setup
   - CI/CD: GitHub Actions workflow for automated testing

4. **Initialize Dependencies**
   - Install frontend dependencies (WeChat types, UI libraries)
   - Set up backend dependencies (Express, database drivers)
   - Configure development scripts

5. **Create Documentation**
   - Generate `README.md` with setup and run instructions
   - Create `docs/ARCHITECTURE.md` outlining system design
   - Add `CONTRIBUTING.md` with development guidelines

6. **Validate Setup**
   - Run build commands to ensure everything works
   - Test basic functionality (hello world page)

## Resources
- [Frontend Template](./assets/frontend-template.json)
- [Backend Template](./assets/backend-template.js)
- [CI Workflow](./assets/ci-workflow.yml)