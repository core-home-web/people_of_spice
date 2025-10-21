# Newsletter Email List Setup Guide

## Auto-Response ✅ Already Configured

All recipe newsletter forms now include automatic email responses that welcome subscribers to People of Spice.

**Auto-response message:**
> "Welcome to People of Spice! Thank you for subscribing to our recipe newsletter. We're excited to share authentic global recipes, cooking tips, and spice blend secrets with you. Get ready to bring the world's flavors to your family table!"

## Email List Management - Setup Required

To build and maintain your email subscriber list, you'll need to connect FormSubmit to an email marketing service using webhooks.

### Recommended Options:

#### Option 1: Make.com (Recommended for Beginners)
1. Go to [Make.com](https://www.make.com) and create a free account
2. Create a new scenario with a "Webhook" trigger
3. Copy the webhook URL from Make
4. Add to your forms: `<input type="hidden" name="_webhook" value="YOUR_MAKE_WEBHOOK_URL">`
5. Connect Make to:
   - **Mailchimp** (email marketing)
   - **Google Sheets** (simple list management)
   - **SendGrid** (transactional emails)
   - **ConvertKit** (creator-focused email)

#### Option 2: Zapier
1. Create a Zap with "Webhooks by Zapier" as trigger
2. Get your webhook URL
3. Add to forms: `<input type="hidden" name="_webhook" value="YOUR_ZAPIER_WEBHOOK_URL">`
4. Connect to your preferred email service

#### Option 3: Google Sheets (Free & Simple)
1. Use Make.com or Zapier to connect FormSubmit → Google Sheets
2. Each submission automatically adds a row with:
   - Email address
   - Recipe subscribed from
   - Timestamp
3. Export list anytime for email campaigns

### Example Webhook Implementation

Add this to each recipe form after the `_autoresponse` field:

```html
<input type="hidden" name="_webhook" value="https://hook.us1.make.com/YOUR_WEBHOOK_ID">
```

### Webhook Response Format

FormSubmit sends data in this format:

```json
{
  "form_data": {
    "email": "user@example.com",
    "Recipe": "Thai Green Curry",
    "_subject": "New Recipe Newsletter Subscription - Thai Green Curry"
  }
}
```

### Current Form Configuration

All 5 recipe pages include:
- ✅ `_subject` - Email subject line with recipe name
- ✅ `_next` - Redirect to thank-you.html
- ✅ `_autoresponse` - Welcome message sent to subscriber
- ✅ `Recipe` field - Tracks which recipe page they subscribed from
- ⏳ `_webhook` - **Ready to add when you choose your email service**

### Next Steps

1. Choose an email marketing platform (Mailchimp, ConvertKit, etc.)
2. Set up Make.com or Zapier
3. Create webhook connection
4. Add webhook URL to forms
5. Test with a submission
6. Start sending newsletters!

---

**Need help?** All forms are already configured and working. You just need to add the webhook URL when you're ready to start building your email list.

