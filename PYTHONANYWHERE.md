# PythonAnywhere Deployment

Use PythonAnywhere to host the public app. For reliable SMS, use Twilio. Gmail-to-Verizon email gateway sending remains available only as a fallback.

## 1. Open a Paid PythonAnywhere Account

Use a paid/custom PythonAnywhere plan so the app can use PostgreSQL and Gmail SMTP reliably.

## 2. Clone the GitHub Repository

In a PythonAnywhere Bash console:

```bash
git clone https://github.com/fallahi98/Client-Manager-project.git
cd Client-Manager-project
```

## 3. Create a Virtual Environment

```bash
python3.10 -m venv venv
source venv/bin/activate
pip install -r Server/requirements.txt
```

If PythonAnywhere uses a newer Python version, use that version in both the virtualenv command and the Web tab.

## 4. Set Up PostgreSQL

In PythonAnywhere, open the **Databases** tab and create a PostgreSQL database.

Then create this private file:

```bash
cp Server/pythonanywhere.env.example Server/pythonanywhere.env
nano Server/pythonanywhere.env
```

Fill in the PostgreSQL values from PythonAnywhere:

```text
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=your-postgres-database
DB_USER=your-postgres-username
DB_PASSWORD=your-postgres-password
```

## 5. Set Up Email and SMS

In the same `Server/pythonanywhere.env` file, set:

```text
ADMIN_EMAIL=your-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_USE_TLS=true
SMS_GATEWAY_DOMAIN=vtext.com
```

`SMTP_PASSWORD` must be a Gmail app password, not your normal Gmail password.

For reliable SMS, also set Twilio credentials:

```text
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_PHONE=+15551234567
```

`TWILIO_FROM_PHONE` must be your Twilio phone number in E.164 format. Example: `+16302002405`.

## 6. Configure the Web App

In PythonAnywhere, open the **Web** tab.

Create a new manual web app:

```text
Framework: Manual configuration
Python: same version as your virtualenv
```

Set **Source code** to:

```text
/home/yourusername/Client-Manager-project
```

Set **Virtualenv** to:

```text
/home/yourusername/Client-Manager-project/venv
```

Open the WSGI configuration file in the Web tab and replace its contents with the contents of:

```text
Server/pythonanywhere_wsgi.py
```

Important: change this line to your real PythonAnywhere username:

```python
PROJECT_DIR = Path(os.getenv("CLIENT_MANAGER_PROJECT_DIR", "/home/yourusername/Client-Manager-project"))
```

## 7. Static Files

The React build is included in:

```text
Client/dist
```

Flask serves those files automatically, so you do not need a separate static file mapping for the first deployment.

## 8. Reload

Go back to the **Web** tab and click:

```text
Reload
```

Then open:

```text
https://yourusername.pythonanywhere.com
```

## 9. Test SMS

Use a client phone number with 10 US digits or E.164 format. If Twilio is configured, the app sends SMS through:

```text
Twilio -> client phone
```

If Twilio is not configured, the app falls back to:

```text
your-gmail@gmail.com -> 10digitnumber@vtext.com -> Verizon phone
```
