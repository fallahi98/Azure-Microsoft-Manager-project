# Public Deployment

This project can run from one public Render URL.

## What Render Hosts

- React frontend from `Client/dist`
- Flask backend from `Server/app.py`
- PostgreSQL database from Render

## Deploy Steps

1. Push the latest code to GitHub.
2. Go to Render.
3. Choose **New** > **Blueprint**.
4. Connect the GitHub repository.
5. Select the repository and let Render read `render.yaml`.
6. Create the service and database.

Do not create only a **Static Site** for this app. A static site can build the React frontend, but it cannot run Flask or PostgreSQL. Use **Blueprint** so Render creates the Python web service and database.

If Render shows this error:

```text
Couldn't find a package.json file in "/opt/render/project/src"
```

then Render is trying to run npm from the repository root. The repository now includes a root `package.json` bridge, but the recommended fix is still to deploy from **New > Blueprint** using `render.yaml`.

## Required Secret Environment Variables

After Render creates the web service, open the web service settings and add these environment variables:

```text
ADMIN_EMAIL=your-admin-email@example.com
SMTP_FROM_EMAIL=your-email@example.com
BREVO_API_KEY=your-brevo-api-key
```

Render can time out when using direct Gmail SMTP. For Render, use Brevo's HTTPS email API instead:

1. Create or open a Brevo account.
2. Create a transactional email API key.
3. Add the API key to Render as `BREVO_API_KEY`.
4. Make sure `SMTP_FROM_EMAIL` is an email sender that Brevo allows.

Brevo API documentation: https://developers.brevo.com/reference/send-transac-email

## Optional Local Gmail SMTP Settings

If you run the app on your own computer instead of Render, Gmail SMTP can still work locally. Use:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@example.com
SMTP_USE_TLS=false
```

## Optional SMS Setting

The default SMS gateway is Verizon:

```text
SMS_GATEWAY_DOMAIN=vtext.com
```

Only Verizon numbers use `vtext.com`. Other carriers need their own email-to-SMS gateway domain.

## Public URL

After deployment finishes, Render gives a URL like:

```text
https://client-manager.onrender.com
```

Open that URL to use the Client Manager app publicly.
