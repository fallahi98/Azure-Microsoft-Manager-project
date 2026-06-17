import os
import smtplib
import threading
import time
from contextlib import closing
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from flask import Flask, jsonify, request
from flask_cors import CORS
import pymssql
try:
    from azure.communication.sms import SmsClient
except ImportError:
    SmsClient = None


app = Flask(__name__)
CORS(app)
note_scheduler_started = False


def get_db():
    server = os.getenv("DB_SERVER", "aminsproject.database.windows.net")
    database = os.getenv("DB_NAME", "aminsproject")
    user = os.getenv("DB_USER", "")
    password = os.getenv("DB_PASSWORD", "")

    if not user:
        raise RuntimeError("Database username is missing. Add DB_USER in Server\\credentials.local.ps1 or enter it at startup.")

    if not password:
        raise RuntimeError("Database password is missing. Add DB_PASSWORD in Server\\credentials.local.ps1 or enter it at startup.")

    try:
        return pymssql.connect(
            server=server,
            port=int(os.getenv("DB_PORT", "1433")),
            user=user,
            password=password,
            database=database,
            login_timeout=15,
            timeout=30,
        )
    except pymssql.OperationalError as error:
        error_text = str(error)
        if "18456" in error_text:
            raise RuntimeError(
                "Database login failed. Check DB_USER and DB_PASSWORD in Server\\credentials.local.ps1, "
                "or reset the Azure SQL password."
            ) from error
        raise RuntimeError(
            "Database connection failed. Check DB_SERVER, Azure SQL firewall rules, and internet access."
        ) from error


def row_to_client(row):
    return {
        "id": row[0],
        "first_name": row[1],
        "last_name": row[2],
        "address": row[3],
        "zip_code": row[4],
        "city": row[5],
        "email": row[6],
        "phone_number": row[7] if len(row) > 7 else "",
    }


def row_to_client_from_db(cursor, client_id):
    cursor.execute(
        """
        SELECT id, first_name, last_name, address, zip_code, city, email, phone_number
        FROM dbo.Clients
        WHERE id = %s
        """,
        (client_id,),
    )
    row = cursor.fetchone()

    if not row:
        return None

    return row_to_client(row)


def row_to_case(row):
    return {
        "id": row[0],
        "client_id": row[1],
        "title": row[2] or "",
        "status": row[3],
        "created_at": str(row[4]) if row[4] else None,
        "closed_at": str(row[5]) if row[5] else None,
        "history": row[6] or "",
    }


def row_to_case_from_db(cursor, case_id):
    cursor.execute(
        """
        SELECT id, client_id, title, status, created_at, closed_at, history
        FROM dbo.Cases
        WHERE id = %s
        """,
        (case_id,),
    )
    row = cursor.fetchone()

    if not row:
        return None

    return row_to_case(row)


def row_to_reminder(row):
    return {
        "id": row[0],
        "client_id": row[1],
        "case_id": row[2],
        "message": row[3],
        "remind_at": str(row[4]) if row[4] else None,
        "finished_at": str(row[5]) if row[5] else None,
        "created_at": str(row[6]) if row[6] else None,
        "client_name": f"{row[7] or ''} {row[8] or ''}".strip(),
        "case_title": row[9] or "",
    }


def ensure_clients_table(cursor):
    cursor.execute(
        """
        IF OBJECT_ID('dbo.Clients', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.Clients (
                id INT IDENTITY(1,1) PRIMARY KEY,
                first_name NVARCHAR(100) NOT NULL,
                last_name NVARCHAR(100) NOT NULL,
                address NVARCHAR(255) NOT NULL,
                zip_code NVARCHAR(20) NOT NULL,
                city NVARCHAR(100) NOT NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
            );
        END;

        IF COL_LENGTH('dbo.Clients', 'address') IS NULL
            ALTER TABLE dbo.Clients ADD address NVARCHAR(255) NULL;

        IF COL_LENGTH('dbo.Clients', 'zip_code') IS NULL
            ALTER TABLE dbo.Clients ADD zip_code NVARCHAR(20) NULL;

        IF COL_LENGTH('dbo.Clients', 'city') IS NULL
            ALTER TABLE dbo.Clients ADD city NVARCHAR(100) NULL;

        IF COL_LENGTH('dbo.Clients', 'email') IS NULL
            ALTER TABLE dbo.Clients ADD email NVARCHAR(255) NULL;

        IF COL_LENGTH('dbo.Clients', 'phone_number') IS NULL
            ALTER TABLE dbo.Clients ADD phone_number NVARCHAR(30) NULL;
        """
    )


def ensure_cases_table(cursor):
    ensure_clients_table(cursor)
    cursor.execute(
        """
        IF OBJECT_ID('dbo.Cases', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.Cases (
                id INT IDENTITY(1,1) PRIMARY KEY,
                client_id INT NOT NULL,
                title NVARCHAR(150) NULL,
                status NVARCHAR(10) NOT NULL DEFAULT 'Open',
                history NVARCHAR(MAX) NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                closed_at DATETIME2 NULL,
                CONSTRAINT CK_Cases_Status CHECK (status IN ('Open', 'Closed')),
                CONSTRAINT FK_Cases_Clients FOREIGN KEY (client_id)
                    REFERENCES dbo.Clients(id)
                    ON DELETE CASCADE
            );
        END;

        IF COL_LENGTH('dbo.Cases', 'history') IS NULL
            ALTER TABLE dbo.Cases ADD history NVARCHAR(MAX) NULL;

        IF COL_LENGTH('dbo.Cases', 'title') IS NULL
            ALTER TABLE dbo.Cases ADD title NVARCHAR(150) NULL;
        """
    )


def ensure_admin_notes_table(cursor):
    ensure_cases_table(cursor)
    cursor.execute(
        """
        IF OBJECT_ID('dbo.AdminNotes', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.AdminNotes (
                id INT IDENTITY(1,1) PRIMARY KEY,
                client_id INT NULL,
                case_id INT NULL,
                note NVARCHAR(MAX) NOT NULL,
                send_at DATETIME2 NOT NULL,
                sent_at DATETIME2 NULL,
                failed_at DATETIME2 NULL,
                error_message NVARCHAR(1000) NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
            );
        END;

        IF COL_LENGTH('dbo.AdminNotes', 'client_id') IS NULL
            ALTER TABLE dbo.AdminNotes ADD client_id INT NULL;

        IF COL_LENGTH('dbo.AdminNotes', 'case_id') IS NULL
            ALTER TABLE dbo.AdminNotes ADD case_id INT NULL;

        IF NOT EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE name = 'FK_AdminNotes_Clients'
        )
        BEGIN
            ALTER TABLE dbo.AdminNotes
            ADD CONSTRAINT FK_AdminNotes_Clients
            FOREIGN KEY (client_id) REFERENCES dbo.Clients(id)
            ON DELETE CASCADE;
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE name = 'FK_AdminNotes_Cases'
        )
        BEGIN
            ALTER TABLE dbo.AdminNotes
            ADD CONSTRAINT FK_AdminNotes_Cases
            FOREIGN KEY (case_id) REFERENCES dbo.Cases(id);
        END;
        """
    )


def ensure_reminders_table(cursor):
    ensure_cases_table(cursor)
    cursor.execute(
        """
        IF OBJECT_ID('dbo.Reminders', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.Reminders (
                id INT IDENTITY(1,1) PRIMARY KEY,
                client_id INT NOT NULL,
                case_id INT NOT NULL,
                [message] NVARCHAR(MAX) NOT NULL,
                remind_at DATETIME2 NOT NULL,
                finished_at DATETIME2 NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                CONSTRAINT FK_Reminders_Clients FOREIGN KEY (client_id)
                    REFERENCES dbo.Clients(id),
                CONSTRAINT FK_Reminders_Cases FOREIGN KEY (case_id)
                    REFERENCES dbo.Cases(id)
            );
        END;
        """
    )


def ensure_sms_messages_table(cursor):
    ensure_cases_table(cursor)
    cursor.execute(
        """
        IF OBJECT_ID('dbo.SmsMessages', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.SmsMessages (
                id INT IDENTITY(1,1) PRIMARY KEY,
                client_id INT NOT NULL,
                case_id INT NULL,
                phone_number NVARCHAR(30) NOT NULL,
                message NVARCHAR(MAX) NOT NULL,
                status NVARCHAR(50) NOT NULL,
                provider_message_id NVARCHAR(255) NULL,
                error_message NVARCHAR(1000) NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                sent_at DATETIME2 NULL,
                CONSTRAINT FK_SmsMessages_Clients FOREIGN KEY (client_id)
                    REFERENCES dbo.Clients(id),
                CONSTRAINT FK_SmsMessages_Cases FOREIGN KEY (case_id)
                    REFERENCES dbo.Cases(id)
            );
        END;
        """
    )


def error_response(message, status_code=500):
    return jsonify({"error": message}), status_code


def get_sms_client():
    if SmsClient is None:
        raise RuntimeError("Azure SMS SDK is not installed. Run: pip install azure-communication-sms")

    connection_string = os.getenv("ACS_CONNECTION_STRING")
    if not connection_string:
        raise RuntimeError("ACS_CONNECTION_STRING is missing. Add it in Server\\credentials.local.ps1 or enter it at startup.")

    return SmsClient.from_connection_string(connection_string)


def send_sms_message(to_phone_number, message):
    from_phone_number = os.getenv("ACS_SMS_FROM_PHONE")
    if not from_phone_number:
        raise RuntimeError("ACS_SMS_FROM_PHONE is missing. Add it in Server\\credentials.local.ps1 or enter it at startup.")

    sms_client = get_sms_client()
    responses = sms_client.send(
        from_=from_phone_number,
        to=[to_phone_number],
        message=message,
        enable_delivery_report=True,
    )

    response = responses[0] if responses else None
    if response and not response.successful:
        raise RuntimeError(response.error_message or "Azure Communication Services could not send the SMS")

    return response.message_id if response else None


def send_email_to_admin(subject, body):
    admin_email = os.getenv("ADMIN_EMAIL")
    smtp_host = os.getenv("SMTP_HOST")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_username)
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    if not all([admin_email, smtp_host, smtp_username, smtp_password, smtp_from_email]):
        app.logger.warning("Email not sent because SMTP/admin environment variables are missing")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = smtp_from_email
    message["To"] = admin_email
    message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as smtp:
        if smtp_use_tls:
            smtp.starttls()
        smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)

    return True


def send_client_email_to_admin(client):
    send_email_to_admin(
        f"New client added: {client['first_name']} {client['last_name']}",
        "\n".join(
            [
                "A new client was added.",
                "",
                f"ID: {client['id']}",
                f"Name: {client['first_name']} {client['last_name']}",
                f"Email: {client['email']}",
                f"Address: {client['address']}",
                f"City: {client['city']}",
                f"Zip Code: {client['zip_code']}",
            ]
        ),
    )


def prepend_case_history(cursor, case_id, note):
    case = row_to_case_from_db(cursor, case_id)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    history_entry = f"[{timestamp}]\n{note}"

    if case["history"]:
        updated_history = f"{history_entry}\n\n{case['history']}"
    else:
        updated_history = history_entry

    cursor.execute(
        """
        UPDATE dbo.Cases
        SET history = %s
        WHERE id = %s
        """,
        (updated_history, case_id),
    )

    return updated_history


def get_requested_case_title(data):
    for field_name in ("title", "case_title"):
        title = str(data.get(field_name, "")).strip()
        if title:
            return title[:150]

    return ""


def generate_case_title(client):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"Case for {client['first_name']} {client['last_name']} - {timestamp}"


def schedule_case_reminder(cursor, case_id, client_id, send_at, note="Case follow-up reminder"):
    if not send_at:
        return

    cursor.execute(
        """
        INSERT INTO dbo.AdminNotes (client_id, case_id, note, send_at)
        VALUES (%s, %s, %s, %s)
        """,
        (client_id, case_id, note, send_at),
    )


def format_customer_note_email(client, note):
    return "\n".join(
        [
            "Customer information was added.",
            "",
            f"Customer ID: {client['id']}",
            f"Name: {client['first_name']} {client['last_name']}",
            f"Email: {client['email']}",
            f"Address: {client['address']}",
            f"City: {client['city']}",
            f"Zip Code: {client['zip_code']}",
            "",
            "Administrator note:",
            note,
        ]
    )


def parse_send_at(value):
    if not value:
        raise ValueError("Send date is required")

    normalized_value = str(value).replace("Z", "+00:00")
    send_at = datetime.fromisoformat(normalized_value)

    if send_at.tzinfo is None:
        send_at = send_at.replace(tzinfo=timezone.utc)

    return send_at.astimezone(timezone.utc).replace(tzinfo=None)


def parse_admin_notes(data):
    notes = data.get("admin_notes")

    if notes is None:
        note = str(data.get("admin_note", "")).strip()
        send_at_value = data.get("admin_note_send_at")

        if not note and not send_at_value:
            return []

        notes = [{"note": note, "send_at": send_at_value}]

    parsed_notes = []

    for index, note_item in enumerate(notes, start=1):
        note = str(note_item.get("note", "")).strip()
        send_at_value = note_item.get("send_at")

        if not note and not send_at_value:
            continue

        if note and not send_at_value:
            raise ValueError(f"Choose a date for note {index}")

        if send_at_value and not note:
            raise ValueError(f"Write note {index} before choosing a note email date")

        send_at = parse_send_at(send_at_value)

        if send_at <= datetime.now(timezone.utc).replace(tzinfo=None):
            raise ValueError(f"Note {index} email date must be in the future")

        parsed_notes.append({"note": note, "send_at": send_at})

    return parsed_notes


def send_due_admin_notes():
    with closing(get_db()) as conn:
        cursor = conn.cursor()
        ensure_clients_table(cursor)
        ensure_admin_notes_table(cursor)
        conn.commit()

        cursor.execute(
            """
            SELECT
                notes.id,
                notes.client_id,
                notes.case_id,
                notes.note,
                notes.send_at,
                cases.history,
                clients.id,
                clients.first_name,
                clients.last_name,
                clients.address,
                clients.zip_code,
                clients.city,
                clients.email
            FROM dbo.AdminNotes notes
            LEFT JOIN dbo.Clients clients ON clients.id = notes.client_id
            LEFT JOIN dbo.Cases cases ON cases.id = notes.case_id
            WHERE notes.sent_at IS NULL
                AND notes.failed_at IS NULL
                AND notes.send_at <= SYSUTCDATETIME()
            ORDER BY notes.send_at ASC
            """
        )
        due_notes = cursor.fetchall()

        for row in due_notes:
            note_id = row[0]
            client_id = row[1]
            case_id = row[2]
            note = row[3]
            send_at = row[4]
            try:
                if client_id:
                    client = {
                        "id": row[6],
                        "first_name": row[7],
                        "last_name": row[8],
                        "address": row[9],
                        "zip_code": row[10],
                        "city": row[11],
                        "email": row[12],
                    }
                    email_body = "\n".join(
                        [
                            f"Case ID: {case_id}" if case_id else "Case ID: None",
                            "",
                            format_customer_note_email(client, str(note)),
                        ]
                    )
                else:
                    email_body = str(note)

                email_sent = send_email_to_admin(
                    "Scheduled customer information note",
                    "\n".join(
                        [
                            email_body,
                            "",
                            f"Scheduled for: {send_at} UTC",
                        ]
                    ),
                )

                if email_sent:
                    cursor.execute(
                        "UPDATE dbo.AdminNotes SET sent_at = SYSUTCDATETIME() WHERE id = %s",
                        (note_id,),
                    )
                else:
                    cursor.execute(
                        """
                        UPDATE dbo.AdminNotes
                        SET failed_at = SYSUTCDATETIME(),
                            error_message = %s
                        WHERE id = %s
                        """,
                        ("Missing SMTP/admin environment variables", note_id),
                    )
            except Exception as error:
                app.logger.exception("Failed to send scheduled admin note")
                cursor.execute(
                    """
                    UPDATE dbo.AdminNotes
                    SET failed_at = SYSUTCDATETIME(),
                        error_message = %s
                    WHERE id = %s
                    """,
                    (str(error)[:1000], note_id),
                )

        conn.commit()


def note_scheduler_loop():
    while True:
        try:
            send_due_admin_notes()
        except Exception:
            app.logger.exception("Scheduled note check failed")
        time.sleep(30)


def start_note_scheduler():
    global note_scheduler_started

    if note_scheduler_started:
        return

    note_scheduler_started = True
    thread = threading.Thread(target=note_scheduler_loop, daemon=True)
    thread.start()


@app.errorhandler(RuntimeError)
def handle_runtime_error(error):
    return error_response(str(error), 500)


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    app.logger.exception("Unhandled backend error")
    return error_response("Internal server error", 500)


@app.route("/", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "ok",
            "message": "Flask backend is running",
            "database_driver": "pymssql",
        }
    )


@app.route("/clients", methods=["GET"])
def get_clients():
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_clients_table(cursor)
            conn.commit()

            cursor.execute(
                """
                SELECT id, first_name, last_name, address, zip_code, city, email, phone_number
                FROM dbo.Clients
                ORDER BY id DESC
                """
            )
            clients = [row_to_client(row) for row in cursor.fetchall()]

        return jsonify(clients)
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to fetch clients")
        return error_response("Failed to fetch clients", 500)


@app.route("/clients", methods=["POST"])
def add_client():
    data = request.get_json(silent=True) or {}

    first_name = str(data.get("first_name", "")).strip()
    last_name = str(data.get("last_name", "")).strip()
    address = str(data.get("address", "")).strip()
    zip_code = str(data.get("zip_code", "")).strip()
    city = str(data.get("city", "")).strip()
    email = str(data.get("email", "")).strip()
    phone_number = str(data.get("phone_number", "")).strip()

    missing_fields = [
        field
        for field, value in {
            "first_name": first_name,
            "last_name": last_name,
            "address": address,
            "zip_code": zip_code,
            "city": city,
            "email": email,
        }.items()
        if not value
    ]

    if missing_fields:
        return error_response(
            f"Missing required fields: {', '.join(missing_fields)}",
            400,
        )

    if "@" not in email:
        return error_response("Enter a valid client email", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_clients_table(cursor)
            cursor.execute(
                """
                INSERT INTO dbo.Clients (first_name, last_name, address, zip_code, city, email, phone_number)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (first_name, last_name, address, zip_code, city, email, phone_number),
            )
            cursor.execute("SELECT CAST(SCOPE_IDENTITY() AS INT)")
            client_id = cursor.fetchone()[0]

            client = {
                "id": client_id,
                "first_name": first_name,
                "last_name": last_name,
                "address": address,
                "zip_code": zip_code,
                "city": city,
                "email": email,
                "phone_number": phone_number,
            }

            conn.commit()

        try:
            send_client_email_to_admin(client)
        except Exception:
            app.logger.exception("Client was added, but admin email notification failed")

        return jsonify(
            {
                "message": "Client added successfully",
                "client": client,
            }
        ), 201
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception as error:
        app.logger.exception("Failed to add client")
        return error_response(f"Failed to add client: {error}", 500)


@app.route("/clients/<int:client_id>", methods=["PUT"])
def update_client(client_id):
    data = request.get_json(silent=True) or {}

    first_name = str(data.get("first_name", "")).strip()
    last_name = str(data.get("last_name", "")).strip()
    address = str(data.get("address", "")).strip()
    zip_code = str(data.get("zip_code", "")).strip()
    city = str(data.get("city", "")).strip()
    email = str(data.get("email", "")).strip()
    phone_number = str(data.get("phone_number", "")).strip()

    missing_fields = [
        field
        for field, value in {
            "first_name": first_name,
            "last_name": last_name,
            "address": address,
            "zip_code": zip_code,
            "city": city,
            "email": email,
        }.items()
        if not value
    ]

    if missing_fields:
        return error_response(
            f"Missing required fields: {', '.join(missing_fields)}",
            400,
        )

    if "@" not in email:
        return error_response("Enter a valid client email", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_clients_table(cursor)
            cursor.execute(
                """
                UPDATE dbo.Clients
                SET first_name = %s,
                    last_name = %s,
                    address = %s,
                    zip_code = %s,
                    city = %s,
                    email = %s,
                    phone_number = %s
                WHERE id = %s
                """,
                (first_name, last_name, address, zip_code, city, email, phone_number, client_id),
            )

            if cursor.rowcount == 0:
                return error_response("Client not found", 404)

            conn.commit()

        return jsonify(
            {
                "message": "Client updated successfully",
                "client": {
                    "id": client_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "address": address,
                    "zip_code": zip_code,
                    "city": city,
                    "email": email,
                    "phone_number": phone_number,
                },
            }
        )
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to update client")
        return error_response("Failed to update client", 500)


@app.route("/clients/<int:client_id>/cases", methods=["GET"])
def get_client_cases(client_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_cases_table(cursor)

            client = row_to_client_from_db(cursor, client_id)
            if not client:
                return error_response("Client not found", 404)

            cursor.execute(
                """
                SELECT id, client_id, title, status, created_at, closed_at, history
                FROM dbo.Cases
                WHERE client_id = %s
                ORDER BY created_at DESC
                """,
                (client_id,),
            )
            cases = [row_to_case(row) for row in cursor.fetchall()]

        return jsonify(cases)
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to fetch customer cases")
        return error_response("Failed to fetch customer cases", 500)


@app.route("/clients/<int:client_id>/cases", methods=["POST"])
def create_client_case(client_id):
    data = request.get_json(silent=True) or {}
    note = str(data.get("note", "")).strip()
    title = get_requested_case_title(data)
    send_at_value = data.get("send_at")
    send_at = None

    if send_at_value:
        try:
            send_at = parse_send_at(send_at_value)
        except ValueError as error:
            return error_response(str(error), 400)

        if send_at <= datetime.now(timezone.utc).replace(tzinfo=None):
            return error_response("Reminder date must be in the future", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_cases_table(cursor)
            ensure_admin_notes_table(cursor)

            client = row_to_client_from_db(cursor, client_id)
            if not client:
                return error_response("Client not found", 404)

            case_title = title or generate_case_title(client)
            case_note = f"Case Title: {case_title}\n\n{note}" if note else ""

            cursor.execute(
                """
                INSERT INTO dbo.Cases (client_id, title, status)
                OUTPUT INSERTED.id, INSERTED.client_id, INSERTED.title, INSERTED.status, INSERTED.created_at, INSERTED.closed_at, INSERTED.history
                VALUES (%s, %s, 'Open')
                """,
                (client_id, case_title),
            )
            case = row_to_case(cursor.fetchone())

            if case_note:
                case["history"] = prepend_case_history(cursor, case["id"], case_note)

            schedule_case_reminder(cursor, case["id"], client_id, send_at)
            conn.commit()

        return jsonify(
            {
                "message": "Case created successfully",
                "case": case,
                "reminder_scheduled": bool(send_at),
            }
        ), 201
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to create customer case")
        return error_response("Failed to create customer case", 500)


@app.route("/cases/<int:case_id>/close", methods=["POST"])
def close_case(case_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_cases_table(cursor)

            case = row_to_case_from_db(cursor, case_id)
            if not case:
                return error_response("Case not found", 404)

            cursor.execute(
                """
                UPDATE dbo.Cases
                SET status = 'Closed',
                    closed_at = COALESCE(closed_at, SYSUTCDATETIME())
                WHERE id = %s
                """,
                (case_id,),
            )
            conn.commit()

        return jsonify({"message": "Case closed successfully", "id": case_id})
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to close case")
        return error_response("Failed to close case", 500)


@app.route("/cases/<int:case_id>", methods=["DELETE"])
def delete_case(case_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_admin_notes_table(cursor)

            case = row_to_case_from_db(cursor, case_id)
            if not case:
                return error_response("Case not found", 404)

            ensure_reminders_table(cursor)
            cursor.execute("DELETE FROM dbo.Reminders WHERE case_id = %s", (case_id,))
            cursor.execute("DELETE FROM dbo.AdminNotes WHERE case_id = %s", (case_id,))
            cursor.execute("DELETE FROM dbo.Cases WHERE id = %s", (case_id,))
            conn.commit()

        return jsonify({"message": "Case deleted successfully", "id": case_id})
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to delete case")
        return error_response("Failed to delete case", 500)


@app.route("/cases/<int:case_id>/notes", methods=["POST"])
def schedule_case_note_emails(case_id):
    data = request.get_json(silent=True) or {}
    note = str(data.get("note", "")).strip()
    send_at_value = data.get("send_at")
    send_at = None

    if not note and data.get("admin_notes"):
        first_note = data["admin_notes"][0]
        note = str(first_note.get("note", "")).strip()
        send_at_value = first_note.get("send_at")

    if not note:
        return error_response("Note is required", 400)

    if send_at_value:
        try:
            send_at = parse_send_at(send_at_value)
        except ValueError as error:
            return error_response(str(error), 400)

        if send_at <= datetime.now(timezone.utc).replace(tzinfo=None):
            return error_response("Reminder date must be in the future", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_clients_table(cursor)
            ensure_cases_table(cursor)
            ensure_admin_notes_table(cursor)

            case = row_to_case_from_db(cursor, case_id)
            if not case:
                return error_response("Case not found", 404)

            if case["status"] != "Open":
                return error_response("Cannot add notes to a closed case", 400)

            client = row_to_client_from_db(cursor, case["client_id"])
            if not client:
                return error_response("Client not found", 404)

            updated_history = prepend_case_history(cursor, case_id, note)
            schedule_case_reminder(cursor, case_id, client["id"], send_at)
            conn.commit()

            case["history"] = updated_history

        return jsonify(
            {
                "message": "Case history updated successfully",
                "client": client,
                "case": case,
                "reminder_scheduled": bool(send_at),
            }
        ), 201
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to update case history")
        return error_response("Failed to update case history", 500)


@app.route("/cases/<int:case_id>/email-history", methods=["GET"])
def get_case_email_history(case_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_admin_notes_table(cursor)

            case = row_to_case_from_db(cursor, case_id)
            if not case:
                return error_response("Case not found", 404)

            cursor.execute(
                """
                SELECT id, note, send_at, sent_at, failed_at, error_message, created_at
                FROM dbo.AdminNotes
                WHERE case_id = %s
                ORDER BY created_at DESC, send_at DESC
                """,
                (case_id,),
            )
            email_history = [
                {
                    "id": row[0],
                    "note": row[1],
                    "send_at": str(row[2]) if row[2] else None,
                    "sent_at": str(row[3]) if row[3] else None,
                    "failed_at": str(row[4]) if row[4] else None,
                    "error_message": row[5],
                    "created_at": str(row[6]) if row[6] else None,
                }
                for row in cursor.fetchall()
            ]

        return jsonify(email_history)
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to fetch case email history")
        return error_response("Failed to fetch case email history", 500)


@app.route("/cases/<int:case_id>/scheduled-emails", methods=["POST"])
def schedule_case_email(case_id):
    data = request.get_json(silent=True) or {}
    note = str(data.get("message", data.get("note", ""))).strip()
    send_at_value = data.get("send_at")

    if not note:
        return error_response("Message is required", 400)

    try:
        send_at = parse_send_at(send_at_value)
    except ValueError as error:
        return error_response(str(error), 400)

    if send_at <= datetime.now(timezone.utc).replace(tzinfo=None):
        return error_response("Email date must be in the future", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_admin_notes_table(cursor)

            case = row_to_case_from_db(cursor, case_id)
            if not case:
                return error_response("Case not found", 404)

            client = row_to_client_from_db(cursor, case["client_id"])
            if not client:
                return error_response("Client not found", 404)

            cursor.execute(
                """
                INSERT INTO dbo.AdminNotes (client_id, case_id, note, send_at)
                VALUES (%s, %s, %s, %s)
                """,
                (client["id"], case_id, note, send_at),
            )
            cursor.execute(
                """
                SELECT TOP 1 id, note, send_at, created_at
                FROM dbo.AdminNotes
                WHERE client_id = %s
                    AND case_id = %s
                    AND note = %s
                    AND send_at = %s
                ORDER BY id DESC
                """,
                (client["id"], case_id, note, send_at),
            )
            row = cursor.fetchone()
            conn.commit()

        return jsonify(
            {
                "message": "Email scheduled successfully",
                "email": {
                    "id": row[0],
                    "note": row[1],
                    "send_at": str(row[2]) if row[2] else None,
                    "sent_at": None,
                    "failed_at": None,
                    "error_message": None,
                    "created_at": str(row[3]) if row[3] else None,
                },
            }
        ), 201
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to schedule case email")
        return error_response("Failed to schedule case email", 500)


@app.route("/cases/<int:case_id>/sms", methods=["POST"])
def send_case_sms(case_id):
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()

    if not message:
        return error_response("SMS message is required", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_sms_messages_table(cursor)

            case = row_to_case_from_db(cursor, case_id)
            if not case:
                return error_response("Case not found", 404)

            client = row_to_client_from_db(cursor, case["client_id"])
            if not client:
                return error_response("Client not found", 404)

            phone_number = str(client.get("phone_number") or "").strip()
            if not phone_number:
                return error_response("Client phone number is missing", 400)

            status = "Sent"
            provider_message_id = None
            error_message = None
            sent_at_sql = "SYSUTCDATETIME()"

            try:
                provider_message_id = send_sms_message(phone_number, message)
            except Exception as error:
                status = "Failed"
                error_message = str(error)[:1000]
                sent_at_sql = "NULL"

            cursor.execute(
                f"""
                INSERT INTO dbo.SmsMessages (
                    client_id,
                    case_id,
                    phone_number,
                    message,
                    status,
                    provider_message_id,
                    error_message,
                    sent_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, {sent_at_sql})
                """,
                (client["id"], case_id, phone_number, message, status, provider_message_id, error_message),
            )
            cursor.execute(
                """
                SELECT TOP 1 id, client_id, case_id, phone_number, message, status,
                    provider_message_id, error_message, created_at, sent_at
                FROM dbo.SmsMessages
                WHERE client_id = %s
                    AND case_id = %s
                    AND phone_number = %s
                    AND message = %s
                ORDER BY id DESC
                """,
                (client["id"], case_id, phone_number, message),
            )
            row = cursor.fetchone()
            conn.commit()

        sms = {
            "id": row[0],
            "client_id": row[1],
            "case_id": row[2],
            "phone_number": row[3],
            "message": row[4],
            "status": row[5],
            "provider_message_id": row[6],
            "error_message": row[7],
            "created_at": str(row[8]) if row[8] else None,
            "sent_at": str(row[9]) if row[9] else None,
        }

        if status == "Failed":
            return jsonify({"error": error_message, "sms": sms}), 502

        return jsonify({"message": "SMS sent successfully", "sms": sms}), 201
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception as error:
        app.logger.exception("Failed to send SMS")
        return error_response(f"Failed to send SMS: {error}", 500)


@app.route("/cases/<int:case_id>/sms-history", methods=["GET"])
def get_case_sms_history(case_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_sms_messages_table(cursor)

            case = row_to_case_from_db(cursor, case_id)
            if not case:
                return error_response("Case not found", 404)

            cursor.execute(
                """
                SELECT id, client_id, case_id, phone_number, message, status,
                    provider_message_id, error_message, created_at, sent_at
                FROM dbo.SmsMessages
                WHERE case_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (case_id,),
            )
            messages = [
                {
                    "id": row[0],
                    "client_id": row[1],
                    "case_id": row[2],
                    "phone_number": row[3],
                    "message": row[4],
                    "status": row[5],
                    "provider_message_id": row[6],
                    "error_message": row[7],
                    "created_at": str(row[8]) if row[8] else None,
                    "sent_at": str(row[9]) if row[9] else None,
                }
                for row in cursor.fetchall()
            ]

        return jsonify(messages)
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to fetch SMS history")
        return error_response("Failed to fetch SMS history", 500)


@app.route("/reminders", methods=["POST"])
def create_reminder():
    data = request.get_json(silent=True) or {}
    client_id = data.get("client_id")
    case_id = data.get("case_id")
    message = str(data.get("message", "")).strip()

    if not client_id:
        return error_response("Client is required", 400)

    if not case_id:
        return error_response("Case is required", 400)

    if not message:
        return error_response("Reminder message is required", 400)

    try:
        remind_at = parse_send_at(data.get("remind_at"))
    except ValueError as error:
        return error_response(str(error), 400)

    if remind_at <= datetime.now(timezone.utc).replace(tzinfo=None):
        return error_response("Reminder date must be in the future", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_reminders_table(cursor)

            client = row_to_client_from_db(cursor, int(client_id))
            if not client:
                return error_response("Client not found", 404)

            case = row_to_case_from_db(cursor, int(case_id))
            if not case or case["client_id"] != int(client_id):
                return error_response("Case not found for selected client", 404)

            cursor.execute(
                """
                INSERT INTO dbo.Reminders (client_id, case_id, [message], remind_at)
                VALUES (%s, %s, %s, %s)
                """,
                (client_id, case_id, message, remind_at),
            )
            cursor.execute(
                """
                SELECT TOP 1
                    reminders.id,
                    reminders.client_id,
                    reminders.case_id,
                    reminders.[message],
                    reminders.remind_at,
                    reminders.finished_at,
                    reminders.created_at,
                    clients.first_name,
                    clients.last_name,
                    cases.title
                FROM dbo.Reminders reminders
                JOIN dbo.Clients clients ON clients.id = reminders.client_id
                JOIN dbo.Cases cases ON cases.id = reminders.case_id
                WHERE reminders.client_id = %s
                    AND reminders.case_id = %s
                    AND reminders.[message] = %s
                    AND reminders.remind_at = %s
                ORDER BY reminders.id DESC
                """,
                (client_id, case_id, message, remind_at),
            )
            reminder = row_to_reminder(cursor.fetchone())
            conn.commit()

        return jsonify({"message": "Reminder created successfully", "reminder": reminder}), 201
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception as error:
        app.logger.exception("Failed to create reminder")
        return error_response(f"Failed to create reminder: {error}", 500)


@app.route("/reminders/history", methods=["GET"])
def get_reminder_history():
    client_id = request.args.get("client_id")
    case_id = request.args.get("case_id")

    filters = []
    params = []
    if client_id:
        filters.append("reminders.client_id = %s")
        params.append(client_id)
    if case_id:
        filters.append("reminders.case_id = %s")
        params.append(case_id)

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_reminders_table(cursor)
            cursor.execute(
                f"""
                SELECT
                    reminders.id,
                    reminders.client_id,
                    reminders.case_id,
                    reminders.[message],
                    reminders.remind_at,
                    reminders.finished_at,
                    reminders.created_at,
                    clients.first_name,
                    clients.last_name,
                    cases.title
                FROM dbo.Reminders reminders
                JOIN dbo.Clients clients ON clients.id = reminders.client_id
                JOIN dbo.Cases cases ON cases.id = reminders.case_id
                {where_clause}
                ORDER BY reminders.created_at DESC, reminders.remind_at DESC
                """,
                tuple(params),
            )
            reminders = [row_to_reminder(row) for row in cursor.fetchall()]

        return jsonify(reminders)
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to fetch reminder history")
        return error_response("Failed to fetch reminder history", 500)


@app.route("/reminders/due", methods=["GET"])
def get_due_reminders():
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_reminders_table(cursor)
            cursor.execute(
                """
                SELECT
                    reminders.id,
                    reminders.client_id,
                    reminders.case_id,
                    reminders.[message],
                    reminders.remind_at,
                    reminders.finished_at,
                    reminders.created_at,
                    clients.first_name,
                    clients.last_name,
                    cases.title
                FROM dbo.Reminders reminders
                JOIN dbo.Clients clients ON clients.id = reminders.client_id
                JOIN dbo.Cases cases ON cases.id = reminders.case_id
                WHERE reminders.finished_at IS NULL
                    AND reminders.remind_at <= SYSUTCDATETIME()
                ORDER BY reminders.remind_at ASC
                """
            )
            reminders = [row_to_reminder(row) for row in cursor.fetchall()]

        return jsonify(reminders)
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to fetch due reminders")
        return error_response("Failed to fetch due reminders", 500)


@app.route("/reminders/<int:reminder_id>/dismiss", methods=["POST"])
def dismiss_reminder(reminder_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_reminders_table(cursor)
            cursor.execute(
                """
                SELECT remind_at
                FROM dbo.Reminders
                WHERE id = %s
                    AND finished_at IS NULL
                """,
                (reminder_id,),
            )
            row = cursor.fetchone()
            if not row:
                return error_response("Reminder not found", 404)

            next_remind_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=10)

            cursor.execute(
                """
                UPDATE dbo.Reminders
                SET remind_at = %s
                WHERE id = %s
                """,
                (next_remind_at, reminder_id),
            )
            conn.commit()

        return jsonify({"message": "Reminder dismissed", "id": reminder_id})
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to dismiss reminder")
        return error_response("Failed to dismiss reminder", 500)


@app.route("/reminders/<int:reminder_id>/finish", methods=["POST"])
def finish_reminder(reminder_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_reminders_table(cursor)
            cursor.execute(
                """
                UPDATE dbo.Reminders
                SET finished_at = SYSUTCDATETIME()
                WHERE id = %s
                    AND finished_at IS NULL
                """,
                (reminder_id,),
            )
            if cursor.rowcount == 0:
                return error_response("Reminder not found", 404)
            conn.commit()

        return jsonify({"message": "Reminder finished", "id": reminder_id})
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to finish reminder")
        return error_response("Failed to finish reminder", 500)


@app.route("/admin-notes", methods=["POST"])
def schedule_admin_note():
    data = request.get_json(silent=True) or {}
    note = str(data.get("note", "")).strip()

    try:
        send_at = parse_send_at(data.get("send_at"))
    except ValueError as error:
        return error_response(str(error), 400)

    if not note:
        return error_response("Note is required", 400)

    if send_at <= datetime.now(timezone.utc).replace(tzinfo=None):
        return error_response("Send date must be in the future", 400)

    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_clients_table(cursor)
            ensure_admin_notes_table(cursor)
            cursor.execute(
                """
                INSERT INTO dbo.AdminNotes (note, send_at)
                OUTPUT INSERTED.id
                VALUES (%s, %s)
                """,
                (note, send_at),
            )
            note_id = cursor.fetchone()[0]
            conn.commit()

        return jsonify(
            {
                "message": "Administrator note scheduled successfully",
                "note": {
                    "id": note_id,
                    "note": note,
                    "send_at": send_at.isoformat() + "Z",
                },
            }
        ), 201
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to schedule administrator note")
        return error_response("Failed to schedule administrator note", 500)


@app.route("/clients/<int:client_id>", methods=["DELETE"])
def delete_client(client_id):
    try:
        with closing(get_db()) as conn:
            cursor = conn.cursor()
            ensure_clients_table(cursor)
            ensure_reminders_table(cursor)
            cursor.execute("DELETE FROM dbo.Reminders WHERE client_id = %s", (client_id,))
            cursor.execute("DELETE FROM dbo.Clients WHERE id = %s", (client_id,))
            deleted_count = cursor.rowcount
            conn.commit()

        if deleted_count == 0:
            return error_response("Client not found", 404)

        return jsonify({"message": "Client deleted successfully", "id": client_id})
    except RuntimeError as error:
        return error_response(str(error), 500)
    except Exception:
        app.logger.exception("Failed to delete client")
        return error_response("Failed to delete client", 500)


if __name__ == "__main__":
    start_note_scheduler()
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)
