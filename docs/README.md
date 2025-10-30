# Collaborative Code Review API Documentation

## Overview

This API provides comprehensive functionality for collaborative code review with real-time features, including pull request management, commenting, reviewer assignments, and live notifications.

## Base URL

```
http://localhost:4000/api
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting Started

1. **Register a new user**
2. **Login to get JWT token**
3. **Create a project**
4. **Create pull requests**
5. **Add comments and assign reviewers**

## Quick Start Examples

### 1. User Registration & Login

```bash
# Register new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Login to get JWT token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64f5e8b2c4a7d8f9e0a1b2c3",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### 2. Project Management

```bash
# Create a project
curl -X POST http://localhost:4000/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome Project",
    "description": "A project for building awesome features"
  }'

# Get all projects
curl -X GET http://localhost:4000/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Branch Protection Rules

Our platform implements comprehensive branch protection rules that ensure code quality through enforced review processes and automated checks.

### Key Features
- **Real-time Protection Status**: Live validation of merge requirements
- **Smart Merge Controls**: Context-aware merge buttons with protection awareness  
- **GitHub Integration**: Seamless integration with GitHub Actions CI/CD pipeline
- **Admin Override**: Emergency force merge capabilities with audit logging

### Quick Example - Check Protection Status
```bash
curl -X GET http://localhost:4000/api/pull-requests/PR_ID/protection-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Quick Example - Merge with Protection
```bash
curl -X POST http://localhost:4000/api/pull-requests/PR_ID/merge \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mergeMethod": "squash"}'
```

📖 **For complete setup and configuration guide, see [Branch Protection Documentation](./branch-protection.md)**

### 3. Pull Request Operations

```bash
# Create a pull request
curl -X POST http://localhost:4000/api/pull-requests/PROJECT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add user authentication feature",
    "description": "Implements JWT-based authentication with proper error handling",
    "sourceBranch": "feature/auth",
    "targetBranch": "main",
    "files": [
      {
        "path": "src/auth.js",
        "changeType": "added",
        "newContent": "const jwt = require(\"jsonwebtoken\");\n\nmodule.exports = { generateToken };"
      },
      {
        "path": "src/routes.js", 
        "changeType": "modified",
        "oldContent": "// No auth routes",
        "newContent": "app.post(\"/login\", loginHandler);\napp.post(\"/register\", registerHandler);"
      }
    ]
  }'

# Get pull requests with filtering and pagination
curl -X GET "http://localhost:4000/api/pull-requests/repository/PROJECT_ID?page=1&limit=10&status=open&search=auth" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update pull request status
curl -X PATCH http://localhost:4000/api/pull-requests/PR_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### 4. Comments and Reviews

```bash
# Add a general comment
curl -X POST http://localhost:4000/api/pull-requests/PR_ID/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great work! The authentication logic looks solid."
  }'

# Add a line-specific comment
curl -X POST http://localhost:4000/api/pull-requests/PR_ID/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Consider adding input validation here",
    "filePath": "src/auth.js",
    "lineNumber": 15
  }'

# Assign reviewers
curl -X PATCH http://localhost:4000/api/pull-requests/PR_ID/assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewerIds": ["USER_ID_1", "USER_ID_2"]
  }'
```

## Advanced Features

### 1. Search and Filtering

The API supports comprehensive search and filtering capabilities:

```bash
# Search by title/description with status filter
curl -X GET "http://localhost:4000/api/pull-requests/repository/PROJECT_ID?search=authentication&status=open&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by assignment
curl -X GET "http://localhost:4000/api/pull-requests/repository/PROJECT_ID?assignedTo=me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get unassigned PRs
curl -X GET "http://localhost:4000/api/pull-requests/repository/PROJECT_ID?assignedTo=unassigned" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Pagination Response Format

```json
{
  "pullRequests": [
    {
      "_id": "64f5e8b2c4a7d8f9e0a1b2c3",
      "title": "Add authentication",
      "status": "open",
      "author": {
        "_id": "64f5e8b2c4a7d8f9e0a1b2c4",
        "username": "john_doe"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 25,
    "hasNextPage": true,
    "hasPrevPage": false,
    "limit": 10
  }
}
```

### 3. Real-time Features (WebSocket)

The API includes Socket.IO for real-time updates:

```javascript
// Frontend JavaScript example
const socket = io('http://localhost:4000');

// Join a pull request room for real-time updates
socket.emit('joinPRRoom', pullRequestId);

// Listen for new comments
socket.on('commentAdded', (data) => {
  console.log('New comment:', data.comment);
  // Update UI with new comment
});

// Listen for reviewer assignments
socket.on('reviewerAssigned', (data) => {
  console.log('New reviewer assigned:', data.assignedReviewer);
});

// Leave room when done
socket.emit('leavePRRoom', pullRequestId);
```

## Error Handling

The API returns consistent error responses:

```json
{
  "message": "Detailed error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `422` - Validation failed
- `500` - Internal server error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General API endpoints**: 100 requests per minute per user
- **Comment creation**: 10 requests per minute

## Testing

### Using Postman

1. Import the provided Postman collection: `docs/postman-collection.json`
2. Set environment variables:
   - `base_url`: `http://localhost:4000/api`
   - `auth_token`: Your JWT token (auto-populated after login)
3. Run the collection to test all endpoints

### Using curl

```bash
# Test authentication flow
./test-scripts/auth-flow.sh

# Test pull request workflow  
./test-scripts/pr-workflow.sh

# Test real-time features
./test-scripts/realtime-test.sh
```

## Data Models

### Pull Request Status Flow

```
draft → open → reviewing → approved/rejected → merged/closed
```

Valid status transitions:
- `draft` → `open`
- `open` → `reviewing`, `closed`, `draft`
- `reviewing` → `approved`, `rejected`, `open`
- `approved` → `merged`, `open`
- `rejected` → `open`
- Any status → `closed`

### File Change Types

- `added` - New file
- `modified` - Existing file with changes
- `deleted` - Removed file

## Performance Considerations

### Pagination Best Practices

- Use reasonable page sizes (10-50 items)
- Implement client-side caching for better UX
- Use search filters to reduce data transfer

### Real-time Optimization

- Only join rooms for active PR pages
- Leave rooms when navigating away
- Implement reconnection logic for network issues

## Security

### Authentication Security

- JWT tokens expire after 24 hours
- Tokens include user ID and role information
- Passwords are hashed with bcrypt (12 rounds)

### Authorization Levels

- **Project Owner**: Full project management rights
- **Collaborator**: Can create PRs, comment, review
- **Reviewer**: Can comment and approve/reject assigned PRs

### Input Validation

All endpoints validate input data:
- Email format validation
- Password strength requirements (8+ chars)
- File path validation (prevents directory traversal)
- Content length limits (comments: 10KB max)

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   ```bash
   # Check if token is valid
   curl -X GET http://localhost:4000/api/auth/verify \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **403 Forbidden**
   - Verify user has proper project access
   - Check if user is assigned as collaborator

3. **404 Not Found**
   - Verify resource IDs are correct
   - Check if resource exists and user has access

4. **Real-time not working**
   - Verify Socket.IO connection
   - Check browser console for connection errors
   - Ensure CORS settings allow your domain

### Debug Mode

Enable debug logging by setting environment variable:

```bash
export DEBUG=collab-review:*
npm start
```

## Support

For additional support:

1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review the integration tests in `/backend/tests/`
3. Use the Postman collection for endpoint testing
4. Enable debug mode for detailed logging

## API Changelog

### v1.0.0 (Current)
- Initial release
- JWT authentication
- Pull request management
- Real-time comments
- Search and filtering
- Pagination support
- Reviewer assignments

### Implemented Features
- Branch protection rules with local enforcement
- GitHub Actions CI/CD pipeline
- Real-time status validation
- Smart merge controls with protection awareness

### Upcoming Features
- Code review templates
- Slack/Discord notifications
- Advanced analytics and reporting
- Custom protection rule templates