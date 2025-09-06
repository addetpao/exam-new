# Supabase Authentication Configuration Guide

This guide covers the complete setup of Supabase Auth with OAuth providers for the ExamPrep platform.

## Overview

The authentication system implements:
- Email/password authentication with mandatory email verification
- Google and Microsoft OAuth providers
- Single session enforcement via session versioning
- Role-based access control (RBAC)
- Automatic session validation and cleanup

## Environment Configuration

### Required Environment Variables

```bash
# Core Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Update per environment
```

### Environment-Specific URLs

| Environment | App URL | OAuth Redirect URL |
|------------|---------|-------------------|
| Development | `http://localhost:3000` | `http://localhost:3000/auth/callback` |
| Preview | `https://examprep-platform-preview.vercel.app` | `https://examprep-platform-preview.vercel.app/auth/callback` |
| Production | `https://examprep-platform.vercel.app` | `https://examprep-platform.vercel.app/auth/callback` |

## Supabase Dashboard Configuration

### 1. Authentication Settings

Navigate to **Authentication > Settings** in your Supabase dashboard:

#### Site URL Configuration
```
Site URL: https://examprep-platform.vercel.app (production)
```

#### Additional Redirect URLs
Add all environment callback URLs:
```
http://localhost:3000/auth/callback
https://examprep-platform-preview.vercel.app/auth/callback
https://examprep-platform.vercel.app/auth/callback
```

#### Email Templates
Configure custom email templates for:
- **Confirm signup**: Welcome message with verification link
- **Reset password**: Password reset instructions
- **Magic link**: (Optional) For passwordless login

### 2. Email Provider Setup

#### SMTP Configuration (Recommended for Production)
```
SMTP Host: your-smtp-host.com
SMTP Port: 587
SMTP User: noreply@examprep.com
SMTP Pass: your-smtp-password
```

#### Email Template Customization
Update email templates to match ExamPrep branding:
- Use company logo and colors
- Include support contact information
- Add clear call-to-action buttons

## OAuth Provider Configuration

### Google OAuth Setup

1. **Google Cloud Console Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select a project
   - Enable Google+ API
   - Go to **Credentials > OAuth 2.0 Client IDs**

2. **OAuth Client Configuration**
   ```
   Application type: Web application
   Name: ExamPrep Platform
   
   Authorized JavaScript origins:
   - http://localhost:3000 (development)
   - https://examprep-platform-preview.vercel.app (preview)
   - https://examprep-platform.vercel.app (production)
   
   Authorized redirect URIs:
   - http://localhost:3000/auth/callback
   - https://examprep-platform-preview.vercel.app/auth/callback  
   - https://examprep-platform.vercel.app/auth/callback
   ```

3. **Supabase Configuration**
   - Copy Client ID and Client Secret
   - Go to **Authentication > Providers > Google**
   - Enable Google provider
   - Enter Client ID and Client Secret
   - Save configuration

### Microsoft OAuth Setup

1. **Azure AD App Registration**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to **Azure Active Directory > App registrations**
   - Click **New registration**

2. **Application Configuration**
   ```
   Name: ExamPrep Platform
   Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   
   Redirect URI (Web):
   - http://localhost:3000/auth/callback
   - https://examprep-platform-preview.vercel.app/auth/callback
   - https://examprep-platform.vercel.app/auth/callback
   ```

3. **API Permissions**
   - Add **Microsoft Graph** permissions:
     - `openid`
     - `email`
     - `profile`

4. **Client Secret Creation**
   - Go to **Certificates & secrets**
   - Create new client secret
   - Copy the secret value immediately

5. **Supabase Configuration**
   - Copy Application (client) ID and client secret
   - Go to **Authentication > Providers > Azure**
   - Enable Azure provider
   - Enter Client ID and Client Secret
   - Set Azure URL: `https://login.microsoftonline.com/common`
   - Save configuration

## Database Schema Requirements

Ensure the `users` table includes the following fields for session management:

```sql
-- Add session versioning column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version UUID;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_session_version ON users(session_version);

-- Update RLS policies to include session validation
CREATE OR REPLACE FUNCTION auth.user_session_valid()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT session_version = (auth.jwt() ->> 'session_version')::UUID
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Security Settings

### Password Policy
Configure in **Authentication > Settings**:
```
Minimum password length: 8 characters
Require uppercase: Yes
Require lowercase: Yes  
Require numbers: Yes
Require symbols: No (for better UX)
```

### Rate Limiting
```
Max sign-ins per hour: 10
Max sign-ups per hour: 5
Max password resets per hour: 3
```

### Session Settings
```
JWT expiry: 3600 seconds (1 hour)
Refresh token expiry: 2592000 seconds (30 days)
```

## Row Level Security (RLS) Policies

### Users Table Policies
```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
FOR SELECT USING (auth.uid() = id AND auth.user_session_valid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users  
FOR UPDATE USING (auth.uid() = id AND auth.user_session_valid());

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON users
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND auth.user_session_valid()
  AND (
    SELECT app_role = 'admin' 
    FROM users 
    WHERE id = auth.uid()
  )
);
```

## Testing Authentication Flows

### Manual Testing Checklist

#### Email/Password Authentication
- [ ] User registration with email verification
- [ ] Sign in with correct credentials
- [ ] Sign in with incorrect credentials (should fail)
- [ ] Password reset flow
- [ ] Email verification required before access

#### OAuth Authentication
- [ ] Google OAuth sign in/up
- [ ] Microsoft OAuth sign in/up
- [ ] Profile data mapping from OAuth providers
- [ ] Email verification bypass for OAuth users

#### Session Management
- [ ] Single session enforcement (login from second device logs out first)
- [ ] Session validation on protected routes
- [ ] Automatic logout on session conflicts
- [ ] Remember me functionality

#### Role-Based Access
- [ ] Admin access to admin routes
- [ ] Content editor access to editor routes
- [ ] User access restrictions
- [ ] Unauthorized page display for insufficient permissions

### Automated Testing

Use the provided test utilities in `lib/auth/__tests__/`:

```bash
npm test auth
```

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Verify redirect URIs match exactly in provider config
   - Check for trailing slashes or protocol mismatches

2. **Email Verification Not Working**
   - Check SMTP configuration
   - Verify email templates are active
   - Check spam folder

3. **Session Conflicts**
   - Clear browser storage
   - Check session version implementation
   - Verify RLS policies include session validation

4. **Role-Based Access Issues**
   - Check user role assignment in database
   - Verify JWT contains role claims
   - Review RLS policy conditions

### Debug Mode

Enable debug logging by setting:
```bash
NEXT_PUBLIC_DEBUG_AUTH=true
```

This will log detailed auth events to the browser console.

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] OAuth providers configured for production domains
- [ ] SMTP email provider configured
- [ ] Database migrations applied
- [ ] RLS policies enabled and tested
- [ ] Rate limiting configured appropriately
- [ ] Email templates customized with production branding

### Post-Deployment Verification

- [ ] Test complete authentication flows
- [ ] Verify email delivery works
- [ ] Check OAuth provider connectivity
- [ ] Validate session management
- [ ] Test role-based access controls

## Support and Maintenance

### Monitoring

Monitor key authentication metrics:
- Sign-up conversion rates
- Email verification rates  
- OAuth vs email/password usage
- Session conflict frequency
- Authentication error rates

### Regular Maintenance

- Rotate OAuth client secrets quarterly
- Review and update email templates
- Monitor for suspicious authentication patterns
- Update provider configurations as needed

For technical support, contact the development team or refer to the Supabase documentation.