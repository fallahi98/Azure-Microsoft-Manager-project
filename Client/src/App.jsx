import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:5000" : "");

const emptyClientForm = {
  first_name: "",
  last_name: "",
  address: "",
  zip_code: "",
  city: "",
  email: "",
  phone_number: "",
};

function App() {
  const [clients, setClients] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [clientFormMode, setClientFormMode] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [showAddClientConfirm, setShowAddClientConfirm] = useState(false);
  const [showEditClientConfirm, setShowEditClientConfirm] = useState(false);
  const [showDeleteClientConfirm, setShowDeleteClientConfirm] = useState(false);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [showNewCaseWindow, setShowNewCaseWindow] = useState(false);
  const [showEditCaseWindow, setShowEditCaseWindow] = useState(false);
  const [showCaseHistoryWindow, setShowCaseHistoryWindow] = useState(false);
  const [showHistoryCaseSelector, setShowHistoryCaseSelector] = useState(false);
  const [showDeleteCaseConfirm, setShowDeleteCaseConfirm] = useState(false);
  const [enoteText, setEnoteText] = useState("");
  const [showEnoteConfirm, setShowEnoteConfirm] = useState(false);
  const [showEnoteHistoryWindow, setShowEnoteHistoryWindow] = useState(false);
  const [emailHistory, setEmailHistory] = useState([]);
  const [emailSendAt, setEmailSendAt] = useState("");
  const [showScheduleEmailConfirm, setShowScheduleEmailConfirm] = useState(false);
  const [showEmailHistoryWindow, setShowEmailHistoryWindow] = useState(false);
  const [smsHistory, setSmsHistory] = useState([]);
  const [showSmsConfirm, setShowSmsConfirm] = useState(false);
  const [showSmsHistoryWindow, setShowSmsHistoryWindow] = useState(false);
  const [reminderAt, setReminderAt] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [showReminderWindow, setShowReminderWindow] = useState(false);
  const [reminderHistory, setReminderHistory] = useState([]);
  const [showReminderHistoryWindow, setShowReminderHistoryWindow] = useState(false);
  const [dueReminders, setDueReminders] = useState([]);
  const [message, setMessage] = useState("");

  const selectedCase = cases.find((customerCase) => String(customerCase.id) === selectedCaseId);

  const loadClients = async () => {
    const res = await axios.get(`${API_URL}/clients`);
    setClients(res.data);
  };

  const openClientTask = async () => {
    setMessage("");
    setActiveTask("clients");
    await loadClients();
  };

  const openCaseNoteTask = async () => {
    setMessage("");
    setActiveTask("case-notes");
    setSelectedClient(null);
    setCases([]);
    setSelectedCaseId("");
    setCaseTitle("");
    setShowNewCaseWindow(false);
    setShowEditCaseWindow(false);
    setShowCaseHistoryWindow(false);
    setShowHistoryCaseSelector(false);
    setShowDeleteCaseConfirm(false);
    await loadClients();
  };

  const openEnotesTask = async () => {
    setMessage("");
    setActiveTask("e-notes");
    setSelectedClient(null);
    setCases([]);
    setSelectedCaseId("");
    setEnoteText("");
    setShowEnoteConfirm(false);
    setShowEnoteHistoryWindow(false);
    setEmailHistory([]);
    setEmailSendAt("");
    setShowScheduleEmailConfirm(false);
    setShowEmailHistoryWindow(false);
    setSmsHistory([]);
    setShowSmsConfirm(false);
    setShowSmsHistoryWindow(false);
    await loadClients();
  };

  const openReminderTask = async () => {
    setMessage("");
    setActiveTask("reminders");
    setSelectedClient(null);
    setCases([]);
    setSelectedCaseId("");
    setReminderAt("");
    setReminderMessage("");
    setShowReminderWindow(true);
    setReminderHistory([]);
    setShowReminderHistoryWindow(false);
    await loadClients();
  };

  const closeClientTask = () => {
    setActiveTask(null);
    setClientFormMode(null);
    setShowAddClientConfirm(false);
    setShowEditClientConfirm(false);
    setShowDeleteClientConfirm(false);
    setSelectedClient(null);
    setClientForm(emptyClientForm);
    setCases([]);
    setSelectedCaseId("");
    setCaseTitle("");
    setShowNewCaseWindow(false);
    setShowEditCaseWindow(false);
    setShowCaseHistoryWindow(false);
    setShowHistoryCaseSelector(false);
    setShowDeleteCaseConfirm(false);
    setEnoteText("");
    setShowEnoteConfirm(false);
    setShowEnoteHistoryWindow(false);
    setEmailHistory([]);
    setEmailSendAt("");
    setShowScheduleEmailConfirm(false);
    setShowEmailHistoryWindow(false);
    setSmsHistory([]);
    setShowSmsConfirm(false);
    setShowSmsHistoryWindow(false);
    setReminderAt("");
    setReminderMessage("");
    setShowReminderWindow(false);
    setReminderHistory([]);
    setShowReminderHistoryWindow(false);
    setMessage("");
  };

  const startAddClient = () => {
    setClientFormMode("add");
    setShowAddClientConfirm(false);
    setShowEditClientConfirm(false);
    setShowDeleteClientConfirm(false);
    setSelectedClient(null);
    setClientForm(emptyClientForm);
    setMessage("");
  };

  const startEditClientTask = async () => {
    setClientFormMode("edit");
    setShowAddClientConfirm(false);
    setShowEditClientConfirm(false);
    setShowDeleteClientConfirm(false);
    setSelectedClient(null);
    setClientForm(emptyClientForm);
    setMessage("");
    await loadClients();
  };

  const startEditClient = (client) => {
    setClientFormMode("edit");
    setShowAddClientConfirm(false);
    setShowEditClientConfirm(false);
    setShowDeleteClientConfirm(false);
    setSelectedClient(client);
    setClientForm({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      address: client.address || "",
      zip_code: client.zip_code || "",
      city: client.city || "",
      email: client.email || "",
      phone_number: client.phone_number || "",
    });
    setMessage("");
  };

  const cancelClientForm = () => {
    setClientFormMode(null);
    setShowAddClientConfirm(false);
    setShowEditClientConfirm(false);
    setShowDeleteClientConfirm(false);
    setSelectedClient(null);
    setClientForm(emptyClientForm);
    setMessage("");
  };

  const updateClientForm = (field, value) => {
    setClientForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const getClientFormErrors = () => {
    const requiredFields = {
      "First Name": clientForm.first_name,
      "Last Name": clientForm.last_name,
      Address: clientForm.address,
      "Zip Code": clientForm.zip_code,
      City: clientForm.city,
      Email: clientForm.email,
      "Phone Number": clientForm.phone_number,
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !String(value).trim())
      .map(([field]) => field);

    if (missingFields.length > 0) {
      return `Missing required fields: ${missingFields.join(", ")}`;
    }

    if (!clientForm.email.includes("@")) {
      return "Enter a valid client email";
    }

    if (!clientForm.phone_number.startsWith("+")) {
      return "Enter phone number in E.164 format, like +14255550123";
    }

    return "";
  };

  const requestSaveClient = () => {
    setMessage("");

    const formError = getClientFormErrors();
    if (formError) {
      setMessage(formError);
      return;
    }

    if (clientFormMode === "add") {
      setShowAddClientConfirm(true);
      return;
    }

    if (clientFormMode === "edit") {
      if (!selectedClient) {
        setMessage("Select a client to edit");
        return;
      }

      setShowEditClientConfirm(true);
      return;
    }

    saveClient();
  };

  const saveClient = async () => {
    setMessage("");

    try {
      if (clientFormMode === "edit" && selectedClient) {
        await axios.put(`${API_URL}/clients/${selectedClient.id}`, clientForm);
        setMessage("Client updated");
      } else {
        await axios.post(`${API_URL}/clients`, clientForm);
        setMessage("Client added");
      }

      await loadClients();
      setClientFormMode(null);
      setShowAddClientConfirm(false);
      setShowEditClientConfirm(false);
      setShowDeleteClientConfirm(false);
      setSelectedClient(null);
      setClientForm(emptyClientForm);
    } catch (error) {
      setShowAddClientConfirm(false);
      setShowEditClientConfirm(false);
      setMessage(error.response?.data?.error || "Could not save client. Make sure the server is running.");
    }
  };

  const requestDeleteClient = () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client to delete");
      return;
    }

    setShowDeleteClientConfirm(true);
  };

  const deleteSelectedClient = async () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client to delete");
      setShowDeleteClientConfirm(false);
      return;
    }

    try {
      await axios.delete(`${API_URL}/clients/${selectedClient.id}`);
      setMessage("Client deleted");
      setShowDeleteClientConfirm(false);
      setShowEditClientConfirm(false);
      setSelectedClient(null);
      setClientForm(emptyClientForm);
      await loadClients();
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not delete client. Make sure the server is running.");
      setShowDeleteClientConfirm(false);
    }
  };

  const loadCases = async (clientId, caseIdToKeep = "") => {
    if (!clientId) {
      setCases([]);
      setSelectedCaseId("");
      return;
    }

    const res = await axios.get(`${API_URL}/clients/${clientId}/cases`);
    setCases(res.data);
    setSelectedCaseId(caseIdToKeep);
  };

  const selectCaseClient = async (client) => {
    setSelectedClient(client);
    setSelectedCaseId("");
    setCaseTitle("");
    setShowNewCaseWindow(false);
    setShowEditCaseWindow(false);
    setShowCaseHistoryWindow(false);
    setShowHistoryCaseSelector(false);
    setShowDeleteCaseConfirm(false);
    setMessage("");
    await loadCases(client.id);
  };

  const closeNewCaseWindow = () => {
    setShowNewCaseWindow(false);
    setCaseTitle("");
    setMessage("");
  };

  const openEditCaseWindow = () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client first");
      return;
    }

    setShowNewCaseWindow(false);
    setShowCaseHistoryWindow(false);
    setShowEditCaseWindow(true);
  };

  const closeEditCaseWindow = () => {
    setShowEditCaseWindow(false);
    setShowDeleteCaseConfirm(false);
    setMessage("");
  };

  const openCaseHistoryWindow = () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case to view history");
      return;
    }

    setShowNewCaseWindow(false);
    setShowEditCaseWindow(false);
    setShowCaseHistoryWindow(true);
    setShowHistoryCaseSelector(false);
  };

  const closeCaseHistoryWindow = () => {
    setShowCaseHistoryWindow(false);
    setShowHistoryCaseSelector(false);
    setMessage("");
  };

  const createCase = async () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client first");
      return;
    }

    try {
      const requestedTitle = caseTitle.trim();
      const res = await axios.post(`${API_URL}/clients/${selectedClient.id}/cases`, {
        title: requestedTitle,
        case_title: requestedTitle,
      });
      const createdCase = res.data.case;
      setCases((currentCases) => [
        createdCase,
        ...currentCases.filter((customerCase) => customerCase.id !== createdCase.id),
      ]);
      setSelectedCaseId(String(createdCase.id));
      setCaseTitle("");
      setShowNewCaseWindow(false);
      setMessage("Case created");

      try {
        const casesRes = await axios.get(`${API_URL}/clients/${selectedClient.id}/cases`);
        setCases(casesRes.data);
        setSelectedCaseId(String(createdCase.id));
      } catch {
        setMessage("Case created. Refresh cases if the full list does not update.");
      }
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not create case");
    }
  };

  const closeSelectedCase = async () => {
    setMessage("");

    if (!selectedCaseId) {
      setMessage("Select a case first");
      return;
    }

    if (selectedCase?.status === "Closed") {
      setMessage("This case is already closed");
      return;
    }

    try {
      await axios.post(`${API_URL}/cases/${selectedCaseId}/close`);
      setMessage("Case closed");
      await loadCases(selectedClient.id, selectedCaseId);
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not close case");
    }
  };

  const requestDeleteCase = () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case to delete");
      return;
    }

    setShowDeleteCaseConfirm(true);
  };

  const deleteSelectedCase = async () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case to delete");
      setShowDeleteCaseConfirm(false);
      return;
    }

    try {
      await axios.delete(`${API_URL}/cases/${selectedCase.id}`);
      setCases((currentCases) => currentCases.filter((customerCase) => customerCase.id !== selectedCase.id));
      setSelectedCaseId("");
      setShowCaseHistoryWindow(false);
      setShowHistoryCaseSelector(false);
      setShowDeleteCaseConfirm(false);
      setMessage("Case deleted");

      if (selectedClient) {
        await loadCases(selectedClient.id);
      }
    } catch (error) {
      setShowDeleteCaseConfirm(false);
      setMessage(error.response?.data?.error || "Could not delete case");
    }
  };

  const selectEnoteClient = async (client) => {
    setSelectedClient(client);
    setSelectedCaseId("");
    setEnoteText("");
    setShowEnoteConfirm(false);
    setShowEnoteHistoryWindow(false);
    setEmailHistory([]);
    setEmailSendAt("");
    setShowScheduleEmailConfirm(false);
    setShowEmailHistoryWindow(false);
    setSmsHistory([]);
    setShowSmsConfirm(false);
    setShowSmsHistoryWindow(false);
    setMessage("");
    await loadCases(client.id);
  };

  const requestAddEnote = () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client first");
      return;
    }

    if (!selectedCase) {
      setMessage("Select a case first");
      return;
    }

    if (selectedCase.status === "Closed") {
      setMessage("Closed cases can be viewed, but you cannot add e-notes to them");
      return;
    }

    if (!enoteText.trim()) {
      setMessage("Write an e-note first");
      return;
    }

    setShowEnoteConfirm(true);
  };

  const addEnote = async () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case first");
      setShowEnoteConfirm(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/cases/${selectedCase.id}/notes`, {
        note: enoteText.trim(),
      });
      const updatedCase = res.data.case;
      setCases((currentCases) =>
        currentCases.map((customerCase) => (customerCase.id === updatedCase.id ? updatedCase : customerCase))
      );
      setSelectedCaseId(String(updatedCase.id));
      setEnoteText("");
      setShowEnoteConfirm(false);
      setMessage("E-note added");

      if (selectedClient) {
        await loadCases(selectedClient.id, String(updatedCase.id));
      }
    } catch (error) {
      setShowEnoteConfirm(false);
      setMessage(error.response?.data?.error || "Could not add e-note");
    }
  };

  const requestScheduleEmail = () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client first");
      return;
    }

    if (!selectedCase) {
      setMessage("Select a case first");
      return;
    }

    if (!enoteText.trim()) {
      setMessage("Write a message first");
      return;
    }

    setShowScheduleEmailConfirm(true);
  };

  const scheduleEmail = async () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case first");
      setShowScheduleEmailConfirm(false);
      return;
    }

    if (!emailSendAt) {
      setMessage("Select the date and time to send the email");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/cases/${selectedCase.id}/scheduled-emails`, {
        message: enoteText.trim(),
        send_at: new Date(emailSendAt).toISOString(),
      });
      setEmailHistory((currentHistory) => [res.data.email, ...currentHistory]);
      setEnoteText("");
      setEmailSendAt("");
      setShowScheduleEmailConfirm(false);
      setMessage("Email scheduled");
    } catch (error) {
      setShowScheduleEmailConfirm(false);
      setMessage(error.response?.data?.error || "Could not schedule email");
    }
  };

  const openEnoteHistoryWindow = () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case to display e-note history");
      return;
    }

    setShowEnoteHistoryWindow(true);
    setShowEmailHistoryWindow(false);
  };

  const openEmailHistoryWindow = async () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case to display email history");
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/cases/${selectedCase.id}/email-history`);
      setEmailHistory(res.data);
      setShowEnoteHistoryWindow(false);
      setShowEmailHistoryWindow(true);
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not load email history");
    }
  };

  const requestSendSms = () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client first");
      return;
    }

    if (!selectedCase) {
      setMessage("Select a case first");
      return;
    }

    if (!selectedClient.phone_number) {
      setMessage("Selected client does not have a phone number");
      return;
    }

    if (!enoteText.trim()) {
      setMessage("Write an SMS message first");
      return;
    }

    setShowSmsConfirm(true);
  };

  const sendSms = async () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case first");
      setShowSmsConfirm(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/cases/${selectedCase.id}/sms`, {
        message: enoteText.trim(),
      });
      setSmsHistory((currentHistory) => [res.data.sms, ...currentHistory]);
      setEnoteText("");
      setShowSmsConfirm(false);
      setMessage("SMS sent");
    } catch (error) {
      setShowSmsConfirm(false);
      setMessage(error.response?.data?.error || "Could not send SMS");
    }
  };

  const openSmsHistoryWindow = async () => {
    setMessage("");

    if (!selectedCase) {
      setMessage("Select a case to display SMS history");
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/cases/${selectedCase.id}/sms-history`);
      setSmsHistory(res.data);
      setShowSmsHistoryWindow(true);
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not load SMS history");
    }
  };

  const selectReminderClient = async (client) => {
    setSelectedClient(client);
    setSelectedCaseId("");
    setMessage("");
    await loadCases(client.id);
  };

  const openReminderWindow = async () => {
    setMessage("");

    if (!selectedClient && activeTask === "case-notes") {
      setMessage("Select a client first");
      return;
    }

    setReminderAt("");
    setReminderMessage("");
    setReminderHistory([]);
    setShowReminderHistoryWindow(false);
    setShowReminderWindow(true);

    if (!selectedClient) {
      await loadClients();
    } else {
      await loadCases(selectedClient.id, selectedCaseId);
    }
  };

  const cancelReminderWindow = () => {
    setShowReminderWindow(false);
    setReminderAt("");
    setReminderMessage("");
    if (activeTask === "reminders") {
      setActiveTask(null);
    }
    setMessage("");
  };

  const createReminder = async () => {
    setMessage("");

    if (!selectedClient) {
      setMessage("Select a client first");
      return;
    }

    if (!selectedCase) {
      setMessage("Select a case first");
      return;
    }

    if (!reminderAt) {
      setMessage("Select reminder date and time");
      return;
    }

    if (!reminderMessage.trim()) {
      setMessage("Write a reminder message");
      return;
    }

    try {
      await axios.post(`${API_URL}/reminders`, {
        client_id: selectedClient.id,
        case_id: selectedCase.id,
        remind_at: new Date(reminderAt).toISOString(),
        message: reminderMessage.trim(),
      });
      setReminderAt("");
      setReminderMessage("");
      setShowReminderWindow(false);
      if (activeTask === "reminders") {
        setActiveTask(null);
      }
      setMessage("Reminder created");
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not create reminder");
    }
  };

  const openReminderHistoryWindow = async () => {
    setMessage("");

    try {
      const params = selectedCase ? `?case_id=${selectedCase.id}` : selectedClient ? `?client_id=${selectedClient.id}` : "";
      const res = await axios.get(`${API_URL}/reminders/history${params}`);
      setReminderHistory(res.data);
      setShowReminderHistoryWindow(true);
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not load reminder history");
    }
  };

  const loadDueReminders = async () => {
    try {
      const res = await axios.get(`${API_URL}/reminders/due`);
      setDueReminders(res.data);
    } catch {
      setDueReminders([]);
    }
  };

  const dismissDueReminder = async (reminderId) => {
    try {
      await axios.post(`${API_URL}/reminders/${reminderId}/dismiss`);
      setDueReminders((currentReminders) => currentReminders.filter((reminder) => reminder.id !== reminderId));
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not dismiss reminder");
    }
  };

  const finishDueReminder = async (reminderId) => {
    try {
      await axios.post(`${API_URL}/reminders/${reminderId}/finish`);
      setDueReminders((currentReminders) => currentReminders.filter((reminder) => reminder.id !== reminderId));
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not finish reminder");
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadInitialClients = async () => {
      try {
        const res = await axios.get(`${API_URL}/clients`);
        if (!ignore) {
          setClients(res.data);
        }
      } catch {
        if (!ignore) {
          setMessage("Could not load clients. Make sure the server is running.");
        }
      }
    };

    loadInitialClients();
    loadDueReminders();
    const reminderInterval = window.setInterval(loadDueReminders, 30000);

    return () => {
      ignore = true;
      window.clearInterval(reminderInterval);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="main-window">
        <h1>Client Manager</h1>
        <p className="subtitle">Select a task to begin.</p>

        {message && <p className="message">{message}</p>}

        <div className="task-grid">
          <button className="task-button" type="button" onClick={openClientTask}>
            <span className="task-icon" aria-hidden="true"></span>
            <span>Add / Manage Clients</span>
          </button>
          <button className="task-button" type="button" onClick={openCaseNoteTask}>
            <span className="note-task-icon" aria-hidden="true"></span>
            <span>Add Case</span>
          </button>
          <button className="task-button" type="button" onClick={openEnotesTask}>
            <span className="enote-task-icon" aria-hidden="true"></span>
            <span>E Notes</span>
          </button>
          <button className="task-button" type="button" onClick={openReminderTask}>
            <span className="reminder-task-icon" aria-hidden="true"></span>
            <span>Reminder</span>
          </button>
        </div>
      </section>

      {activeTask === "clients" && (
        <section className="window-overlay" aria-label="Manage clients task window">
          <div className="task-window">
            <header className="window-titlebar">
              <div>
                <h2>Manage Clients</h2>
                <p>Choose whether to add a new client or edit an existing client.</p>
              </div>
              <button className="secondary-button" type="button" onClick={closeClientTask}>
                Done
              </button>
            </header>

            {message && <p className="message">{message}</p>}

            {!clientFormMode && (
              <>
                <div className="window-toolbar">
                  <button type="button" onClick={startAddClient}>
                    + Add New Client
                  </button>
                  <button className="secondary-button" type="button" onClick={startEditClientTask}>
                    Edit Client
                  </button>
                </div>
              </>
            )}

            {clientFormMode && (
              <div className="form-window" aria-label={clientFormMode === "edit" ? "Edit client" : "Add client"}>
                <header className="form-titlebar">
                  <h3>{clientFormMode === "edit" ? "Edit Client" : "Add Client"}</h3>
                </header>

                {clientFormMode === "edit" && (
                  <div className="edit-client-selector">
                    <h4>Select Client</h4>
                    <div className="client-icon-grid compact-grid">
                      {clients.length === 0 ? (
                        <p className="empty-state">No clients yet.</p>
                      ) : (
                        clients.map((client) => (
                          <button
                            className={`client-icon ${selectedClient?.id === client.id ? "selected-client" : ""}`}
                            type="button"
                            key={client.id}
                            onClick={() => startEditClient(client)}
                          >
                            <span className="folder-icon" aria-hidden="true"></span>
                            <span className="client-name">
                              {client.first_name} {client.last_name}
                            </span>
                            <span className="client-meta">{client.city}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="client-form">
                  <input
                    placeholder="First Name"
                    value={clientForm.first_name}
                    onChange={(event) => updateClientForm("first_name", event.target.value)}
                    disabled={clientFormMode === "edit" && !selectedClient}
                  />
                  <input
                    placeholder="Last Name"
                    value={clientForm.last_name}
                    onChange={(event) => updateClientForm("last_name", event.target.value)}
                    disabled={clientFormMode === "edit" && !selectedClient}
                  />
                  <input
                    placeholder="Address"
                    value={clientForm.address}
                    onChange={(event) => updateClientForm("address", event.target.value)}
                    disabled={clientFormMode === "edit" && !selectedClient}
                  />
                  <input
                    placeholder="Zip Code"
                    value={clientForm.zip_code}
                    onChange={(event) => updateClientForm("zip_code", event.target.value)}
                    disabled={clientFormMode === "edit" && !selectedClient}
                  />
                  <input
                    placeholder="City"
                    value={clientForm.city}
                    onChange={(event) => updateClientForm("city", event.target.value)}
                    disabled={clientFormMode === "edit" && !selectedClient}
                  />
                  <input
                    placeholder="Email"
                    value={clientForm.email}
                    onChange={(event) => updateClientForm("email", event.target.value)}
                    disabled={clientFormMode === "edit" && !selectedClient}
                  />
                  <input
                    placeholder="Phone Number"
                    value={clientForm.phone_number}
                    onChange={(event) => updateClientForm("phone_number", event.target.value)}
                    disabled={clientFormMode === "edit" && !selectedClient}
                  />
                </div>

                <footer className="form-actions">
                  <button type="button" onClick={requestSaveClient} disabled={clientFormMode === "edit" && !selectedClient}>
                    Accept
                  </button>
                  {clientFormMode === "edit" && (
                    <button className="danger-button" type="button" onClick={requestDeleteClient} disabled={!selectedClient}>
                      Delete Client
                    </button>
                  )}
                  <button className="secondary-button" type="button" onClick={cancelClientForm}>
                    Cancel
                  </button>
                </footer>
              </div>
            )}

            {showAddClientConfirm && (
              <div className="confirm-overlay" aria-label="Confirm add client">
                <div className="confirm-window">
                  <h3>Complete Adding Client?</h3>
                  <p>
                    Add {clientForm.first_name || "this"} {clientForm.last_name || "client"} to the client list?
                  </p>
                  <footer className="form-actions">
                    <button type="button" onClick={saveClient}>
                      OK
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setShowAddClientConfirm(false)}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showEditClientConfirm && (
              <div className="confirm-overlay" aria-label="Confirm edit client">
                <div className="confirm-window">
                  <h3>Complete Client Changes?</h3>
                  <p>
                    Save changes for {clientForm.first_name || "this"} {clientForm.last_name || "client"}?
                  </p>
                  <footer className="form-actions">
                    <button type="button" onClick={saveClient}>
                      OK
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setShowEditClientConfirm(false)}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showDeleteClientConfirm && (
              <div className="confirm-overlay" aria-label="Confirm delete client">
                <div className="confirm-window">
                  <h3>Delete Client?</h3>
                  <p>
                    Delete {selectedClient?.first_name || "this"} {selectedClient?.last_name || "client"} from the client list?
                  </p>
                  <footer className="form-actions">
                    <button className="danger-button" type="button" onClick={deleteSelectedClient}>
                      OK
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setShowDeleteClientConfirm(false)}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTask === "case-notes" && (
        <section className="window-overlay" aria-label="Add case task window">
          <div className="task-window">
            <header className="window-titlebar">
              <div>
                <h2>Add Case</h2>
                <p>Select a client to open a new case window.</p>
              </div>
              <button className="secondary-button" type="button" onClick={closeClientTask}>
                Done
              </button>
            </header>

            <div className="case-note-layout">
              <section>
                <h3>Clients</h3>
                <div className="client-icon-grid compact-grid">
                  {clients.map((client) => (
                    <button
                      className={`client-icon ${selectedClient?.id === client.id ? "selected-client" : ""}`}
                      type="button"
                      key={client.id}
                      onClick={() => selectCaseClient(client)}
                    >
                      <span className="folder-icon" aria-hidden="true"></span>
                      <span className="client-name">
                        {client.first_name} {client.last_name}
                      </span>
                      <span className="client-meta">{client.city}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="case-panel">
                <h3>Cases</h3>
                <div className="window-toolbar">
                  <button type="button" onClick={() => setShowNewCaseWindow(true)} disabled={!selectedClient}>
                    Open New Case
                  </button>
                  <button className="secondary-button" type="button" onClick={openEditCaseWindow} disabled={!selectedClient}>
                    Edit Case
                  </button>
                  <button className="secondary-button" type="button" onClick={openCaseHistoryWindow} disabled={!selectedCase}>
                    Display Case History
                  </button>
                  <button type="button" onClick={closeSelectedCase} disabled={!selectedCase || selectedCase.status === "Closed"}>
                    Close Selected Case
                  </button>
                  <button className="secondary-button" type="button" onClick={openReminderWindow} disabled={!selectedClient}>
                    Reminder
                  </button>
                </div>

              </section>
            </div>

            {showNewCaseWindow && selectedClient && (
              <div className="confirm-overlay" aria-label="Open new case">
                <div className="case-entry-window">
                  <header className="form-titlebar">
                    <h3>Open New Case</h3>
                    <p>
                      {selectedClient.first_name} {selectedClient.last_name}
                    </p>
                  </header>

                  <div className="case-entry-form">
                    <input
                      placeholder="Case Title"
                      value={caseTitle}
                      onChange={(event) => setCaseTitle(event.target.value)}
                    />
                  </div>

                  <footer className="form-actions">
                    <button type="button" onClick={createCase}>
                      Accept
                    </button>
                    <button className="secondary-button" type="button" onClick={closeNewCaseWindow}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showEditCaseWindow && selectedClient && (
              <div className="confirm-overlay" aria-label="Edit case">
                <div className="case-entry-window">
                  <header className="form-titlebar">
                    <h3>Edit Case</h3>
                    <p>
                      {selectedClient.first_name} {selectedClient.last_name}
                    </p>
                  </header>

                  <div className="edit-case-selector">
                    <h4>Select Case</h4>
                    <div className="client-icon-grid compact-grid">
                      {cases.length === 0 ? (
                        <p className="empty-state">No cases yet.</p>
                      ) : (
                        cases.map((customerCase) => (
                          <button
                            className={`case-icon ${selectedCase?.id === customerCase.id ? "selected-client" : ""}`}
                            type="button"
                            key={customerCase.id}
                            onClick={() => setSelectedCaseId(String(customerCase.id))}
                          >
                            <span className="case-file-icon" aria-hidden="true"></span>
                            <span className="client-name">{customerCase.title || `Case #${customerCase.id}`}</span>
                            <span className="client-meta">{customerCase.status}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <footer className="form-actions">
                    <button className="danger-button" type="button" onClick={requestDeleteCase} disabled={!selectedCase}>
                      Delete Selected Case
                    </button>
                    <button className="secondary-button" type="button" onClick={closeEditCaseWindow}>
                      Done
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showCaseHistoryWindow && selectedCase && (
              <div className="confirm-overlay" aria-label="Display case history">
                <div className="case-entry-window">
                  <header className="form-titlebar">
                    <h3>{selectedCase.title || `Case #${selectedCase.id}`}</h3>
                    <p>Status: {selectedCase.status}</p>
                  </header>

                  <div className="window-toolbar">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setShowHistoryCaseSelector((isVisible) => !isVisible)}
                    >
                      Switch Case
                    </button>
                  </div>

                  {showHistoryCaseSelector && (
                    <div className="edit-case-selector">
                      <h4>Select Case</h4>
                      <div className="client-icon-grid compact-grid">
                        {cases.length === 0 ? (
                          <p className="empty-state">No cases yet.</p>
                        ) : (
                          cases.map((customerCase) => (
                            <button
                              className={`case-icon ${selectedCase?.id === customerCase.id ? "selected-client" : ""}`}
                              type="button"
                              key={customerCase.id}
                              onClick={() => {
                                setSelectedCaseId(String(customerCase.id));
                                setShowHistoryCaseSelector(false);
                              }}
                            >
                              <span className="case-file-icon" aria-hidden="true"></span>
                              <span className="client-name">{customerCase.title || `Case #${customerCase.id}`}</span>
                              <span className="client-meta">{customerCase.status}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <textarea
                    className="history-field"
                    readOnly
                    placeholder="Case history"
                    value={selectedCase.history || ""}
                  />

                  <footer className="form-actions">
                    <button className="secondary-button" type="button" onClick={closeCaseHistoryWindow}>
                      Close
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showDeleteCaseConfirm && selectedCase && (
              <div className="confirm-overlay" aria-label="Confirm delete case">
                <div className="confirm-window">
                  <h3>Delete Case?</h3>
                  <p>
                    Delete {selectedCase.title || `Case #${selectedCase.id}`}?
                  </p>
                  <footer className="form-actions">
                    <button className="danger-button" type="button" onClick={deleteSelectedCase}>
                      OK
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setShowDeleteCaseConfirm(false)}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTask === "e-notes" && (
        <section className="window-overlay" aria-label="E notes task window">
          <div className="task-window">
            <header className="window-titlebar">
              <div>
                <h2>E Notes</h2>
                <p>Add and review e-notes for a selected client case.</p>
              </div>
              <button className="secondary-button" type="button" onClick={closeClientTask}>
                Done
              </button>
            </header>

            <div className="enotes-toolbar">
              <button type="button" onClick={requestAddEnote} disabled={!selectedCase || selectedCase.status === "Closed"}>
                Add E Note
              </button>
              <button type="button" onClick={requestScheduleEmail} disabled={!selectedCase}>
                Schedule Email
              </button>
              <button type="button" onClick={requestSendSms} disabled={!selectedCase}>
                Send SMS
              </button>
              <button className="secondary-button" type="button" onClick={openEnoteHistoryWindow} disabled={!selectedCase}>
                Display E Notes History
              </button>
              <button className="secondary-button" type="button" onClick={openEmailHistoryWindow} disabled={!selectedCase}>
                Display Email History
              </button>
              <button className="secondary-button" type="button" onClick={openSmsHistoryWindow} disabled={!selectedCase}>
                Display SMS History
              </button>
            </div>

            <div className="enotes-layout">
              <section className="strip-panel">
                <h3>Clients</h3>
                <div className="button-strip">
                  {clients.length === 0 ? (
                    <p className="empty-state">No clients yet.</p>
                  ) : (
                    clients.map((client) => (
                      <button
                        className={`strip-button ${selectedClient?.id === client.id ? "selected-client" : ""}`}
                        type="button"
                        key={client.id}
                        onClick={() => selectEnoteClient(client)}
                      >
                        {client.first_name} {client.last_name}
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="strip-panel">
                <h3>Cases</h3>
                <div className="button-strip case-button-strip">
                  {!selectedClient ? (
                    <p className="empty-state">Select a client first.</p>
                  ) : cases.length === 0 ? (
                    <p className="empty-state">No cases yet.</p>
                  ) : (
                    cases.map((customerCase) => (
                      <button
                        className={`strip-button ${selectedCase?.id === customerCase.id ? "selected-client" : ""}`}
                        type="button"
                        key={customerCase.id}
                        onClick={() => {
                          setSelectedCaseId(String(customerCase.id));
                          setEnoteText("");
                          setEmailSendAt("");
                          setSmsHistory([]);
                          setShowSmsConfirm(false);
                          setShowSmsHistoryWindow(false);
                        }}
                      >
                        {customerCase.title || `Case #${customerCase.id}`}
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <textarea
              className="enote-textbox"
              placeholder="Type e-note or email message"
              value={enoteText}
              onChange={(event) => setEnoteText(event.target.value)}
              disabled={!selectedCase || selectedCase.status === "Closed"}
            />

            {showEnoteConfirm && selectedCase && (
              <div className="confirm-overlay" aria-label="Confirm e-note">
                <div className="confirm-window">
                  <h3>Add E Note?</h3>
                  <p>
                    Add this e-note to {selectedCase.title || `Case #${selectedCase.id}`}?
                  </p>
                  <footer className="form-actions">
                    <button type="button" onClick={addEnote}>
                      OK
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setShowEnoteConfirm(false)}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showScheduleEmailConfirm && selectedCase && (
              <div className="confirm-overlay" aria-label="Confirm scheduled email">
                <div className="confirm-window">
                  <h3>Schedule Email?</h3>
                  <p>
                    Send this message for {selectedCase.title || `Case #${selectedCase.id}`} at the selected date and time?
                  </p>
                  <input
                    className="email-schedule-input"
                    type="datetime-local"
                    value={emailSendAt}
                    onChange={(event) => setEmailSendAt(event.target.value)}
                  />
                  <footer className="form-actions">
                    <button type="button" onClick={scheduleEmail}>
                      Send
                    </button>
                    <button className="secondary-button" type="button" onClick={() => {
                      setShowScheduleEmailConfirm(false);
                      setEmailSendAt("");
                    }}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showSmsConfirm && selectedCase && (
              <div className="confirm-overlay" aria-label="Confirm SMS">
                <div className="confirm-window">
                  <h3>Send SMS?</h3>
                  <p>
                    Send this SMS to {selectedClient?.phone_number || "the selected client"}?
                  </p>
                  <footer className="form-actions">
                    <button type="button" onClick={sendSms}>
                      Send
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setShowSmsConfirm(false)}>
                      Cancel
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showEnoteHistoryWindow && selectedCase && (
              <div className="confirm-overlay" aria-label="E notes history">
                <div className="case-entry-window">
                  <header className="form-titlebar">
                    <h3>{selectedCase.title || `Case #${selectedCase.id}`}</h3>
                    <p>E-notes history</p>
                  </header>

                  <textarea
                    className="history-field"
                    readOnly
                    placeholder="E-notes history"
                    value={selectedCase.history || ""}
                  />

                  <footer className="form-actions">
                    <button className="secondary-button" type="button" onClick={() => setShowEnoteHistoryWindow(false)}>
                      Back
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showEmailHistoryWindow && selectedCase && (
              <div className="confirm-overlay" aria-label="Email history">
                <div className="case-entry-window">
                  <header className="form-titlebar">
                    <h3>{selectedCase.title || `Case #${selectedCase.id}`}</h3>
                    <p>Email history</p>
                  </header>

                  <div className="history-field email-history-list">
                    {emailHistory.length === 0 ? (
                      <p className="empty-state">No email history for this case.</p>
                    ) : (
                      emailHistory.map((emailItem) => (
                        <article className="email-history-item" key={emailItem.id}>
                          <h4>{emailItem.sent_at ? "Sent" : emailItem.failed_at ? "Failed" : "Scheduled"}</h4>
                          <p>Created: {emailItem.created_at || "Not recorded"}</p>
                          <p>Scheduled: {emailItem.send_at || "Not scheduled"}</p>
                          {emailItem.sent_at && <p>Sent: {emailItem.sent_at}</p>}
                          {emailItem.failed_at && <p>Failed: {emailItem.failed_at}</p>}
                          {emailItem.error_message && <p>Error: {emailItem.error_message}</p>}
                          <textarea readOnly value={emailItem.note || ""} />
                        </article>
                      ))
                    )}
                  </div>

                  <footer className="form-actions">
                    <button className="secondary-button" type="button" onClick={() => setShowEmailHistoryWindow(false)}>
                      Back
                    </button>
                  </footer>
                </div>
              </div>
            )}

            {showSmsHistoryWindow && selectedCase && (
              <div className="confirm-overlay" aria-label="SMS history">
                <div className="case-entry-window">
                  <header className="form-titlebar">
                    <h3>{selectedCase.title || `Case #${selectedCase.id}`}</h3>
                    <p>SMS history</p>
                  </header>

                  <div className="history-field email-history-list">
                    {smsHistory.length === 0 ? (
                      <p className="empty-state">No SMS history for this case.</p>
                    ) : (
                      smsHistory.map((smsItem) => (
                        <article className="email-history-item" key={smsItem.id}>
                          <h4>{smsItem.status}</h4>
                          <p>To: {smsItem.phone_number}</p>
                          <p>Created: {smsItem.created_at || "Not recorded"}</p>
                          {smsItem.sent_at && <p>Sent: {smsItem.sent_at}</p>}
                          {smsItem.provider_message_id && <p>Provider ID: {smsItem.provider_message_id}</p>}
                          {smsItem.error_message && <p>Error: {smsItem.error_message}</p>}
                          <textarea readOnly value={smsItem.message || ""} />
                        </article>
                      ))
                    )}
                  </div>

                  <footer className="form-actions">
                    <button className="secondary-button" type="button" onClick={() => setShowSmsHistoryWindow(false)}>
                      Back
                    </button>
                  </footer>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {showReminderWindow && (activeTask === "reminders" || activeTask === "case-notes") && (
        <section className="window-overlay" aria-label="Reminder window">
          <div className="case-entry-window">
            <header className="form-titlebar">
              <h3>Reminder</h3>
              <p>Select a client and case, then set the reminder.</p>
            </header>

            {message && <p className="message">{message}</p>}

            <div className="enotes-layout">
              <section className="strip-panel">
                <h3>Clients</h3>
                <div className="button-strip">
                  {clients.length === 0 ? (
                    <p className="empty-state">No clients yet.</p>
                  ) : (
                    clients.map((client) => (
                      <button
                        className={`strip-button ${selectedClient?.id === client.id ? "selected-client" : ""}`}
                        type="button"
                        key={client.id}
                        onClick={() => selectReminderClient(client)}
                      >
                        {client.first_name} {client.last_name}
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="strip-panel">
                <h3>Cases</h3>
                <div className="button-strip case-button-strip">
                  {!selectedClient ? (
                    <p className="empty-state">Select a client first.</p>
                  ) : cases.length === 0 ? (
                    <p className="empty-state">No cases yet.</p>
                  ) : (
                    cases.map((customerCase) => (
                      <button
                        className={`strip-button ${selectedCase?.id === customerCase.id ? "selected-client" : ""}`}
                        type="button"
                        key={customerCase.id}
                        onClick={() => setSelectedCaseId(String(customerCase.id))}
                      >
                        {customerCase.title || `Case #${customerCase.id}`}
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <input
              className="email-schedule-input"
              type="datetime-local"
              value={reminderAt}
              onChange={(event) => setReminderAt(event.target.value)}
            />
            <textarea
              className="enote-textbox"
              placeholder="Reminder message"
              value={reminderMessage}
              onChange={(event) => setReminderMessage(event.target.value)}
            />

            <footer className="form-actions">
              <button type="button" onClick={createReminder}>
                Accept
              </button>
              <button className="secondary-button" type="button" onClick={openReminderHistoryWindow}>
                Reminder History
              </button>
              <button className="secondary-button" type="button" onClick={cancelReminderWindow}>
                Cancel
              </button>
            </footer>
          </div>
        </section>
      )}

      {showReminderHistoryWindow && (
        <section className="window-overlay" aria-label="Reminder history">
          <div className="case-entry-window">
            <header className="form-titlebar">
              <h3>Reminder History</h3>
              <p>Most recent reminders are shown first.</p>
            </header>

            <div className="history-field email-history-list">
              {reminderHistory.length === 0 ? (
                <p className="empty-state">No reminder history.</p>
              ) : (
                reminderHistory.map((reminder) => (
                  <article className="email-history-item" key={reminder.id}>
                    <h4>{reminder.case_title || `Case #${reminder.case_id}`}</h4>
                    <p>Client: {reminder.client_name || `Client #${reminder.client_id}`}</p>
                    <p>Reminder time: {reminder.remind_at}</p>
                    <p>Status: {reminder.finished_at ? "Finished" : "Open"}</p>
                    <textarea readOnly value={reminder.message || ""} />
                  </article>
                ))
              )}
            </div>

            <footer className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setShowReminderHistoryWindow(false)}>
                Back
              </button>
            </footer>
          </div>
        </section>
      )}

      {dueReminders.length > 0 && (
        <section className="window-overlay" aria-label="Reminder popup">
          <div className="confirm-window">
            <h3>Reminder</h3>
            <p>{dueReminders[0].client_name}</p>
            <p>{dueReminders[0].case_title || `Case #${dueReminders[0].case_id}`}</p>
            <textarea readOnly value={dueReminders[0].message || ""} />
            <footer className="form-actions">
              <button className="secondary-button" type="button" onClick={() => dismissDueReminder(dueReminders[0].id)}>
                Dismiss
              </button>
              <button type="button" onClick={() => finishDueReminder(dueReminders[0].id)}>
                Finished
              </button>
            </footer>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
