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

## Required Secret Environment Variables

After Render creates the web service, open the web service settings and add these environment variables:

```text
ADMIN_EMAIL=your-admin-email@example.com
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-email-app-password
SMTP_FROM_EMAIL=your-email@example.com
```

For Gmail, `SMTP_PASSWORD` must be a Gmail app password, not the normal Gmail login password.

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
