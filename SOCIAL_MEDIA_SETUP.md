# Social Media Integration Setup

Direct API integration for Instagram and TikTok video posting:

## 🎯 Direct API Integration

### Environment Variables

```bash
# Add to your .env file
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id_here
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token_here
```

## 📸 Instagram Graph API Setup

### Prerequisites:
- ✅ **Facebook account** (personal account required)
- ✅ **Facebook Developer account** 
- ✅ **Facebook Page** (business page)
- ✅ **Instagram Business account** (convert from personal)
- ✅ **Link Instagram to Facebook Page**

### Step-by-Step Setup:

#### 1. Create Facebook Developer Account
- Go to [Facebook Developers](https://developers.facebook.com/)
- Register as a developer
- Verify your account (phone/email)

#### 2. Create Facebook App
- Create new app → "Business" → Next
- App Name: "Penguin Video Generator"
- Add "Instagram Graph API" product

#### 3. Convert Instagram to Business Account
- Instagram → Settings → Account → Switch to Professional Account
- Choose "Business"

#### 4. Create & Connect Facebook Page
- Create a Facebook Page for your business
- Connect Instagram to this Page:
  - Instagram → Settings → Account → Linked Accounts → Facebook
  - Link to your business page

#### 5. Get Access Token
- Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- Select your app
- Generate User Access Token with permissions:
  - `instagram_basic`
  - `instagram_content_publish` 
  - `pages_read_engagement`
  - `pages_show_list`
- Exchange short-lived token for long-lived token (60 days)

#### 6. Get Instagram Business Account ID
- In Graph API Explorer: `GET /me/accounts`
- Find your page ID
- Then: `GET /{page-id}?fields=instagram_business_account`
- Copy the Instagram Business Account ID

## 🎵 TikTok Setup

### Prerequisites
- TikTok account
- TikTok Developer account

### Steps:
1. **Apply for TikTok for Developers:**
   - Go to [TikTok for Developers](https://developers.tiktok.com/)
   - Register as a developer
   - Create a new app

2. **Get API Access:**
   - Apply for Content Posting API access
   - Get your access token through OAuth flow
   - Note: TikTok approval process may take time

## 🚀 Usage

1. Generate your penguin video as usual
2. Once generated, you'll see the "Share to Social Media" section
3. Write your caption
4. Click either "Share to Instagram" or "Share to TikTok"
5. The video will be posted automatically!

## ⚠️ Important Notes

- **Instagram**: Requires Business/Creator account
- **TikTok**: Personal accounts work but need developer approval
- **Video Requirements**: Both platforms have specific video format requirements
- **Rate Limits**: Be mindful of API rate limits for posting

## 🛠️ Troubleshooting

### Common Issues:
1. **"Instagram credentials are required"**: Add your access token and business account ID to .env
2. **"Failed to post to Instagram"**: Check if your access token is valid and has proper permissions
3. **"Failed to post to TikTok"**: Verify your developer account is approved for Content Posting API

### Testing:
- Start with Instagram as it's easier to set up
- Use TikTok's sandbox environment for testing
- Check the console logs for detailed error messages

## 📚 API Documentation

- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)