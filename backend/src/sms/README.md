# SMS Providers Configuration

This application supports multiple SMS providers. You can switch between them by setting the appropriate environment variables.

## Available Providers

### 1. Twilio (Recommended - Most Reliable)

Twilio is a cloud-based SMS service that is generally more reliable than Vonage.

**Setup:**

1. Create an account at https://www.twilio.com/
2. Get your Account SID and Auth Token from the dashboard:
   - Go to https://console.twilio.com/
   - Your Account SID and Auth Token are displayed on the dashboard
3. Get a phone number:
   - Go to https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
   - Click "Buy a number" or use a trial number (if available)
   - Select a number with SMS capabilities
   - Copy the phone number (format: +1234567890)
4. Add to your `.env`:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

**Note:** If you're on a free trial, Twilio provides a trial number that you can use. Check your Twilio console for the trial number.

**Pros:**

- Very reliable
- Good documentation
- Free trial available
- Good delivery rates

**Cons:**

- Requires purchasing a phone number (can be expensive)
- Pay-per-SMS pricing

---

### 2. SMS Gateway (Use Your Own Phone Number)

Send SMS via your Android smartphone using an SMS Gateway app. This uses your own phone number and doesn't require a paid service.

**Setup:**

1. Install "SMS Gateway" app on your Android phone:
   - https://play.google.com/store/apps/details?id=com.aj.smsgateway
   - Or search for "SMS Gateway" in Play Store
2. Configure the app:
   - Enable HTTP API
   - Set a port (default: 8080)
   - Optionally set an authentication token
3. Find your phone's IP address on your local network
4. Add to your `.env`:
   ```env
   SMS_GATEWAY_URL=http://YOUR_PHONE_IP:8080
   SMS_GATEWAY_TOKEN=your_token_if_configured
   ```

**Important:** Your phone must be on the same network as your backend server, or you need to set up port forwarding/ngrok.

**Pros:**

- Uses your own phone number (free)
- No per-SMS costs
- Works with your existing phone plan

**Cons:**

- Requires Android phone
- Phone must be on and connected to network
- More complex setup
- Less reliable if phone goes offline

---

### 3. Vonage (Legacy - Not Recommended)

Vonage is kept for backward compatibility but is not recommended due to reliability issues.

**Setup:**

```env
VONAGE_API_KEY=your_key
VONAGE_API_SECRET=your_secret
VONAGE_FROM_NUMBER=SecretSanta
```

---

## Provider Selection Priority

The system automatically selects a provider based on environment variables (in order of priority):

1. **SMS Gateway** - If `SMS_GATEWAY_URL` is set
2. **Twilio** - If `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set
3. **Vonage** - If `VONAGE_API_KEY` and `VONAGE_API_SECRET` are set (legacy)

## Phone Number Format

All providers expect phone numbers in E.164 format:

- French numbers: `+33612345678` (with country code +33)
- The system automatically validates and formats numbers to 11 digits (removing the + for providers that need it)

## Testing

Use the "Dry-run SMS" feature in the Events page to test your SMS configuration without actually sending messages.
