# Release Guide for Hibit ID SDK

This document outlines the release process for the Hibit ID SDK monorepo using Release-it with @release-it-plugins/workspaces.

## Release Workflow

### One-Command Release

The SDK now uses `@release-it-plugins/workspaces` plugin for unified release management:

```bash
# Interactive release (recommended)
pnpm release

# Dry run to preview changes
pnpm release:dry

# Automated release for CI
pnpm release:ci

# Specific version types
pnpm release:patch  # 1.0.0 -> 1.0.1
pnpm release:minor  # 1.0.0 -> 1.1.0
pnpm release:major  # 1.0.0 -> 2.0.0

# Beta release
pnpm release:beta   # 1.0.0 -> 1.1.0-beta.0
```

### What Happens During Release

When you run `pnpm release`, the system automatically:

1. **Tests & Builds**: Runs `pnpm test:all` and `pnpm build:all`
2. **Version Bump**: Updates version in root `package.json` based on conventional commits
3. **Workspace Updates**:
   - Updates version in all workspace packages
   - Converts `workspace:*` dependencies to actual version numbers (e.g., `^1.2.0`)
4. **Git Operations**: Creates commit and git tag (e.g., `v1.2.0`)
5. **Package Publishing**: Publishes all packages to npm registry
6. **GitHub Release**: Creates GitHub release with automatic changelog

### Workspace Dependencies Handling

The plugin automatically handles `workspace:*` dependencies:

**Development (before release):**

```json
{
  "dependencies": {
    "@delandlabs/crypto-lib": "workspace:*",
    "@delandlabs/coin-base": "workspace:*"
  }
}
```

**Published to npm:**

```json
{
  "dependencies": {
    "@delandlabs/crypto-lib": "^1.2.0",
    "@delandlabs/coin-base": "^1.2.0"
  }
}
```

**After publishing (restored automatically):**

```json
{
  "dependencies": {
    "@delandlabs/crypto-lib": "workspace:*",
    "@delandlabs/coin-base": "workspace:*"
  }
}
```

## Package Publishing Order

The plugin automatically publishes packages in the correct dependency order:

1. `crypto-lib` - Core cryptographic utilities
2. `coin-base` - Base wallet interface
3. Chain-specific packages:
   - `coin-ethereum`
   - `coin-solana`
   - `coin-ton`
   - `coin-tron`
   - `coin-kaspa`
   - `coin-dfinity`
4. `sdk` - Main SDK package (depends on all above)

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format for automatic version detection:

```
type(scope): description

[optional body]

[optional footer]
```

### Types and Version Bumps

- `feat:` commits → **minor** version bump
- `fix:` commits → **patch** version bump
- `BREAKING CHANGE:` in commit → **major** version bump
- `chore:`, `docs:`, etc. → **patch** version bump

### Examples

```bash
git commit -m "feat(ethereum): add support for EIP-1559 transactions"
git commit -m "fix(crypto): resolve key derivation issue for edge cases"
git commit -m "docs: update installation guide"
git commit -m "chore: upgrade dependencies"
```

## Complete Release Process

For a full release, follow these steps:

```bash
# 1. Ensure clean working directory
git status

# 2. Run tests and builds (optional - release does this automatically)
pnpm test:all
pnpm build:all

# 3. Interactive release (handles everything)
pnpm release

# That's it! The plugin handles:
# - Version updates
# - Workspace dependency conversion
# - Package publishing
# - Git tagging
# - GitHub release creation
```

## GitHub Integration

The release process automatically:

- Creates git tags (v1.0.0, v1.1.0, etc.)
- Generates GitHub releases with changelog
- Uses conventional commit messages to categorize changes
- Links commits to GitHub issues and PRs

## Troubleshooting

### Failed Release

If a release fails:

```bash
# Reset to previous state
git tag -d v1.2.0  # Remove created tag if any
git reset --hard HEAD~1  # Reset commit if any

# Fix issues and retry
pnpm release
```

### Package Publication Issues

```bash
# Check package status
npm view @delandlabs/hibit-id-sdk

# Check npm authentication
npm whoami

# Manual publish (rarely needed)
cd packages/sdk
npm publish --access public
```

### Version Conflicts

The plugin handles version conflicts automatically by:

- Updating all workspace packages to the same version
- Converting workspace dependencies consistently
- Maintaining dependency order during publishing

## Configuration

- `.release-it.js` - Main release configuration with workspaces plugin
- `CHANGELOG.md` - Automatically generated changelog
- `package.json` workspaces field - Defines publishable packages

## Best Practices

1. **Use conventional commits** for automatic version detection
2. **Test before releasing**: `pnpm test:all && pnpm build:all`
3. **Use dry run** for new configurations: `pnpm release:dry`
4. **Keep commits focused** and use descriptive messages
5. **Review generated changelog** before confirming release
6. **Monitor npm publication** - verify packages are accessible
7. **Coordinate releases** - avoid multiple simultaneous releases

## Migration from Custom Scripts

The SDK has migrated from custom release scripts to `@release-it-plugins/workspaces`:

- ✅ **Simplified workflow** - Single command instead of multiple steps
- ✅ **Automatic workspace handling** - No manual dependency conversion needed
- ✅ **Standard tooling** - Uses official release-it plugin
- ✅ **Better error handling** - Plugin handles edge cases automatically
