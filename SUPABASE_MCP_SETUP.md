# Supabase MCP Integration Setup Guide

## Issue: Missing Supabase Access Token

The Supabase MCP server is configured but cannot connect because the `SUPABASE_ACCESS_TOKEN` in `.env.local` is a placeholder value.

## Fix: Obtain Real Access Token

### Step 1: Get Supabase Access Token

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/kveahsantuaadsdtgibm
2. **Navigate to Settings**: Click "Settings" in the left sidebar
3. **Access Tokens Section**: Click "Access Tokens" 
4. **Create New Token**:
   - Name: `Claude Code MCP Server`
   - Scopes: Select all needed permissions (typically full access for development)
   - Click "Create Token"
5. **Copy Token**: Copy the generated token (starts with `sbp_...`)

### Step 2: Update Environment Variables

1. **Edit `.env.local`**:
   ```bash
   # Replace this line:
   SUPABASE_ACCESS_TOKEN=sbp_your_supabase_access_token_here
   
   # With your actual token:
   SUPABASE_ACCESS_TOKEN=sbp_your_actual_token_from_dashboard
   ```

2. **Save the file**

### Step 3: Restart Development Server

```bash
# Kill existing dev servers
pkill -f "npm run dev"

# Start fresh server
npm run dev
```

### Step 4: Verify MCP Connectivity

```bash
# Test if MCP can connect to Supabase
node -e "console.log('SUPABASE_ACCESS_TOKEN:', process.env.SUPABASE_ACCESS_TOKEN ? 'Set' : 'Missing')"
```

## Expected Result

After fixing the token:
- ✅ Supabase MCP server can connect to your database
- ✅ Database agents can use MCP tools for schema operations  
- ✅ Future migrations can be deployed automatically via MCP
- ✅ Agents can query database status and manage tables

## Security Note

⚠️ **Never commit the actual token to git**
- The real token gives full access to your Supabase project
- Keep it secure and rotate periodically
- Use different tokens for development vs production

## Troubleshooting

If MCP still doesn't work:
1. Check token has proper permissions in Supabase dashboard
2. Verify environment variable is loaded: `echo $SUPABASE_ACCESS_TOKEN`  
3. Restart your IDE/terminal to pick up new environment variables
4. Test with curl: `curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://kveahsantuaadsdtgibm.supabase.co/rest/v1/`