# Environment Configuration Setup

## .env File Created ✅

The `.env` file has been created in the project root directory with the following content:

```env
# Environment Configuration

# API Configuration
VITE_API_BASE_URL=http://localhost:3274/api/v0
VITE_BACKEND_URL=http://localhost:3274

# Application Information
VITE_APP_NAME=Inventory Management System
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Comprehensive inventory and order management system
VITE_APP_AUTHOR=MISA Team
VITE_APP_CONTACT=support@misa.com
VITE_APP_WEBSITE=https://misa.com

# Environment Mode
VITE_NODE_ENV=development

# Debug and Logging
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=info
VITE_ENABLE_LOGGING=true

# API Settings
VITE_API_TIMEOUT=30000
VITE_MAX_RETRY_ATTEMPTS=3

# Features
VITE_ENABLE_ANALYTICS=false
```

## Environment Variables

### API Configuration
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_API_BASE_URL` | Base URL for API calls | `http://localhost:3274/api/v0` |
| `VITE_BACKEND_URL` | Backend server URL | `http://localhost:3274` |

### Application Information
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_APP_NAME` | Application name | `Inventory Management System` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |
| `VITE_APP_DESCRIPTION` | Application description | `Comprehensive inventory and order management system` |
| `VITE_APP_AUTHOR` | Application author | `MISA Team` |
| `VITE_APP_CONTACT` | Contact email | `support@misa.com` |
| `VITE_APP_WEBSITE` | Application website | `https://misa.com` |

### Environment Settings
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_NODE_ENV` | Environment mode | `development` |

### Debug and Logging
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_DEBUG_MODE` | Enable debug mode | `true` |
| `VITE_LOG_LEVEL` | Logging level | `info` |
| `VITE_ENABLE_LOGGING` | Enable logging | `true` |

### API Settings
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_API_TIMEOUT` | API request timeout (ms) | `30000` |
| `VITE_MAX_RETRY_ATTEMPTS` | Maximum retry attempts | `3` |

### Features
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_ENABLE_ANALYTICS` | Enable analytics tracking | `false` |

## Usage

The environment variables are automatically loaded by Vite and can be accessed directly in the application using `import.meta.env.VITE_*`.

## Next Steps

1. **Restart your development server** to load the new environment variables:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Verify the configuration** by checking the browser console for any environment-related logs

## Important Notes

- All environment variables must be prefixed with `VITE_` to be accessible in the frontend
- The `.env` file should be added to `.gitignore` to avoid committing sensitive configuration
- For production, update the URLs to point to your production backend
- Changes to `.env` require restarting the development server to take effect
