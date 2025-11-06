# Airtable Integration Setup Guide

This guide explains how to connect your People of Spice website to your Airtable database securely using Cloudflare Pages Functions.

## 🔒 Security

**IMPORTANT:** Your Airtable access token is stored as an environment variable in Cloudflare Pages and is **never** committed to GitHub. The token only exists server-side in Cloudflare's secure environment.

## 📋 Prerequisites

- Airtable base ID: `appOLeQs1TFrsSbe2`
- Airtable Personal Access Token (PAT)
- Cloudflare Pages project: `peopleofspice-pages`

## 🚀 Setup Steps

### 1. Set Environment Variables in Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Pages** → **peopleofspice-pages**
3. Click on **Settings** → **Environment Variables**
4. Add the following variables:

   **Variable Name:** `AIRTABLE_TOKEN`  
   **Value:** `your_airtable_personal_access_token_here`

   **Variable Name:** `AIRTABLE_BASE_ID` (optional, defaults to your base)  
   **Value:** `appOLeQs1TFrsSbe2`

5. Make sure to add these to **Production**, **Preview**, and **Branch Preview** environments if needed
6. Click **Save**

### 2. Deploy Your Changes

After setting the environment variables, deploy your site:

```bash
npm run deploy
```

Or push to GitHub (if you have auto-deploy enabled):
```bash
git add .
git commit -m "Add Airtable integration"
git push origin main
```

## 💻 Usage in Your Website

### Include the Airtable Client Script

Add this script tag to any HTML page where you want to use Airtable:

```html
<script src="js/airtable.js"></script>
```

### Example: Fetch Records from a Table

```html
<!DOCTYPE html>
<html>
<head>
  <title>Airtable Example</title>
</head>
<body>
  <div id="products"></div>

  <script src="js/airtable.js"></script>
  <script>
    // Fetch all records from a table called "Products"
    airtable.getRecords('Products')
      .then(data => {
        console.log('Records:', data.records);
        // Display records
        const container = document.getElementById('products');
        data.records.forEach(record => {
          const div = document.createElement('div');
          div.innerHTML = `<h3>${record.fields.Name}</h3>`;
          container.appendChild(div);
        });
      })
      .catch(error => {
        console.error('Error:', error);
      });
  </script>
</body>
</html>
```

### Example: Get a Single Record

```javascript
// Get a specific record by ID
airtable.getRecord('Products', 'rec1234567890')
  .then(record => {
    console.log('Product:', record);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Example: Create a New Record

```javascript
// Create a new record
airtable.createRecord('Newsletter Subscribers', {
  Email: 'user@example.com',
  Name: 'John Doe',
  Source: 'Website Form'
})
  .then(result => {
    console.log('Created:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Example: Update a Record

```javascript
// Update an existing record
airtable.updateRecord('Newsletter Subscribers', 'rec1234567890', {
  Status: 'Active',
  Subscribed: true
})
  .then(result => {
    console.log('Updated:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Example: Filter Records

```javascript
// Get records with a filter
airtable.getRecords('Products', {
  filterByFormula: "{Status} = 'Active'",
  maxRecords: 50
})
  .then(data => {
    console.log('Active products:', data.records);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## 🔌 API Endpoint

The server-side function is available at:
```
/api/airtable
```

### Query Parameters (GET requests):
- `table` (required) - Table name
- `recordId` (optional) - Get specific record
- `view` (optional) - View name (default: "Grid view")
- `maxRecords` (optional) - Max records to return (default: 100)
- `filterByFormula` (optional) - Airtable filter formula

### POST Request Body:
For creating records:
```json
{
  "fields": {
    "Name": "Product Name",
    "Price": 29.99
  }
}
```

For updating records (include `recordId` in query):
```json
{
  "fields": {
    "Status": "Active"
  }
}
```

## 🧪 Testing Locally

To test locally with Wrangler:

1. Create a `.dev.vars` file in the project root (this file is gitignored):
```
AIRTABLE_TOKEN=your_airtable_personal_access_token_here
AIRTABLE_BASE_ID=appOLeQs1TFrsSbe2
```

2. Run the dev server:
```bash
npm run dev
```

3. Test the API endpoint:
```bash
curl "http://localhost:8788/api/airtable?table=YourTableName"
```

## 📚 Airtable API Documentation

For more advanced usage, refer to the [Airtable API documentation](https://airtable.com/developers/web/api/introduction).

## 🐛 Troubleshooting

### Error: "Airtable token not configured"
- Make sure you've set `AIRTABLE_TOKEN` in Cloudflare Pages environment variables
- Redeploy your site after adding environment variables

### Error: "Table name is required"
- Make sure you're passing the `table` parameter in your API call
- Table names are case-sensitive and must match exactly

### CORS Errors
- The API endpoint includes CORS headers, but if you're testing from a different domain, make sure CORS is properly configured

### 404 on `/api/airtable`
- Make sure the `functions/api/airtable.js` file exists
- Redeploy your site after adding the functions directory

## 🔐 Security Best Practices

1. ✅ **DO**: Store tokens in Cloudflare Pages environment variables
2. ✅ **DO**: Use server-side functions (Cloudflare Pages Functions) for API calls
3. ✅ **DO**: Keep `.dev.vars` in `.gitignore` (already done)
4. ❌ **DON'T**: Commit tokens to GitHub
5. ❌ **DON'T**: Make Airtable API calls directly from client-side JavaScript
6. ❌ **DON'T**: Expose tokens in HTML or JavaScript files

## 📝 Notes

- The base ID (`appOLeQs1TFrsSbe2`) is hardcoded in the function but can be overridden with the `AIRTABLE_BASE_ID` environment variable
- All API calls are proxied through Cloudflare Pages Functions, keeping your token secure
- The client-side helper (`js/airtable.js`) makes it easy to use Airtable from your frontend code

