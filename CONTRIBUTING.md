# Contributing to German Wordle Game

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Publishing others' private information
- Other unprofessional conduct

## Getting Started

### Prerequisites

- Python 3.11+
- Git
- Google Cloud account (for testing Vertex AI features)
- Basic understanding of Flask and JavaScript

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/word-guessing-ai-game-german.git
   cd word-guessing-ai-game-german
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/word-guessing-ai-game-german.git
   ```

## Development Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.template` to `.env` and fill in your values:

```bash
cp .env.template .env
# Edit .env with your GCP credentials
```

**Minimum required for local testing**:
```
GCP_PROJECT_ID=your-project-id
GCP_REGION=europe-west3
BUCKET_NAME=test-bucket-name
ADMIN_PASSWORD=test123
FLASK_SECRET_KEY=dev-secret-key
ENVIRONMENT=development
```

### 4. Set Up GCP Authentication

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### 5. Run Locally

```bash
python flask_app.py
```

Visit http://localhost:8080

## Making Changes

### Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/your-feature`: Individual features
- `bugfix/issue-number`: Bug fixes

### Creating a Feature Branch

```bash
git checkout -b feature/add-new-feature
```

### Development Workflow

1. **Keep your fork updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Make your changes** in small, logical commits

3. **Test your changes** thoroughly

4. **Commit with meaningful messages**:
   ```bash
   git commit -m "Add feature: detailed description"
   ```

## Submitting Changes

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Documentation updated if needed
- [ ] Commits are clean and well-described
- [ ] No secrets or credentials in code

### Pull Request Process

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

2. **Open a Pull Request** on GitHub:
   - Provide clear title and description
   - Reference any related issues
   - Explain what changed and why
   - Include screenshots for UI changes

3. **Review Process**:
   - Maintainers will review your PR
   - Address any feedback
   - Once approved, it will be merged

### PR Template

```markdown
## Description
Brief description of changes

## Related Issue
Fixes #(issue number)

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes
```

## Coding Standards

### Python (Backend)

**Style Guide**: [PEP 8](https://pep8.org/)

**Key Points**:
- 4 spaces for indentation
- Max line length: 100 characters
- Use docstrings for functions
- Type hints encouraged

**Example**:
```python
def calculate_score(attempts: int) -> int:
    """
    Calculate score based on number of attempts.
    
    Args:
        attempts: Number of attempts taken (1-6)
        
    Returns:
        Score value (1-6), or 0 if failed
    """
    if 1 <= attempts <= 6:
        return 7 - attempts
    return 0
```

**Tools**:
```bash
# Format code
black flask_app.py

# Lint code
flake8 flask_app.py
pylint flask_app.py
```

### JavaScript (Frontend)

**Style Guide**: [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

**Key Points**:
- 2 spaces for indentation
- Use `const` and `let`, avoid `var`
- Use arrow functions
- Use template literals
- Semicolons required

**Example**:
```javascript
const calculateScore = (attempts) => {
  if (attempts >= 1 && attempts <= 6) {
    return 7 - attempts;
  }
  return 0;
};
```

**Tools**:
```bash
# Lint JavaScript
eslint static/js/game.js

# Format JavaScript
prettier --write static/js/game.js
```

### HTML/CSS

**HTML**:
- Semantic HTML5 tags
- Proper indentation (2 spaces)
- Meaningful class names

**CSS**:
- BEM naming convention encouraged
- Mobile-first responsive design
- Use CSS variables for theming

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(game): add difficulty levels
fix(leaderboard): correct sorting algorithm
docs(readme): update installation instructions
style(css): improve mobile responsive design
refactor(api): simplify word validation logic
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_game_logic.py

# Run with coverage
pytest --cov=. --cov-report=html
```

### Writing Tests

**Location**: Place tests in `tests/` directory

**Example** (`tests/test_game_logic.py`):
```python
import pytest
from flask_app import calculate_feedback

def test_calculate_feedback_all_correct():
    target = "HAUS"
    guess = "HAUS"
    feedback = calculate_feedback(guess, target)
    assert all(item['status'] == 'correct' for item in feedback)

def test_calculate_feedback_duplicate_letters():
    target = "GROSS"
    guess = "SOSSS"
    feedback = calculate_feedback(guess, target)
    expected_statuses = ['present', 'correct', 'absent', 'correct', 'correct']
    actual_statuses = [item['status'] for item in feedback]
    assert actual_statuses == expected_statuses
```

### Manual Testing Checklist

Before submitting, manually test:

- [ ] Game initialization
- [ ] Letter input (keyboard and clicks)
- [ ] Word submission (valid and invalid)
- [ ] Win/loss scenarios
- [ ] Leaderboard updates
- [ ] Username setting
- [ ] Admin reset functionality
- [ ] Mobile responsive design
- [ ] Error handling

## Project Structure

```
word-guessing-ai-game-german/
├── flask_app.py          # Main Flask application
├── config.py             # Configuration management
├── word_generator_vertex.py  # Vertex AI integration
├── requirements.txt      # Python dependencies
├── Dockerfile           # Container definition
├── .env.template        # Environment variable template
├── .gitignore          # Git ignore rules
│
├── static/
│   ├── css/
│   │   └── style.css    # Styling
│   └── js/
│       └── game.js      # Game logic
│
├── templates/
│   └── game.html        # Main game template
│
├── terraform/
│   ├── main.tf         # Infrastructure as code
│   └── README.md       # Terraform documentation
│
├── tests/              # Test files
│   └── test_*.py
│
└── docs/               # Documentation
    ├── README.md
    ├── API.md
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    └── CONTRIBUTING.md
```

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Implement feature with tests
3. Update documentation
4. Submit PR

### Fixing a Bug

1. Create bugfix branch
2. Write failing test that reproduces bug
3. Fix the bug
4. Ensure test passes
5. Submit PR

### Updating Documentation

1. Edit relevant `.md` files
2. Ensure code examples are accurate
3. Check formatting with Markdown linter
4. Submit PR

### Adding Dependencies

1. Add to `requirements.txt`
2. Update documentation if needed
3. Explain why dependency is needed in PR

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## Recognition

Contributors will be acknowledged in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
